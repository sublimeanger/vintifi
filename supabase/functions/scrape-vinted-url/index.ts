import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─────────────────────────────────────────────
// URL helpers
// ─────────────────────────────────────────────

const VINTED_ITEM_URL_RE = /^https?:\/\/(www\.)?vinted\.(co\.uk|fr|de|nl|be|es|it|pl|com)\/items\/\d+/;

function extractItemId(url: string): string | null {
  const match = url.match(/items\/(\d+)/);
  return match ? match[1] : null;
}

function extractSlug(url: string): string {
  const match = url.match(/items\/\d+-(.+?)(?:\?|$)/);
  return match ? match[1].replace(/-/g, " ") : "";
}

/** Detect Vinted domain from URL so we hit the right regional API */
function extractVintedDomain(url: string): string {
  const match = url.match(/vinted\.(co\.uk|fr|de|nl|be|es|it|pl|com)/);
  return match ? `www.vinted.${match[1]}` : "www.vinted.co.uk";
}

// ─────────────────────────────────────────────
// Condition & category mappers
// ─────────────────────────────────────────────

function mapCondition(raw: string | number | null | undefined): string | null {
  if (raw == null) return null;
  const s = String(raw).toLowerCase().trim();
  // Numeric codes
  if (s === "1") return "New with tags";
  if (s === "2") return "New without tags";
  if (s === "3") return "Very Good";
  if (s === "4") return "Good";
  if (s === "5") return "Satisfactory";
  // String codes
  if (s === "new_with_tags" || s.includes("new with tags")) return "New with tags";
  if (s === "new_no_tags"  || s.includes("new without") || (s.includes("new") && !s.includes("tag"))) return "New without tags";
  if (s === "very_good"    || s.includes("very good") || s.includes("très bon")) return "Very Good";
  if (s === "good"         || s.includes("bon état") || (s.includes("good") && !s.includes("very"))) return "Good";
  if (s === "satisfactory" || s.includes("satisf")) return "Satisfactory";
  return raw ? String(raw) : null;
}

function mapCategory(raw: string): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const map: Record<string, string> = {
    "t-shirt": "T-shirts", "top": "Tops", "shirt": "Shirts",
    "hoodie": "Hoodies", "jumper": "Jumpers", "sweater": "Jumpers",
    "jacket": "Jackets", "coat": "Coats", "jean": "Jeans",
    "trouser": "Trousers", "short": "Shorts", "skirt": "Skirts",
    "dress": "Dresses", "shoe": "Shoes", "trainer": "Trainers",
    "sneaker": "Trainers", "boot": "Boots", "sandal": "Sandals",
    "bag": "Bags", "accessor": "Accessories", "jewel": "Jewellery",
    "watch": "Watches", "sport": "Sportswear", "vintage": "Vintage",
    "gilet": "Jackets", "vest": "Jackets", "legging": "Trousers",
    "sweatshirt": "Hoodies", "cardigan": "Jumpers", "blazer": "Jackets",
  };
  for (const [key, val] of Object.entries(map)) {
    if (lower.includes(key)) return val;
  }
  return raw || null;
}

// ─────────────────────────────────────────────
// Tier 1: Vinted public API (free, instant, exact)
// ─────────────────────────────────────────────

