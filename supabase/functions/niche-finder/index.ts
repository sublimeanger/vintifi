import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("authorization");
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

    // Tier check: pro+
    const serviceClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await serviceClient.from("profiles").select("subscription_tier").eq("user_id", user.id).single();
    const tierLevel: Record<string, number> = { free: 0, pro: 1, business: 2, scale: 3 };
    if ((tierLevel[profile?.subscription_tier || "free"] ?? 0) < 1) {
      return new Response(JSON.stringify({ error: "This feature requires a Pro plan. Upgrade to continue." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { categories, price_range, limit = 12 } = await req.json();

    if (!categories || categories.length === 0) {
      return new Response(
        JSON.stringify({ error: "Select at least one category" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const priceFilter = price_range ? ` ${price_range}` : "";

    // Two parallel searches per category: supply (active) and demand (sold/popular)
    const searchPromises = categories.flatMap((cat: string) => {
      const q = CATEGORY_QUERIES[cat] || cat.toLowerCase();
      return [
        fetchFirecrawl(FIRECRAWL_API_KEY, `site:vinted.co.uk ${q}${priceFilter}`, 8, `${cat}-supply`),
        fetchFirecrawl(FIRECRAWL_API_KEY, `site:vinted.co.uk ${q} popular OR sold${priceFilter}`, 8, `${cat}-demand`),
      ];
    });

    const searchResults = await Promise.all(searchPromises);

    // Build context for AI
    const contextLines = searchResults.map((r) => {
      const items = r.results.slice(0, 6).map((item: any) => {
        const title = item.title || "";
        const desc = item.description || item.markdown?.slice(0, 200) || "";
        return `  - ${title} | ${desc}`;
      }).join("\n");
      return `## ${r.label}\n${items || "  No results found"}`;
    }).join("\n\n");

    const prompt = `You are a Vinted market analyst. Analyse the following scraped data from Vinted to identify underserved niches where buyer demand significantly outstrips seller supply.

CATEGORIES ANALYSED: ${categories.join(", ")}
PRICE RANGE FILTER: ${price_range || "All prices"}

${contextLines}

For each category, identify specific sub-niches (e.g. "Y2K mini skirts" not just "Womenswear") where demand signals (sold items, favourites, search interest) are high but active listing supply is low.

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
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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

    return new Response(
      JSON.stringify({
        niches,
        categories_searched: categories,
        total_found: niches.length,
      }),
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

async function fetchFirecrawl(apiKey: string, query: string, limit: number, label: string) {
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, limit, scrapeOptions: { formats: ["markdown"] } }),
    });
    if (!res.ok) {
      console.error(`${label} search failed:`, res.status);
      return { label, results: [] };
    }
    const data = await res.json();
    return { label, results: data.data || data.results || [] };
  } catch (e) {
    console.error(`${label} error:`, e);
    return { label, results: [] };
  }
}
