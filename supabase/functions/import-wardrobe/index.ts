import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIER_LIMITS: Record<string, number> = {
  pro: 200,
  business: 1000,
  scale: 999999,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apifyToken = Deno.env.get("APIFY_API_TOKEN");

    if (!apifyToken) {
      return new Response(JSON.stringify({ error: "Apify API token not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth the user
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get profile for tier check
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("subscription_tier")
      .eq("user_id", user.id)
      .single();

    const tier = profile?.subscription_tier || "free";
    if (tier === "free") {
      return new Response(
        JSON.stringify({ error: "Wardrobe import requires a Pro plan or above." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const maxItems = TIER_LIMITS[tier] || 200;

    const { profileUrl } = await req.json();
    if (!profileUrl || typeof profileUrl !== "string") {
      return new Response(JSON.stringify({ error: "Missing profileUrl" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate Vinted profile URL
    const vintedUrlRegex = /^https?:\/\/www\.vinted\.(co\.uk|fr|de|nl|es|it|pt|pl|be|at|cz|lt|se|hu|ro|sk|hr|fi|dk|bg|gr|ee|lv|lu|ie|si|no)\/(member|membre|mitglied)\/\d+/i;
    if (!vintedUrlRegex.test(profileUrl)) {
      return new Response(
        JSON.stringify({ error: "Invalid Vinted profile URL. Example: https://www.vinted.co.uk/member/12345678" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The Apify actor only accepts vinted.[2-3 letter TLD] URLs.
    // Convert .co.uk to .fr (Vinted uses unified member IDs across all domains).
    let apifySellerUrl = profileUrl.replace(/https?:\/\/www\.vinted\.co\.uk\//i, "https://www.vinted.fr/");
    // Normalise /membre/ or /mitglied/ path segments to /member/ for the actor
    apifySellerUrl = apifySellerUrl.replace(/\/(membre|mitglied)\//, "/member/");

    console.log(`Starting wardrobe import for user ${user.id}, URL: ${profileUrl}, apifyUrl: ${apifySellerUrl}, tier: ${tier}, limit: ${maxItems}`);

    // Call Apify actor synchronously
    const actorId = "pintostudio~vinted-seller-products";
    const apifyUrl = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${apifyToken}&timeout=300`;

    const apifyResponse = await fetch(apifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sellerUrl: apifySellerUrl,
        maxItems: maxItems,
      }),
    });

    if (!apifyResponse.ok) {
      const errText = await apifyResponse.text();
      console.error("Apify error:", apifyResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch wardrobe from Vinted. Please try again later." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const items = await apifyResponse.json();
    if (!Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ imported: 0, skipped: 0, message: "No items found on this profile." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Apify returned ${items.length} items`);

    // Fetch existing vinted_urls for this user to skip duplicates
    const { data: existingListings } = await supabaseAdmin
      .from("listings")
      .select("vinted_url")
      .eq("user_id", user.id)
      .not("vinted_url", "is", null);

    const existingUrls = new Set((existingListings || []).map((l: any) => l.vinted_url));

    // Map and insert
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    const batchSize = 50;
    const toInsert: any[] = [];

    for (const item of items) {
      const itemUrl = item.url || null;
      if (itemUrl && existingUrls.has(itemUrl)) {
        skipped++;
        continue;
      }

      // Determine status
      let status = "active";
      if (item.is_closed === true || item.status === "closed") {
        status = "sold";
      } else if (item.is_reserved === true) {
        status = "reserved";
      }

      const price = item.total_item_price?.amount
        ? parseFloat(item.total_item_price.amount)
        : item.price
          ? parseFloat(String(item.price))
          : null;

      const imageUrl = item.photos?.[0]?.url || item.photo?.url || item.image_url || null;

      toInsert.push({
        user_id: user.id,
        title: item.title || "Untitled Item",
        brand: item.brand_title || item.brand || null,
        current_price: price,
        size: item.size_title || item.size || null,
        condition: item.status_label || item.condition || null,
        description: item.description || null,
        image_url: imageUrl,
        vinted_url: itemUrl,
        views_count: item.view_count || item.views || 0,
        favourites_count: item.favourite_count || item.favorites || 0,
        category: item.catalog_title || item.category || null,
        status,
      });
    }

    // Batch insert
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize);
      const { error: insertError, data: insertedData } = await supabaseAdmin
        .from("listings")
        .insert(batch)
        .select("id");

      if (insertError) {
        console.error("Insert error:", insertError);
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${insertError.message}`);
      } else {
        imported += insertedData?.length || batch.length;
      }
    }

    console.log(`Import complete: ${imported} imported, ${skipped} skipped, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        imported,
        skipped,
        total: items.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully imported ${imported} item${imported !== 1 ? "s" : ""}${skipped > 0 ? `, ${skipped} already existed` : ""}.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("import-wardrobe error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