async function fetchViaVintedApi(url: string, itemId: string): Promise<any | null> {
  const domain = extractVintedDomain(url);
  const apiUrl = `https://${domain}/api/v2/items/${itemId}`;
  console.log(`[Tier 1] Vinted API: ${apiUrl}`);

  try {
    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-GB,en;q=0.9",
        "Referer": `https://${domain}/`,
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    if (!res.ok) {
      console.log(`[Tier 1] Failed: HTTP ${res.status}`);
      return null;
    }

    const json = await res.json();
    const item = json?.item;
    if (!item) {
      console.log("[Tier 1] No item in response");
      return null;
    }

    // Extract photos — try multiple known field names
    const photos: string[] = [];
    if (Array.isArray(item.photos)) {
      for (const p of item.photos) {
        const photoUrl = p?.full_size_url || p?.url || p?.large_url || (typeof p === "string" ? p : null);
        if (photoUrl) photos.push(photoUrl);
      }
    }

    // Price can be nested: item.price or item.price_numeric
    const priceRaw = item.price_numeric ?? item.price;
    const price = priceRaw != null ? parseFloat(String(priceRaw)) : null;

    // Condition: item.status is numeric (1-5) or item.status_id
    const conditionRaw = item.status ?? item.status_id ?? item.condition ?? null;
    const condition = mapCondition(conditionRaw);

    // Category
    const catRaw = item.catalog?.title ?? item.category?.title ?? item.service_fee?.catalog?.title ?? null;
    const category = catRaw ? mapCategory(catRaw) ?? catRaw : null;

    const result = {
      title: item.title || null,
      brand: item.brand?.title ?? item.brand_title ?? null,
      category,
      size: item.size_title ?? item.size ?? null,
      condition,
      description: item.description || null,
      price,
      photos,
    };

    console.log(`[Tier 1] SUCCESS — title: "${result.title}", brand: "${result.brand}", condition: "${result.condition}", price: ${result.price}, photos: ${result.photos.length}`);
    return result;
  } catch (e) {
    console.error("[Tier 1] Exception:", e);
    return null;
  }
}

// ─────────────────────────────────────────────
// Tier 2: JSON-LD extraction via Firecrawl raw HTML
// ─────────────────────────────────────────────

