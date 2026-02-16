import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APIFY_BASE = "https://api.apify.com/v2";
const APIFY_ACTOR = "kazkn~vinted-smart-scraper";

/* ── Retailer config with actual sale page URLs ── */

type RetailerConfig = {
  label: string;
  saleUrls: string[];
};

const RETAILERS: Record<string, RetailerConfig> = {
  "ASOS Outlet": {
    label: "ASOS Outlet",
    saleUrls: ["https://www.asos.com/women/sale/cat/?cid=7046", "https://www.asos.com/men/sale/cat/?cid=8409"],
  },
  "End Clothing": {
    label: "End Clothing",
    saleUrls: ["https://www.endclothing.com/gb/sale"],
  },
  "TK Maxx": {
    label: "TK Maxx",
    saleUrls: ["https://www.tkmaxx.com/uk/en/clearance/c/01300000"],
  },
  "Nike Clearance": {
    label: "Nike",
    saleUrls: ["https://www.nike.com/gb/w/sale-3yaep"],
  },
  "Adidas Outlet": {
    label: "Adidas",
    saleUrls: ["https://www.adidas.co.uk/outlet"],
  },
  "ZARA Sale": {
    label: "ZARA",
    saleUrls: ["https://www.zara.com/uk/en/sale-l1314.html"],
  },
  "H&M Sale": {
    label: "H&M",
    saleUrls: ["https://www2.hm.com/en_gb/sale.html"],
  },
  "Uniqlo Sale": {
    label: "Uniqlo",
    saleUrls: ["https://www.uniqlo.com/uk/en/spl/sale/all-items"],
  },
  "COS Sale": {
    label: "COS",
    saleUrls: ["https://www.cos.com/en_gbp/sale.html"],
  },
  "Ralph Lauren": {
    label: "Ralph Lauren",
    saleUrls: ["https://www.ralphlauren.co.uk/en/sale/10006"],
  },
  "Depop": {
    label: "Depop",
    saleUrls: ["https://www.depop.com/category/mens/"],
  },
  "Vinted UK": {
    label: "Vinted UK",
    saleUrls: ["https://www.vinted.co.uk/catalog"],
  },
};

/* ── Firecrawl structured extraction schema ── */

const PRODUCT_EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    products: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Product name/title" },
          brand: { type: "string", description: "Brand name" },
          price: { type: "number", description: "Current sale price in GBP" },
          original_price: { type: "number", description: "Original/RRP price if available" },
          url: { type: "string", description: "Direct product URL" },
          image_url: { type: "string", description: "Product image URL" },
          category: { type: "string", description: "Product category e.g. Jacket, Trainers" },
        },
        required: ["title", "price"],
      },
    },
  },
  required: ["products"],
};

/* ── Apify for Vinted baseline ── */

