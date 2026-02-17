import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- Perplexity market research ---

async function fetchViaPerplexity(
  brand: string,
  category: string,
  size: string,
  condition: string,
  perplexityKey: string
): Promise<{ marketData: string; citations: string[] }> {
  const itemDesc = [brand, category, size].filter(Boolean).join(" ");
  const conditionNote = condition ? ` in ${condition.replace(/_/g, " ")} condition` : "";

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
          content:
            "You are a secondhand clothing market price researcher. You MUST search for and report SPECIFIC prices in GBP (£) that you find on Vinted, eBay, and Depop. List individual items with their exact prices. Never say you cannot access these sites — search for them and report what you find.",
        },
        {
          role: "user",
          content: `Find current prices for "${itemDesc}"${conditionNote} on UK resale platforms.

Search Vinted UK, eBay UK, and Depop for this item and tell me:

1. List at least 5 specific items you find with their exact prices in £. Format: "Item title - £X.XX (platform, condition)"
2. What is the price range? Lowest: £? Highest: £?
3. What is the average/median selling price?
4. How many listings did you find approximately?
5. Are there any sold/completed listings with prices?
6. How do prices compare across Vinted vs eBay vs Depop?

I need REAL prices from REAL listings. Be specific.`,
        },
      ],
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

  console.log(`Perplexity returned ${content.length} chars with ${citations.length} citations`);
  console.log("Perplexity market data:", content.substring(0, 500));
  return { marketData: content, citations };
}

// --- Optional: Extract context from a Vinted URL via Firecrawl ---

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

    // Extract structured fields from the markdown
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
    const { url, brand, category, condition, size, itemId } = await req.json();

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

    // --- Resolve item details ---
    let itemBrand = brand || "";
    let itemCategory = category || "";
    let itemCondition = condition || "";
    let itemSize = size || "";
    let itemTitle = "";

    // If a Vinted URL is provided, extract context via Firecrawl
    if (url && url.includes("vinted")) {
      const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
      if (firecrawlKey) {
        const context = await extractVintedItemContext(url, firecrawlKey);
        itemBrand = itemBrand || context.brand;
        itemCategory = itemCategory || context.category || context.title;
        itemCondition = itemCondition || context.condition;
        itemSize = itemSize || context.size;
        itemTitle = context.title;
        console.log("Extracted from Vinted URL:", JSON.stringify(context));
      }
    }

    // --- Perplexity market research ---
    const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");
    if (!perplexityKey) throw new Error("Perplexity API not configured. Please connect Perplexity in project settings.");

    const searchDesc = itemTitle || [itemBrand, itemCategory].filter(Boolean).join(" ");
    console.log(`Running Perplexity search for: "${searchDesc}" size: "${itemSize}" condition: "${itemCondition}"`);

    const { marketData, citations } = await fetchViaPerplexity(
      itemBrand,
      itemCategory || itemTitle,
      itemSize,
      itemCondition,
      perplexityKey
    );

    // --- AI Analysis via Gemini ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI not configured");

    const citationsText = citations.length > 0
      ? `\n\nSource URLs (citations from real-time web search):\n${citations.map((c, i) => `${i + 1}. ${c}`).join("\n")}`
      : "";

    const aiPrompt = `You are a Vinted pricing analyst specialising in the UK secondhand market. Analyse the following REAL-TIME market research data gathered from live searches across Vinted, eBay, and Depop.

Item being priced:
- URL: ${url || "N/A"}
- Brand: ${itemBrand || "Unknown"}
- Category: ${itemCategory || itemTitle || "Unknown"}
- Size: ${itemSize || "Unknown"}
- Condition: ${itemCondition || "Unknown"}

═══════════════════════════════════════════
REAL-TIME MARKET DATA (from Perplexity AI search):
═══════════════════════════════════════════
${marketData}
${citationsText}

IMPORTANT INSTRUCTIONS:
1. The market data above is from a LIVE web search conducted moments ago. Use the specific prices, listings, and trends mentioned.
2. DIFFERENTIATE between NEW and USED items. New items command significantly higher prices.
3. Calculate RESELLER buy/sell prices:
   - "buy_price_good": A great sourcing price (50%+ margin after fees)
   - "buy_price_max": Max price to pay and still profit (40%+ margin on resale)
   - "estimated_resale": Realistic sell price on Vinted
4. Estimate DEMAND LEVEL based on the number of listings, price clustering, and market activity described above.
5. Provide CONDITION PRICE BREAKDOWN based on the data.
6. Calculate FEES: estimated_fees ~5% of resale, estimated_shipping £3-5.
7. net_profit_estimate = estimated_resale - estimated_fees - estimated_shipping

═══════════════════════════════════════════
AI INSIGHTS — STRICT REQUIREMENTS
═══════════════════════════════════════════
The "ai_insights" field MUST contain exactly 3 focused paragraphs separated by \\n\\n:

PARAGRAPH 1 — MARKET POSITION (2-3 sentences):
Where this SPECIFIC item sits in the current market RIGHT NOW. Reference actual prices from the market data above. State how many comparable listings are currently active and whether the market is saturated or underserved. Every sentence must contain a specific number from the data.

PARAGRAPH 2 — PRICING STRATEGY (2-3 sentences):
Concrete, actionable advice with specific numbers. Example format: "List at £X for the first 7 days. If no sale, drop to £Y. Accept offers above £Z." Include the best day and time to list based on the category. State whether to accept offers immediately or hold firm.

PARAGRAPH 3 — SELLER EDGE (1-2 sentences):
One specific competitive insight backed by the data above. Reference cross-platform price differences, supply gaps, or demand trends. This must be specific to THIS item.

ABSOLUTE CONSTRAINTS FOR AI INSIGHTS:
- Reference ONLY the specific item and the market data provided above.
- NEVER mention unrelated categories or items.
- Every sentence must contain a specific number, price, or actionable recommendation.
- If data is limited, say so honestly — do NOT fill gaps with generic advice.

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
        model: "google/gemini-2.5-flash",
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
