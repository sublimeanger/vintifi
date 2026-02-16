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
    const results: Record<string, { success: boolean; error?: string; platform_url?: string; categoryName?: string }> = {};

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
        // Validate listing fields for eBay compliance
        const validationErrors: string[] = [];
        if (!listing.title || listing.title.length === 0) validationErrors.push("Title is required");
        if (listing.title && listing.title.length > 80) validationErrors.push("Title must be 80 characters or fewer for eBay");
        if (!listing.current_price || listing.current_price <= 0) validationErrors.push("A valid price is required");
        if (!listing.condition) validationErrors.push("Condition is required");
        if (validationErrors.length > 0) {
          results[platform] = { success: false, error: `eBay validation failed: ${validationErrors.join("; ")}` };
          continue;
        }

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

        results.ebay = { success: true, platform_url: publishResult.platform_url, categoryName: publishResult.categoryName };
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

  // Detect eBay category via AI
  const category = await detectEbayCategory(listing);

  // Build aspects from listing fields
  const aspects = buildAspects(listing);

  // Step 1: Create inventory item
  const inventoryRes = await fetch(
    `https://api.ebay.com/sell/inventory/v1/inventory_item/${sku}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "Content-Language": "en-GB", "Accept-Language": "en-GB" },
      body: JSON.stringify({
        availability: { shipToLocationAvailability: { quantity: 1 } },
        condition: mapConditionToEbay(listing.condition),
        product: {
          title: listing.title,
          description: listing.description || listing.title,
          brand: listing.brand || "Unbranded",
          imageUrls: listing.image_url ? [listing.image_url] : [],
          aspects,
        },
      }),
    }
  );
  if (!inventoryRes.ok && inventoryRes.status !== 204) {
    throw new Error(`eBay inventory creation failed [${inventoryRes.status}]: ${await inventoryRes.text()}`);
  }

  // Step 1.5: Ensure merchant location exists
  await ensureMerchantLocation(accessToken);

  // Step 2: Create offer
  const offerRes = await fetch("https://api.ebay.com/sell/inventory/v1/offer", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "Content-Language": "en-GB", "Accept-Language": "en-GB" },
    body: JSON.stringify({
      sku, marketplaceId: "EBAY_GB", format: "FIXED_PRICE", listingDuration: "GTC",
      pricingSummary: { price: { value: price.toFixed(2), currency: "GBP" } },
      availableQuantity: 1, categoryId: category.id, merchantLocationKey: "default",
    }),
  });
  if (!offerRes.ok) throw new Error(`eBay offer creation failed [${offerRes.status}]: ${await offerRes.text()}`);

  const offerData = await offerRes.json();

  // Step 3: Publish offer
  const publishRes = await fetch(
    `https://api.ebay.com/sell/inventory/v1/offer/${offerData.offerId}/publish`,
    { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "Content-Language": "en-GB", "Accept-Language": "en-GB" } }
  );
  if (!publishRes.ok) throw new Error(`eBay publish failed [${publishRes.status}]: ${await publishRes.text()}`);

  const publishData = await publishRes.json();
  return {
    platform_listing_id: publishData.listingId,
    platform_url: `https://www.ebay.co.uk/itm/${publishData.listingId}`,
    categoryName: category.name,
  };
}

function buildAspects(listing: any): Record<string, string[]> {
  const aspects: Record<string, string[]> = {};
  if (listing.brand) aspects["Brand"] = [listing.brand];
  if (listing.size) aspects["Size"] = [listing.size];
  if (listing.colour) aspects["Colour"] = [listing.colour];
  if (listing.material) aspects["Material"] = [listing.material];
  if (listing.condition) aspects["Condition Description"] = [listing.condition];
  return aspects;
}

function mapConditionToEbay(condition: string | null): string {
  const map: Record<string, string> = {
    "new": "NEW", "new with tags": "NEW_WITH_TAGS", "new without tags": "NEW_WITHOUT_TAGS",
    "excellent": "USED_EXCELLENT", "very good": "USED_VERY_GOOD",
    "good": "USED_GOOD", "satisfactory": "USED_ACCEPTABLE",
  };
  return map[(condition || "").toLowerCase()] || "USED_GOOD";
}

