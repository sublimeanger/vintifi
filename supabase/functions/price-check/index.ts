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

/** Build a broad search term: brand + generic item type (not the full verbose title) */
function buildSearchTerm(brand: string, category: string, title: string): string {
  // If we have brand + category, that's the best generic search
  if (brand && category) return `${brand} ${category}`;
  // Fall back to title but strip size/condition noise
  if (title) {
    return title
      .replace(/\b(XS|S|M|L|XL|XXL|XXXL|UK\s?\d+)\b/gi, "")
      .replace(/\b(great|good|very good|excellent|new|used|condition)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  return brand || category || "clothing item";
}

// --- Perplexity market research ---

async function fetchViaPerplexity(
  searchTerm: string,
  size: string,
  condition: string,
  perplexityKey: string,
): Promise<{ marketData: string; citations: string[] }> {
  const isNew = isNewCondition(condition);
  const condLabel = conditionLabel(condition);

  // First attempt: specific search with size
  const sizeNote = size ? `, size ${size}` : "";
  const searchQuery = `${searchTerm}${sizeNote} price UK`;

  console.log(`Perplexity search query: "${searchQuery}"`);

  const makeRequest = async (query: string) => {
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
            content: `You are a UK secondhand clothing price researcher. Search Vinted UK, eBay UK, and Depop for real listing prices in GBP (£). Report every price you find — both active listings and sold items. Include ALL conditions (new and used) but label each one clearly. Be thorough and specific.`,
          },
          {
            role: "user",
            content: `I need to price a "${searchTerm}"${sizeNote}${condition ? ` (${condLabel} condition)` : ""} for resale on Vinted UK.

Search vinted.co.uk, ebay.co.uk, and depop.com for this item and report:

1. LIST every specific listing you find with exact prices in £. Format each as: "Title - £XX (Platform, Condition: new/used/very good/etc)"
   Include BOTH new and used listings but clearly label the condition of each one.

2. PRICE RANGE: What's the lowest and highest price you found?

3. SOLD ITEMS: Any recently sold/completed listings? What did they sell for?

4. PLATFORM COMPARISON: How do Vinted prices compare to eBay and Depop for this item?

5. SUPPLY: Roughly how many active listings exist across all platforms?

Be thorough. I need real prices from real listings to make a pricing decision. If you find fewer than 5 exact matches, broaden your search to similar items from the same brand in the same category.`,
          },
        ],
        search_domain_filter: ["vinted.co.uk", "ebay.co.uk", "depop.com"],
        search_recency_filter: "month",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Perplexity error:", res.status, errText);
      throw new Error(`Perplexity search failed: ${res.status}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    const citations: string[] = data.citations || [];
    return { content, citations };
  };

  // First attempt with domain filtering
  let result = await makeRequest(searchQuery);
  console.log(`Perplexity attempt 1: ${result.content.length} chars, ${result.citations.length} citations`);

  // If data is thin (< 800 chars or < 3 citations), retry WITHOUT domain filter and with broader terms
  if (result.content.length < 800 || result.citations.length < 3) {
    console.log("Thin data detected — retrying with broader search...");

    const broadRes = await fetch("https://api.perplexity.ai/chat/completions", {
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
            content: `You are a UK secondhand clothing price researcher. Find real prices in GBP (£) for items on resale platforms. Be thorough — list every price you find.`,
          },
          {
            role: "user",
            content: `What do "${searchTerm}" sell for on UK resale platforms like Vinted, eBay, and Depop?

List specific items with prices in £. Include both active listings and recently sold items. Label each with platform and condition (new/used). I need at least 5-10 price points to understand the market. If exact matches are scarce, include similar items from ${searchTerm.split(" ")[0] || "the same brand"}.`,
          },
        ],
        search_recency_filter: "month",
      }),
    });

    if (broadRes.ok) {
      const broadData = await broadRes.json();
      const broadContent = broadData.choices?.[0]?.message?.content || "";
      const broadCitations: string[] = broadData.citations || [];
      console.log(`Perplexity retry: ${broadContent.length} chars, ${broadCitations.length} citations`);

      // Use the better result
      if (broadContent.length > result.content.length) {
        result = { content: broadContent, citations: broadCitations };
      }
    }
  }

  console.log("Perplexity market data preview:", result.content.substring(0, 500));
  return { marketData: result.content, citations: result.citations };
}

// --- Firecrawl URL extraction ---

async function extractVintedItemContext(
  url: string,
  firecrawlKey: string
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

    // --- Resolve item details ---
    let itemBrand = brand || "";
    let itemCategory = category || "";
    let itemCondition = condition || "";
    let itemSize = size || "";
    let itemTitle = title || "";

    if (url && url.includes("vinted")) {
      const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
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

    // --- Perplexity market research ---
    const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");
    if (!perplexityKey) throw new Error("Perplexity API not configured.");

    const searchTerm = buildSearchTerm(itemBrand, itemCategory, itemTitle);
    console.log(`Search term: "${searchTerm}" | Size: "${itemSize}" | Condition: "${itemCondition}"`);

    const { marketData, citations } = await fetchViaPerplexity(
      searchTerm,
      itemSize,
      itemCondition,
      perplexityKey,
    );

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

    const aiPrompt = `You are a Vinted UK pricing analyst. Analyse the REAL market data below and price this specific item.

ITEM TO PRICE:
- Full description: "${fullItemDesc}"
- Brand: ${itemBrand || "Unknown"}
- Category: ${itemCategory || "Unknown"}
- Size: ${itemSize || "Unknown"}
- Condition: ${condLabel} (${condType})
- URL: ${url || "N/A"}

═══════════════════════════════════════════
LIVE MARKET DATA (from real-time web search):
═══════════════════════════════════════════
${marketData}
${citationsText}

PRICING RULES:
- This item is ${condType} in ${condLabel} condition.
${isNew
  ? "- Price against NEW listings only. Ignore used prices."
  : "- Price against USED/pre-owned listings. Used items typically sell for 40-70% of new listing prices. If the market data mostly shows new items, discount accordingly."
}
- If market data shows prices for BOTH new and used, clearly separate them in condition_price_breakdown and use ONLY the relevant ones for recommended_price.
- If few exact matches exist, use similar items from the same brand/category to estimate.

CALCULATE:
- recommended_price: realistic Vinted sell price for THIS condition
- buy_price_good: sourcing price for 50%+ margin after fees
- buy_price_max: max buy price for 40%+ margin
- estimated_fees: ~5% of resale
- estimated_shipping: £3-5
- net_profit_estimate: resale - fees - shipping

AI INSIGHTS — write exactly 3 paragraphs separated by \\n\\n:

PARAGRAPH 1 — MARKET POSITION: Where this item sits in the market. Reference specific prices from the data. How many comparable listings exist? Is the market crowded or sparse? Use real numbers.

PARAGRAPH 2 — PRICING STRATEGY: "List at £X for 7 days. If no sale, drop to £Y. Accept offers above £Z." Include best day/time to list for this category. Be specific and actionable.

PARAGRAPH 3 — SELLER EDGE: One specific insight — a cross-platform price gap, supply shortage, or demand trend. Must reference data above.

CONSTRAINTS:
- Every sentence must contain a specific £ price, number, or actionable recommendation.
- If data is limited, use what's available and state confidence level — never pad with generic filler.
- Write in plain, direct British English.

Return raw JSON only (no markdown):
{
  "recommended_price": <number>,
  "confidence_score": <integer 0-100>,
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

    const BANNED_WORDS_NOTICE = `BANNED WORDS — NEVER use: elevate, elevated, sophisticated, timeless, versatile, effortless, staple, wardrobe essential, investment piece, must-have, perfect addition, stunning, gorgeous, absolutely, boasts, game-changer, trendy, chic, standout, exquisite, premium quality, top-notch, level up.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `Vinted UK pricing analyst. Return valid JSON only. Be precise. ${BANNED_WORDS_NOTICE}` },
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
