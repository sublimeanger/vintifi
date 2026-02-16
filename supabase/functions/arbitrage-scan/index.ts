import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── Platform config ─────────────────────────────────────────────── */

const ALL_PLATFORMS = [
  { name: "eBay", query: "site:ebay.co.uk" },
  { name: "Depop", query: "site:depop.com" },
  { name: "Facebook Marketplace", query: "site:facebook.com/marketplace" },
  { name: "Gumtree", query: "site:gumtree.com" },
  { name: "Vestiaire Collective", query: "site:vestiairecollective.com" },
  { name: "Schpock", query: "site:schpock.com" },
  { name: "Vinted", query: "site:vinted.co.uk" },
];

/* ── Currency conversion ─────────────────────────────────────────── */

const TO_GBP: Record<string, number> = {
  GBP: 1,
  USD: 0.79,
  EUR: 0.85,
  SEK: 0.073,
  PLN: 0.20,
  CZK: 0.033,
  DKK: 0.11,
  NOK: 0.074,
  CHF: 0.89,
  CAD: 0.58,
  AUD: 0.52,
};

function convertToGBP(price: number, currency: string): number {
  const upper = (currency || "GBP").toUpperCase().trim();
  const rate = TO_GBP[upper] ?? 1;
  return Math.round(price * rate * 100) / 100;
}

/* ── Listing URL filter ──────────────────────────────────────────── */

function isListingUrl(url: string, platform: string): boolean {
  if (platform === "eBay") return url.includes("/itm/");
  if (platform === "Depop") return url.includes("/products/");
  if (platform === "Facebook Marketplace") return url.includes("/item/");
  if (platform === "Gumtree") return /\/p\//.test(url);
  if (platform === "Vestiaire Collective") return /\/[a-z]+-\d+\.shtml/.test(url) || url.includes("/products/");
  if (platform === "Schpock") return url.includes("/i/");
  if (platform === "Vinted") return /\/items\/\d+/.test(url);
  return false;
}

/* ── Structured price extraction schema ──────────────────────────── */

const LISTING_PRICE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Item title" },
    price: { type: "number", description: "Current listing price in local currency (numeric, no symbols)" },
    currency: { type: "string", description: "3-letter currency code e.g. GBP, USD, EUR" },
    condition: { type: "string", description: "Item condition e.g. New, Used, Like New" },
    shipping_cost: { type: "number", description: "Shipping cost if shown, otherwise null" },
    is_auction: { type: "boolean", description: "True if this is an auction listing" },
    buy_it_now_price: { type: "number", description: "Buy It Now price if different from main price, otherwise null" },
  },
  required: ["title", "price", "currency"],
};

/* ── Types ────────────────────────────────────────────────────────── */

type ScrapedListing = {
  url: string;
  platform: string;
  title: string;
  price_original: number;
  currency: string;
  price_gbp: number;
  condition: string | null;
  shipping_cost: number | null;
  is_auction: boolean;
  buy_it_now_price: number | null;
};

/* ── Scrape a single listing page for structured price data ──────── */

