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
  Streetwear: "streetwear hoodie",
  Vintage: "vintage clothing",
  Designer: "designer luxury",
  Shoes: "shoes trainers",
  Accessories: "accessories bags",
  Kids: "kids children clothing",
};

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// ── Apify: scrape Vinted for a category ──
async function scrapeVintedCategory(apiToken: string, query: string, limit: number): Promise<any[]> {
  const url = `${APIFY_BASE}/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${apiToken}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      search: query,
      maxItems: limit,
      country: "uk",
    }),
  });
  if (!res.ok) {
    console.error(`Apify scrape failed for "${query}": ${res.status}`);
    return [];
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// ── Firecrawl fallback ──
async function firecrawlFallback(): Promise<string> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!FIRECRAWL_API_KEY) return "No fallback available";

  const queries = [
    "vinted trending brands UK 2026",
    "vinted best selling items UK february 2026",
    "vinted popular streetwear brands resale",
    "vinted trending vintage clothing UK",
    "vinted most sold shoes UK 2026",
    "vinted trending womenswear spring 2026",
    "vinted trending menswear UK 2026",
    "vinted kids clothing popular brands UK",
  ];

  const lines: string[] = [];
  for (const query of queries) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 5 }),
      });
      if (res.ok) {
        const data = await res.json();
        const results = data.data || data.results || [];
        for (const r of results.slice(0, 5)) {
          lines.push(`- ${r.title || ""}: ${(r.description || r.markdown || "").slice(0, 200)}`);
        }
      }
    } catch (e) {
      console.warn(`Firecrawl error for "${query}":`, e);
    }
  }
  return lines.join("\n") || "No results";
}

// ── Main scan: Apify primary, Firecrawl fallback ──
async function runTrendScan(serviceClient: any) {
  const APIFY_API_TOKEN = Deno.env.get("APIFY_API_TOKEN");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  let resultsSummary = "";
  let isApifyData = false;
  const categories = Object.keys(CATEGORY_QUERIES);

  if (APIFY_API_TOKEN) {
    console.log("Using Apify for trend data...");
    const allItems: any[] = [];

    // Scrape categories in parallel (batches of 4 to avoid overload)
    for (let i = 0; i < categories.length; i += 4) {
      const batch = categories.slice(i, i + 4);
      const batchResults = await Promise.all(
        batch.map((cat) => scrapeVintedCategory(APIFY_API_TOKEN, CATEGORY_QUERIES[cat], 50))
      );
      batchResults.forEach((items, idx) => {
        items.forEach((item) => { item._category = batch[idx]; });
        allItems.push(...items);
      });
    }

    console.log(`Apify returned ${allItems.length} total items`);

    if (allItems.length > 0) {
      isApifyData = true;
      resultsSummary = allItems.map((item) => {
        const brand = item.brand || item.brand_title || "";
        const price = item.price || item.total_price || "";
        const title = item.title || "";
        const views = item.view_count || item.views || "";
        const favs = item.favourite_count || item.favorites || "";
        const cat = item._category || "";
        return `${brand}|${price}|${title}|${views}|${favs}|${cat}`;
      }).join("\n");
    }
  }

  // Fallback to Firecrawl if Apify unavailable or returned nothing
  if (!resultsSummary) {
    console.log("Falling back to Firecrawl for trend data...");
    resultsSummary = await firecrawlFallback();
  }

  const dataLabel = isApifyData ? "real scraped Vinted listing data (format: brand|price|title|views|favourites|category)" : "web search results about Vinted trends";

  const prompt = `You are a Vinted marketplace analyst specialising in the UK resale market. Today's date is February 2026. Based on these ${dataLabel}, extract and generate exactly 80 structured trend items.

CRITICAL RULES:
- "brand_or_item" MUST be a specific brand name (e.g. "Carhartt WIP", "The North Face", "Dr. Martens", "Fjällräven") — NEVER use generic category names like "Baby & Kids Clothing" or "Activewear".
- "estimated_peak_date" MUST be a date in 2026 (between February and May 2026).
- You MUST include at least 6 trends from EACH of these 8 categories: ${categories.join(", ")}. That gives 48 baseline trends. Distribute the remaining 32 to categories with the most data/activity.
- "opportunity_score" should have realistic variance: use the full 20-98 range. Declining trends should score 20-45, peaking 40-70, rising 55-98. No more than 10 trends above 90.
- Each brand_or_item should appear at most twice across different categories.

RAW DATA:
${resultsSummary || "No results available - generate realistic trends based on current UK Vinted market knowledge for February 2026."}

Generate a JSON array of exactly 80 trends. For each trend provide:
- brand_or_item: a specific brand or product name (NEVER a generic category)
- category: one of [${categories.join(", ")}]
- trend_direction: "rising", "peaking", or "declining"
- search_volume_change_7d: percentage (-50 to +500)
- search_volume_change_30d: percentage (-30 to +800)
- avg_price: realistic GBP price (5-500)
- price_change_30d: percentage (-20 to +40)
- supply_demand_ratio: (0.1 to 3.0, lower = more demand than supply)
- opportunity_score: 20-98 with realistic variance per trend_direction
- ai_summary: 1-2 sentence explanation${isApifyData ? " referencing actual data patterns (views, favourites)" : ""} with actionable seller advice
- estimated_peak_date: ISO date in 2026 (within next 3 months)

Distribution: ~50 rising, 20 peaking, 10 declining. Use real brand names that are genuinely popular on Vinted UK.
Return ONLY the JSON array, no other text.`;

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!aiResponse.ok) {
    const status = aiResponse.status;
    if (status === 429) throw new Error("AI rate limit exceeded. Please try again in a moment.");
    if (status === 402) throw new Error("AI credits exhausted. Please top up your workspace credits.");
    throw new Error(`AI gateway error: ${status}`);
  }

  const aiData = await aiResponse.json();
  const content = aiData.choices?.[0]?.message?.content || "";

  let trends: any[];
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found");
    trends = JSON.parse(jsonMatch[0]);
  } catch {
    console.error("Failed to parse AI response:", content);
    throw new Error("Failed to parse trend data from AI");
  }

  // Clear old trends and insert new ones
  await serviceClient.from("trends").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  const rows = trends.map((t: any) => {
    let peakDate = t.estimated_peak_date || null;
    if (peakDate) {
      const parsed = new Date(peakDate);
      if (isNaN(parsed.getTime())) peakDate = null;
      else peakDate = parsed.toISOString().split("T")[0];
    }

    return {
      brand_or_item: t.brand_or_item,
      category: t.category,
      trend_direction: t.trend_direction,
      search_volume_change_7d: t.search_volume_change_7d,
      search_volume_change_30d: t.search_volume_change_30d,
      avg_price: t.avg_price,
      price_change_30d: t.price_change_30d,
      supply_demand_ratio: t.supply_demand_ratio,
      opportunity_score: t.opportunity_score,
      ai_summary: t.ai_summary,
      estimated_peak_date: peakDate,
      data_source: isApifyData ? "apify" : "firecrawl",
    };
  });

  const { error: trendInsertError } = await serviceClient.from("trends").insert(rows);
  if (trendInsertError) throw trendInsertError;

  return { success: true, trends_count: trends.length, data_source: isApifyData ? "apify" : "firecrawl" };
}

// ── Auth helper ──
async function authenticateUser(req: Request) {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("authorization") || "";
  const client = createClient(SUPABASE_URL, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return user;
}

// ── Main handler ──
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;
    const serviceClient = getServiceClient();

    // Scheduled action: called by pg_cron (auth via Authorization header with anon key)
    if (action === "scheduled") {
      // pg_cron sends Authorization: Bearer <anon_key> — skip user auth for scheduled runs
      const authHeader = req.headers.get("authorization") || "";
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
      const token = authHeader.replace("Bearer ", "");
      if (token !== anonKey) {
        await authenticateUser(req);
      }
    } else {
      // All other actions require user auth
      await authenticateUser(req);
    }

    // Single synchronous action — no more launch/poll/process
    const result = await runTrendScan(serviceClient);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Market scan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
