import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALL_PLATFORMS = [
  { name: "eBay", query: "site:ebay.co.uk" },
  { name: "Depop", query: "site:depop.com" },
  { name: "Facebook Marketplace", query: "site:facebook.com/marketplace" },
  { name: "Gumtree", query: "site:gumtree.com" },
];

async function searchPlatform(platform: { name: string; query: string }, searchTerm: string, apiKey: string) {
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `${platform.query} ${searchTerm}`,
        limit: 10,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });
    if (!res.ok) {
      console.error(`${platform.name} search failed:`, res.status);
      return { platform: platform.name, results: [] };
    }
    const data = await res.json();
    return { platform: platform.name, results: data.data || data.results || [] };
  } catch (e) {
    console.error(`${platform.name} search error:`, e);
    return { platform: platform.name, results: [] };
  }
}

async function searchVinted(searchTerm: string, apiKey: string) {
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `site:vinted.co.uk ${searchTerm}`,
        limit: 8,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || data.results || [];
  } catch {
    return [];
  }
}

function buildPrompt(searchTerm: string, minMargin: number, platformSummary: string, vintedSummary: string) {
  return `You are a UK reselling arbitrage analyst specialising in Vinted flips. Analyse these search results to find profitable arbitrage opportunities.

SEARCH TERM: "${searchTerm}"
MINIMUM PROFIT MARGIN: ${minMargin}%

## Source Platform Listings (Buy From)
${platformSummary}

## Vinted Reference Prices (Sell On)
${vintedSummary || "No Vinted results - estimate based on UK market knowledge"}

Analyse and return a JSON array of arbitrage opportunities. For each opportunity include ALL of these fields:
- source_platform: platform name exactly as shown above
- source_url: the source listing URL (use actual URL from results if available, otherwise null)
- source_title: item title from source
- source_price: estimated buy price in GBP (extract from listing or estimate)
- vinted_estimated_price: what this would sell for on Vinted in GBP
- estimated_profit: raw profit (vinted price minus source price)
- profit_margin: percentage margin
- brand: brand name
- category: item category
- condition: estimated condition (New / Like New / Good / Fair)
- ai_notes: 1-2 sentence explanation of why this is a good flip
- deal_score: integer 1-100 rating the overall quality (consider margin, demand, brand heat, condition, sell speed)
- risk_level: "low" / "medium" / "high" - risk of the item NOT selling on Vinted
- estimated_days_to_sell: estimated days to sell on Vinted (integer)
- demand_indicator: "hot" / "warm" / "cold" - current UK demand level
- suggested_listing_title: an SEO-optimised Vinted listing title ready to copy-paste
- shipping_estimate: estimated UK shipping cost in GBP (typically 2.50-5.00 for clothing, 5-10 for shoes/heavy)
- net_profit: estimated_profit minus shipping_estimate minus 0 (Vinted has no seller fees)

Only include opportunities with profit margin >= ${minMargin}%.
If no good opportunities exist, return an empty array [].
Return 5-10 opportunities maximum, ranked by deal_score descending.
Return ONLY the JSON array, no other text.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Verify auth
    const authHeader = req.headers.get("authorization");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(SUPABASE_URL, anonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { brand, category, min_profit_margin = 30, platforms } = await req.json();

    if (!brand && !category) {
      return new Response(
        JSON.stringify({ error: "Provide at least a brand or category to scan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchTerm = [brand, category].filter(Boolean).join(" ");
    console.log("Arbitrage scan for:", searchTerm);

    // Filter platforms based on user selection
    const selectedPlatforms = platforms && Array.isArray(platforms) && platforms.length > 0
      ? ALL_PLATFORMS.filter(p => platforms.includes(p.name))
      : ALL_PLATFORMS;

    // Search all selected platforms + Vinted in parallel
    const [platformResults, vintedResults] = await Promise.all([
      Promise.all(selectedPlatforms.map(p => searchPlatform(p, searchTerm, FIRECRAWL_API_KEY))),
      searchVinted(searchTerm, FIRECRAWL_API_KEY),
    ]);

    // Build context for AI
    const platformSummary = platformResults
      .map((p) => {
        const items = p.results.slice(0, 8).map((r: any) => {
          const title = r.title || "";
          const desc = r.description || r.markdown?.slice(0, 200) || "";
          const url = r.url || "";
          return `  - ${title} | ${desc} | ${url}`;
        }).join("\n");
        return `## ${p.platform}\n${items || "  No results found"}`;
      })
      .join("\n\n");

    const vintedSummary = vintedResults.slice(0, 8).map((r: any) => {
      const title = r.title || "";
      const desc = r.description || r.markdown?.slice(0, 200) || "";
      return `  - ${title} | ${desc}`;
    }).join("\n");

    const prompt = buildPrompt(searchTerm, min_profit_margin, platformSummary, vintedSummary);

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
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
      throw new Error("Failed to parse arbitrage data");
    }

    // Store opportunities in database
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (opportunities.length > 0) {
      const rows = opportunities.map((o: any) => ({
        user_id: user.id,
        source_platform: o.source_platform || "eBay",
        source_url: o.source_url,
        source_title: o.source_title,
        source_price: o.source_price,
        vinted_estimated_price: o.vinted_estimated_price,
        estimated_profit: o.estimated_profit,
        profit_margin: o.profit_margin,
        brand: o.brand || brand,
        category: o.category || category,
        condition: o.condition,
        ai_notes: o.ai_notes,
        deal_score: o.deal_score,
        risk_level: o.risk_level,
        estimated_days_to_sell: o.estimated_days_to_sell,
        demand_indicator: o.demand_indicator,
        suggested_listing_title: o.suggested_listing_title,
        shipping_estimate: o.shipping_estimate,
        net_profit: o.net_profit,
      }));

      await serviceClient.from("arbitrage_opportunities").insert(rows);
    }

    return new Response(
      JSON.stringify({
        opportunities,
        search_term: searchTerm,
        platforms_searched: selectedPlatforms.map(p => p.name),
        total_found: opportunities.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Arbitrage scan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
