import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    const { category } = await req.json().catch(() => ({ category: "all" }));

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if we have recent trends (less than 6 hours old)
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { data: existingTrends } = await serviceClient
      .from("trends")
      .select("id, data_source")
      .gte("updated_at", sixHoursAgo)
      .limit(1);

    if (existingTrends && existingTrends.length > 0) {
      // Return existing trends
      let query = serviceClient
        .from("trends")
        .select("*")
        .order("opportunity_score", { ascending: false });

      if (category && category !== "all") {
        query = query.eq("category", category);
      }

      const { data: trends } = await query.limit(20);
      const dataSource = existingTrends[0]?.data_source || "ai_generated";
      return new Response(JSON.stringify({ trends, cached: true, data_source: dataSource }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate fresh trends using AI (fallback when no Lobstr data)
    const categories = [
      "Womenswear", "Menswear", "Streetwear", "Vintage",
      "Designer", "Shoes", "Accessories", "Kids",
    ];

    const prompt = `You are a Vinted marketplace analyst. Generate 16 realistic trending items/brands on Vinted right now (February 2026). For each trend, provide data in JSON format.

Consider seasonal factors (late winter/early spring transition), current fashion trends, and resale market dynamics.

Return a JSON array where each item has:
- brand_or_item: specific brand or item name (e.g. "Carhartt WIP Jackets", "Vintage Levi's 501")
- category: one of [${categories.join(", ")}]
- trend_direction: "rising", "peaking", or "declining"
- search_volume_change_7d: percentage change (-50 to +500)
- search_volume_change_30d: percentage change (-30 to +800)
- avg_price: average price in GBP (5-500)
- price_change_30d: percentage price change (-20 to +40)
- supply_demand_ratio: ratio of listings to searches (0.1 to 3.0, lower = more demand)
- opportunity_score: 0-100 (higher = better opportunity)
- ai_summary: 1-2 sentence plain English explanation of the trend and what sellers should do
- estimated_peak_date: ISO date string when trend will peak (within next 3 months)

Mix of rising (10), peaking (4), and declining (2) trends. Make it realistic with specific brands popular on Vinted.

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
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let trends: any[];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array found");
      trends = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse trend data");
    }

    // Clear old trends and insert new ones
    await serviceClient.from("trends").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const rows = trends.map((t: any) => ({
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
      estimated_peak_date: t.estimated_peak_date,
      data_source: "ai_generated",
    }));

    const { error: insertError } = await serviceClient.from("trends").insert(rows);
    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to store trends");
    }

    // Fetch and return
    let query = serviceClient
      .from("trends")
      .select("*")
      .order("opportunity_score", { ascending: false });

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    const { data: freshTrends } = await query.limit(20);

    return new Response(JSON.stringify({ trends: freshTrends, cached: false, data_source: "ai_generated" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Trends error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
