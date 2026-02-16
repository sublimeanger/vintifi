import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    // Tier check: Business+ required
    const { data: profile } = await supabase
      .from("profiles").select("subscription_tier").eq("user_id", user.id).maybeSingle();
    const tier = profile?.subscription_tier || "free";
    const tierLevel: Record<string, number> = { free: 0, pro: 1, business: 2, scale: 3 };
    if ((tierLevel[tier] ?? 0) < 2) {
      return new Response(
        JSON.stringify({ error: "This feature requires a Business plan. Upgrade to continue." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { listing_id, platforms } = await req.json();
    if (!listing_id || !platforms || !Array.isArray(platforms)) {
      throw new Error("listing_id and platforms[] are required");
    }

    // Fetch listing
    const { data: listing, error: listingError } = await supabase
      .from("listings").select("*").eq("id", listing_id).eq("user_id", user.id).single();
    if (listingError || !listing) throw new Error("Listing not found");

    // Fetch eBay connection
    const { data: connections } = await supabase
      .from("platform_connections").select("*").eq("user_id", user.id).eq("status", "active").eq("platform", "ebay");

    const ebayConn = (connections || [])[0];
    const results: Record<string, { success: boolean; error?: string; platform_url?: string }> = {};

    for (const { platform, price_override } of platforms) {
      if (platform !== "ebay") {
        results[platform] = { success: false, error: `Platform "${platform}" is not supported. Only eBay is available.` };
        continue;
      }

      if (!ebayConn) {
        results[platform] = { success: false, error: "eBay not connected. Go to Settings → eBay Connection first." };
        continue;
      }

      try {
        const publishResult = await publishToEbay(listing, ebayConn, price_override);

        await supabase.from("cross_listings").upsert(
          {
            listing_id, user_id: user.id, platform: "ebay",
            platform_listing_id: publishResult.platform_listing_id || null,
            platform_url: publishResult.platform_url || null,
            platform_price: price_override || listing.current_price,
            status: "published", published_at: new Date().toISOString(),
            last_synced_at: new Date().toISOString(), sync_error: null,
          },
          { onConflict: "listing_id,platform" }
        );

        await supabase.from("platform_sync_log").insert({
          user_id: user.id, action: "publish", status: "success",
          details: { platform: "ebay", listing_id, platform_url: publishResult.platform_url },
        });

        results.ebay = { success: true, platform_url: publishResult.platform_url };
      } catch (err: any) {
        await supabase.from("cross_listings").upsert(
          { listing_id, user_id: user.id, platform: "ebay", status: "error", sync_error: err.message, last_synced_at: new Date().toISOString() },
          { onConflict: "listing_id,platform" }
        );
        await supabase.from("platform_sync_log").insert({
          user_id: user.id, action: "publish", status: "failed",
          details: { platform: "ebay", listing_id, error: err.message },
        });
        results.ebay = { success: false, error: err.message };
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("publish-to-platform error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── eBay Adapter ───
async function publishToEbay(listing: any, connection: any, priceOverride?: number) {
  const accessToken = connection.auth_data?.access_token;
  if (!accessToken) throw new Error("eBay access token not found. Please re-authorise your eBay account.");

  const ebayClientId = Deno.env.get("EBAY_CLIENT_ID");
  if (!ebayClientId) throw new Error("eBay integration is not yet configured. EBAY_CLIENT_ID secret is missing.");

  const price = priceOverride || listing.current_price || 0;
  const sku = `vintifi-${listing.id.slice(0, 8)}`;

  // Step 1: Create inventory item
  const inventoryRes = await fetch(
    `https://api.ebay.com/sell/inventory/v1/inventory_item/${sku}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "Content-Language": "en-GB" },
      body: JSON.stringify({
        availability: { shipToLocationAvailability: { quantity: 1 } },
        condition: mapConditionToEbay(listing.condition),
        product: {
          title: listing.title,
          description: listing.description || listing.title,
          brand: listing.brand || "Unbranded",
          imageUrls: listing.image_url ? [listing.image_url] : [],
        },
      }),
    }
  );
  if (!inventoryRes.ok && inventoryRes.status !== 204) {
    throw new Error(`eBay inventory creation failed [${inventoryRes.status}]: ${await inventoryRes.text()}`);
  }

  // Step 2: Create offer
  const offerRes = await fetch("https://api.ebay.com/sell/inventory/v1/offer", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "Content-Language": "en-GB" },
    body: JSON.stringify({
      sku, marketplaceId: "EBAY_GB", format: "FIXED_PRICE", listingDuration: "GTC",
      pricingSummary: { price: { value: price.toFixed(2), currency: "GBP" } },
      availableQuantity: 1, categoryId: "11450", merchantLocationKey: "default",
    }),
  });
  if (!offerRes.ok) throw new Error(`eBay offer creation failed [${offerRes.status}]: ${await offerRes.text()}`);

  const offerData = await offerRes.json();

  // Step 3: Publish offer
  const publishRes = await fetch(
    `https://api.ebay.com/sell/inventory/v1/offer/${offerData.offerId}/publish`,
    { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
  );
  if (!publishRes.ok) throw new Error(`eBay publish failed [${publishRes.status}]: ${await publishRes.text()}`);

  const publishData = await publishRes.json();
  return {
    platform_listing_id: publishData.listingId,
    platform_url: `https://www.ebay.co.uk/itm/${publishData.listingId}`,
  };
}

function mapConditionToEbay(condition: string | null): string {
  const map: Record<string, string> = {
    "new": "NEW", "new with tags": "NEW_WITH_TAGS", "new without tags": "NEW_WITHOUT_TAGS",
    "very good": "LIKE_NEW", "good": "GOOD", "satisfactory": "ACCEPTABLE",
  };
  return map[(condition || "").toLowerCase()] || "GOOD";
}
