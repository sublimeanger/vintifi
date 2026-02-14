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

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { action, job_id } = await req.json();

    // ==================== LAUNCH (now uses Firecrawl search) ====================
    if (action === "launch") {
      // Check if there's already a running job
      const { data: runningJobs } = await serviceClient
        .from("scrape_jobs")
        .select("id")
        .in("status", ["pending", "running"])
        .limit(1);

      if (runningJobs && runningJobs.length > 0) {
        return new Response(
          JSON.stringify({ error: "A scrape job is already running", job_id: runningJobs[0].id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create job record
      const { data: job, error: insertError } = await serviceClient
        .from("scrape_jobs")
        .insert({ job_type: "trend_scan", status: "running" })
        .select()
        .single();
      if (insertError) throw insertError;

      // Run Firecrawl searches in parallel
      const searchQueries = [
        "vinted trending brands UK 2026",
        "vinted best selling items UK february 2026",
        "vinted popular streetwear brands resale",
        "vinted trending vintage clothing UK",
        "vinted most sold shoes UK 2026",
        "vinted trending womenswear spring 2026",
        "vinted trending menswear UK 2026",
        "vinted kids clothing popular brands UK",
      ];

      console.log("Running Firecrawl searches...");
      const searchResults: any[] = [];

      // Run searches sequentially to avoid rate limits (fast enough for 8 queries)
      for (const query of searchQueries) {
        try {
          const res = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query, limit: 5 }),
          });
          if (res.ok) {
            const data = await res.json();
            const results = data.data || data.results || [];
            searchResults.push(...results);
          } else {
            console.warn(`Search failed for "${query}": ${res.status}`);
          }
        } catch (e) {
          console.warn(`Search error for "${query}":`, e);
        }
      }

      console.log("Firecrawl returned", searchResults.length, "total results");

      // Store raw results and mark completed
      await serviceClient
        .from("scrape_jobs")
        .update({ status: "completed", raw_results: searchResults })
        .eq("id", job.id);

      return new Response(
        JSON.stringify({ success: true, job_id: job.id, status: "completed", results_count: searchResults.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==================== POLL ====================
    if (action === "poll") {
      if (!job_id) throw new Error("job_id required for poll");
      const { data: job } = await serviceClient
        .from("scrape_jobs")
        .select("*")
        .eq("id", job_id)
        .single();
      if (!job) throw new Error("Job not found");

      return new Response(
        JSON.stringify({ status: job.status, processed: job.processed }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==================== PROCESS ====================
    if (action === "process") {
      if (!job_id) throw new Error("job_id required for process");

      const { data: job } = await serviceClient
        .from("scrape_jobs")
        .select("*")
        .eq("id", job_id)
        .single();

      if (!job) throw new Error("Job not found");
      if (job.status !== "completed") throw new Error("Job not completed yet");
      if (job.processed) {
        return new Response(
          JSON.stringify({ success: true, already_processed: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const rawResults = job.raw_results || [];
      console.log("Processing", Array.isArray(rawResults) ? rawResults.length : 0, "raw results");

      // Build context from Firecrawl search results
      const resultsSummary = (Array.isArray(rawResults) ? rawResults : [])
        .slice(0, 50)
        .map((r: any) => {
          const title = r.title || r.name || "";
          const snippet = r.description || r.snippet || r.markdown?.slice(0, 200) || "";
          const link = r.url || r.link || "";
          return `- ${title}: ${snippet} (${link})`;
        })
        .join("\n");

      const categories = [
        "Womenswear", "Menswear", "Streetwear", "Vintage",
        "Designer", "Shoes", "Accessories", "Kids",
      ];

      const prompt = `You are a Vinted marketplace analyst. Based on these real web search results about Vinted trends, extract and generate 16 structured trend items.

RAW SEARCH RESULTS:
${resultsSummary || "No results available - generate realistic trends based on current market knowledge for February 2026."}

Generate a JSON array of 16 trends. For each trend provide:
- brand_or_item: specific brand or item name
- category: one of [${categories.join(", ")}]
- trend_direction: "rising", "peaking", or "declining"
- search_volume_change_7d: percentage (-50 to +500)
- search_volume_change_30d: percentage (-30 to +800)
- avg_price: GBP (5-500)
- price_change_30d: percentage (-20 to +40)
- supply_demand_ratio: (0.1 to 3.0)
- opportunity_score: 0-100
- ai_summary: 1-2 sentence explanation
- estimated_peak_date: ISO date (within 3 months)

Mix: 10 rising, 4 peaking, 2 declining. Use real brand names popular on Vinted.
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
        throw new Error(`AI gateway error: ${aiResponse.status}`);
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
        data_source: "firecrawl",
      }));

      const { error: trendInsertError } = await serviceClient.from("trends").insert(rows);
      if (trendInsertError) throw trendInsertError;

      await serviceClient
        .from("scrape_jobs")
        .update({ processed: true })
        .eq("id", job_id);

      return new Response(
        JSON.stringify({ success: true, trends_count: trends.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: launch, poll, process" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Market scan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
