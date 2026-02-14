import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check if this is a manual trigger for a specific user
    let targetUserId: string | null = null;
    try {
      const body = await req.json();
      targetUserId = body?.user_id || null;
    } catch { /* no body = cron trigger for all users */ }

    // Get users who have digest enabled
    let profilesQuery = supabase
      .from("profiles")
      .select("user_id, display_name, weekly_digest_enabled")
      .eq("weekly_digest_enabled", true);

    if (targetUserId) {
      profilesQuery = supabase
        .from("profiles")
        .select("user_id, display_name, weekly_digest_enabled")
        .eq("user_id", targetUserId);
    }

    const { data: profiles, error: profilesErr } = await profilesQuery;
    if (profilesErr) throw profilesErr;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No users to send digest to" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { email: string; status: string }[] = [];

    for (const profile of profiles) {
      // Get user email from auth
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
      if (!authUser?.user?.email) continue;
      const email = authUser.user.email;
      const name = profile.display_name || "Seller";

      // 1. Top trends (last 7 days)
      const { data: trends } = await supabase
        .from("trends")
        .select("brand_or_item, category, trend_direction, search_volume_change_7d, opportunity_score, avg_price")
        .order("opportunity_score", { ascending: false })
        .limit(5);

      // 2. Stale listings (30+ days, still active)
      const { data: staleListings } = await supabase
        .from("listings")
        .select("title, brand, current_price, days_listed, health_score")
        .eq("user_id", profile.user_id)
        .eq("status", "active")
        .gte("days_listed", 30)
        .order("days_listed", { ascending: false })
        .limit(10);

      // 3. Profit summary (items sold in last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: soldItems } = await supabase
        .from("listings")
        .select("title, sale_price, purchase_price, sold_at")
        .eq("user_id", profile.user_id)
        .eq("status", "sold")
        .gte("sold_at", weekAgo);

      // 4. Active listings count
      const { count: activeCount } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.user_id)
        .eq("status", "active");

      // Calculate profit stats
      const totalRevenue = (soldItems || []).reduce((sum, i) => sum + (i.sale_price || 0), 0);
      const totalCost = (soldItems || []).reduce((sum, i) => sum + (i.purchase_price || 0), 0);
      const totalProfit = totalRevenue - totalCost;
      const itemsSold = (soldItems || []).length;

      // Build email HTML
      const html = buildDigestEmail({
        name,
        trends: trends || [],
        staleListings: staleListings || [],
        activeCount: activeCount || 0,
        itemsSold,
        totalRevenue,
        totalProfit,
      });

      // Send via Resend
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Raqkt <onboarding@resend.dev>",
          to: [email],
          subject: `📊 Your Weekly Raqkt Digest — ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
          html,
        }),
      });

      if (resendRes.ok) {
        results.push({ email, status: "sent" });
      } else {
        const errText = await resendRes.text();
        console.error(`Failed to send to ${email}:`, errText);
        results.push({ email, status: `failed: ${errText}` });
      }
    }

    return new Response(JSON.stringify({ sent: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Weekly digest error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

interface DigestData {
  name: string;
  trends: any[];
  staleListings: any[];
  activeCount: number;
  itemsSold: number;
  totalRevenue: number;
  totalProfit: number;
}

function buildDigestEmail(data: DigestData): string {
  const { name, trends, staleListings, activeCount, itemsSold, totalRevenue, totalProfit } = data;

  const trendRows = trends.length > 0
    ? trends.map((t) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;">
            ${t.trend_direction === "rising" ? "🔥" : t.trend_direction === "peaking" ? "⚡" : "📉"} 
            <strong>${t.brand_or_item}</strong>
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;">${t.category}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;text-align:right;">
            ${t.search_volume_change_7d ? `${t.search_volume_change_7d > 0 ? "+" : ""}${t.search_volume_change_7d}%` : "—"}
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;text-align:right;">
            ${t.opportunity_score || 0}/100
          </td>
        </tr>`).join("")
    : `<tr><td colspan="4" style="padding:16px;text-align:center;color:#888;font-size:14px;">No trending data this week</td></tr>`;

  const staleRows = staleListings.length > 0
    ? staleListings.slice(0, 5).map((l) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;">
            ${l.title}${l.brand ? ` <span style="color:#888;">(${l.brand})</span>` : ""}
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;text-align:right;">
            £${(l.current_price || 0).toFixed(2)}
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;text-align:right;color:#E94560;">
            ${l.days_listed} days
          </td>
        </tr>`).join("")
    : `<tr><td colspan="3" style="padding:16px;text-align:center;color:#2ECC71;font-size:14px;">✅ No stale listings — great job!</td></tr>`;

  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f5f6f8;font-family:'Inter',Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
      
      <!-- Header -->
      <div style="text-align:center;padding:24px 0;">
        <h1 style="margin:0;font-size:28px;font-weight:800;">
          <span style="background:linear-gradient(135deg,#E94560,#F39C12);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Raqkt</span>
        </h1>
        <p style="margin:4px 0 0;color:#888;font-size:14px;">Your Weekly Selling Intelligence</p>
      </div>

      <!-- Welcome -->
      <div style="background:white;border-radius:12px;padding:24px;margin-bottom:16px;">
        <h2 style="margin:0 0 8px;font-size:20px;color:#1A1A2E;">Hey ${name} 👋</h2>
        <p style="margin:0;color:#666;font-size:14px;line-height:1.5;">
          Here's your weekly overview to help you sell smarter.
        </p>
      </div>

      <!-- KPI Cards -->
      <div style="display:flex;gap:12px;margin-bottom:16px;">
        <div style="flex:1;background:white;border-radius:12px;padding:16px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#888;">Active Listings</p>
          <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:#1A1A2E;">${activeCount}</p>
        </div>
        <div style="flex:1;background:white;border-radius:12px;padding:16px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#888;">Sold This Week</p>
          <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:#2ECC71;">${itemsSold}</p>
        </div>
        <div style="flex:1;background:white;border-radius:12px;padding:16px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#888;">Weekly Profit</p>
          <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:${totalProfit >= 0 ? "#2ECC71" : "#E94560"};">
            £${totalProfit.toFixed(2)}
          </p>
        </div>
      </div>

      <!-- Revenue -->
      ${totalRevenue > 0 ? `
      <div style="background:white;border-radius:12px;padding:16px;margin-bottom:16px;border-left:4px solid #2ECC71;">
        <p style="margin:0;font-size:14px;color:#666;">Total Revenue This Week: <strong style="color:#1A1A2E;">£${totalRevenue.toFixed(2)}</strong></p>
      </div>` : ""}

      <!-- Top Trends -->
      <div style="background:white;border-radius:12px;padding:24px;margin-bottom:16px;">
        <h3 style="margin:0 0 16px;font-size:16px;color:#1A1A2E;">🔥 Top Trends This Week</h3>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#888;font-weight:600;">Item / Brand</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#888;font-weight:600;">Category</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;color:#888;font-weight:600;">7d Change</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;color:#888;font-weight:600;">Score</th>
            </tr>
          </thead>
          <tbody>${trendRows}</tbody>
        </table>
      </div>

      <!-- Stale Listings -->
      <div style="background:white;border-radius:12px;padding:24px;margin-bottom:16px;">
        <h3 style="margin:0 0 16px;font-size:16px;color:#1A1A2E;">⚠️ Stale Listings (30+ Days)</h3>
        ${staleListings.length > 0 ? `<p style="margin:0 0 12px;font-size:13px;color:#888;">Consider reducing prices or relisting these items.</p>` : ""}
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#888;font-weight:600;">Item</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;color:#888;font-weight:600;">Price</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;color:#888;font-weight:600;">Listed</th>
            </tr>
          </thead>
          <tbody>${staleRows}</tbody>
        </table>
      </div>

      <!-- CTA -->
      <div style="text-align:center;padding:24px 0;">
        <a href="https://raqkt.lovable.app/dashboard" style="display:inline-block;background:#E94560;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Open Your Dashboard →
        </a>
      </div>

      <!-- Footer -->
      <div style="text-align:center;padding:16px 0;border-top:1px solid #eee;">
        <p style="margin:0;font-size:12px;color:#aaa;">
          You're receiving this because you enabled weekly digests in Raqkt.
          <br>Manage your preferences in Settings.
        </p>
      </div>
    </div>
  </body>
  </html>`;
}
