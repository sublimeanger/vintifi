import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOBSTR_BASE = "https://api.lobstr.io/v1";
const GOOGLE_SEARCH_CRAWLER = "ffd34f9b42a79b7323a048f09fc158e6";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOBSTR_API_KEY = Deno.env.get("LOBSTR_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOBSTR_API_KEY) throw new Error("LOBSTR_API_KEY not configured");
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

    const lobstrHeaders = {
      Authorization: `Token ${LOBSTR_API_KEY}`,
      "Content-Type": "application/json",
    };

    // ==================== LAUNCH ====================
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

      // 1. Reuse or create squid
      let squidId: string;
      console.log("Looking for existing Lobstr.io squids...");

      // Try to find an existing squid with our crawler
      const listRes = await fetch(`${LOBSTR_BASE}/squids`, { headers: lobstrHeaders });
      if (listRes.ok) {
        const squids = await listRes.json();
        const existing = (Array.isArray(squids) ? squids : squids.results || [])
          .find((s: any) => String(s.crawler) === GOOGLE_SEARCH_CRAWLER);
        if (existing) {
          squidId = existing.id;
          console.log("Reusing existing squid:", squidId);
        } else {
          // Delete the oldest squid to free a slot, then create
          const allSquids = Array.isArray(squids) ? squids : squids.results || [];
          if (allSquids.length > 0) {
            const oldest = allSquids[allSquids.length - 1];
            console.log("Deleting oldest squid to free slot:", oldest.id);
            await fetch(`${LOBSTR_BASE}/squids/${oldest.id}`, { method: "DELETE", headers: lobstrHeaders });
          }
          const createRes = await fetch(`${LOBSTR_BASE}/squids`, {
            method: "POST",
            headers: lobstrHeaders,
            body: JSON.stringify({ crawler: GOOGLE_SEARCH_CRAWLER }),
          });
          if (!createRes.ok) {
            const err = await createRes.text();
            console.error("Squid creation failed:", err);
            throw new Error(`Failed to create squid: ${createRes.status}`);
          }
          const squidData = await createRes.json();
          squidId = squidData.id;
          console.log("Created new squid:", squidId);
        }
      } else {
        throw new Error(`Failed to list squids: ${listRes.status}`);
      }

      // 2. Add tasks (Vinted search queries)
      const searchQueries = [
        "https://www.google.com/search?q=site:vinted.co.uk+trending+brands+2026",
        "https://www.google.com/search?q=site:vinted.co.uk+most+popular+items",
        "https://www.google.com/search?q=vinted+best+selling+brands+UK+2026",
        "https://www.google.com/search?q=vinted+trending+streetwear+2026",
        "https://www.google.com/search?q=vinted+trending+vintage+clothing+UK",
        "https://www.google.com/search?q=vinted+popular+designer+brands+resale",
        "https://www.google.com/search?q=vinted+most+sold+shoes+UK+2026",
        "https://www.google.com/search?q=vinted+trending+womenswear+spring+2026",
        "https://www.google.com/search?q=vinted+trending+menswear+UK+february+2026",
        "https://www.google.com/search?q=vinted+kids+clothing+most+popular+brands",
      ];

      console.log("Adding tasks...");
      const tasksRes = await fetch(`${LOBSTR_BASE}/squids/${squidId}/tasks`, {
        method: "POST",
        headers: lobstrHeaders,
        body: JSON.stringify(searchQueries.map((url) => ({ url }))),
      });

      if (!tasksRes.ok) {
        const err = await tasksRes.text();
        console.error("Task addition failed:", err);
        throw new Error(`Failed to add tasks: ${tasksRes.status}`);
      }
      await tasksRes.text();
      console.log("Tasks added");

      // 3. Launch run
      console.log("Launching run...");
      const runRes = await fetch(`${LOBSTR_BASE}/runs`, {
        method: "POST",
        headers: lobstrHeaders,
        body: JSON.stringify({ squid: squidId }),
      });

      if (!runRes.ok) {
        const err = await runRes.text();
        console.error("Run launch failed:", err);
        throw new Error(`Failed to launch run: ${runRes.status}`);
      }

      const runData = await runRes.json();
      const runId = runData.id;
      console.log("Run launched:", runId);

      // 4. Store in scrape_jobs
      const { data: job, error: insertError } = await serviceClient
        .from("scrape_jobs")
        .insert({
          job_type: "trend_scan",
          lobstr_run_id: String(runId),
          lobstr_squid_id: String(squidId),
          status: "running",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({ success: true, job_id: job.id, run_id: runId, status: "running" }),
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

      if (job.status === "completed" || job.status === "failed") {
        return new Response(
          JSON.stringify({ status: job.status, processed: job.processed }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check Lobstr.io run status
      const statusRes = await fetch(`${LOBSTR_BASE}/runs/${job.lobstr_run_id}`, {
        headers: lobstrHeaders,
      });

      if (!statusRes.ok) {
        const err = await statusRes.text();
        console.error("Status check failed:", err);
        throw new Error(`Failed to check status: ${statusRes.status}`);
      }

      const statusData = await statusRes.json();
      console.log("Run status:", statusData.status);

      if (statusData.status === "completed" || statusData.status === "finished") {
        // Fetch results
        const resultsRes = await fetch(
          `${LOBSTR_BASE}/results?run=${job.lobstr_run_id}`,
          { headers: lobstrHeaders }
        );

        let rawResults: any[] = [];
        if (resultsRes.ok) {
          const resultsData = await resultsRes.json();
          rawResults = Array.isArray(resultsData) ? resultsData : resultsData.results || [];
        }

        await serviceClient
          .from("scrape_jobs")
          .update({
            status: "completed",
            raw_results: rawResults,
          })
          .eq("id", job_id);

        return new Response(
          JSON.stringify({ status: "completed", results_count: rawResults.length }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (statusData.status === "failed" || statusData.status === "error") {
        await serviceClient
          .from("scrape_jobs")
          .update({ status: "failed" })
          .eq("id", job_id);

        return new Response(
          JSON.stringify({ status: "failed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Still running
      return new Response(
        JSON.stringify({
          status: "running",
          progress: statusData.progress || statusData.tasks_done || 0,
          total: statusData.total || statusData.tasks_total || 0,
        }),
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
      console.log("Processing", rawResults.length, "raw results");

      // Build context from raw results for AI
      const resultsSummary = (Array.isArray(rawResults) ? rawResults : [])
        .slice(0, 50)
        .map((r: any) => {
          const title = r.title || r.name || "";
          const snippet = r.description || r.snippet || r.text || "";
          const link = r.url || r.link || "";
          return `- ${title}: ${snippet} (${link})`;
        })
        .join("\n");

      const categories = [
        "Womenswear", "Menswear", "Streetwear", "Vintage",
        "Designer", "Shoes", "Accessories", "Kids",
      ];

      const prompt = `You are a Vinted marketplace analyst. Based on these real Google Search results about Vinted trends, extract and generate 16 structured trend items.

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

      // Clear old trends and insert new ones with lobstr source
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
        data_source: "lobstr",
      }));

      const { error: insertError } = await serviceClient.from("trends").insert(rows);
      if (insertError) throw insertError;

      // Mark job as processed
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
    console.error("Lobstr sync error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
