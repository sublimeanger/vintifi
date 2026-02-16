import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url || !url.includes("vinted")) {
      return new Response(
        JSON.stringify({ error: "A valid Vinted URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ error: "Scraping service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Scraping Vinted URL:", url);

    // Scrape the listing page
    const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "links"],
        onlyMainContent: true,
        waitFor: 2000,
      }),
    });

    if (!scrapeRes.ok) {
      const errText = await scrapeRes.text();
      console.error("Firecrawl error:", scrapeRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Failed to scrape listing" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const scrapeData = await scrapeRes.json();
    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};

    if (!markdown) {
      return new Response(
        JSON.stringify({ error: "No content found at this URL" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI to extract structured data from the scraped content
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: "You extract listing details from Vinted page content. Return ONLY valid JSON, no markdown fences.",
          },
          {
            role: "user",
            content: `Extract listing details from this Vinted page content. Return a JSON object with these fields (use null if not found):

{
  "title": "<listing title>",
  "brand": "<brand name>",
  "category": "<one of: Tops, T-shirts, Shirts, Hoodies, Jumpers, Jackets, Coats, Jeans, Trousers, Shorts, Skirts, Dresses, Shoes, Trainers, Boots, Sandals, Bags, Accessories, Jewellery, Watches, Sportswear, Vintage, Other>",
  "size": "<size as shown>",
  "condition": "<one of: New with tags, New without tags, Very Good, Good, Satisfactory>",
  "description": "<listing description text>",
  "price": <number in GBP or null>,
  "photos": [<array of image URLs found>]
}

Page title: ${metadata.title || ""}
Page content:
${markdown.substring(0, 3000)}`,
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      console.error("AI error:", aiRes.status);
      // Return raw metadata as fallback
      return new Response(
        JSON.stringify({
          title: metadata.title || null,
          brand: null,
          category: null,
          size: null,
          condition: null,
          description: null,
          price: null,
          photos: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiRes.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let extracted;
    try {
      extracted = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI extraction:", content);
      extracted = {
        title: metadata.title || null,
        brand: null, category: null, size: null, condition: null,
        description: null, price: null, photos: [],
      };
    }

    console.log("Extracted listing:", extracted.title);
    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scrape-vinted-url error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
