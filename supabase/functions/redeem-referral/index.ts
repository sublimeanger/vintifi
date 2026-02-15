import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get the calling user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { referral_code } = await req.json();
    if (!referral_code || typeof referral_code !== "string") {
      throw new Error("Missing referral_code");
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Find referrer by code
    const { data: referrer } = await admin
      .from("profiles")
      .select("user_id, referral_code")
      .eq("referral_code", referral_code.toUpperCase())
      .maybeSingle();

    if (!referrer) {
      return new Response(JSON.stringify({ error: "Invalid referral code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Self-referral check
    if (referrer.user_id === user.id) {
      return new Response(JSON.stringify({ error: "Cannot use your own referral code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already redeemed check
    const { data: existing } = await admin
      .from("referrals")
      .select("id")
      .eq("referee_id", user.id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Referral already redeemed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const creditsBonus = 5;

    // Create referral record
    await admin.from("referrals").insert({
      referrer_id: referrer.user_id,
      referee_id: user.id,
      referral_code: referral_code.toUpperCase(),
      credits_awarded: creditsBonus,
    });

    // Award credits to both users
    for (const uid of [referrer.user_id, user.id]) {
      const { data: creds } = await admin
        .from("usage_credits")
        .select("credits_limit")
        .eq("user_id", uid)
        .maybeSingle();

      if (creds) {
        await admin
          .from("usage_credits")
          .update({ credits_limit: creds.credits_limit + creditsBonus })
          .eq("user_id", uid);
      }
    }

    return new Response(JSON.stringify({ success: true, credits_awarded: creditsBonus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
