import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- Helpers ---

function isNewCondition(condition: string): boolean {
  const c = condition.toLowerCase().replace(/[\s_-]+/g, "_");
  return c === "new_with_tags" || c === "new_without_tags";
}

function conditionLabel(condition: string): string {
  const c = condition.toLowerCase().replace(/[\s_-]+/g, "_");
  const map: Record<string, string> = {
    new_with_tags: "New with tags",
    new_without_tags: "New without tags",
    very_good: "Very good",
    good: "Good",
    satisfactory: "Satisfactory",
  };
  return map[c] || condition;
}

/**
 * Build a specific Vinted search term — prioritises item title for specificity.
 * "Nike crewneck jumper mens black M" → "Nike crewneck jumper"
 */
function buildVintedSearchTerm(brand: string, category: string, title: string): string {
  if (title) {
    return title
      .replace(/\b(XS|S|M|L|XL|XXL|XXXL|UK\s?\d+|\d+\s?cm|\d+\s?inch)\b/gi, "")
      .replace(/\b(great|good|very good|excellent|condition|new|used|worn|pristine)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim()
      .substring(0, 60);
  }
  if (brand && category) return `${brand} ${category}`;
  return brand || category || "clothing item";
}

/**
 * Build a Vinted catalog search URL with condition filter.
 */
function buildVintedSearchUrl(brand: string, category: string, title: string, condition: string): string {
  const searchText = buildVintedSearchTerm(brand, category, title);

  // Vinted condition IDs
  const conditionMap: Record<string, string> = {
    new_with_tags: "6",
    new_without_tags: "1",
    very_good: "2",
    good: "3",
    satisfactory: "4",
  };
  const normCondition = condition.toLowerCase().replace(/[\s-]/g, "_");
  const conditionId = conditionMap[normCondition];

  const params = new URLSearchParams({ search_text: searchText, order: "relevance" });
  if (conditionId) params.set("catalog[]", conditionId);

  return `https://www.vinted.co.uk/catalog?${params.toString()}`;
}

/**
 * Compute median of a number array.
 */
function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// --- Firecrawl: Scrape live Vinted search results ---

async function scrapeVintedPrices(
  brand: string,
  category: string,
  title: string,
  condition: string,
  firecrawlKey: string,
): Promise<{ prices: number[]; listings: string; searchUrl: string }> {
  const searchUrl = buildVintedSearchUrl(brand, category, title, condition);
  console.log(`Firecrawl scraping Vinted: ${searchUrl}`);

  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url: searchUrl,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    const data = await res.json();
    const markdown: string = data.data?.markdown || data.markdown || "";
    console.log(`Firecrawl returned ${markdown.length} chars of markdown`);

    // Extract £X or £X.XX prices from the rendered page
    const priceMatches = markdown.match(/£(\d+(?:\.\d{2})?)/g) || [];
    const prices = priceMatches
      .map((p) => parseFloat(p.replace("£", "")))
      .filter((p) => p > 0.5 && p < 500);

    console.log(`Extracted ${prices.length} prices from Vinted: ${prices.slice(0, 10).join(", ")}`);

    return {
      prices,
      listings: markdown.substring(0, 4000),
      searchUrl,
    };
  } catch (e) {
    console.error("Firecrawl Vinted scrape failed:", e);
    return { prices: [], listings: "", searchUrl };
  }
}

// --- Perplexity: Broad secondhand market context (NOT primary price source) ---

