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
        JSON.stringify({ error: "CSV import requires a Pro plan or above." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const maxItems = TIER_LIMITS[tier] || 200;

    const { items: csvItems } = await req.json();
    if (!Array.isArray(csvItems) || csvItems.length === 0) {
      return new Response(JSON.stringify({ error: "No items provided. Upload a CSV with at least one row." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (csvItems.length > maxItems) {
      return new Response(
        JSON.stringify({ error: `Your ${tier} plan supports up to ${maxItems} items per import. You sent ${csvItems.length}.` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`CSV import for user ${user.id}, tier: ${tier}, rows: ${csvItems.length}`);

    // Fetch existing vinted_urls for deduplication
    const { data: existingListings } = await supabaseAdmin
      .from("listings")
      .select("vinted_url")
      .eq("user_id", user.id)
      .not("vinted_url", "is", null);

    const existingUrls = new Set((existingListings || []).map((l: any) => l.vinted_url));

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    const batchSize = 50;
    const toInsert: any[] = [];

    for (let i = 0; i < csvItems.length; i++) {
      const item = csvItems[i];
      const title = (item.title || item.Title || "").trim();
      if (!title) {
        errors.push(`Row ${i + 1}: Missing title, skipped.`);
        skipped++;
        continue;
      }

      const vintedUrl = (item.vinted_url || item["Vinted URL"] || item.url || "").trim() || null;
      if (vintedUrl && existingUrls.has(vintedUrl)) {
        skipped++;
        continue;
      }

      const price = parseFloat(item.price || item.Price || item.current_price || "0") || null;
      const purchasePrice = parseFloat(item.purchase_price || item["Purchase Price"] || "0") || null;

      toInsert.push({
        user_id: user.id,
        title,
        brand: (item.brand || item.Brand || "").trim() || null,
        category: (item.category || item.Category || "").trim() || null,
        size: (item.size || item.Size || "").trim() || null,
        condition: (item.condition || item.Condition || "").trim() || null,
        current_price: price,
        purchase_price: purchasePrice,
        vinted_url: vintedUrl,
        status: "active",
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

    console.log(`CSV import complete: ${imported} imported, ${skipped} skipped, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        imported,
        skipped,
        total: csvItems.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully imported ${imported} item${imported !== 1 ? "s" : ""}${skipped > 0 ? `, ${skipped} skipped` : ""}.`,
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