async function scrapeListingPrice(
  url: string,
  platform: string,
  apiKey: string
): Promise<ScrapedListing | null> {
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["extract"],
        extract: { schema: LISTING_PRICE_SCHEMA },
      }),
    });

    if (!res.ok) {
      console.error(`Scrape failed for ${url}: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const extracted = data?.data?.extract || data?.extract;
    if (!extracted || !extracted.price || !extracted.currency) {
      console.warn(`No price extracted from ${url}`);
      return null;
    }

    const priceGBP = convertToGBP(extracted.price, extracted.currency);

    return {
      url,
      platform,
      title: extracted.title || "",
      price_original: extracted.price,
      currency: extracted.currency,
      price_gbp: priceGBP,
      condition: extracted.condition || null,
      shipping_cost: extracted.shipping_cost ?? null,
      is_auction: extracted.is_auction ?? false,
      buy_it_now_price: extracted.buy_it_now_price ?? null,
    };
  } catch (e) {
    console.error(`Scrape error for ${url}:`, e);
    return null;
  }
}

/* ── Search + scrape a platform ──────────────────────────────────── */

async function searchAndScrapePlatform(
  platform: { name: string; query: string },
  searchTerm: string,
  apiKey: string
): Promise<{ platform: string; scraped: ScrapedListing[] }> {
  try {
    // Step 1: Firecrawl search to find listing URLs
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `${platform.query} ${searchTerm}`,
        limit: 20,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    if (!res.ok) {
      console.error(`${platform.name} search failed: ${res.status}`);
      return { platform: platform.name, scraped: [] };
    }

    const data = await res.json();
    const results = data.data || data.results || [];

    // Step 2: Filter to actual listing URLs (not category/search pages)
    const listingUrls = results
      .filter((r: any) => r.url && isListingUrl(r.url, platform.name))
      .slice(0, 10)
      .map((r: any) => r.url);

    if (listingUrls.length === 0) {
      console.log(`${platform.name}: no listing URLs found in search results`);
      return { platform: platform.name, scraped: [] };
    }

    console.log(`${platform.name}: scraping ${listingUrls.length} listing URLs`);

    // Step 3: Scrape each listing URL for structured price data
    const scrapeResults = await Promise.all(
      listingUrls.map((url: string) => scrapeListingPrice(url, platform.name, apiKey))
    );

    const scraped = scrapeResults.filter((s): s is ScrapedListing => s !== null);
    console.log(`${platform.name}: got ${scraped.length} prices from ${listingUrls.length} URLs`);

    return { platform: platform.name, scraped };
  } catch (e) {
    console.error(`${platform.name} search+scrape error:`, e);
    return { platform: platform.name, scraped: [] };
  }
}

/* ── Vinted baseline via Apify ───────────────────────────────────── */

async function searchVintedApify(searchTerm: string, apifyToken: string): Promise<any[] | null> {
  try {
    const actorId = "kazkn~vinted-smart-scraper";
    const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${apifyToken}&timeout=120`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "SEARCH",
        searchQuery: searchTerm.substring(0, 100),
        country: "uk",
        maxItems: 25,
      }),
    });

    if (!res.ok) {
      console.error("Apify Vinted search error:", res.status);
      return null;
    }

    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) return null;
    return items;
  } catch (e) {
    console.error("Apify Vinted search failed:", e);
    return null;
  }
}

async function searchVintedFirecrawl(searchTerm: string, apiKey: string): Promise<any[]> {
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `site:vinted.co.uk ${searchTerm}`,
        limit: 15,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || data.results || [];
  } catch {
    return [];
  }
}

/* ── Build Vinted summary string ─────────────────────────────────── */

async function getVintedSummary(
  searchTerm: string,
  apifyToken: string | undefined,
  firecrawlKey: string
): Promise<string> {
  if (apifyToken) {
    const apifyItems = await searchVintedApify(searchTerm, apifyToken);
    if (apifyItems && apifyItems.length > 0) {
      console.log(`Apify returned ${apifyItems.length} Vinted results`);
      return apifyItems
        .map((item: any, i: number) => {
          const title = item.title || "Unknown";
          const price = item.price != null ? `£${item.price}` : "N/A";
          const views = item.view_count ?? "N/A";
          const favs = item.favourite_count ?? "N/A";
          const status = item.status || "active";
          const condition = item.status_label || "Unknown";
          return `  ${i + 1}. ${title} | ${price} | ${condition} | ${views} views | ${favs} favs | ${status}`;
        })
        .join("\n");
    }
  }

  console.log("Falling back to Firecrawl for Vinted search");
  const fcResults = await searchVintedFirecrawl(searchTerm, firecrawlKey);
  return fcResults
    .slice(0, 8)
    .map((r: any) => `  - ${r.title || ""} | ${r.description || r.markdown?.slice(0, 200) || ""}`)
    .join("\n");
}

/* ── AI prompt (strict — no price invention) ─────────────────────── */