async function scrapeVintedBaseline(apiToken: string, query: string): Promise<any[]> {
  try {
    const url = `${APIFY_BASE}/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${apiToken}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ search: query, maxItems: 20, country: "uk" }),
    });
    if (!res.ok) { console.error(`Apify baseline failed: ${res.status}`); return []; }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) { console.error("Apify error:", e); return []; }
}

/* ── Firecrawl structured scrape ── */

async function scrapeRetailer(apiKey: string, retailerId: string, config: RetailerConfig, searchSuffix: string): Promise<{ retailer: string; products: any[] }> {
  const allProducts: any[] = [];

  for (const saleUrl of config.saleUrls) {
    try {
      // Use Firecrawl scrape with extract for structured data
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          url: saleUrl,
          formats: [{ type: "json", schema: PRODUCT_EXTRACT_SCHEMA, prompt: `Extract product listings from this sale/clearance page. ${searchSuffix ? `Focus on items matching: ${searchSuffix}.` : ""} Return up to 10 products with their sale prices in GBP.` }],
          onlyMainContent: true,
          waitFor: 3000,
        }),
      });

      if (!res.ok) {
        console.error(`Firecrawl scrape ${retailerId} failed: ${res.status}`);
        continue;
      }

      const data = await res.json();
      const extracted = data?.data?.json || data?.json || {};
      const products = extracted?.products || [];
      
      for (const p of products) {
        if (p.title && p.price) {
          allProducts.push({
            ...p,
            retailer: retailerId,
            source_url: p.url || saleUrl,
          });
        }
      }
    } catch (e) {
      console.error(`${retailerId} scrape error:`, e);
    }
  }

  return { retailer: retailerId, products: allProducts.slice(0, 8) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const APIFY_API_TOKEN = Deno.env.get("APIFY_API_TOKEN");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Auth
    const authHeader = req.headers.get("authorization");
    const userClient = createClient(SUPABASE_URL, anonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tier check: business+
    const serviceClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await serviceClient.from("profiles").select("subscription_tier").eq("user_id", user.id).single();
    const tierLevel: Record<string, number> = { free: 0, pro: 1, business: 2, scale: 3 };
    if ((tierLevel[profile?.subscription_tier || "free"] ?? 0) < 2) {
      return new Response(JSON.stringify({ error: "This feature requires a Business plan. Upgrade to continue." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { retailers, brand, category, min_margin = 40, save_results = false } = await req.json();
    if (!retailers || retailers.length === 0) {
      return new Response(JSON.stringify({ error: "Select at least one retailer" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchSuffix = [brand, category].filter(Boolean).join(" ");

    // Scrape retailers in parallel using structured extraction
    const retailerPromises = retailers.map((r: string) => {
      const config = RETAILERS[r];
      if (!config) return Promise.resolve({ retailer: r, products: [] });
      return scrapeRetailer(FIRECRAWL_API_KEY, r, config, searchSuffix);
    });

    // Vinted baseline via Apify
    const vintedPromise = (async () => {
      const query = searchSuffix || "sale";
      if (APIFY_API_TOKEN) {
        const items = await scrapeVintedBaseline(APIFY_API_TOKEN, query);
        if (items.length > 0) return items;
      }
      return [];
    })();

    const [retailerResults, vintedItems] = await Promise.all([
      Promise.all(retailerPromises),
      vintedPromise,
    ]);

    // Build structured AI context
    const retailerContext = retailerResults.map((r: any) => {
      if (r.products.length === 0) return `## ${r.retailer}\nNo products found`;
      const items = r.products.map((p: any) =>
        `  - ${p.brand || "Unknown"} | ${p.title} | £${p.price} ${p.original_price ? `(was £${p.original_price})` : ""} | ${p.category || ""} | ${p.url || ""} | ${p.image_url || ""}`
      ).join("\n");
      return `## ${r.retailer}\n${items}`;
    }).join("\n\n");

    const vintedContext = vintedItems.length > 0
      ? vintedItems.slice(0, 15).map((item: any) => {
          const b = item.brand || item.brand_title || "";
          const price = item.price || item.total_price || "?";
          const title = item.title || "";
          const favs = item.favourite_count || item.favorites || 0;
          return `  - ${b} | £${price} | ${title} | ${favs} favs`;
        }).join("\n")
      : "No Vinted baseline data — estimate based on market knowledge";

    const prompt = `You are a UK reselling arbitrage analyst. Compare structured retail clearance product data against Vinted resale values to find profitable flip opportunities.

SEARCH FILTERS: ${searchSuffix || "General clearance"}
MINIMUM PROFIT MARGIN: ${min_margin}%

## Retail Clearance Products (Buy From — STRUCTURED DATA)
${retailerContext}

## Vinted Reference Prices (Sell On)
${vintedContext}

Return a JSON array of opportunities. Each object must have:
- retailer: the retailer name
- item_title: item name
- item_url: the product URL from the retailer data (use exact URL from data, or null)
- image_url: the product image URL from the retailer data (use exact URL from data, or null)
- sale_price: clearance buy price in GBP (from structured data)
- vinted_resale_price: estimated Vinted sell price in GBP
- estimated_profit: vinted_resale_price minus sale_price
- profit_margin: percentage margin
- brand: brand name
- category: item category
- ai_notes: 1-2 sentence explanation of why this is a good flip

Only include items with profit margin >= ${min_margin}%.
Return max 12 opportunities ranked by margin descending.
If none found, return [].
Return ONLY the JSON array.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "user", content: prompt }] }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    let opportunities: any[];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array");
      opportunities = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse clearance data");
    }

    // ── Post-AI validation: cross-reference vinted_resale_price against Apify baseline ──
    const vintedPriceMap: Record<string, { median: number; low: number; high: number }> = {};
    if (vintedItems.length > 0) {
      // Group Vinted items by brand for lookup
      for (const item of vintedItems) {
        const brand = (item.brand || item.brand_title || "").toLowerCase().trim();
        const price = parseFloat(item.price || item.total_price || 0);
        if (!brand || !price) continue;
        if (!vintedPriceMap[brand]) vintedPriceMap[brand] = { median: 0, low: Infinity, high: 0 };
        vintedPriceMap[brand].low = Math.min(vintedPriceMap[brand].low, price);
        vintedPriceMap[brand].high = Math.max(vintedPriceMap[brand].high, price);
      }
      // Calculate medians per brand
      const brandPrices: Record<string, number[]> = {};
      for (const item of vintedItems) {
        const brand = (item.brand || item.brand_title || "").toLowerCase().trim();
        const price = parseFloat(item.price || item.total_price || 0);
        if (!brand || !price) continue;
        if (!brandPrices[brand]) brandPrices[brand] = [];
        brandPrices[brand].push(price);
      }
      for (const [brand, prices] of Object.entries(brandPrices)) {
        prices.sort((a, b) => a - b);
        vintedPriceMap[brand].median = prices[Math.floor(prices.length / 2)];
      }
    }

    const validatedOpportunities = opportunities.filter((opp: any) => {
      const brand = (opp.brand || "").toLowerCase().trim();
      const baseline = vintedPriceMap[brand];
      
      if (baseline && opp.vinted_resale_price) {
        const deviation = Math.abs(opp.vinted_resale_price - baseline.median) / baseline.median;
        if (deviation > 0.3) {
          console.log(`Correcting ${opp.item_title}: AI said £${opp.vinted_resale_price}, Apify median £${baseline.median}`);
          opp.vinted_resale_price = Math.round(baseline.median * 100) / 100;
          opp.estimated_profit = Math.round((opp.vinted_resale_price - opp.sale_price) * 100) / 100;
          opp.profit_margin = opp.sale_price > 0 
            ? Math.round((opp.estimated_profit / opp.sale_price) * 10000) / 100 
            : 0;
        }
      }
      
      // Reject if margin falls below threshold after correction
      if (opp.profit_margin < min_margin || opp.estimated_profit <= 0) {
        console.log(`Rejecting ${opp.item_title}: margin ${opp.profit_margin}% < ${min_margin}%`);
        return false;
      }
      return true;
    });

    opportunities = validatedOpportunities;

    // Optionally save to clearance_opportunities table
    if (save_results && opportunities.length > 0) {
      const rows = opportunities.map((o: any) => ({
        user_id: user.id,
        retailer: o.retailer,
        item_title: o.item_title,
        item_url: o.item_url || null,
        image_url: o.image_url || null,
        sale_price: o.sale_price,
        vinted_resale_price: o.vinted_resale_price,
        estimated_profit: o.estimated_profit,
        profit_margin: o.profit_margin,
        brand: o.brand || null,
        category: o.category || null,
        ai_notes: o.ai_notes || null,
        status: "new",
      }));
      const { error: insertError } = await serviceClient.from("clearance_opportunities").insert(rows);
      if (insertError) console.error("Failed to save opportunities:", insertError);
    }

    return new Response(
      JSON.stringify({ opportunities, retailers_searched: retailers, total_found: opportunities.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Clearance radar error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
