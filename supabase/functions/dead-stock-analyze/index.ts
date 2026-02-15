import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get user
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: supabaseKey },
    });
    const userData = await userRes.json();
    const userId = userData.id;
    if (!userId) throw new Error("Invalid user");

    // Tier check: pro+
    const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}&select=subscription_tier`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    });
    const profiles = await profileRes.json();
    const tierLevel: Record<string, number> = { free: 0, pro: 1, business: 2, scale: 3 };
    if ((tierLevel[profiles?.[0]?.subscription_tier || "free"] ?? 0) < 1) {
      return new Response(JSON.stringify({ error: "This feature requires a Pro plan. Upgrade to continue." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch active listings older than threshold
    const { threshold_days = 30 } = await req.json().catch(() => ({}));

    const listingsRes = await fetch(
      `${supabaseUrl}/rest/v1/listings?user_id=eq.${userId}&status=eq.active&select=*&order=created_at.asc`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    const allListings = await listingsRes.json();

    // Filter dead stock (listed >= threshold days)
    const now = Date.now();
    const deadStock = allListings.filter((l: any) => {
      const daysListed = Math.floor((now - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return daysListed >= threshold_days;
    });

    if (deadStock.length === 0) {
      return new Response(JSON.stringify({ dead_stock: [], recommendations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build AI prompt
    const listingSummary = deadStock.map((l: any, i: number) => {
      const days = Math.floor((now - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return `${i + 1}. "${l.title}" - Brand: ${l.brand || "Unknown"}, Category: ${l.category || "Unknown"}, Price: £${l.current_price || "N/A"}, Purchase: £${l.purchase_price || "N/A"}, Days Listed: ${days}, Views: ${l.views_count || 0}, Favourites: ${l.favourites_count || 0}, Health: ${l.health_score || "N/A"}/100`;
    }).join("\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a Vinted selling expert specializing in inventory liquidation. Always respond with valid JSON only, no markdown.",
          },
          {
            role: "user",
            content: `Analyse these stale Vinted listings and provide liquidation recommendations.

Listings:
${listingSummary}

Return JSON with this structure:
{
  "recommendations": [
    {
      "listing_index": <1-based index>,
      "listing_title": "<title>",
      "action": "price_reduction" | "bundle" | "crosslist" | "relist" | "donate",
      "priority": "high" | "medium" | "low",
      "suggested_price": <number or null>,
      "price_reduction_schedule": [
        {"week": 1, "price": <number>, "reason": "<why>"},
        {"week": 2, "price": <number>, "reason": "<why>"}
      ] or null,
      "bundle_with_indices": [<indices of other listings to bundle>] or null,
      "bundle_discount_percent": <number> or null,
      "crosslist_platforms": ["eBay", "Depop", "Facebook Marketplace"] or null,
      "reasoning": "<1-2 sentences explaining why this action>",
      "estimated_days_to_sell": <number>,
      "opportunity_cost_note": "<what holding this item costs>"
    }
  ],
  "summary": {
    "total_dead_stock_value": <number>,
    "estimated_recovery_value": <number>,
    "top_action": "<most impactful single action to take>",
    "overview": "<2-3 sentence overview of the dead stock situation>"
  }
}`,
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      if (aiRes.status === 429) throw new Error("AI rate limit reached. Try again in a moment.");
      if (aiRes.status === 402) throw new Error("AI credits exhausted.");
      throw new Error("AI analysis failed");
    }

    const aiData = await aiRes.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let result;
    try {
      result = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("AI returned invalid response");
    }

    // Attach listing IDs to recommendations
    const enrichedRecs = (result.recommendations || []).map((r: any) => ({
      ...r,
      listing_id: deadStock[r.listing_index - 1]?.id || null,
      current_price: deadStock[r.listing_index - 1]?.current_price || null,
      purchase_price: deadStock[r.listing_index - 1]?.purchase_price || null,
      days_listed: Math.floor((now - new Date(deadStock[r.listing_index - 1]?.created_at).getTime()) / (1000 * 60 * 60 * 24)),
    }));

    return new Response(
      JSON.stringify({
        dead_stock: deadStock,
        recommendations: enrichedRecs,
        summary: result.summary || {},
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("dead-stock-analyze error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
