import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOBSTR_BASE = "https://api.lobstr.io/v1";

// Your configured Vinted scraper Squid on Lobstr.io
const DEFAULT_SQUID_IDS = [
  "2a6c83edef674d04a168760fe2f0d607",
];

function lobstrHeaders(apiKey: string) {
  return {
    Authorization: `Token ${apiKey}`,
    "Content-Type": "application/json",
  };
}

// ── Auth helper ──
async function authenticateUser(req: Request) {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("authorization") || "";
  const client = createClient(SUPABASE_URL, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return user;
}

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// ── Firecrawl fallback (existing behaviour) ──
async function firecrawlFallback(serviceClient: any) {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!FIRECRAWL_API_KEY) throw new Error("No fallback available: FIRECRAWL_API_KEY not configured");

  const { data: runningJobs } = await serviceClient
    .from("scrape_jobs")
    .select("id")
    .in("status", ["pending", "running"])
    .limit(1);
  if (runningJobs && runningJobs.length > 0) {
    return { error: "A scrape job is already running", job_id: runningJobs[0].id };
  }

  const { data: job, error: insertError } = await serviceClient
    .from("scrape_jobs")
    .insert({ job_type: "trend_scan", status: "running" })
    .select()
    .single();
  if (insertError) throw insertError;

  const queries = [
    "vinted trending brands UK 2026",
    "vinted best selling items UK february 2026",
    "vinted popular streetwear brands resale",
    "vinted trending vintage clothing UK",
    "vinted most sold shoes UK 2026",
    "vinted trending womenswear spring 2026",
    "vinted trending menswear UK 2026",
    "vinted kids clothing popular brands UK",
  ];

  const searchResults: any[] = [];
  for (const query of queries) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 5 }),
      });
      if (res.ok) {
        const data = await res.json();
        searchResults.push(...(data.data || data.results || []));
      }
    } catch (e) {
      console.warn(`Firecrawl search error for "${query}":`, e);
    }
  }

  await serviceClient
    .from("scrape_jobs")
    .update({ status: "completed", raw_results: searchResults })
    .eq("id", job.id);

  return { success: true, job_id: job.id, status: "completed", results_count: searchResults.length, fallback: true };
}

