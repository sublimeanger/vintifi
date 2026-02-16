import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APIFY_BASE = "https://api.apify.com/v2";
const APIFY_ACTOR = "kazkn~vinted-smart-scraper";

const RETAILER_QUERIES: Record<string, string> = {
  "ASOS Outlet": "site:asos.com sale OR outlet",
  "End Clothing": "site:endclothing.com sale",
  "TK Maxx": "site:tkmaxx.com",
  "Nike Clearance": "site:nike.com sale",
  "Adidas Outlet": "site:adidas.co.uk outlet OR sale",
  "ZARA Sale": "site:zara.com sale",
};

// ── Apify for Vinted baseline ──
async function scrapeVintedBaseline(apiToken: string, query: string): Promise<any[]> {
  try {
    const url = `${APIFY_BASE}/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${apiToken}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ search: query, maxItems: 15, country: "uk" }),
    });
    if (!res.ok) { console.error(`Apify clearance baseline failed: ${res.status}`); return []; }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) { console.error("Apify clearance error:", e); return []; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const APIFY_API_TOKEN = Deno.env.get("APIFY_API_TOKEN");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Verify auth
    const authHeader = req.headers.get("authorization");
    const userClient = createClient(SUPABASE_URL, anonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tier check: business+
    const serviceClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await serviceClient.from("profiles").select("subscription_tier").eq("user_id", user.id).single();
    const tierLevel: Record<string, number> = { free: 0, pro: 1, business: 2, scale: 3 };
    if ((tierLevel[profile?.subscription_tier || "free"] ?? 0) < 2) {
      return new Response(JSON.stringify({ error: "This feature requires a Business plan. Upgrade to continue." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { retailers, brand, category, min_margin = 40 } = await req.json();
    if (!retailers || retailers.length === 0) {
      return new Response(JSON.stringify({ error: "Select at least one retailer" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchSuffix = [brand, category].filter(Boolean).join(" ");

    // Search each retailer via Firecrawl (parallel) — retailers stay on Firecrawl
    const retailerPromises = retailers.map(async (retailer: string) => {
      const baseQuery = RETAILER_QUERIES[retailer];
      if (!baseQuery) return { retailer, results: [] };
      const query = searchSuffix ? `${baseQuery} ${searchSuffix}` : baseQuery;
      try {
        const res = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ query, limit: 8, scrapeOptions: { formats: ["markdown"] } }),
        });
        if (!res.ok) { console.error(`${retailer} search failed:`, res.status); return { retailer, results: [] }; }
        const data = await res.json();
        return { retailer, results: data.data || data.results || [] };
      } catch (e) { console.error(`${retailer} error:`, e); return { retailer, results: [] }; }
    });

    // Vinted baseline: Apify primary, Firecrawl fallback
    const vintedPromise = (async () => {
      const vintedQuery = searchSuffix || "sale";

      // Try Apify first
      if (APIFY_API_TOKEN) {
        const items = await scrapeVintedBaseline(APIFY_API_TOKEN, vintedQuery);
        if (items.length > 0) {
          return { source: "apify", items };
        }
      }

      // Fallback to Firecrawl
      try {
        const res = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ query: `site:vinted.co.uk ${vintedQuery}`, limit: 8, scrapeOptions: { formats: ["markdown"] } }),
        });
        if (!res.ok) return { source: "firecrawl", items: [] };
        const data = await res.json();
        return { source: "firecrawl", items: data.data || data.results || [] };
      } catch { return { source: "firecrawl", items: [] }; }
    })();

    const [retailerResults, vintedResult] = await Promise.all([
      Promise.all(retailerPromises),
      vintedPromise,
    ]);

    // Build AI context
    const retailerSummary = retailerResults.map((r) => {
      const items = r.results.slice(0, 6).map((item: any) => {
        const title = item.title || "";
        const desc = item.description || item.markdown?.slice(0, 200) || "";
        const url = item.url || "";
        return `  - ${title} | ${desc} | ${url}`;
      }).join("\n");
      return `## ${r.retailer}\n${items || "  No results found"}`;
    }).join("\n\n");

    let vintedSummary = "";
    if (vintedResult.source === "apify") {
      vintedSummary = vintedResult.items.slice(0, 10).map((item: any) => {
        const brand = item.brand || item.brand_title || "";
        const price = item.price || item.total_price || "?";
        const title = item.title || "";
        const favs = item.favourite_count || item.favorites || 0;
        return `  - ${brand} | £${price} | ${title} | ${favs} favs`;
      }).join("\n");
    } else {
      vintedSummary = vintedResult.items.slice(0, 8).map((r: any) =>
        `  - ${r.title || ""} | ${r.description || r.markdown?.slice(0, 200) || ""}`
      ).join("\n");
    }

    const prompt = `You are a reselling arbitrage analyst specialising in UK retail clearance flips. Compare retail clearance prices against Vinted resale values to find profitable opportunities.

SEARCH FILTERS: ${searchSuffix || "General clearance"}
MINIMUM PROFIT MARGIN: ${min_margin}%

## Retail Clearance Listings (Buy From)
${retailerSummary}

## Vinted Reference Prices (Sell On)
${vintedSummary || "No Vinted results - estimate based on market knowledge"}

Return a JSON array of opportunities. Each object must have:
- retailer: the retailer name
- item_title: item name
- item_url: the retail listing URL (from results, or null)
- sale_price: clearance buy price in GBP (extract or estimate)
- vinted_resale_price: estimated Vinted sell price in GBP
- estimated_profit: vinted_resale_price minus sale_price
- profit_margin: percentage margin
- brand: brand name
- category: item category
- ai_notes: 1-2 sentence explanation

Only include items with profit margin >= ${min_margin}%.
Return max 10 opportunities ranked by margin descending.
If none found, return [].
Return ONLY the JSON array.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "user", content: prompt }] }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    let opportunities: any[];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array");
      opportunities = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse clearance data");
    }

    return new Response(
      JSON.stringify({ opportunities, retailers_searched: retailers, total_found: opportunities.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Clearance radar error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
