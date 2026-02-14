import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url, brand, category, condition } = await req.json();

    // Auth
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
      `${supabaseUrl}/rest/v1/usage_credits?user_id=eq.${userId}&select=price_checks_used,credits_limit`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    const creditsData = await creditsRes.json();
    if (creditsData.length > 0) {
      const c = creditsData[0];
      if (c.price_checks_used >= c.credits_limit) {
        return new Response(
          JSON.stringify({ error: "Monthly price check limit reached. Upgrade your plan for more." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Build search query for Firecrawl
    let searchQuery = "";
    if (url && url.includes("vinted")) {
      // Scrape the URL first to get item details
      const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
      if (!firecrawlKey) throw new Error("Firecrawl not configured");

      const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
      });
      const scrapeData = await scrapeRes.json();
      const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";

      // Extract item details from markdown
      searchQuery = `vinted ${markdown.substring(0, 300)}`;
    } else {
      searchQuery = `vinted ${brand || ""} ${category || ""} ${condition || ""}`.trim();
    }

    // Search for comparable items using Firecrawl
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) throw new Error("Firecrawl not configured");

    const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: searchQuery.substring(0, 200),
        limit: 10,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });
    const searchData = await searchRes.json();
    const comparables = searchData.data || [];

    // Build context for AI analysis
    const comparablesSummary = comparables
      .map((r: any, i: number) => `${i + 1}. ${r.title || r.url}: ${r.markdown?.substring(0, 200) || "No details"}`)
      .join("\n");

    // AI Analysis using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI not configured");

    const aiPrompt = `You are a Vinted pricing analyst. Analyse the following market data and provide a structured pricing recommendation.

Item being priced:
- URL: ${url || "N/A"}
- Brand: ${brand || "Unknown"}
- Category: ${category || "Unknown"}  
- Condition: ${condition || "Unknown"}

Comparable items found on the market:
${comparablesSummary || "No comparables found"}

Return a JSON object (no markdown, just raw JSON) with this exact structure:
{
  "recommended_price": <number in GBP>,
  "confidence_score": <integer 0-100>,
  "price_range_low": <number>,
  "price_range_high": <number>,
  "item_title": "<best guess at item title>",
  "item_brand": "<brand>",
  "comparable_items": [
    {"title": "<item title>", "price": <number>, "sold": <boolean>, "days_listed": <number or null>}
  ],
  "ai_insights": "<2-3 paragraphs explaining the pricing rationale in plain English>",
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
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a pricing analyst for Vinted marketplace. Always respond with valid JSON only." },
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
    
    // Clean markdown code fences if present
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
        item_title: report.item_title,
        item_brand: report.item_brand,
        item_category: category || report.item_category,
        item_condition: condition,
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
