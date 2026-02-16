import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APIFY_BASE = "https://api.apify.com/v2";
const APIFY_ACTOR = "kazkn~vinted-smart-scraper";

const CATEGORY_QUERIES: Record<string, string> = {
  Womenswear: "women clothing",
  Menswear: "men clothing",
  Streetwear: "streetwear",
  Vintage: "vintage",
  Designer: "designer luxury",
  Shoes: "shoes trainers",
  Accessories: "accessories bags",
  Kids: "kids children clothing",
  Home: "home decor",
};

// ── Apify scrape ──
async function scrapeApify(apiToken: string, query: string, limit: number): Promise<any[]> {
  try {
    const url = `${APIFY_BASE}/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${apiToken}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ search: query, maxItems: limit, country: "uk" }),
    });
    if (!res.ok) { console.error(`Apify niche scrape failed: ${res.status}`); return []; }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) { console.error("Apify niche error:", e); return []; }
}

// ── Firecrawl fallback ──
async function fetchFirecrawl(apiKey: string, query: string, limit: number, label: string) {
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit, scrapeOptions: { formats: ["markdown"] } }),
    });
    if (!res.ok) { console.error(`${label} search failed:`, res.status); return { label, results: [] }; }
    const data = await res.json();
    return { label, results: data.data || data.results || [] };
  } catch (e) { console.error(`${label} error:`, e); return { label, results: [] }; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const APIFY_API_TOKEN = Deno.env.get("APIFY_API_TOKEN");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!APIFY_API_TOKEN && !FIRECRAWL_API_KEY) throw new Error("No scraping API configured");

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

    // Tier check: pro+
    const serviceClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await serviceClient.from("profiles").select("subscription_tier").eq("user_id", user.id).single();
    const tierLevel: Record<string, number> = { free: 0, pro: 1, business: 2, scale: 3 };
    if ((tierLevel[profile?.subscription_tier || "free"] ?? 0) < 1) {
      return new Response(JSON.stringify({ error: "This feature requires a Pro plan. Upgrade to continue." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { categories, price_range, limit = 12 } = await req.json();
    if (!categories || categories.length === 0) {
      return new Response(JSON.stringify({ error: "Select at least one category" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const priceFilter = price_range ? ` ${price_range}` : "";
    let contextLines = "";

    // Try Apify first for structured data
    if (APIFY_API_TOKEN) {
      const apifyPromises = categories.map(async (cat: string) => {
        const q = CATEGORY_QUERIES[cat] || cat.toLowerCase();
        const items = await scrapeApify(APIFY_API_TOKEN, `${q}${priceFilter}`, 30);
        return { category: cat, items };
      });
      const apifyResults = await Promise.all(apifyPromises);

      const hasData = apifyResults.some((r) => r.items.length > 0);
      if (hasData) {
        // Pre-compute real statistics from scraped data
        const categoryStats: Record<string, { avgPrice: number; count: number; avgFavs: number }> = {};
        for (const r of apifyResults) {
          if (r.items.length === 0) continue;
          const prices = r.items.map((i: any) => parseFloat(i.price || i.total_price || 0)).filter((p: number) => p > 0);
          const favs = r.items.map((i: any) => parseInt(i.favourite_count || i.favorites || 0, 10));
          categoryStats[r.category] = {
            avgPrice: prices.length > 0 ? Math.round((prices.reduce((a: number, b: number) => a + b, 0) / prices.length) * 100) / 100 : 0,
            count: r.items.length,
            avgFavs: favs.length > 0 ? Math.round((favs.reduce((a: number, b: number) => a + b, 0) / favs.length) * 100) / 100 : 0,
          };
        }

        contextLines = apifyResults.map((r) => {
          const stats = categoryStats[r.category];
          const statsLine = stats
            ? `PRE-COMPUTED STATS (use these, do NOT invent your own): avg_price=£${stats.avgPrice}, total_listings=${stats.count}, avg_favourites=${stats.avgFavs}`
            : "";
          const summary = r.items.slice(0, 15).map((item: any) => {
            const brand = item.brand || item.brand_title || "Unknown";
            const price = item.price || item.total_price || "?";
            const title = item.title || "";
            const views = item.view_count || item.views || 0;
            const favs = item.favourite_count || item.favorites || 0;
            return `  - ${brand} | £${price} | ${title} | ${views} views | ${favs} favs`;
          }).join("\n");
          return `## ${r.category} (${r.items.length} listings found)\n${statsLine}\n${summary || "  No results"}`;
        }).join("\n\n");

        // Store stats for post-AI validation
        (globalThis as any).__nicheStats = categoryStats;
      }
    }

    // Fallback to Firecrawl
    if (!contextLines && FIRECRAWL_API_KEY) {
      const searchPromises = categories.flatMap((cat: string) => {
        const q = CATEGORY_QUERIES[cat] || cat.toLowerCase();
        return [
          fetchFirecrawl(FIRECRAWL_API_KEY, `site:vinted.co.uk ${q}${priceFilter}`, 8, `${cat}-supply`),
          fetchFirecrawl(FIRECRAWL_API_KEY, `site:vinted.co.uk ${q} popular OR sold${priceFilter}`, 8, `${cat}-demand`),
        ];
      });
      const searchResults = await Promise.all(searchPromises);
      contextLines = searchResults.map((r) => {
        const items = r.results.slice(0, 6).map((item: any) => {
          const title = item.title || "";
          const desc = item.description || item.markdown?.slice(0, 200) || "";
          return `  - ${title} | ${desc}`;
        }).join("\n");
        return `## ${r.label}\n${items || "  No results found"}`;
      }).join("\n\n");
    }

    const prompt = `You are a Vinted market analyst. Analyse the following scraped data from Vinted to identify underserved niches where buyer demand significantly outstrips seller supply.

CATEGORIES ANALYSED: ${categories.join(", ")}
PRICE RANGE FILTER: ${price_range || "All prices"}

${contextLines}

For each category, identify specific sub-niches (e.g. "Y2K mini skirts" not just "Womenswear") where demand signals (sold items, favourites, search interest) are high but active listing supply is low.

CRITICAL: Use the PRE-COMPUTED STATS provided above for avg_price and competition_count. Do NOT invent your own values. Your avg_price for each niche must be within 30% of the pre-computed category average.

Return a JSON array of niche opportunities (max ${limit}). Each object must have:
- niche_name: specific niche name (e.g. "Vintage Levi's 501 jeans", "Carhartt WIP jackets")
- category: parent category
- demand_level: "high" | "medium" | "low"
- supply_level: "high" | "medium" | "low"
- opportunity_score: 0-100 (higher = bigger gap between demand and supply)
- avg_price: average selling price in GBP
- estimated_monthly_sales: estimated monthly sales volume
- competition_count: approximate number of active competing listings
- sourcing_tips: 1-2 sentences on where/how to source stock and target buy price
- ai_reasoning: 1-2 sentence explanation of why this is a good opportunity

Only include niches with opportunity_score >= 50.
Rank by opportunity_score descending.
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

    let niches: any[];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array");
      niches = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse niche data");
    }

    // Post-AI validation: reject niches with hallucinated avg_price
    const nicheStats = (globalThis as any).__nicheStats as Record<string, { avgPrice: number; count: number }> | undefined;
    if (nicheStats) {
      niches = niches.filter((n: any) => {
        const catStats = nicheStats[n.category];
        if (!catStats || !catStats.avgPrice || !n.avg_price) return true; // can't validate, keep
        const deviation = Math.abs(n.avg_price - catStats.avgPrice) / catStats.avgPrice;
        if (deviation > 0.3) {
          console.log(`Correcting niche "${n.niche_name}": AI avg_price £${n.avg_price} vs real £${catStats.avgPrice}`);
          n.avg_price = catStats.avgPrice;
        }
        // Also cap competition_count to real listing count
        if (n.competition_count && catStats.count && n.competition_count > catStats.count * 2) {
          n.competition_count = catStats.count;
        }
        return true;
      });
      delete (globalThis as any).__nicheStats;
    }

    return new Response(
      JSON.stringify({ niches, categories_searched: categories, total_found: niches.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Niche finder error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
