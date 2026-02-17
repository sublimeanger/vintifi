import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- Data fetching helpers ---

async function fetchViaApify(searchQuery: string, apifyToken: string): Promise<any[] | null> {
  try {
    const actorId = "kazkn~vinted-smart-scraper";
    const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${apifyToken}&timeout=120`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "SEARCH",
        searchQuery: searchQuery.substring(0, 100),
        country: "uk",
        maxItems: 20,
      }),
    });

    if (!res.ok) {
      console.error("Apify error:", res.status, await res.text());
      return null;
    }

    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) return null;
    return items;
  } catch (e) {
    console.error("Apify fetch failed:", e);
    return null;
  }
}

async function fetchViaFirecrawl(searchQuery: string, firecrawlKey: string): Promise<any[]> {
  const res = await fetch("https://api.firecrawl.dev/v1/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `site:vinted.co.uk ${searchQuery.substring(0, 200)}`,
      limit: 10,
      scrapeOptions: { formats: ["markdown"] },
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

function formatApifyComparables(items: any[]): string {
  return items
    .map((item: any, i: number) => {
      const title = item.title || "Unknown";
      const price = item.price != null ? `£${item.price}` : "N/A";
      const brand = item.brand_title || item.brand || "Unknown";
      const size = item.size_title || "";
      const views = item.view_count ?? "N/A";
      const favs = item.favourite_count ?? "N/A";
      const status = item.status || "active";
      const url = item.url || "";
      const condition = item.status_label || "Unknown";
      return `${i + 1}. ${title} | Brand: ${brand} | Price: ${price} | Size: ${size} | Condition: ${condition} | Views: ${views} | Favourites: ${favs} | Status: ${status} | URL: ${url}`;
    })
    .join("\n");
}

function formatFirecrawlComparables(items: any[]): string {
  return items
    .map((r: any, i: number) => `${i + 1}. ${r.title || r.url}: ${r.markdown?.substring(0, 200) || "No details"}`)
    .join("\n");
}

// --- Main handler ---

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url, brand, category, condition, itemId } = await req.json();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get user
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: supabaseKey },
    });
    const userData = await userRes.json();
    const userId = userData.id;
    if (!userId) throw new Error("Invalid user");

    // Check credits (unified pool)
    const creditsRes = await fetch(
      `${supabaseUrl}/rest/v1/usage_credits?user_id=eq.${userId}&select=price_checks_used,optimizations_used,vintography_used,credits_limit`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    const creditsData = await creditsRes.json();
    if (creditsData.length > 0) {
      const c = creditsData[0];
      if (c.credits_limit < 999) {
        const totalUsed = (c.price_checks_used || 0) + (c.optimizations_used || 0) + (c.vintography_used || 0);
        if (totalUsed >= c.credits_limit) {
          return new Response(
            JSON.stringify({ error: "Monthly credit limit reached. Upgrade your plan for more." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Build search query
    let searchQuery = "";
    if (url && url.includes("vinted")) {
      // Extract item details from URL via Firecrawl scrape for context
      const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
      if (firecrawlKey) {
        try {
          const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
          });
          const scrapeData = await scrapeRes.json();
          const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
          searchQuery = markdown.substring(0, 300);
        } catch {
          searchQuery = url;
        }
      } else {
        searchQuery = url;
      }
    } else {
      searchQuery = [brand, category, condition].filter(Boolean).join(" ");
    }

    // --- Hybrid data fetching: Apify primary, Firecrawl fallback ---
    const apifyToken = Deno.env.get("APIFY_API_TOKEN");
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

    let comparablesSummary = "";
    let dataSource = "none";

    if (apifyToken) {
      const apifyItems = await fetchViaApify(searchQuery, apifyToken);
      if (apifyItems && apifyItems.length > 0) {
        comparablesSummary = formatApifyComparables(apifyItems);
        dataSource = "apify";
        console.log(`Apify returned ${apifyItems.length} structured results`);
      }
    }

    // Fallback to Firecrawl if Apify failed or not configured
    if (!comparablesSummary && firecrawlKey) {
      const fcItems = await fetchViaFirecrawl(searchQuery, firecrawlKey);
      if (fcItems.length > 0) {
        comparablesSummary = formatFirecrawlComparables(fcItems);
        dataSource = "firecrawl";
        console.log(`Firecrawl fallback returned ${fcItems.length} results`);
      }
    }

    // AI Analysis
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI not configured");

    const dataSourceNote = dataSource === "apify"
      ? "The comparable items below are STRUCTURED DATA from Vinted with exact prices, view counts, and favourite counts. Use these real numbers for your analysis."
      : "The comparable items below are web search snippets. Estimate prices and metrics from the text.";

    const aiPrompt = `You are a Vinted pricing analyst specialising in the UK secondhand market. Analyse the following market data and provide a comprehensive pricing report.

Item being priced:
- URL: ${url || "N/A"}
- Brand: ${brand || "Unknown"}
- Category: ${category || "Unknown"}  
- Condition: ${condition || "Unknown"}

${dataSourceNote}

Comparable items found on the market:
${comparablesSummary || "No comparables found"}

IMPORTANT INSTRUCTIONS:
1. DIFFERENTIATE between NEW and USED items. New items (with or without tags) command significantly higher prices.
2. Calculate RESELLER buy/sell prices:
   - "buy_price_good": A great sourcing price (50%+ margin after fees)
   - "buy_price_max": Max price to pay and still profit (40%+ margin on resale)
   - "estimated_resale": Realistic sell price on Vinted
3. Estimate DEMAND LEVEL based on views, favourites, and sold vs active ratio.
4. Provide CONDITION PRICE BREAKDOWN.
5. Calculate FEES: estimated_fees ~5% of resale, estimated_shipping £3-5.
6. net_profit_estimate = estimated_resale - estimated_fees - estimated_shipping

═══════════════════════════════════════════
AI INSIGHTS — STRICT REQUIREMENTS
═══════════════════════════════════════════
The "ai_insights" field MUST contain exactly 3 focused paragraphs separated by \\n\\n:

PARAGRAPH 1 — MARKET POSITION (2-3 sentences):
Where this SPECIFIC item sits in the current market RIGHT NOW. Reference actual comparable prices from the data above. State how many comparable listings are currently active and whether the market is saturated or underserved for this exact item. Every sentence must contain a specific number from the data.

PARAGRAPH 2 — PRICING STRATEGY (2-3 sentences):
Concrete, actionable advice with specific numbers. Example format: "List at £X for the first 7 days. If no sale, drop to £Y. Accept offers above £Z." Include the best day and time to list based on the category (weekday evenings for menswear, Sunday evenings for womenswear, Saturday mornings for kids). State whether to accept offers immediately or hold firm for the first week.

PARAGRAPH 3 — SELLER EDGE (1-2 sentences):
One specific competitive insight that gives the seller an advantage. Examples: "Only 3 of these in size M are currently listed on Vinted UK" or "Nike crewnecks have seen a 20% price increase over the last 30 days" or "Bundle with another Nike item — bundled listings sell 40% faster on Vinted." This must be data-backed and specific to THIS item.

ABSOLUTE CONSTRAINTS FOR AI INSIGHTS:
- Your insights must ONLY reference the specific item being priced and the comparable data provided above.
- NEVER mention unrelated categories, items, or markets (no board games, no electronics, no furniture).
- Every sentence must contain a specific number, price, date, or actionable recommendation.
- If the data is limited, say so honestly — do NOT fill gaps with generic advice or unrelated information.

Return a JSON object (no markdown, just raw JSON) with this exact structure:
{
  "recommended_price": <number in GBP>,
  "confidence_score": <integer 0-100>,
  "price_range_low": <number>,
  "price_range_high": <number>,
  "item_title": "<best guess at item title>",
  "item_brand": "<brand>",
  "condition_detected": "<new_with_tags | new_without_tags | very_good | good | satisfactory>",
  "buy_price_good": <number>,
  "buy_price_max": <number>,
  "estimated_resale": <number>,
  "estimated_days_to_sell": <number>,
  "demand_level": "<high | medium | low>",
  "condition_price_breakdown": [
    {"condition": "New with tags", "avg_price": <number>, "count": <number>},
    {"condition": "New without tags", "avg_price": <number>, "count": <number>},
    {"condition": "Very good", "avg_price": <number>, "count": <number>},
    {"condition": "Good", "avg_price": <number>, "count": <number>},
    {"condition": "Satisfactory", "avg_price": <number>, "count": <number>}
  ],
  "estimated_fees": <number>,
  "estimated_shipping": <number>,
  "net_profit_estimate": <number>,
  "comparable_items": [
    {"title": "<item title>", "price": <number>, "sold": <boolean>, "days_listed": <number or null>, "condition": "<condition grade>"}
  ],
  "ai_insights": "<3 paragraphs as specified above, separated by \\n\\n>",
  "price_distribution": [
    {"range": "£0-5", "count": <number>},
    {"range": "£5-10", "count": <number>},
    {"range": "£10-15", "count": <number>},
    {"range": "£15-20", "count": <number>},
    {"range": "£20-30", "count": <number>},
    {"range": "£30+", "count": <number>}
  ]
}`;

    const BANNED_WORDS_NOTICE = `BANNED WORDS — NEVER use any of these words or phrases in any field: elevate, elevated, sophisticated, timeless, versatile, effortless, staple, wardrobe essential, investment piece, must-have, perfect addition, stunning, gorgeous, absolutely, boasts, game-changer, trendy, chic, standout, exquisite, premium quality, top-notch, level up, take your wardrobe to the next level. Write in plain, direct British English.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: `You are a pricing analyst for Vinted UK marketplace. Always respond with valid JSON only. Be precise with numbers and realistic with estimates. ${BANNED_WORDS_NOTICE}` },
          { role: "user", content: aiPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      if (aiRes.status === 429) throw new Error("AI rate limit reached. Try again in a moment.");
      if (aiRes.status === 402) throw new Error("AI credits exhausted.");
      throw new Error("AI analysis failed");
    }

    const aiData = await aiRes.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let report;
    try {
      report = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("AI returned invalid response");
    }

    // Save report to database
    await fetch(`${supabaseUrl}/rest/v1/price_reports`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        user_id: userId,
        listing_id: itemId || null,
        item_title: report.item_title,
        item_brand: report.item_brand,
        item_category: category || report.item_category,
        item_condition: condition || report.condition_detected,
        recommended_price: report.recommended_price,
        confidence_score: report.confidence_score,
        price_range_low: report.price_range_low,
        price_range_high: report.price_range_high,
        comparable_items: report.comparable_items,
        ai_insights: report.ai_insights,
        price_distribution: report.price_distribution,
        search_query: searchQuery.substring(0, 500),
        vinted_url: url || null,
      }),
    });

    // Increment usage
    await fetch(
      `${supabaseUrl}/rest/v1/usage_credits?user_id=eq.${userId}`,
      {
        method: "PATCH",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ price_checks_used: (creditsData[0]?.price_checks_used || 0) + 1 }),
      }
    );

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("price-check error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