function buildPrompt(
  searchTerm: string,
  minMargin: number,
  scrapedData: string,
  vintedSummary: string
) {
  return `You are a UK reselling arbitrage analyst. You are given VERIFIED, REAL price data from source platforms and Vinted baseline prices.

SEARCH TERM: "${searchTerm}"
MINIMUM PROFIT MARGIN: ${minMargin}%

## VERIFIED Source Platform Listings (with REAL scraped prices in GBP)
${scrapedData}

## Vinted Reference Prices (Sell On)
${vintedSummary || "No Vinted results — estimate Vinted resale value based on UK market knowledge for this brand/category"}

CRITICAL RULES:
1. source_price MUST be the EXACT price_gbp value shown in the verified data above. DO NOT change, round, or invent any buy price.
2. If a listing's price seems too good to be true, use the EXACT price shown — do not "correct" it.
3. vinted_estimated_price should be based on the Vinted reference data above, or your knowledge of typical Vinted UK resale values.
4. Only include opportunities where profit_margin >= ${minMargin}%.
5. estimated_profit = vinted_estimated_price - source_price
6. profit_margin = (estimated_profit / source_price) * 100
7. net_profit = estimated_profit - shipping_estimate - 0 (Vinted has no seller fees)
8. If there are no genuine opportunities meeting the margin threshold, return an empty array [].

Return a JSON array of opportunities (max 20, ranked by deal_score desc). Each object MUST have:
- source_platform: platform name
- source_url: the listing URL
- source_title: item title from the verified data
- source_price: EXACT price_gbp from verified data (DO NOT CHANGE THIS)
- original_currency: the original currency code
- original_price: the price in original currency before GBP conversion
- vinted_estimated_price: estimated Vinted sell price in GBP
- estimated_profit: vinted_estimated_price - source_price
- profit_margin: percentage
- brand: brand name
- category: item category
- condition: from verified data
- ai_notes: 1-2 sentence explanation
- deal_score: 1-100 quality rating
- risk_level: "low" / "medium" / "high"
- estimated_days_to_sell: integer
- demand_indicator: "hot" / "warm" / "cold"
- suggested_listing_title: SEO-optimised Vinted title
- shipping_estimate: estimated UK shipping cost in GBP
- net_profit: estimated_profit minus shipping_estimate

Return ONLY the JSON array, no other text.`;
}

/* ── Post-AI validation against scraped data ─────────────────────── */

function validateOpportunities(
  opportunities: any[],
  allScraped: ScrapedListing[],
  minMargin: number
): any[] {
  return opportunities
    .map((opp) => {
      // Find the matching scraped listing
      const match = allScraped.find(
        (s) =>
          s.url === opp.source_url ||
          (s.title && opp.source_title && s.title.toLowerCase().includes(opp.source_title?.toLowerCase()?.substring(0, 30)))
      );

      if (!match) {
        console.warn(`Rejecting opportunity — no matching scraped listing: ${opp.source_title}`);
        return null; // AI invented this listing
      }

      // Correct source_price if AI deviated from scraped data
      const priceDiff = Math.abs((opp.source_price || 0) - match.price_gbp) / match.price_gbp;
      if (priceDiff > 0.1) {
        console.warn(
          `Correcting price for "${opp.source_title}": AI said £${opp.source_price}, actual £${match.price_gbp}`
        );
        opp.source_price = match.price_gbp;
        opp.original_price = match.price_original;
        opp.original_currency = match.currency;
      }

      // Recalculate margins with corrected price
      const shippingEst = opp.shipping_estimate || 5;
      opp.estimated_profit = (opp.vinted_estimated_price || 0) - opp.source_price;
      opp.profit_margin = opp.source_price > 0
        ? Math.round(((opp.estimated_profit) / opp.source_price) * 100 * 10) / 10
        : 0;
      opp.net_profit = opp.estimated_profit - shippingEst;

      // Ensure URL is from scraped data
      opp.source_url = match.url;
      opp.condition = opp.condition || match.condition;

      return opp;
    })
    .filter((opp): opp is any => {
      if (!opp) return false;
      if (opp.profit_margin < minMargin) {
        console.log(`Filtering out "${opp.source_title}" — margin ${opp.profit_margin}% < ${minMargin}%`);
        return false;
      }
      if (opp.estimated_profit <= 0) {
        console.log(`Filtering out "${opp.source_title}" — negative profit`);
        return false;
      }
      return true;
    });
}