async function fetchViaPerplexity(
  searchTerm: string,
  size: string,
  condition: string,
  perplexityKey: string,
): Promise<{ marketData: string; citations: string[] }> {
  const condLabel = conditionLabel(condition);
  const sizeNote = size ? `, size ${size}` : "";

  // No domain filter — use Perplexity for what it's good at: broad context
  const query = `What price range do "${searchTerm}"${sizeNote} sell for secondhand in the UK? Include eBay, Depop, charity shop and resale market context. What is the typical Vinted price range versus eBay? How does demand look?`;

  console.log(`Perplexity context query: "${query}"`);

  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${perplexityKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content: `You are a UK secondhand clothing market analyst. Provide broad market context, platform comparisons, and demand signals for items. Focus on UK resale prices across eBay, Depop, Vinted and charity shops. Note that Vinted prices are typically 50-70% LOWER than eBay because Vinted has zero seller fees.`,
          },
          {
            role: "user",
            content: query,
          },
        ],
        search_recency_filter: "month",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Perplexity error:", res.status, errText);
      return { marketData: "", citations: [] };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    const citations: string[] = data.citations || [];
    console.log(`Perplexity context: ${content.length} chars, ${citations.length} citations`);
    return { marketData: content, citations };
  } catch (e) {
    console.error("Perplexity failed:", e);
    return { marketData: "", citations: [] };
  }
}

// --- Firecrawl: Extract item context from Vinted listing URL ---

async function extractVintedItemContext(
  url: string,
  firecrawlKey: string,
): Promise<{ brand: string; title: string; category: string; condition: string; size: string }> {
  try {
    const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    });
    const scrapeData = await scrapeRes.json();
    const markdown: string = scrapeData.data?.markdown || scrapeData.markdown || "";

    const titleMatch = markdown.match(/^#\s+(.+)/m);
    const brandMatch = markdown.match(/brand[:\s]+([^\n|]+)/i);
    const sizeMatch = markdown.match(/size[:\s]+([^\n|]+)/i);
    const conditionMatch = markdown.match(/condition[:\s]+([^\n|]+)/i);
    const categoryMatch = markdown.match(/category[:\s]+([^\n|]+)/i);

    return {
      title: titleMatch?.[1]?.trim() || "",
      brand: brandMatch?.[1]?.trim() || "",
      category: categoryMatch?.[1]?.trim() || "",
      condition: conditionMatch?.[1]?.trim() || "",
      size: sizeMatch?.[1]?.trim() || "",
    };
  } catch (e) {
    console.error("Firecrawl context extraction failed:", e);
    return { brand: "", title: "", category: "", condition: "", size: "" };
  }
}