async function fetchViaJsonLd(url: string): Promise<any | null> {
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!firecrawlKey) return null;
  console.log("[Tier 2] Firecrawl JSON-LD extraction");

  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["rawHtml"],
        onlyMainContent: false,
        waitFor: 4000,
      }),
    });

    if (!res.ok) {
      console.log(`[Tier 2] Firecrawl failed: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const html: string = data?.data?.rawHtml ?? data?.rawHtml ?? "";
    if (!html || html.length < 100) {
      console.log("[Tier 2] No HTML content");
      return null;
    }

    // Extract all JSON-LD blocks
    const ldBlocks = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (!ldBlocks) {
      console.log("[Tier 2] No JSON-LD blocks found");
      return null;
    }

    for (const block of ldBlocks) {
      try {
        const jsonStr = block.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "").trim();
        const parsed = JSON.parse(jsonStr);

        // Handle @graph arrays
        const candidates = Array.isArray(parsed["@graph"]) ? parsed["@graph"] : [parsed];

        for (const candidate of candidates) {
          if (candidate["@type"] !== "Product") continue;

          const priceRaw = candidate?.offers?.price ?? candidate?.offers?.lowPrice ?? null;
          const price = priceRaw != null ? parseFloat(String(priceRaw)) : null;

          // Availability maps loosely to condition
          const availability = candidate?.offers?.availability ?? "";
          let condition: string | null = null;
          if (availability.includes("NewCondition") || availability.includes("new")) condition = "New without tags";

          const result = {
            title: candidate.name ?? null,
            brand: candidate.brand?.name ?? candidate.brand ?? null,
            category: candidate.category ? mapCategory(candidate.category) ?? candidate.category : null,
            size: candidate.size ?? null,
            condition,
            description: candidate.description ?? null,
            price,
            photos: Array.isArray(candidate.image)
              ? candidate.image.filter((u: any) => typeof u === "string" && u.startsWith("http"))
              : typeof candidate.image === "string" ? [candidate.image] : [],
          };

          if (result.title) {
            console.log(`[Tier 2] SUCCESS via JSON-LD — title: "${result.title}", price: ${result.price}`);
            return result;
          }
        }
      } catch (_) {
        // malformed JSON-LD block, skip
      }
    }

    console.log("[Tier 2] No Product JSON-LD found in blocks");
    return null;
  } catch (e) {
    console.error("[Tier 2] Exception:", e);
    return null;
  }
}

// ─────────────────────────────────────────────
// Tier 3: Firecrawl markdown + AI with item-ID anchoring
// ─────────────────────────────────────────────

async function fetchViaFirecrawlAI(url: string, itemId: string, slug: string): Promise<any | null> {
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  const lovableKey   = Deno.env.get("LOVABLE_API_KEY");
  if (!firecrawlKey || !lovableKey) return null;
  console.log("[Tier 3] Firecrawl + AI extraction");

  try {
    const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "html"],
        onlyMainContent: false, // keep JSON-LD and full page
        waitFor: 6000,          // give Vinted's React SPA time to hydrate
      }),
    });

    if (!scrapeRes.ok) {
      console.log(`[Tier 3] Firecrawl failed: HTTP ${scrapeRes.status}`);
      return null;
    }

    const scrapeData = await scrapeRes.json();
    const markdown = scrapeData?.data?.markdown ?? scrapeData?.markdown ?? "";
    const metadata = scrapeData?.data?.metadata ?? scrapeData?.metadata ?? {};

    if (!markdown || markdown.length < 50) {
      console.log("[Tier 3] Insufficient markdown content");
      return null;
    }

    // Send up to 8000 chars (not 4000!) to avoid cutting off item data
    const contentPreview = markdown.substring(0, 8000);
    console.log(`[Tier 3] Markdown: ${markdown.length} chars, sending ${contentPreview.length} to AI`);

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert at extracting product listing details from Vinted marketplace page content.
You must return ONLY valid JSON, no markdown fences, no explanation.
CRITICAL: This page contains ONE primary listing plus many recommendations. You MUST extract ONLY the primary listing.
The slug hint tells you what the item should be — use it to verify you have the right item.
Look for price in formats like "£12.00", "12,00 €", "€15". 
Look for brand near labels "Brand", "Marque", "Marke".
Look for size near "Size", "Taille", "Größe".
Look for condition near "Condition", "État", "Zustand".
Do NOT extract data from sections labelled: "Similar items", "You might also like", "Recently viewed", "Suggested", "More from this seller", or any recommendations panels.`,
          },
          {
            role: "user",
            content: `Extract the listing for item ID ${itemId} from this Vinted page.
URL slug hint (what this item should be): "${slug}"

Return ONLY this JSON shape:
{
  "title": "<the primary listing title — must match the slug hint>",
  "brand": "<brand name or null>",
  "category": "<best fit from: Tops, T-shirts, Shirts, Hoodies, Jumpers, Jackets, Coats, Jeans, Trousers, Shorts, Skirts, Dresses, Shoes, Trainers, Boots, Sandals, Bags, Accessories, Jewellery, Watches, Sportswear, Vintage, Other>",
  "size": "<size as shown, e.g. S, M, L, 38, UK 10, or null>",
  "condition": "<one of: New with tags, New without tags, Very Good, Good, Satisfactory, or null>",
  "description": "<full listing description text or null>",
  "price": <numeric price or null>,
  "photos": [<https image URLs of the primary item only>]
}

Page URL: ${url}
Page title: ${metadata.title || ""}
Page description: ${metadata.description || ""}

Page content (first 8000 chars):
${contentPreview}`,
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      console.error(`[Tier 3] AI failed: HTTP ${aiRes.status}`);
      return null;
    }

    const aiData = await aiRes.json();
    let content = aiData.choices?.[0]?.message?.content ?? "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const parsed = JSON.parse(content);

    // Post-process category
    if (!parsed.category || parsed.category === "Other") {
      parsed.category = mapCategory(parsed.title ?? "") ?? mapCategory(slug) ?? parsed.category;
    }

    console.log(`[Tier 3] SUCCESS — title: "${parsed.title}", brand: "${parsed.brand}", condition: "${parsed.condition}", price: ${parsed.price}`);
    return parsed;
  } catch (e) {
    console.error("[Tier 3] Exception:", e);
    return null;
  }
}

// ─────────────────────────────────────────────
// Tier 4: Apify direct URL fetch (not keyword search)
// ─────────────────────────────────────────────