// ── LAUNCH: Start Lobstr.io scraping runs ──
async function handleLaunch(serviceClient: any, squidIds: string[]) {
  const LOBSTR_API_KEY = Deno.env.get("LOBSTR_API_KEY");
  if (!LOBSTR_API_KEY) {
    console.warn("LOBSTR_API_KEY not configured, falling back to Firecrawl");
    return await firecrawlFallback(serviceClient);
  }

  // Check for running jobs
  const { data: runningJobs } = await serviceClient
    .from("scrape_jobs")
    .select("id")
    .in("status", ["pending", "running"])
    .limit(1);
  if (runningJobs && runningJobs.length > 0) {
    return { error: "A scrape job is already running", job_id: runningJobs[0].id };
  }

  const runEntries: Array<{ squid_id: string; run_id: string; status: string }> = [];
  const errors: string[] = [];

  for (const squidId of squidIds) {
    try {
      const res = await fetch(`${LOBSTR_BASE}/runs`, {
        method: "POST",
        headers: lobstrHeaders(LOBSTR_API_KEY),
        body: JSON.stringify({ squid: squidId }),
      });
      if (!res.ok) {
        const text = await res.text();
        errors.push(`Squid ${squidId}: ${res.status} ${text}`);
        continue;
      }
      const data = await res.json();
      // Lobstr.io returns the run object with an id
      const runId = data.id || data.run_id || data._id;
      if (runId) {
        runEntries.push({ squid_id: squidId, run_id: String(runId), status: "running" });
      }
    } catch (e) {
      errors.push(`Squid ${squidId}: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  }

  // If ALL squids failed, fall back to Firecrawl
  if (runEntries.length === 0) {
    console.warn("All Lobstr.io launches failed, falling back to Firecrawl:", errors);
    return await firecrawlFallback(serviceClient);
  }

  // Create job record with run IDs
  const { data: job, error: insertError } = await serviceClient
    .from("scrape_jobs")
    .insert({
      job_type: "trend_scan",
      status: "running",
      lobstr_run_ids: runEntries,
    })
    .select()
    .single();
  if (insertError) throw insertError;

  return {
    success: true,
    job_id: job.id,
    status: "running",
    runs_launched: runEntries.length,
    runs_failed: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ── POLL: Check status of Lobstr.io runs ──
async function handlePoll(serviceClient: any, jobId: string) {
  const LOBSTR_API_KEY = Deno.env.get("LOBSTR_API_KEY");

  const { data: job } = await serviceClient
    .from("scrape_jobs")
    .select("*")
    .eq("id", jobId)
    .single();
  if (!job) throw new Error("Job not found");

  // If no lobstr_run_ids, it's a Firecrawl fallback job — already completed
  const runIds = job.lobstr_run_ids as Array<{ squid_id: string; run_id: string; status: string }> | null;
  if (!runIds || runIds.length === 0) {
    return { status: job.status, processed: job.processed, completed: 0, total: 0 };
  }

  if (!LOBSTR_API_KEY) {
    return { status: job.status, processed: job.processed, completed: 0, total: runIds.length };
  }

  let completedCount = 0;
  let failedCount = 0;
  const updatedRuns = [...runIds];

  for (let i = 0; i < updatedRuns.length; i++) {
    const entry = updatedRuns[i];
    if (entry.status === "completed" || entry.status === "failed") {
      if (entry.status === "completed") completedCount++;
      if (entry.status === "failed") failedCount++;
      continue;
    }

    try {
      const res = await fetch(`${LOBSTR_BASE}/runs/${entry.run_id}`, {
        headers: lobstrHeaders(LOBSTR_API_KEY),
      });
      if (res.ok) {
        const runData = await res.json();
        const runStatus = runData.status || runData.state || "running";
        if (runStatus === "completed" || runStatus === "finished" || runStatus === "done") {
          updatedRuns[i] = { ...entry, status: "completed" };
          completedCount++;
        } else if (runStatus === "failed" || runStatus === "error") {
          updatedRuns[i] = { ...entry, status: "failed" };
          failedCount++;
        }
        // else still running
      }
    } catch (e) {
      console.warn(`Poll error for run ${entry.run_id}:`, e);
    }
  }

  const allDone = completedCount + failedCount === updatedRuns.length;
  const overallStatus = allDone
    ? (completedCount > 0 ? "completed" : "failed")
    : "running";

  await serviceClient
    .from("scrape_jobs")
    .update({ lobstr_run_ids: updatedRuns, status: overallStatus })
    .eq("id", jobId);

  return {
    status: overallStatus,
    processed: job.processed,
    completed: completedCount,
    failed: failedCount,
    total: updatedRuns.length,
  };
}

// ── PROCESS: Fetch results and analyse with AI ──
async function handleProcess(serviceClient: any, jobId: string) {
  const LOBSTR_API_KEY = Deno.env.get("LOBSTR_API_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const { data: job } = await serviceClient
    .from("scrape_jobs")
    .select("*")
    .eq("id", jobId)
    .single();
  if (!job) throw new Error("Job not found");
  if (job.status !== "completed") throw new Error("Job not completed yet");
  if (job.processed) return { success: true, already_processed: true };

  const runIds = job.lobstr_run_ids as Array<{ squid_id: string; run_id: string; status: string }> | null;
  let isLobstrData = false;
  let resultsSummary = "";

  // If we have Lobstr.io run IDs, fetch real scraped data
  if (runIds && runIds.length > 0 && LOBSTR_API_KEY) {
    isLobstrData = true;
    const allResults: any[] = [];

    for (const entry of runIds) {
      if (entry.status !== "completed") continue;
      try {
        const res = await fetch(`${LOBSTR_BASE}/runs/${entry.run_id}/results?limit=500`, {
          headers: lobstrHeaders(LOBSTR_API_KEY),
        });
        if (res.ok) {
          const data = await res.json();
          const results = Array.isArray(data) ? data : (data.results || data.data || []);
          allResults.push(...results);
        }
      } catch (e) {
        console.warn(`Failed to fetch results for run ${entry.run_id}:`, e);
      }
    }

    console.log(`Lobstr.io returned ${allResults.length} total results`);

    // Build summary from real Vinted listing data
    resultsSummary = allResults.slice(0, 200).map((item: any) => {
      const title = item.title || item.name || "";
      const price = item.price || item.total_price || "";
      const brand = item.brand || item.brand_title || "";
      const category = item.category || item.catalog_title || "";
      const condition = item.status || item.condition || "";
      const views = item.views || item.view_count || "";
      const favourites = item.favourites || item.favourite_count || "";
      return `${title} | Brand: ${brand} | Price: ${price} | Category: ${category} | Condition: ${condition} | Views: ${views} | Favs: ${favourites}`;
    }).join("\n");
  } else {
    // Firecrawl fallback data
    const rawResults = job.raw_results || [];
    resultsSummary = (Array.isArray(rawResults) ? rawResults : [])
      .slice(0, 50)
      .map((r: any) => {
        const title = r.title || r.name || "";
        const snippet = r.description || r.snippet || r.markdown?.slice(0, 200) || "";
        const link = r.url || r.link || "";
        return `- ${title}: ${snippet} (${link})`;
      })
      .join("\n");
  }

  const categories = ["Womenswear", "Menswear", "Streetwear", "Vintage", "Designer", "Shoes", "Accessories", "Kids"];

  const dataTypeLabel = isLobstrData ? "real scraped Vinted listing data" : "web search results about Vinted trends";
  const prompt = `You are a Vinted marketplace analyst specialising in the UK resale market. Today's date is February 2026. Based on these ${dataTypeLabel}, extract and generate exactly 16 structured trend items.

CRITICAL RULES:
- "brand_or_item" MUST be a specific brand name (e.g. "Carhartt WIP", "The North Face", "Dr. Martens", "Fjällräven") — NEVER use generic category names like "Baby & Kids Clothing" or "Activewear".
- "estimated_peak_date" MUST be a date in 2026 (between February and May 2026).
- You MUST include at least 1 trend from EACH of these categories: ${categories.join(", ")}. Distribute the remaining 8 trends across categories with the most activity.
- "opportunity_score" should have realistic variance: use the full 20-98 range. Declining trends should score 20-45, peaking 40-70, rising 55-98. No more than 3 trends above 90.

RAW DATA:
${resultsSummary || "No results available - generate realistic trends based on current UK Vinted market knowledge for February 2026."}

Generate a JSON array of exactly 16 trends. For each trend provide:
- brand_or_item: a specific brand or product name (NEVER a generic category)
- category: one of [${categories.join(", ")}]
- trend_direction: "rising", "peaking", or "declining"
- search_volume_change_7d: percentage (-50 to +500)
- search_volume_change_30d: percentage (-30 to +800)
- avg_price: realistic GBP price (5-500)
- price_change_30d: percentage (-20 to +40)
- supply_demand_ratio: (0.1 to 3.0, lower = more demand than supply)
- opportunity_score: 20-98 with realistic variance per trend_direction
- ai_summary: 1-2 sentence explanation${isLobstrData ? " referencing actual data patterns" : ""} with actionable seller advice
- estimated_peak_date: ISO date in 2026 (within next 3 months)

Distribution: 10 rising, 4 peaking, 2 declining. Use real brand names that are genuinely popular on Vinted UK.
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
    if (status === 429) throw new Error("AI rate limit exceeded. Please try again in a moment.");
    if (status === 402) throw new Error("AI credits exhausted. Please top up your workspace credits.");
    throw new Error(`AI gateway error: ${status}`);
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

  const rows = trends.map((t: any) => {
    // Validate estimated_peak_date — reject invalid dates like Feb 29 in non-leap years
    let peakDate = t.estimated_peak_date || null;
    if (peakDate) {
      const parsed = new Date(peakDate);
      if (isNaN(parsed.getTime())) {
        peakDate = null;
      } else {
        peakDate = parsed.toISOString().split("T")[0];
      }
    }

    return {
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
      estimated_peak_date: peakDate,
      data_source: isLobstrData ? "lobstr" : "firecrawl",
    };
  });

  const { error: trendInsertError } = await serviceClient.from("trends").insert(rows);
  if (trendInsertError) throw trendInsertError;

  await serviceClient
    .from("scrape_jobs")
    .update({ processed: true })
    .eq("id", jobId);

  return { success: true, trends_count: trends.length, data_source: isLobstrData ? "lobstr" : "firecrawl" };
}

// ── Main handler ──
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await authenticateUser(req);
    const serviceClient = getServiceClient();
    const { action, job_id, squid_ids } = await req.json();

    let result: any;

    if (action === "launch") {
      result = await handleLaunch(serviceClient, squid_ids || DEFAULT_SQUID_IDS);
    } else if (action === "poll") {
      if (!job_id) throw new Error("job_id required for poll");
      result = await handlePoll(serviceClient, job_id);
    } else if (action === "process") {
      if (!job_id) throw new Error("job_id required for process");
      result = await handleProcess(serviceClient, job_id);
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action. Use: launch, poll, process" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Market scan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
