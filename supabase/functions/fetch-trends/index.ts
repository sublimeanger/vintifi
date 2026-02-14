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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    // Read trends from database (populated by daily cron job)
    let query = serviceClient
      .from("trends")
      .select("*")
      .order("opportunity_score", { ascending: false });

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    const { data: trends, error: queryError } = await query.limit(50);
    if (queryError) throw queryError;

    // Get the most recent updated_at as "last_updated"
    let lastUpdated: string | null = null;
    if (trends && trends.length > 0) {
      lastUpdated = trends.reduce((latest: string, t: any) => {
        return t.updated_at > latest ? t.updated_at : latest;
      }, trends[0].updated_at);
    }

    const dataSource = trends?.[0]?.data_source || "none";

    return new Response(JSON.stringify({
      trends: trends || [],
      data_source: dataSource,
      last_updated: lastUpdated,
    }), {
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
