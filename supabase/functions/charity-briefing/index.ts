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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get user categories from auth token
    const authHeader = req.headers.get("authorization") || "";
    let userCategories: string[] = [];
    let userTimezone = "Europe/London";
    let userTier = "free";
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("selling_categories, timezone, subscription_tier")
            .eq("user_id", user.id)
            .single();
          userCategories = profile?.selling_categories || [];
          userTimezone = profile?.timezone || "Europe/London";
          userTier = profile?.subscription_tier || "free";
        }
      } catch { /* continue without personalisation */ }
    }

    // Tier check: pro+
    const tierLevel: Record<string, number> = { free: 0, pro: 1, business: 2, scale: 3 };
    if ((tierLevel[userTier] ?? 0) < 1) {
      return new Response(JSON.stringify({ error: "This feature requires a Pro plan. Upgrade to continue." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get latest trends for context
    const { data: trends } = await supabase
      .from("trends")
      .select("brand_or_item, category, trend_direction, search_volume_change_7d, avg_price, opportunity_score")
      .in("trend_direction", ["rising", "peaking"])
      .order("opportunity_score", { ascending: false })
      .limit(20);

    // Fetch real Vinted prices for top trending items via Apify
    const APIFY_API_TOKEN = Deno.env.get("APIFY_API_TOKEN");
    const topTrends = (trends || []).slice(0, 10);
    const vintedPriceRanges: Record<string, { low: number; high: number; median: number }> = {};

    if (APIFY_API_TOKEN && topTrends.length > 0) {
      const APIFY_BASE = "https://api.apify.com/v2";
      const APIFY_ACTOR = "kazkn~vinted-smart-scraper";
      
      const pricePromises = topTrends.map(async (t) => {
        try {
          const url = `${APIFY_BASE}/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`;
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ search: t.brand_or_item, maxItems: 10, country: "uk" }),
          });
          if (!res.ok) return;
          const items = await res.json();
          if (!Array.isArray(items) || items.length === 0) return;
          const prices = items.map((i: any) => parseFloat(i.price || i.total_price || 0)).filter((p: number) => p > 0);
          if (prices.length === 0) return;
          prices.sort((a: number, b: number) => a - b);
          vintedPriceRanges[t.brand_or_item] = {
            low: prices[0],
            high: prices[prices.length - 1],
            median: prices[Math.floor(prices.length / 2)],
          };
        } catch (e) {
          console.error(`Apify price fetch for ${t.brand_or_item} failed:`, e);
        }
      });
      await Promise.all(pricePromises);
      console.log(`Fetched real Vinted prices for ${Object.keys(vintedPriceRanges).length}/${topTrends.length} trending items`);
    }

    const trendContext = (trends || []).map(t => {
      const priceRange = vintedPriceRanges[t.brand_or_item];
      const priceInfo = priceRange
        ? `REAL Vinted prices: £${priceRange.low}-£${priceRange.high} (median £${priceRange.median})`
        : `avg price from trends DB: £${t.avg_price} (no live validation)`;
      return `${t.brand_or_item} (${t.category}) — direction: ${t.trend_direction}, 7d search change: ${t.search_volume_change_7d}%, ${priceInfo}, score: ${t.opportunity_score}/100`;
    }).join("\n");

    const categoriesHint = userCategories.length > 0
      ? `The seller primarily sells: ${userCategories.join(", ")}. Prioritise items in these categories but also include cross-category opportunities.`
      : "The seller has no category preference set, so provide a broad mix.";

    const systemPrompt = `You are a Vinted reselling expert. Generate a "Charity Shop Briefing" — a concise, mobile-friendly sourcing guide for a reseller about to visit charity shops or car boot sales.

The seller's local timezone is ${userTimezone}. Consider local market context and timing for any time-sensitive advice.

Use the current trend data below to make recommendations grounded in real demand.

CURRENT TRENDING DATA:
${trendContext || "No trend data available — use general reselling knowledge."}

${categoriesHint}

Return a valid JSON object (no markdown) with this structure:
{
  "generated_at": "ISO timestamp",
  "summary": "One-sentence overview of today's top opportunity",
  "items": [
    {
      "brand": "Brand name",
      "item_type": "e.g. Oversized jacket, Cargo trousers",
      "category": "Womenswear / Menswear / Shoes / etc",
      "max_buy_price": 8.00,
      "estimated_sell_price": 35.00,
      "demand_signal": "rising" | "peaking" | "stable",
      "tip": "One-line sourcing tip, e.g. 'Check the men's coat rack — often misfiled under women's'"
    }
  ],
  "general_tips": ["Tip 1", "Tip 2", "Tip 3"]
}

Rules:
- Return 8-12 items, ranked by profit potential
- max_buy_price should be realistic for charity shop pricing (£1-£15)
- CRITICAL: estimated_sell_price MUST be within the REAL Vinted price range provided above. Do NOT invent sell prices. If no real price data is available for an item, use the trend DB avg_price as a ceiling.
- Tips should be practical and actionable
- Include a mix of safe bets and high-upside picks`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate today's charity shop sourcing briefing." },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited — try again shortly" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const raw = aiData.choices?.[0]?.message?.content || "{}";

    // Strip markdown fences if present
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const briefing = JSON.parse(cleaned);

    // Post-AI validation: correct estimated_sell_price against real Vinted data
    if (briefing.items && Array.isArray(briefing.items)) {
      for (const item of briefing.items) {
        const brandKey = Object.keys(vintedPriceRanges).find(k => 
          item.brand?.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(item.brand?.toLowerCase() || "")
        );
        if (brandKey && vintedPriceRanges[brandKey]) {
          const range = vintedPriceRanges[brandKey];
          if (item.estimated_sell_price > range.high * 1.3) {
            console.log(`Correcting ${item.brand}: AI said £${item.estimated_sell_price}, Vinted high £${range.high}`);
            item.estimated_sell_price = Math.round(range.median * 100) / 100;
          } else if (item.estimated_sell_price < range.low * 0.7) {
            item.estimated_sell_price = Math.round(range.median * 100) / 100;
          }
        }
      }
    }

    return new Response(JSON.stringify(briefing), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Charity briefing error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