async function fetchViaApifyDirect(url: string, itemId: string | null, apifyToken: string): Promise<any | null> {
  try {
    console.log("[Tier 4] Apify direct item fetch:", url);
    const actorId = "kazkn~vinted-smart-scraper";
    const apiUrl = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${apifyToken}&timeout=60`;

    // Try direct item URL mode first (if actor supports it)
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "ITEM",
        urls: [url],
        maxItems: 1,
      }),
    });

    let items: any[] = [];

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) items = data;
    }

    // If ITEM mode not supported, fall back to item-ID targeted search
    if (items.length === 0 && itemId) {
      console.log("[Tier 4] ITEM mode empty, trying itemId targeted search");
      const res2 = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "SEARCH",
          itemId,
          maxItems: 5,
        }),
      });
      if (res2.ok) {
        const data2 = await res2.json();
        if (Array.isArray(data2)) {
          // Find exact match by item ID
          const exact = data2.find((i: any) => String(i.id) === itemId);
          items = exact ? [exact] : data2.slice(0, 1);
        }
      }
    }

    if (items.length === 0) {
      console.log("[Tier 4] No items returned");
      return null;
    }

    const item = items[0];
    const photos: string[] = Array.isArray(item.photos)
      ? item.photos.map((p: any) => typeof p === "string" ? p : (p.full_size_url || p.url || "")).filter(Boolean)
      : [];

    const result = {
      title: item.title || null,
      brand: item.brand || item.brand_title || null,
      category: mapCategory(item.catalogue_title || item.catalog_title || ""),
      size: item.size || item.size_title || null,
      condition: mapCondition(item.condition || item.status || item.status_id || ""),
      description: item.description || null,
      price: item.price != null ? parseFloat(String(item.price)) : null,
      photos,
    };

    console.log(`[Tier 4] SUCCESS — title: "${result.title}", id matched: ${String(item.id) === itemId}`);
    return result;
  } catch (e) {
    console.error("[Tier 4] Exception:", e);
    return null;
  }
}

// ─────────────────────────────────────────────
// Merge: higher-tier values always win
// ─────────────────────────────────────────────

function isComplete(r: any): boolean {
  return !!(r?.title && r?.price != null && r?.condition);
}

/**
 * Merge base (higher trust) with supplement (lower trust).
 * Fields in base are NEVER overwritten — supplement only fills nulls.
 */
function mergeResults(base: any, supplement: any): any {
  if (!supplement) return base;
  if (!base) return supplement;
  const merged = { ...base };
  for (const key of ["title", "brand", "category", "size", "condition", "description", "price"]) {
    if ((merged[key] == null || merged[key] === "") && supplement[key] != null) {
      merged[key] = supplement[key];
    }
  }
  if ((!merged.photos || merged.photos.length === 0) && supplement.photos?.length > 0) {
    merged.photos = supplement.photos;
  }
  return merged;
}

// ─────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();

    // Strict URL validation
    if (!url || !VINTED_ITEM_URL_RE.test(url)) {
      return new Response(
        JSON.stringify({
          error: "Please paste a Vinted item URL (e.g. vinted.co.uk/items/12345678-item-name)",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const itemId = extractItemId(url);
    const slug   = extractSlug(url);
    console.log(`=== scrape-vinted-url START — itemId: ${itemId}, slug: "${slug}" ===`);

    // ── Tier 1: Vinted public API ─────────────────────────────
    let result: any = null;
    if (itemId) {
      result = await fetchViaVintedApi(url, itemId);
    }

    if (isComplete(result)) {
      console.log("=== Tier 1 complete — returning immediately ===");
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Tier 2: JSON-LD via Firecrawl raw HTML ────────────────
    const tier2 = await fetchViaJsonLd(url);
    result = mergeResults(result, tier2);

    if (isComplete(result)) {
      console.log("=== Tier 2 complete — returning ===");
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Tier 3: Firecrawl markdown + AI with anchoring ────────
    const tier3 = await fetchViaFirecrawlAI(url, itemId ?? "", slug);
    result = mergeResults(result, tier3);

    if (isComplete(result)) {
      console.log("=== Tier 3 complete — returning ===");
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Tier 4: Apify direct fetch ────────────────────────────
    const apifyToken = Deno.env.get("APIFY_API_TOKEN");
    if (apifyToken) {
      const tier4 = await fetchViaApifyDirect(url, itemId, apifyToken);
      result = mergeResults(result, tier4);
    }

    // Final: ensure we return a well-shaped object
    if (!result) {
      result = { title: null, brand: null, category: null, size: null, condition: null, description: null, price: null, photos: [] };
    }

    console.log(`=== FINAL — title: "${result.title}", brand: "${result.brand}", size: "${result.size}", condition: "${result.condition}", price: ${result.price}, photos: ${result.photos?.length ?? 0} ===`);

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
