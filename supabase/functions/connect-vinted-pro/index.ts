import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function hmacSign(
  signingKey: string,
  message: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function testVintedProCredentials(
  accessKey: string,
  signingKey: string
): Promise<{ ok: boolean; error?: string }> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const method = "GET";
  const path = "/api/v1/items";
  const body = "";
  const message = `${timestamp}.${method}.${path}.${accessKey}.${body}`;

  try {
    const signature = await hmacSign(signingKey, message);
    const url = `https://pro.svc.vinted.com${path}?per_page=1`;

    const res = await fetch(url, {
      method,
      headers: {
        "X-Access-Key": accessKey,
        "X-Timestamp": timestamp,
        "X-Signature": signature,
        Accept: "application/json",
      },
    });

    if (res.ok) {
      return { ok: true };
    }

    const text = await res.text();
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Invalid credentials. Please check your Access Key and Signing Key." };
    }
    return { ok: false, error: `Vinted Pro API returned ${res.status}: ${text.slice(0, 200)}` };
  } catch (e: any) {
    return { ok: false, error: e.message || "Failed to reach Vinted Pro API" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get user from auth token
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // --- Tier check: Business+ required for Vinted Pro connection ---
    const { data: profile } = await adminClient
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

    const { action, access_key, signing_key } = await req.json();

    if (action === "validate_and_save") {
      if (!access_key || !signing_key) {
        return new Response(
          JSON.stringify({ error: "Access Key and Signing Key are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await testVintedProCredentials(access_key, signing_key);
      if (!result.ok) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Upsert the connection
      const { data: existing } = await adminClient
        .from("platform_connections")
        .select("id")
        .eq("user_id", user.id)
        .eq("platform", "vinted_pro")
        .maybeSingle();

      const connectionData = {
        user_id: user.id,
        platform: "vinted_pro",
        platform_username: access_key.slice(0, 12) + "...",
        status: "active",
        auth_data: { access_key, signing_key },
        connected_at: new Date().toISOString(),
        token_expires_at: null,
      };

      let error;
      if (existing) {
        ({ error } = await adminClient
          .from("platform_connections")
          .update(connectionData)
          .eq("id", existing.id));
      } else {
        ({ error } = await adminClient
          .from("platform_connections")
          .insert(connectionData));
      }

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true, username: connectionData.platform_username }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "test_connection") {
      const { data: conn, error: connError } = await adminClient
        .from("platform_connections")
        .select("auth_data")
        .eq("user_id", user.id)
        .eq("platform", "vinted_pro")
        .maybeSingle();

      if (connError || !conn) {
        return new Response(
          JSON.stringify({ error: "No Vinted Pro connection found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { access_key: ak, signing_key: sk } = conn.auth_data as any;
      const result = await testVintedProCredentials(ak, sk);

      if (!result.ok) {
        await adminClient
          .from("platform_connections")
          .update({ status: "error" })
          .eq("user_id", user.id)
          .eq("platform", "vinted_pro");
      }

      return new Response(JSON.stringify({ success: result.ok, error: result.error }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
