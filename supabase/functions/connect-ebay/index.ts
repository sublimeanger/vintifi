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

  const url = new URL(req.url);

  // --- eBay Marketplace Account Deletion: GET verification challenge ---
  if (req.method === "GET" && url.searchParams.has("challenge_code")) {
    try {
      const challengeCode = url.searchParams.get("challenge_code")!;
      const verificationToken = Deno.env.get("EBAY_VERIFICATION_TOKEN") || "";
      const endpoint = "https://jufvrlenxbcmohpkuvlo.supabase.co/functions/v1/connect-ebay";

      const encoder = new TextEncoder();
      const data = encoder.encode(challengeCode + verificationToken + endpoint);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      return new Response(JSON.stringify({ challengeResponse: hashHex }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err: any) {
      console.error("eBay challenge error:", err);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // --- eBay Marketplace Account Deletion: POST notification ---
  if (req.method === "POST") {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      // No auth header = eBay deletion notification (not a user request)
      try {
        const body = await req.json();
        console.log("eBay account deletion notification received:", JSON.stringify(body));
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err: any) {
        console.error("eBay notification error:", err);
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    // --- Tier check: Business+ required for eBay connection ---
    const { data: profile } = await supabase
      .from("profiles").select("subscription_tier").eq("user_id", user.id).maybeSingle();
    const tier = profile?.subscription_tier || "free";
    const tierLevel: Record<string, number> = { free: 0, pro: 1, business: 2, scale: 3 };
    if ((tierLevel[tier] ?? 0) < 2) {
      return new Response(
        JSON.stringify({ error: "This feature requires a Business plan. Upgrade to continue." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // --- End tier check ---

    const body = await req.json();
    const { action } = body;

    const EBAY_CLIENT_ID = Deno.env.get("EBAY_CLIENT_ID");
    const EBAY_CLIENT_SECRET = Deno.env.get("EBAY_CLIENT_SECRET");
    const EBAY_REDIRECT_URI = Deno.env.get("EBAY_REDIRECT_URI");

    if (action === "get_auth_url") {
      if (!EBAY_CLIENT_ID || !EBAY_REDIRECT_URI) {
        return new Response(
          JSON.stringify({
            error: "eBay API keys not configured",
            url: null,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const scopes = [
        "https://api.ebay.com/oauth/api_scope/sell.inventory",
        "https://api.ebay.com/oauth/api_scope/sell.account",
        "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
      ].join(" ");

      const state = btoa(JSON.stringify({ user_id: user.id }));
      const authUrl = `https://auth.ebay.com/oauth2/authorize?client_id=${encodeURIComponent(
        EBAY_CLIENT_ID
      )}&response_type=code&redirect_uri=${encodeURIComponent(
        EBAY_REDIRECT_URI
      )}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}`;

      return new Response(JSON.stringify({ url: authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "exchange_code") {
      const { code } = body;
      if (!code) throw new Error("Authorization code required");
      if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET || !EBAY_REDIRECT_URI) {
        throw new Error("eBay API keys not configured");
      }

      // Exchange code for tokens
      const tokenRes = await fetch(
        "https://api.ebay.com/identity/v1/oauth2/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${btoa(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`)}`,
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: EBAY_REDIRECT_URI,
          }),
        }
      );

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        throw new Error(`eBay token exchange failed [${tokenRes.status}]: ${errText}`);
      }

      const tokenData = await tokenRes.json();

      // Save connection
      await supabase.from("platform_connections").upsert(
        {
          user_id: user.id,
          platform: "ebay",
          auth_data: {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_in: tokenData.expires_in,
            token_type: tokenData.token_type,
          },
          status: "active",
          connected_at: new Date().toISOString(),
          token_expires_at: new Date(
            Date.now() + (tokenData.expires_in || 7200) * 1000
          ).toISOString(),
        },
        { onConflict: "user_id,platform" }
      );

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err: any) {
    console.error("connect-ebay error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