// ─── AI-Powered eBay Category Detection ───
const EBAY_CATEGORY_FALLBACKS: Record<string, string> = {
  "women's clothing": "15724", "men's clothing": "1059",
  "women's shoes": "3034", "men's shoes": "93427",
  "women's bags": "169291", "men's bags": "169285",
  "women's accessories": "4251", "men's accessories": "4250",
  "kids' clothing": "171146", "jewellery": "281",
  "watches": "14324", "vintage clothing": "175759",
  "sportswear": "137084", "coats & jackets": "63862",
  "dresses": "63861", "tops": "53159", "jeans": "11483",
  "trainers": "155202", "boots": "11498", "shirts": "57990",
  "jumpers": "11484", "skirts": "63864", "shorts": "15689",
  "suits": "3001", "swimwear": "15690",
};

// Reverse lookup: category ID → human-readable name
const EBAY_CATEGORY_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(EBAY_CATEGORY_FALLBACKS).map(([name, id]) => [id, name.split("'").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join("'")])
);
// Add generic fallback
EBAY_CATEGORY_NAMES["11450"] = "Clothing, Shoes & Accessories";

function getCategoryName(id: string): string {
  return EBAY_CATEGORY_NAMES[id] || "Clothing, Shoes & Accessories";
}

async function detectEbayCategory(listing: any): Promise<{ id: string; name: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.warn("No LOVABLE_API_KEY — using fallback category");
    const id = quickFallbackCategory(listing);
    return { id, name: getCategoryName(id) };
  }

  try {
    const prompt = `You are an eBay category mapping expert. Given this item, return the single best eBay UK category ID (numeric string).

Item: "${listing.title}"
Brand: ${listing.brand || "Unknown"}
Category: ${listing.category || "Unknown"}
Size: ${listing.size || "Unknown"}

Common eBay UK clothing category IDs:
- 15724: Women's Clothing
- 1059: Men's Clothing  
- 63861: Dresses
- 63862: Coats, Jackets & Waistcoats (Women)
- 57990: Shirts & Tops (Men)
- 53159: Tops & Shirts (Women)
- 11483: Jeans (Men/Women)
- 11484: Jumpers & Cardigans
- 63864: Skirts
- 15689: Shorts
- 3001: Suits & Tailoring
- 15690: Swimwear
- 3034: Women's Shoes
- 93427: Men's Shoes
- 155202: Trainers
- 11498: Boots
- 169291: Women's Bags & Handbags
- 169285: Men's Bags
- 4251: Women's Accessories
- 4250: Men's Accessories
- 281: Jewellery
- 14324: Watches
- 175759: Vintage Clothing
- 137084: Activewear
- 171146: Kids' Clothing
- 11450: Clothing, Shoes & Accessories (generic fallback)

Return ONLY the numeric category ID, nothing else.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You return only a single eBay category ID number. No explanation." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      console.warn("AI category detection failed, using fallback");
      const id = quickFallbackCategory(listing);
      return { id, name: getCategoryName(id) };
    }

    const aiData = await aiRes.json();
    const raw = (aiData.choices?.[0]?.message?.content || "").trim();
    const idMatch = raw.match(/\d{3,6}/);
    if (idMatch) {
      const id = idMatch[0];
      return { id, name: getCategoryName(id) };
    }

    const id = quickFallbackCategory(listing);
    return { id, name: getCategoryName(id) };
  } catch (err) {
    console.error("Category detection error:", err);
    const id = quickFallbackCategory(listing);
    return { id, name: getCategoryName(id) };
  }
}

function quickFallbackCategory(listing: any): string {
  const cat = (listing.category || "").toLowerCase();
  for (const [key, id] of Object.entries(EBAY_CATEGORY_FALLBACKS)) {
    if (cat.includes(key) || key.includes(cat)) return id;
  }
  return "11450";
}

// ─── Ensure eBay Merchant Location Exists ───
async function ensureMerchantLocation(accessToken: string) {
  const checkRes = await fetch(
    "https://api.ebay.com/sell/inventory/v1/location/default",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (checkRes.ok) return; // already exists

  const createRes = await fetch(
    "https://api.ebay.com/sell/inventory/v1/location/default",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        location: {
          address: {
            postalCode: "SW1A 1AA",
            country: "GB",
          },
        },
        name: "Default Location",
        merchantLocationStatus: "ENABLED",
        locationTypes: ["WAREHOUSE"],
      }),
    }
  );
  if (!createRes.ok && createRes.status !== 409) {
    const errorText = await createRes.text();
    console.error(`eBay location setup failed [${createRes.status}]: ${errorText}`);
    throw new Error(`eBay location setup failed [${createRes.status}]: ${errorText}`);
  }
}
