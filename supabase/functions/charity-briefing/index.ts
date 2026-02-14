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
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("selling_categories, timezone")
            .eq("user_id", user.id)
            .single();
          userCategories = profile?.selling_categories || [];
          userTimezone = profile?.timezone || "Europe/London";
        }
      } catch { /* continue without personalisation */ }
    }

    // Get latest trends for context
    const { data: trends } = await supabase
      .from("trends")
      .select("brand_or_item, category, trend_direction, search_volume_change_7d, avg_price, opportunity_score")
      .in("trend_direction", ["rising", "peaking"])
      .order("opportunity_score", { ascending: false })
      .limit(20);

    const trendContext = (trends || []).map(t =>
      `${t.brand_or_item} (${t.category}) — direction: ${t.trend_direction}, 7d search change: ${t.search_volume_change_7d}%, avg price: £${t.avg_price}, score: ${t.opportunity_score}/100`
    ).join("\n");

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
- estimated_sell_price based on current Vinted market data
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
