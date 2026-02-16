import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractSlug(url: string): string {
  // "https://www.vinted.co.uk/items/8186759256-gilet" → "gilet"
  const match = url.match(/items\/\d+-(.+?)(?:\?|$)/);
  return match ? match[1].replace(/-/g, " ") : "";
}

function extractItemId(url: string): string | null {
  const match = url.match(/items\/(\d+)/);
  return match ? match[1] : null;
}

function mapCondition(raw: string): string | null {
  const lower = (raw || "").toLowerCase();
  if (lower.includes("new with tags") || lower === "new_with_tags") return "New with tags";
  if (lower.includes("new") || lower === "new_no_tags" || lower === "neuf") return "New without tags";
  if (lower.includes("very good") || lower.includes("très bon")) return "Very Good";
  if (lower.includes("good") || lower.includes("bon")) return "Good";
  if (lower.includes("satisfactory") || lower.includes("satisfaisant")) return "Satisfactory";
  return raw || null;
}

function mapCategory(raw: string): string | null {
  const lower = (raw || "").toLowerCase();
  const map: Record<string, string> = {
    "t-shirt": "T-shirts", "top": "Tops", "shirt": "Shirts", "hoodie": "Hoodies",
    "jumper": "Jumpers", "sweater": "Jumpers", "jacket": "Jackets", "coat": "Coats",
    "jean": "Jeans", "trouser": "Trousers", "short": "Shorts", "skirt": "Skirts",
    "dress": "Dresses", "shoe": "Shoes", "trainer": "Trainers", "boot": "Boots",
    "sandal": "Sandals", "bag": "Bags", "accessor": "Accessories", "jewel": "Jewellery",
    "watch": "Watches", "sport": "Sportswear", "vintage": "Vintage", "gilet": "Jackets",
    "vest": "Jackets",
  };
  for (const [key, val] of Object.entries(map)) {
    if (lower.includes(key)) return val;
  }
  return raw || null;
}

// Primary: Firecrawl scrape + AI extraction (most reliable for single-item URLs)
async function fetchViaFirecrawl(url: string): Promise<any | null> {
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!firecrawlKey) return null;

  try {
    console.log("Firecrawl: scraping", url);
    const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    if (!scrapeRes.ok) {
      console.error("Firecrawl error:", scrapeRes.status);
      return null;
    }

    const scrapeData = await scrapeRes.json();
    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};

    if (!markdown || markdown.length < 50) {
      console.log("Firecrawl: insufficient content, length:", markdown.length);
      return null;
    }

    console.log("Firecrawl: got", markdown.length, "chars, sending to AI");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return null;

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
            content: `You are an expert at extracting product listing details from Vinted marketplace page content. 
You must return ONLY valid JSON, no markdown fences, no explanation.
Be thorough: look for price in formats like "£12.00", "12,00 €", "$15". 
Look for brand names near labels like "Brand", "Marque". 
Look for size near "Size", "Taille".
Look for condition near "Condition", "État".
Extract the main listing description text.`,
          },
          {
            role: "user",
            content: `Extract ALL available listing details from this Vinted page. Return a JSON object:
{
  "title": "<listing title - the main product name>",
  "brand": "<brand name or null>",
  "category": "<best fit from: Tops, T-shirts, Shirts, Hoodies, Jumpers, Jackets, Coats, Jeans, Trousers, Shorts, Skirts, Dresses, Shoes, Trainers, Boots, Sandals, Bags, Accessories, Jewellery, Watches, Sportswear, Vintage, Other>",
  "size": "<size as shown, e.g. S, M, L, 38, UK 10, etc. or null>",
  "condition": "<one of: New with tags, New without tags, Very Good, Good, Satisfactory, or null>",
  "description": "<full listing description text or null>",
  "price": <numeric price in the listing's currency, e.g. 12.5, or null>,
  "photos": [<array of image URLs (full https URLs only)>]
}

Page URL: ${url}
Page title: ${metadata.title || ""}
Page description: ${metadata.description || ""}

Page content (first 4000 chars):
${markdown.substring(0, 4000)}`,
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      console.error("AI error:", aiRes.status);
      return null;
    }

    const aiData = await aiRes.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const parsed = JSON.parse(content);
    // Post-process category if AI returned "Other" or null
    if (!parsed.category || parsed.category === "Other") {
      const betterCat = mapCategory(parsed.title || "") || mapCategory(url);
      if (betterCat) parsed.category = betterCat;
    }
    console.log("AI extracted:", parsed.title, "price:", parsed.price, "brand:", parsed.brand, "size:", parsed.size, "condition:", parsed.condition);
    return parsed;
  } catch (e) {
    console.error("Firecrawl+AI failed:", e);
    return null;
  }
}

// Fallback: Apify search by slug (finds similar items, takes first match)
async function fetchViaApifySearch(slug: string, itemId: string | null, apifyToken: string): Promise<any | null> {
  if (!slug) return null;
  try {
    console.log("Apify search fallback for slug:", slug);
    const actorId = "kazkn~vinted-smart-scraper";
    const apiUrl = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${apifyToken}&timeout=60`;

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "SEARCH",
        searchQuery: slug.substring(0, 50),
        countries: ["uk"],
        maxItems: 10,
      }),
    });

    if (!res.ok) return null;

    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) return null;

    // Try to find exact match by item ID
    let item = itemId ? items.find((i: any) => String(i.id) === itemId) : null;
    if (!item) item = items[0]; // Use best search result

    console.log("Apify search found:", item.title, "id:", item.id, "price:", item.price);

    return {
      title: item.title || null,
      brand: item.brand || item.brand_title || null,
      category: mapCategory(item.catalogue_title || item.catalog_title || ""),
      size: item.size || item.size_title || null,
      condition: mapCondition(item.condition || item.status || ""),
      description: item.description || null,
      price: item.price != null ? parseFloat(String(item.price)) : null,
      photos: Array.isArray(item.photos)
        ? item.photos.map((p: any) => typeof p === "string" ? p : (p.full_size_url || p.url || "")).filter(Boolean)
        : [],
    };
  } catch (e) {
    console.error("Apify search fallback failed:", e);
    return null;
  }
}

// Merge: fill nulls in primary with values from fallback
function mergeResults(primary: any, fallback: any): any {
  if (!fallback) return primary;
  const merged = { ...primary };
  for (const key of ["title", "brand", "category", "size", "condition", "description", "price"]) {
    if (!merged[key] && fallback[key]) merged[key] = fallback[key];
  }
  if ((!merged.photos || merged.photos.length === 0) && fallback.photos?.length > 0) {
    merged.photos = fallback.photos;
  }
  return merged;
}

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

    console.log("Scraping Vinted URL:", url);
    const slug = extractSlug(url);
    const itemId = extractItemId(url);

    // Primary: Firecrawl + AI (most reliable for exact URL)
    let result = await fetchViaFirecrawl(url);

    // If primary got something but is missing fields, try Apify search to fill gaps
    const apifyToken = Deno.env.get("APIFY_API_TOKEN");
    if (apifyToken) {
      const needsMore = !result || !result.price || !result.brand || !result.size || !result.condition;
      if (needsMore) {
        const apifyResult = await fetchViaApifySearch(slug, itemId, apifyToken);
        result = result ? mergeResults(result, apifyResult) : apifyResult;
      }
    }

    if (!result) {
      result = { title: null, brand: null, category: null, size: null, condition: null, description: null, price: null, photos: [] };
    }

    console.log("Final result:", result.title, "price:", result.price, "brand:", result.brand, "size:", result.size);

    return new Response(JSON.stringify(result), {
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
