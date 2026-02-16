import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APIFY_BASE = "https://api.apify.com/v2";
const APIFY_ACTOR = "kazkn~vinted-smart-scraper";

// ── Helpers ──

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function err(msg: string, status = 500) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Detect if input looks like a Vinted profile URL
function isVintedProfileUrl(input: string): boolean {
  return /vinted\.\w+\/member\/\d+/i.test(input);
}

// Extract member ID from URL like https://www.vinted.co.uk/member/12345-username
function extractMemberId(url: string): string | null {
  const match = url.match(/\/member\/(\d+)/);
  return match ? match[1] : null;
}

// ── Apify: Seller Profile scrape ──
async function scrapeSellerProfile(apiToken: string, memberUrl: string): Promise<any> {
  try {
    const url = `${APIFY_BASE}/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${apiToken}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "SELLER_PROFILE",
        sellerUrl: memberUrl,
        country: "uk",
      }),
    });
    if (!res.ok) {
      console.error(`Apify seller profile scrape failed: ${res.status}`);
      return null;
    }
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch (e) {
    console.error("Apify seller profile error:", e);
    return null;
  }
}

// ── Apify: Search listings ──
async function scrapeListings(apiToken: string, query: string, maxItems = 20): Promise<any[]> {
  try {
    const url = `${APIFY_BASE}/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${apiToken}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ search: query, maxItems, country: "uk" }),
    });
    if (!res.ok) {
      console.error(`Apify search failed: ${res.status}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("Apify search error:", e);
    return [];
  }
}

// ── Firecrawl fallback ──
async function firecrawlSearch(apiKey: string, query: string): Promise<any[]> {
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 15, scrapeOptions: { formats: ["markdown"] } }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || data.results || [];
  } catch {
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const APIFY_API_TOKEN = Deno.env.get("APIFY_API_TOKEN");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!APIFY_API_TOKEN && !FIRECRAWL_API_KEY) throw new Error("No scraping API configured");

    // Auth
    const authHeader = req.headers.get("authorization");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(SUPABASE_URL, anonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return err("Unauthorized", 401);

    // Tier check
    const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: profile } = await svc.from("profiles").select("subscription_tier").eq("user_id", user.id).single();
    const tierLevel: Record<string, number> = { free: 0, pro: 1, business: 2, scale: 3 };
    if ((tierLevel[profile?.subscription_tier || "free"] ?? 0) < 1) {
      return err("This feature requires a Pro plan. Upgrade to continue.", 403);
    }

    // Parse request
    const body = await req.json();
    const { competitor_id, input, search_query, category, mode: requestMode } = body;

    // Determine scan mode
    const inputStr = (input || "").trim();
    const isProfileUrl = isVintedProfileUrl(inputStr);
    const hasQuery = !!(search_query || "").trim();

    let scanMode: "profile" | "niche" | "combined";
    if (isProfileUrl && hasQuery) scanMode = "combined";
    else if (isProfileUrl) scanMode = "profile";
    else scanMode = "niche";

    // If mode is "preview", just fetch seller profile data and return (for smart add flow)
    if (requestMode === "preview" && isProfileUrl && APIFY_API_TOKEN) {
      const sellerData = await scrapeSellerProfile(APIFY_API_TOKEN, inputStr);
      if (!sellerData) return err("Could not fetch seller profile. Check the URL and try again.", 400);
      return ok({
        preview: true,
        competitor_name: sellerData.login || sellerData.username || "Unknown Seller",
        profile_photo_url: sellerData.photo?.url || sellerData.photo || null,
        seller_rating: sellerData.feedback_reputation ?? sellerData.rating ?? null,
        follower_count: sellerData.followers_count ?? sellerData.followers ?? null,
        total_items_sold: sellerData.items_count ?? sellerData.given_items_count ?? null,
        verification_status: sellerData.verification?.email ? "verified" : "unverified",
        vinted_profile_url: inputStr,
      });
    }

    console.log(`Competitor scan mode=${scanMode}, input="${inputStr}", query="${search_query}"`);

    // ── Gather intelligence ──
    let sellerProfile: any = null;
    let listings: any[] = [];
    let listingSummary = "";

    // Mode 1 & 3: Scrape seller profile
    if ((scanMode === "profile" || scanMode === "combined") && APIFY_API_TOKEN) {
      sellerProfile = await scrapeSellerProfile(APIFY_API_TOKEN, inputStr);
      // Also get their listings by searching their username
      const username = sellerProfile?.login || sellerProfile?.username || "";
      if (username) {
        listings = await scrapeListings(APIFY_API_TOKEN, username, 25);
      }
    }

    // Mode 2 & 3: Search niche
    if ((scanMode === "niche" || scanMode === "combined") && APIFY_API_TOKEN) {
      const nicheQuery = `${search_query || inputStr} ${category || ""}`.trim();
      const nicheListings = await scrapeListings(APIFY_API_TOKEN, nicheQuery, 20);
      listings = [...listings, ...nicheListings];
    }

    // Format listings for AI
    if (listings.length > 0) {
      listingSummary = listings.slice(0, 20).map((item: any) => {
        const brand = item.brand || item.brand_title || "";
        const price = item.price || item.total_price || "?";
        const title = item.title || "";
        const views = item.view_count || item.views || 0;
        const favs = item.favourite_count || item.favorites || 0;
        const url = item.url || "";
        const img = item.photo?.url || item.photos?.[0]?.url || "";
        return `- ${brand} | £${price} | ${title} | ${views} views | ${favs} favs | ${url} | img:${img}`;
      }).join("\n");
    }

    // Firecrawl fallback
    if (!listingSummary && FIRECRAWL_API_KEY) {
      const q = isProfileUrl
        ? `site:vinted.co.uk ${sellerProfile?.login || inputStr}`
        : `site:vinted.co.uk ${search_query || inputStr} ${category || ""}`.trim();
      const results = await firecrawlSearch(FIRECRAWL_API_KEY, q);
      listingSummary = results.slice(0, 12).map((r: any) =>
        `- ${r.title || ""} | ${r.description || r.markdown?.slice(0, 200) || ""} | ${r.url || ""}`
      ).join("\n");
    }

    // Get previous scan for comparison
    let previousData: any = null;
    if (competitor_id) {
      const { data: prev } = await svc
        .from("competitor_profiles")
        .select("avg_price, listing_count, seller_rating, follower_count, last_scanned_at")
        .eq("id", competitor_id)
        .single();
      previousData = prev;
    }

    // ── Build AI prompt ──
    const sellerSection = sellerProfile ? `
SELLER PROFILE DATA:
- Username: ${sellerProfile.login || sellerProfile.username || "unknown"}
- Rating: ${sellerProfile.feedback_reputation ?? sellerProfile.rating ?? "unknown"}/5.0
- Followers: ${sellerProfile.followers_count ?? sellerProfile.followers ?? "unknown"}
- Items Sold: ${sellerProfile.items_count ?? sellerProfile.given_items_count ?? "unknown"}
- Verification: ${sellerProfile.verification?.email ? "Email Verified" : "Unverified"}
- Profile Photo: ${sellerProfile.photo?.url || sellerProfile.photo || "none"}
- Member Since: ${sellerProfile.created_at || "unknown"}
` : "";

    const previousSection = previousData ? `
PREVIOUS SCAN DATA:
- Previous avg price: £${previousData.avg_price || "unknown"}
- Previous listing count: ${previousData.listing_count || "unknown"}
- Previous rating: ${previousData.seller_rating || "unknown"}
- Previous followers: ${previousData.follower_count || "unknown"}
- Last scanned: ${previousData.last_scanned_at || "never"}
` : "This is the first scan for this competitor.";

    const prompt = `You are an elite competitive intelligence analyst for Vinted resellers. Perform a deep-dive analysis.

SCAN MODE: ${scanMode.toUpperCase()}
${sellerSection}
ACTIVE LISTINGS (up to 20):
${listingSummary || "No listing data available"}

${previousSection}

Analyse thoroughly and return a JSON object:
{
  "avg_price": <average listing price in GBP as number>,
  "listing_count": <number of active listings found>,
  "price_trend": "rising" | "falling" | "stable",
  "seller_rating": <rating out of 5 if available, null otherwise>,
  "follower_count": <follower count if available, null otherwise>,
  "total_items_sold": <total items sold if available, null otherwise>,
  "threat_score": <1-10 competitive threat level>,
  "pricing_strategy": "<one sentence describing their pricing approach>",
  "top_items": [
    {
      "title": "<item title>",
      "price": <price in GBP>,
      "url": "<vinted URL if available>",
      "image_url": "<image URL if available>"
    }
  ],
  "alerts": [
    {
      "alert_type": "price_drop" | "new_listings" | "new_seller" | "price_increase" | "trend_change",
      "title": "<short alert title>",
      "description": "<1-2 sentence explanation>",
      "old_value": <previous value if applicable, null otherwise>,
      "new_value": <current value if applicable, null otherwise>
    }
  ],
  "ai_summary": "<3-5 sentence competitive intelligence summary. Include: threat assessment, their strength, their weakness, and one specific counter-strategy recommendation. Be direct and actionable.>",
  "best_categories": ["<their top 2-3 selling categories>"],
  "counter_strategies": ["<2-3 specific actionable recommendations to compete against this seller/niche>"]
}

Guidelines:
- threat_score: 1-3 = low threat, 4-6 = moderate, 7-8 = high, 9-10 = dominant competitor
- For profile scans, base analysis on real seller data. For niche scans, identify dominant sellers.
- top_items: pick the 3-6 most notable items (highest price, most views, or most favourited)
- Generate 1-4 relevant alerts based on changes from previous scan or notable findings
- ai_summary must be specific and actionable, not generic
- Return ONLY the JSON object, no other text.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return err("Rate limited, try again in a moment.", 429);
      if (aiRes.status === 402) return err("AI credits exhausted.", 402);
      return err(`AI error: ${aiRes.status}`, 500);
    }

    const aiData = await aiRes.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse competitor analysis");
    }

    // Post-AI validation: overwrite avg_price with real computed value from listings
    if (listings.length > 0) {
      const realPrices = listings
        .map((l: any) => parseFloat(l.price || l.total_price || 0))
        .filter((p: number) => p > 0);
      if (realPrices.length > 0) {
        const realAvg = Math.round((realPrices.reduce((a: number, b: number) => a + b, 0) / realPrices.length) * 100) / 100;
        if (analysis.avg_price && Math.abs(analysis.avg_price - realAvg) / realAvg > 0.3) {
          console.log(`Correcting avg_price: AI said £${analysis.avg_price}, real computed £${realAvg}`);
        }
        analysis.avg_price = realAvg;
        analysis.listing_count = listings.length;
      }
    }

    // ── Persist results ──
    if (competitor_id) {
      // Update competitor profile with latest data
      await svc.from("competitor_profiles").update({
        avg_price: analysis.avg_price,
        listing_count: analysis.listing_count,
        price_trend: analysis.price_trend,
        seller_rating: analysis.seller_rating ?? sellerProfile?.feedback_reputation ?? null,
        follower_count: analysis.follower_count ?? sellerProfile?.followers_count ?? null,
        total_items_sold: analysis.total_items_sold ?? sellerProfile?.items_count ?? null,
        top_items: analysis.top_items || [],
        ai_summary: analysis.ai_summary,
        last_scan_data: { ...analysis, raw_listings_count: listings.length },
        vinted_profile_url: isProfileUrl ? inputStr : undefined,
        profile_photo_url: sellerProfile?.photo?.url || sellerProfile?.photo || undefined,
        verification_status: sellerProfile?.verification?.email ? "verified" : (sellerProfile ? "unverified" : undefined),
        last_scanned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", competitor_id);

      // Save scan history
      await svc.from("competitor_scans").insert({
        user_id: user.id,
        competitor_id,
        avg_price: analysis.avg_price,
        listing_count: analysis.listing_count,
        seller_rating: analysis.seller_rating,
        follower_count: analysis.follower_count,
        total_items_sold: analysis.total_items_sold,
        price_trend: analysis.price_trend,
        top_items: analysis.top_items || [],
        ai_summary: analysis.ai_summary,
        raw_data: { scan_mode: scanMode, listings_found: listings.length },
      });

      // Store alerts
      if (analysis.alerts?.length > 0) {
        const alertRows = analysis.alerts.map((a: any) => ({
          user_id: user.id,
          competitor_id,
          alert_type: a.alert_type || "price_drop",
          title: a.title,
          description: a.description,
          old_value: a.old_value,
          new_value: a.new_value,
        }));
        await svc.from("competitor_alerts").insert(alertRows);
      }
    }

    return ok(analysis);
  } catch (e) {
    console.error("competitor-scan error:", e);
    return err(e instanceof Error ? e.message : "Unknown error");
  }
});
