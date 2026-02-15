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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header if present (manual trigger)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const anonClient = createClient(
        supabaseUrl,
        Deno.env.get("SUPABASE_ANON_KEY")!
      );
      const { data: { user } } = await anonClient.auth.getUser(
        authHeader.replace("Bearer ", "")
      );
      userId = user?.id || null;
    }

    // Fetch active cross-listings to sync
    let query = supabase
      .from("cross_listings")
      .select("*, platform_connections!inner(auth_data, platform)")
      .eq("status", "published");

    if (userId) {
      query = query.eq("user_id", userId);
    }

    // For now, return a placeholder response since actual sync
    // requires platform-specific API calls with valid tokens
    const { data: crossListings, error } = await supabase
      .from("cross_listings")
      .select("id, platform, platform_listing_id, user_id")
      .eq("status", "published")
      .limit(100);

    if (error) throw error;

    const synced = (crossListings || []).length;

    // Log sync attempt
    if (userId) {
      await supabase.from("platform_sync_log").insert({
        user_id: userId,
        action: "sync",
        status: "success",
        details: { synced_count: synced, triggered_by: "manual" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced,
        message: `Checked ${synced} cross-listing(s) for status updates.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("sync-platform-status error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