// --- Main handler ---

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url, brand, category, condition, size, itemId, title } = await req.json();

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

    // Check credits
    const creditsRes = await fetch(
      `${supabaseUrl}/rest/v1/usage_credits?user_id=eq.${userId}&select=price_checks_used,optimizations_used,vintography_used,credits_limit`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } },
    );
    const creditsData = await creditsRes.json();
    if (creditsData.length > 0) {
      const c = creditsData[0];
      if (c.credits_limit < 999) {
        const totalUsed = (c.price_checks_used || 0) + (c.optimizations_used || 0) + (c.vintography_used || 0);
        if (totalUsed >= c.credits_limit) {
          return new Response(
            JSON.stringify({ error: "Monthly credit limit reached. Upgrade your plan for more." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    // --- Resolve item details ---
    let itemBrand = brand || "";
    let itemCategory = category || "";
    let itemCondition = condition || "";
    let itemSize = size || "";
    let itemTitle = title || "";

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

    if (url && url.includes("vinted")) {
      if (firecrawlKey) {
        const context = await extractVintedItemContext(url, firecrawlKey);
        itemBrand = itemBrand || context.brand;
        itemCategory = itemCategory || context.category || context.title;
        itemCondition = itemCondition || context.condition;
        itemSize = itemSize || context.size;
        itemTitle = itemTitle || context.title;
        console.log("Extracted from Vinted URL:", JSON.stringify(context));
      }
    }

    const searchTerm = buildVintedSearchTerm(itemBrand, itemCategory, itemTitle);
    console.log(`Search term: "${searchTerm}" | Size: "${itemSize}" | Condition: "${itemCondition}"`);

    // --- Run Firecrawl Vinted scrape + Perplexity context in parallel ---
    const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");
    if (!perplexityKey) throw new Error("Perplexity API not configured.");
    if (!firecrawlKey) throw new Error("Firecrawl API not configured.");

    const [vintedScrape, { marketData, citations }] = await Promise.all([
      scrapeVintedPrices(itemBrand, itemCategory, itemTitle, itemCondition, firecrawlKey),
      fetchViaPerplexity(searchTerm, itemSize, itemCondition, perplexityKey),
    ]);

    // Compute Vinted price statistics
    const vintedPrices = vintedScrape.prices;
    const vintedMedian = median(vintedPrices);
    const vintedMin = vintedPrices.length > 0 ? Math.min(...vintedPrices) : 0;
    const vintedMax = vintedPrices.length > 0 ? Math.max(...vintedPrices) : 0;
    const lowConfidence = vintedPrices.length < 3;

    console.log(`Vinted live data: ${vintedPrices.length} prices, median £${vintedMedian}, range £${vintedMin}–£${vintedMax}`);

    // Confidence cap based on data quality
    const maxConfidence = vintedPrices.length >= 5 ? 95 : vintedPrices.length >= 3 ? 80 : 60;

    // --- AI Analysis ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI not configured");

    const citationsText = citations.length > 0
      ? `\n\nSource URLs:\n${citations.map((c, i) => `${i + 1}. ${c}`).join("\n")}`
      : "";

    const isNew = isNewCondition(itemCondition);
    const condType = isNew ? "NEW" : "USED";
    const condLabel = conditionLabel(itemCondition);
    const fullItemDesc = itemTitle || [itemBrand, itemCategory, itemSize].filter(Boolean).join(" ");

    // Build SOURCE 1 section
    let source1Text: string;
    if (vintedPrices.length >= 3) {
      source1Text = `SOURCE 1 — VINTED UK LIVE PRICES (ground truth — HIGHEST WEIGHT):
Scraped directly from: ${vintedScrape.searchUrl}
Actual prices found: ${vintedPrices.slice(0, 20).map(p => `£${p}`).join(", ")}
Computed stats: Median £${vintedMedian.toFixed(2)}, Range £${vintedMin}–£${vintedMax}, N=${vintedPrices.length} listings

Raw listing content (first 3000 chars of search results):
${vintedScrape.listings}

⚠️ CRITICAL PRICING RULE: The recommended_price MUST be within ±30% of the Vinted median (£${vintedMedian.toFixed(2)}).
The Vinted live prices above are the ground truth. Do NOT adjust upward toward eBay prices.`;
    } else {
      source1Text = `SOURCE 1 — VINTED UK LIVE PRICES (LIMITED DATA — low confidence):
Scraped from: ${vintedScrape.searchUrl}
Only ${vintedPrices.length} price(s) found: ${vintedPrices.map(p => `£${p}`).join(", ") || "none"}
Vinted JavaScript may not have rendered fully. Use SOURCE 2 but apply 50-60% discount from eBay prices.

IMPORTANT: Vinted prices are typically 50-70% LOWER than eBay because Vinted has zero seller fees.
A Nike jumper at £20 on eBay would typically be £6-10 on Vinted.`;
    }

    const aiPrompt = `You are a Vinted UK pricing analyst. Analyse the REAL market data below and price this specific item ACCURATELY for Vinted UK.

ITEM TO PRICE:
- Full description: "${fullItemDesc}"
- Brand: ${itemBrand || "Unknown"}
- Category: ${itemCategory || "Unknown"}
- Size: ${itemSize || "Unknown"}
- Condition: ${condLabel} (${condType})
- URL: ${url || "N/A"}

═══════════════════════════════════════════
PRICING DATA — TWO SOURCES:
═══════════════════════════════════════════

${source1Text}

───────────────────────────────────────────
SOURCE 2 — BROADER MARKET CONTEXT (eBay/Depop reference — lower weight):
───────────────────────────────────────────
${marketData || "No broader market data available."}
${citationsText}

═══════════════════════════════════════════
CRITICAL PRICING RULES:
═══════════════════════════════════════════
1. SOURCE 1 (Vinted live prices) is the GROUND TRUTH. Base recommended_price on these.
2. Vinted prices are typically 50-70% LOWER than eBay prices because Vinted has zero seller fees.
3. If SOURCE 1 has ≥3 prices: recommended_price MUST be within ±30% of the computed Vinted median.
4. If SOURCE 1 has <3 prices: use SOURCE 2 but discount eBay prices by 55% to estimate Vinted price.
5. Do NOT anchor to eBay/Depop prices as if they were Vinted prices.
6. A used Nike basic crewneck sweatshirt on Vinted typically sells for £5-15, NOT £20-30.

ITEM CONDITION:
- This item is ${condType} in ${condLabel} condition.
${isNew
    ? "- Price against NEW listings only."
    : "- Price against USED/pre-owned Vinted listings. This is what Vinted buyers actually pay."
  }

CALCULATE:
- recommended_price: realistic Vinted sell price (ANCHORED TO VINTED LIVE DATA)
- buy_price_good: sourcing price for 50%+ margin after fees
- buy_price_max: max buy price for 40%+ margin
- estimated_fees: ~5% of resale (Vinted has no seller fees, buyer pays protection fee)
- estimated_shipping: £3-5
- net_profit_estimate: resale - fees - shipping - purchase_price (use buy_price_good)
- confidence_score: maximum ${maxConfidence} (data quality cap)${lowConfidence ? " — MUST be ≤60 due to limited Vinted data" : ""}

AI INSIGHTS — write exactly 3 paragraphs separated by \\n\\n:

PARAGRAPH 1 — MARKET POSITION: Where this item sits in the Vinted market specifically. Reference the actual Vinted prices from SOURCE 1. How competitive is the market? Use real numbers.

PARAGRAPH 2 — PRICING STRATEGY: "List at £X for 7 days. If no sale, drop to £Y. Accept offers above £Z." Be specific and actionable with real Vinted-appropriate prices.

PARAGRAPH 3 — SELLER EDGE: One specific insight about cross-platform price gaps, demand, or timing. Must reference real data.

CONSTRAINTS:
- Every sentence must contain a specific £ price, number, or actionable recommendation.
- Write in plain, direct British English.
- BANNED WORDS: elevate, sophisticated, timeless, versatile, effortless, staple, wardrobe essential, investment piece, must-have, stunning, gorgeous, boasts, game-changer, trendy, chic, exquisite, premium quality.

Return raw JSON only (no markdown):
{
  "recommended_price": <number>,
  "confidence_score": <integer 0-${maxConfidence}>,
  "price_range_low": <number>,
  "price_range_high": <number>,
  "item_title": "<descriptive title>",
  "item_brand": "<brand>",
  "condition_detected": "<new_with_tags|new_without_tags|very_good|good|satisfactory>",
  "buy_price_good": <number>,
  "buy_price_max": <number>,
  "estimated_resale": <number>,
  "estimated_days_to_sell": <number>,
  "demand_level": "<high|medium|low>",
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
    {"title": "<title>", "price": <number>, "sold": <boolean>, "days_listed": <number|null>, "condition": "<condition>"}
  ],
  "ai_insights": "<3 paragraphs separated by \\n\\n>",
  "price_distribution": [
    {"range": "£0-5", "count": <number>},
    {"range": "£5-10", "count": <number>},
    {"range": "£10-15", "count": <number>},
    {"range": "£15-20", "count": <number>},
    {"range": "£20-30", "count": <number>},
    {"range": "£30+", "count": <number>}
  ]
}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Vinted UK pricing analyst. Return valid JSON only. Be precise. Ground all prices in Vinted UK reality — items sell for significantly less on Vinted than eBay due to zero seller fees.`,
          },
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

    // Enforce confidence cap
    if (report.confidence_score > maxConfidence) {
      report.confidence_score = maxConfidence;
    }

    // Save report
    const searchQuery = [itemBrand, itemCategory || itemTitle, itemSize].filter(Boolean).join(" ");
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
      },
    );

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("price-check error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