/* ── Main handler ────────────────────────────────────────────────── */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const APIFY_API_TOKEN = Deno.env.get("APIFY_API_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Auth
    const authHeader = req.headers.get("authorization");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(SUPABASE_URL, anonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tier check: business+
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("subscription_tier")
      .eq("user_id", user.id)
      .single();
    const tierLevel: Record<string, number> = { free: 0, pro: 1, business: 2, scale: 3 };
    if ((tierLevel[profile?.subscription_tier || "free"] ?? 0) < 2) {
      return new Response(
        JSON.stringify({ error: "This feature requires a Business plan. Upgrade to continue." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { brand, category, min_profit_margin = 30, platforms } = await req.json();

    if (!brand && !category) {
      return new Response(
        JSON.stringify({ error: "Provide at least a brand or category to scan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchTerm = [brand, category].filter(Boolean).join(" ");
    const minMargin = min_profit_margin;
    console.log("Arbitrage scan for:", searchTerm, "| min margin:", minMargin);

    // Filter platforms
    const selectedPlatforms =
      platforms && Array.isArray(platforms) && platforms.length > 0
        ? ALL_PLATFORMS.filter((p) => platforms.includes(p.name))
        : ALL_PLATFORMS;

    // ── Parallel: search+scrape all platforms + get Vinted baseline ──
    const [platformResults, vintedSummary] = await Promise.all([
      Promise.all(
        selectedPlatforms.map((p) => searchAndScrapePlatform(p, searchTerm, FIRECRAWL_API_KEY))
      ),
      getVintedSummary(searchTerm, APIFY_API_TOKEN, FIRECRAWL_API_KEY),
    ]);

    // Flatten all scraped listings
    const allScraped: ScrapedListing[] = platformResults.flatMap((p) => p.scraped);
    console.log(`Total scraped listings with real prices: ${allScraped.length}`);

    if (allScraped.length === 0) {
      return new Response(
        JSON.stringify({
          opportunities: [],
          search_term: searchTerm,
          platforms_searched: selectedPlatforms.map((p) => p.name),
          total_found: 0,
          message: "No listings with extractable prices found. Try a different search term.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build structured data string for AI (with REAL prices)
    const scrapedDataStr = allScraped
      .map(
        (s, i) =>
          `  ${i + 1}. [${s.platform}] "${s.title}" | price_gbp: £${s.price_gbp} (original: ${s.currency} ${s.price_original}) | condition: ${s.condition || "Unknown"} | auction: ${s.is_auction} | shipping: ${s.shipping_cost != null ? `£${s.shipping_cost}` : "Unknown"} | url: ${s.url}`
      )
      .join("\n");

    const prompt = buildPrompt(searchTerm, minMargin, scrapedDataStr, vintedSummary);

    // ── AI analysis ──
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
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    let rawOpportunities: any[];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array in AI response");
      rawOpportunities = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse arbitrage data from AI");
    }

    // ── Post-AI validation against real scraped prices ──
    const opportunities = validateOpportunities(rawOpportunities, allScraped, minMargin);
    console.log(
      `AI returned ${rawOpportunities.length} opportunities, ${opportunities.length} passed validation`
    );

    // Store validated opportunities
    if (opportunities.length > 0) {
      const rows = opportunities.map((o: any) => ({
        user_id: user.id,
        source_platform: o.source_platform || "eBay",
        source_url: o.source_url,
        source_title: o.source_title,
        source_price: o.source_price,
        vinted_estimated_price: o.vinted_estimated_price,
        estimated_profit: o.estimated_profit,
        profit_margin: o.profit_margin,
        brand: o.brand || brand,
        category: o.category || category,
        condition: o.condition,
        ai_notes: o.ai_notes,
        deal_score: o.deal_score,
        risk_level: o.risk_level,
        estimated_days_to_sell: o.estimated_days_to_sell,
        demand_indicator: o.demand_indicator,
        suggested_listing_title: o.suggested_listing_title,
        shipping_estimate: o.shipping_estimate,
        net_profit: o.net_profit,
      }));

      await serviceClient.from("arbitrage_opportunities").insert(rows);
    }

    return new Response(
      JSON.stringify({
        opportunities,
        search_term: searchTerm,
        platforms_searched: selectedPlatforms.map((p) => p.name),
        total_found: opportunities.length,
        total_scraped: allScraped.length,
        total_before_validation: rawOpportunities.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Arbitrage scan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
