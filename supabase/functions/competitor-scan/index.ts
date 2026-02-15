import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Auth
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

    // Tier check: pro+
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: profile } = await serviceClient.from("profiles").select("subscription_tier").eq("user_id", user.id).single();
    const tierLevel: Record<string, number> = { free: 0, pro: 1, business: 2, scale: 3 };
    const userTierLevel = tierLevel[profile?.subscription_tier || "free"] ?? 0;
    if (userTierLevel < 1) {
      return new Response(JSON.stringify({ error: "This feature requires a Pro plan. Upgrade to continue." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Competitor count limit check
    const competitorLimits: Record<string, number> = { free: 0, pro: 3, business: 15, scale: 50 };
    const maxCompetitors = competitorLimits[profile?.subscription_tier || "free"] ?? 0;
    const { count } = await serviceClient.from("competitor_profiles").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    if ((count || 0) > maxCompetitors) {
      return new Response(JSON.stringify({ error: `You've reached your competitor limit (${maxCompetitors}). Upgrade for more.` }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { competitor_id, competitor_name, vinted_username, search_query, category } = await req.json();

    const searchTerm = vinted_username
      ? `site:vinted.co.uk ${vinted_username}`
      : `site:vinted.co.uk ${search_query || competitor_name} ${category || ""}`.trim();

    console.log("Competitor scan for:", searchTerm);

    // Scrape Vinted for competitor data
    const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchTerm,
        limit: 15,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    if (!searchRes.ok) {
      console.error("Firecrawl search failed:", searchRes.status);
      throw new Error("Failed to search marketplace data");
    }

    const searchData = await searchRes.json();
    const results = searchData.data || searchData.results || [];

    // Build context for AI
    const listingSummary = results
      .slice(0, 12)
      .map((r: any) => {
        const title = r.title || "";
        const desc = r.description || r.markdown?.slice(0, 200) || "";
        const url = r.url || "";
        return `- ${title} | ${desc} | ${url}`;
      })
      .join("\n");

    // Get previous scan data for comparison
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let previousData: any = null;
    if (competitor_id) {
      const { data: prev } = await serviceClient
        .from("competitor_profiles")
        .select("avg_price, listing_count, last_scanned_at")
        .eq("id", competitor_id)
        .single();
      previousData = prev;
    }

    const prompt = `You are a competitive intelligence analyst for Vinted resellers. Analyse these search results for the competitor/niche "${competitor_name || search_query}".

SEARCH RESULTS:
${listingSummary || "No results found"}

${previousData ? `PREVIOUS SCAN DATA:
- Previous avg price: £${previousData.avg_price || "unknown"}
- Previous listing count: ${previousData.listing_count || "unknown"}
- Last scanned: ${previousData.last_scanned_at || "never"}` : "This is the first scan for this competitor."}

Analyse and return a JSON object with:
{
  "avg_price": <average listing price in GBP as number>,
  "listing_count": <estimated number of active listings>,
  "price_trend": "rising" | "falling" | "stable",
  "alerts": [
    {
      "alert_type": "price_drop" | "new_listings" | "new_seller" | "price_increase" | "trend_change",
      "title": "<short alert title>",
      "description": "<1-2 sentence explanation>",
      "old_value": <previous value if applicable, null otherwise>,
      "new_value": <current value if applicable, null otherwise>
    }
  ],
  "summary": "<2-3 sentence competitive intelligence summary>",
  "top_items": [
    {
      "title": "<item title>",
      "price": <price in GBP>,
      "url": "<vinted URL if available>"
    }
  ]
}

Generate 1-4 relevant alerts based on:
- Price changes vs previous scan (if available)
- New listings appearing in the niche
- Unusual pricing patterns
- Market saturation signals

If this is the first scan, generate "baseline" alerts about the current state of the market.
Return ONLY the JSON object, no other text.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

    if (!aiRes.ok) {
      if (aiRes.status === 429) throw new Error("Rate limited, try again later.");
      if (aiRes.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`AI error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse competitor analysis");
    }

    // Update competitor profile
    if (competitor_id) {
      await serviceClient.from("competitor_profiles").update({
        avg_price: analysis.avg_price,
        listing_count: analysis.listing_count,
        price_trend: analysis.price_trend,
        last_scanned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", competitor_id);
    }

    // Store alerts
    if (analysis.alerts?.length > 0 && competitor_id) {
      const alertRows = analysis.alerts.map((a: any) => ({
        user_id: user.id,
        competitor_id,
        alert_type: a.alert_type || "price_drop",
        title: a.title,
        description: a.description,
        old_value: a.old_value,
        new_value: a.new_value,
      }));
      await serviceClient.from("competitor_alerts").insert(alertRows);
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("competitor-scan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
