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

    // Get user from token
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    const { action, listingIds } = await req.json();

    if (action === "generate") {
      // Fetch user's active listings
      let query = supabase
        .from("listings")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: true });

      if (listingIds?.length) {
        query = query.in("id", listingIds);
      }

      const { data: listings, error: listErr } = await query;
      if (listErr) throw listErr;
      if (!listings?.length) {
        return new Response(JSON.stringify({ schedules: [], message: "No active listings found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get user timezone
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("timezone")
        .eq("user_id", user.id)
        .single();
      const userTimezone = userProfile?.timezone || "Europe/London";

      // Build AI prompt
      const listingSummary = listings.map(l => ({
        id: l.id,
        title: l.title,
        brand: l.brand,
        category: l.category,
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
              content: `You are a Vinted selling expert. Analyse listings and generate optimal relist schedules.

The seller's timezone is ${userTimezone}. All scheduled times MUST be in ${userTimezone}.

Rules for scheduling:
- Womenswear relists perform best on Sunday evenings (18:00-20:00 ${userTimezone})
- Menswear performs best on Tuesday mornings (8:00-10:00 ${userTimezone})
- Shoes/trainers: Thursday evenings (18:00-20:00 ${userTimezone})
- Kids: Saturday mornings (9:00-11:00 ${userTimezone})
- Vintage/designer: Friday evenings (19:00-21:00 ${userTimezone})
- Default/other: Wednesday or Saturday mornings

Price adjustment rules:
- Items listed <14 days: no price change
- Items listed 14-30 days: suggest 5-10% reduction
- Items listed 30-60 days: suggest 10-20% reduction
- Items listed 60+ days: suggest 20-30% reduction or bundle
- Never go below purchase_price if available (protect margin)
- Items with high favourites but no sale: small 3-5% reduction to tip the balance

Return a JSON array of schedule objects.`,
            },
            {
              role: "user",
              content: `Generate relist schedules for these listings. Today is ${new Date().toISOString().split("T")[0]}. Return the next optimal relist date/time for each.\n\n${JSON.stringify(listingSummary)}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "create_relist_schedules",
                description: "Create relist schedules for listings",
                parameters: {
                  type: "object",
                  properties: {
                    schedules: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          listing_id: { type: "string" },
                          scheduled_at: { type: "string", description: "ISO 8601 datetime for optimal relist" },
                          new_price: { type: "number", description: "Suggested new price, null if no change" },
                          price_adjustment_percent: { type: "number", description: "Percentage change (negative = reduction)" },
                          strategy: { type: "string", enum: ["optimal_timing", "price_reduction", "bundle_suggestion", "crosslist"] },
                          ai_reason: { type: "string", description: "Brief explanation of the recommendation" },
                        },
                        required: ["listing_id", "scheduled_at", "strategy", "ai_reason"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["schedules"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "create_relist_schedules" } },
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
        throw new Error("AI analysis failed");
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No AI response");

      const { schedules } = JSON.parse(toolCall.function.arguments);

      // Clear existing pending schedules for these listings
      const existingListingIds = schedules.map((s: any) => s.listing_id);
      await supabase
        .from("relist_schedules")
        .delete()
        .eq("user_id", user.id)
        .eq("status", "pending")
        .in("listing_id", existingListingIds);

      // Insert new schedules
      const rows = schedules.map((s: any) => ({
        user_id: user.id,
        listing_id: s.listing_id,
        scheduled_at: s.scheduled_at,
        new_price: s.new_price || null,
        price_adjustment_percent: s.price_adjustment_percent || null,
        strategy: s.strategy,
        ai_reason: s.ai_reason,
        status: "pending",
      }));

      const { error: insertErr } = await supabase.from("relist_schedules").insert(rows);
      if (insertErr) throw insertErr;

      return new Response(JSON.stringify({ schedules: rows, message: `Generated ${rows.length} relist schedules` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("relist-scheduler error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
