import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    // Tier check: pro+
    const { data: profile } = await supabase.from("profiles").select("subscription_tier").eq("user_id", user.id).single();
    const tierLevel: Record<string, number> = { free: 0, pro: 1, business: 2, scale: 3 };
    if ((tierLevel[profile?.subscription_tier || "free"] ?? 0) < 1) {
      return new Response(JSON.stringify({ error: "This feature requires a Pro plan. Upgrade to continue." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all active listings
    const { data: listings, error: listErr } = await supabase
      .from("listings")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (listErr) throw listErr;
    if (!listings?.length) {
      return new Response(JSON.stringify({ recommendations: [], summary: { total: 0 } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build listing summaries for AI
    const listingSummary = listings.map(l => ({
      id: l.id,
      title: l.title,
      brand: l.brand,
      category: l.category,
      condition: l.condition,
      current_price: l.current_price,
      purchase_price: l.purchase_price,
      days_listed: l.days_listed || Math.floor((Date.now() - new Date(l.created_at).getTime()) / 86400000),
      views: l.views_count || 0,
      favourites: l.favourites_count || 0,
      health_score: l.health_score,
    }));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `You are a Vinted portfolio pricing expert. Analyse a seller's entire active inventory and classify each listing.

Classification rules:
- OVERPRICED: Listed significantly above likely market value based on brand, category, condition, and age. Low views/favourites relative to days listed suggest overpricing.
- UNDERPRICED: Listed below market value. High favourites but not selling could indicate suspiciously low pricing. Items from premium brands listed too cheaply.
- STALE: Listed 30+ days with minimal engagement. Price may be fine but listing needs refreshing (relist, new photos, better description).
- WELL_PRICED: Price appears competitive and listing is performing normally.

For each item provide:
- A suggested new price (null if well-priced)
- A confidence score (0-100)
- A brief reason explaining the recommendation
- An action: "reduce_price", "increase_price", "relist", "bundle", "keep"

IMPORTANT: If you cannot determine a confident market price for an item, set suggested_price to null rather than guessing. Do NOT invent prices without market evidence.`,
          },
          {
            role: "user",
            content: `Analyse this seller's portfolio and return recommendations:\n\n${JSON.stringify(listingSummary)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "portfolio_analysis",
              description: "Return portfolio analysis with per-listing recommendations",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "object",
                    properties: {
                      total_items: { type: "number" },
                      overpriced_count: { type: "number" },
                      underpriced_count: { type: "number" },
                      stale_count: { type: "number" },
                      well_priced_count: { type: "number" },
                      estimated_revenue_gain: { type: "number", description: "Estimated additional revenue from applying all recommendations in GBP" },
                      portfolio_health_score: { type: "number", description: "Overall portfolio health 0-100" },
                    },
                    required: ["total_items", "overpriced_count", "underpriced_count", "stale_count", "well_priced_count", "estimated_revenue_gain", "portfolio_health_score"],
                    additionalProperties: false,
                  },
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        listing_id: { type: "string" },
                        classification: { type: "string", enum: ["OVERPRICED", "UNDERPRICED", "STALE", "WELL_PRICED"] },
                        suggested_price: { type: "number", description: "Suggested new price, null if no change" },
                        confidence: { type: "number", description: "0-100" },
                        reason: { type: "string" },
                        action: { type: "string", enum: ["reduce_price", "increase_price", "relist", "bundle", "keep"] },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                      },
                      required: ["listing_id", "classification", "confidence", "reason", "action", "priority"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["summary", "recommendations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "portfolio_analysis" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI analysis failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No AI response");

    const result = JSON.parse(toolCall.function.arguments);

    // Enrich recommendations with listing data
    const listingsMap: Record<string, any> = {};
    listings.forEach(l => { listingsMap[l.id] = l; });

    // Post-AI validation: reject obviously wrong suggested_price values
    for (const r of result.recommendations) {
      const listing = listingsMap[r.listing_id];
      if (r.suggested_price != null && listing?.current_price) {
        const ratio = r.suggested_price / listing.current_price;
        if (ratio > 3 || ratio < 0.2 || r.suggested_price <= 0) {
          console.log(`Rejecting suggested_price £${r.suggested_price} for "${listing.title}" (current £${listing.current_price})`);
          r.suggested_price = null;
          r.confidence = Math.min(r.confidence, 30);
        }
      }
    }

    const enriched = result.recommendations.map((r: any) => ({
      ...r,
      listing: listingsMap[r.listing_id] ? {
        title: listingsMap[r.listing_id].title,
        brand: listingsMap[r.listing_id].brand,
        category: listingsMap[r.listing_id].category,
        current_price: listingsMap[r.listing_id].current_price,
        purchase_price: listingsMap[r.listing_id].purchase_price,
        days_listed: listingsMap[r.listing_id].days_listed || Math.floor((Date.now() - new Date(listingsMap[r.listing_id].created_at).getTime()) / 86400000),
        views_count: listingsMap[r.listing_id].views_count,
        favourites_count: listingsMap[r.listing_id].favourites_count,
      } : null,
    }));

    return new Response(JSON.stringify({ summary: result.summary, recommendations: enriched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("portfolio-optimizer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
