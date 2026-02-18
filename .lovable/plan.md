
# Fix: Price Intelligence Engine — Accurate Vinted-Specific Pricing

## Root Cause Diagnosis

The pricing engine is consistently returning prices 2-3x too high for used Vinted items. A Nike crewneck jumper in very good condition that sells for £6-15 on Vinted is being recommended at £20-26. The problem has four compounding causes:

**Cause 1: Perplexity cannot crawl live Vinted listings**
Vinted is a JavaScript-rendered SPA with no public sitemap of listings. Perplexity's web crawler indexes static pages — it cannot see Vinted's live search results. The `search_domain_filter: ["vinted.co.uk", ...]` constraint causes Perplexity to scrape Vinted's *static* pages (category hubs, blog posts, about pages) rather than actual item listings. This means the "market data" returned is largely from eBay and Depop, which both have higher average prices than Vinted.

**Cause 2: eBay and Depop prices are structurally higher than Vinted**
Vinted has no seller fees — which means items naturally price lower. A Nike crewneck that goes for £18-25 on eBay (with seller fees) or £15-22 on Depop lists for £6-14 on Vinted because sellers can price lower and still profit. By anchoring to eBay/Depop data, the engine systematically overestimates Vinted prices.

**Cause 3: The Perplexity search query is too broad**
`buildSearchTerm("Nike", "Jumpers")` produces `"Nike Jumpers"` — which hits Nike Tech Fleece, Nike Windrunner, and premium capsule items priced £40-80 on eBay, inflating the dataset average far above the £6-15 basic crewneck reality.

**Cause 4: The AI analysis prompt has no Vinted price floor awareness**
The prompt instructs the AI to use "40-70% of new listing prices" as a used discount — but it doesn't know that Vinted's baseline is already 60-80% below eBay. Without explicit grounding in Vinted-specific price levels, the AI calibrates to eBay standards.

---

## The Fix: A Completely Rethought Data Strategy

### Strategy: Replace Perplexity domain filtering → Use Firecrawl to actually scrape Vinted search results

Instead of asking Perplexity to "search vinted.co.uk" (which it can't do for dynamic listings), we use **Firecrawl's scrape endpoint** to directly fetch Vinted's search results page HTML/markdown, which contains the actual listing prices in the page's structured data.

The flow becomes:

```text
Step 1: Build a Vinted search URL for the item
        → https://www.vinted.co.uk/catalog?search_text=Nike+jumper+crew+neck&order=relevance

Step 2: Use Firecrawl to scrape that URL (with waitFor=3000 to let JS render)
        → Returns markdown/HTML containing listing titles and prices

Step 3: Use Perplexity WITHOUT domain filter for broad market context
        → "What do Nike crew neck jumpers sell for secondhand in the UK?"
        → This gives eBay/Depop context for cross-platform comparison

Step 4: AI analysis receives BOTH:
        - Real Vinted prices from Firecrawl (the ground truth)
        - eBay/Depop context from Perplexity (the cross-platform reference)
        → AI anchors recommendation to Vinted prices, uses eBay as ceiling
```

This is a fundamental upgrade: real Vinted listing data instead of inferred/hallucinated prices.

### Firecrawl Vinted Search URL Construction

```typescript
function buildVintedSearchUrl(brand: string, category: string, title: string, condition: string): string {
  // Build search text — brand + item type, not full verbose title
  const searchText = brand && category 
    ? `${brand} ${category}` 
    : title || `${brand} ${category}`;
  
  // Map our condition to Vinted's catalog_filters format
  const conditionMap: Record<string, string> = {
    new_with_tags: "6",    // Vinted condition ID 6 = New with tags
    new_without_tags: "1", // Vinted condition ID 1 = New without tags  
    very_good: "2",        // Vinted condition ID 2 = Very good
    good: "3",             // Vinted condition ID 3 = Good
    satisfactory: "4",     // Vinted condition ID 4 = Satisfactory
  };
  
  const conditionId = conditionMap[condition.toLowerCase().replace(/[\s-]/g, "_")];
  const params = new URLSearchParams({ search_text: searchText, order: "relevance" });
  if (conditionId) params.set("catalog[]", conditionId);
  
  return `https://www.vinted.co.uk/catalog?${params.toString()}`;
}
```

### Firecrawl Scraping Function

```typescript
async function scrapeVintedPrices(
  brand: string, 
  category: string, 
  title: string, 
  condition: string,
  firecrawlKey: string
): Promise<{ prices: number[]; listings: string; rawMarkdown: string }> {
  const vintedUrl = buildVintedSearchUrl(brand, category, title, condition);
  
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      url: vintedUrl,
      formats: ["markdown"],
      onlyMainContent: true,
      waitFor: 3000, // Let Vinted's JS render
    }),
  });
  
  const data = await res.json();
  const markdown = data.data?.markdown || data.markdown || "";
  
  // Extract prices from markdown — Vinted renders prices as "£X" or "£X.XX"
  const priceMatches = markdown.match(/£(\d+(?:\.\d{2})?)/g) || [];
  const prices = priceMatches
    .map(p => parseFloat(p.replace("£", "")))
    .filter(p => p > 0.5 && p < 500); // Filter noise
    
  return { prices, listings: markdown.substring(0, 3000), rawMarkdown: markdown };
}
```

### Updated `fetchViaPerplexity` — Remove Domain Filter

Remove `search_domain_filter` entirely from the Perplexity call. Instead, use Perplexity for what it's actually good at: broad secondhand market context without being constrained to domains it can't index properly.

New Perplexity prompt focus:
- "What price range do [item] typically sell for secondhand in the UK?"
- No domain filter — let it search blog posts, forums, comparison sites, Reddit r/Vinted discussions, etc.
- This gives useful *context* (seasonal demand, brand reputation, typical sell times) rather than claiming to have Vinted-specific prices it doesn't actually have

### Updated AI Analysis Prompt — Vinted as Ground Truth

The AI prompt is restructured to clearly separate the two data sources and instruct the AI on how to weight them:

```
PRICING DATA — TWO SOURCES:

SOURCE 1 — VINTED UK LIVE PRICES (ground truth — highest weight):
[Firecrawl Vinted prices]
Actual prices: £X, £X, £X, £X (median: £X, range: £X–£X)
Based on N listings from vinted.co.uk search results.

SOURCE 2 — BROADER MARKET CONTEXT (eBay/Depop reference):
[Perplexity data]

PRICING RULES:
- The Vinted prices in SOURCE 1 are the ground truth. Base recommended_price on these.
- Vinted prices are typically 50-70% LOWER than eBay prices because Vinted has zero seller fees.
- If SOURCE 1 shows real prices, use them directly. Do NOT adjust upward toward eBay prices.
- Only use SOURCE 2 to understand cross-platform context and seller edge insights.
- If SOURCE 1 has <3 data points, use SOURCE 2 but explicitly discount 50-60% from eBay prices.
```

### Fallback if Firecrawl Returns No Prices

If Firecrawl scrapes Vinted but gets <3 price signals (possible if the search returns nothing or the JS doesn't render in time), fall back gracefully:

```typescript
if (vintedPrices.length < 3) {
  // Use Perplexity but with explicit Vinted discount instructions in the AI prompt
  // Add a warning flag: lowConfidence = true → confidence_score capped at 60
}
```

### Search Term Improvement

Improve `buildSearchTerm` to produce more specific terms. For a Nike crewneck jumper, the current function produces "Nike Jumpers" — which is too broad and pulls in premium Nike products.

New logic: include a sanitised version of the title/description as the search term, stripping only size/condition noise, not the item type descriptor:

```typescript
function buildVintedSearchTerm(brand: string, category: string, title: string): string {
  // Prefer title over brand+category combo (more specific)
  if (title) {
    return title
      .replace(/\b(XS|S|M|L|XL|XXL|XXXL|UK\s?\d+|\d+\s?cm|\d+\s?inch)\b/gi, "")
      .replace(/\b(great|good|very good|excellent|condition|new|used|worn|pristine)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim()
      .substring(0, 60); // Keep it concise enough for a URL search
  }
  // If no title, brand + specific category
  if (brand && category) return `${brand} ${category}`;
  return brand || category || "clothing";
}
```

For "Nike crewneck jumper mens black M" → search term becomes "Nike crewneck jumper" → Vinted URL: `vinted.co.uk/catalog?search_text=Nike+crewneck+jumper&catalog[]=2` (condition: very good). This returns the right market.

---

## What Changes in Each File

### `supabase/functions/price-check/index.ts`

**Add `scrapeVintedPrices` function:**
- Constructs proper Vinted search URL with condition filter
- Uses Firecrawl `/v1/scrape` with `waitFor: 3000` 
- Extracts all `£X` price strings from the rendered markdown
- Returns array of prices + first 3000 chars of the listings markdown for AI context

**Update `buildSearchTerm` → `buildVintedSearchTerm`:**
- Prioritises item title over broad brand+category
- Strips only noise words, keeps item-type descriptors ("crewneck", "windrunner", "track jacket")
- This ensures Vinted search finds the right specific product

**Update `fetchViaPerplexity`:**
- Remove `search_domain_filter` entirely
- Reframe the prompt: "What do [item] typically sell for secondhand in the UK? Include eBay, Depop, charity shop context"
- Reduces Perplexity to a supporting data source, not the primary source

**Update main handler — add Firecrawl scrape step:**
- After resolving item details, call `scrapeVintedPrices` (runs in parallel with Perplexity call using `Promise.all`)
- Pass both data sources to AI analysis

**Update the AI prompt:**
- Clearly label "SOURCE 1 — VINTED LIVE PRICES" and "SOURCE 2 — BROADER MARKET CONTEXT"
- Add explicit instruction: "Base recommended_price on SOURCE 1 (Vinted). Vinted is typically 50-70% cheaper than eBay."
- Add Vinted price statistics: compute median and range from the scraped prices and inject them directly into the prompt as "Computed Vinted market stats: median £X, range £X–£X, N listings"
- Add explicit price floor/ceiling guard: "If the Vinted median is £X, recommended_price must be within ±30% of that median unless you have strong evidence of exceptional scarcity."

**Update confidence score logic:**
- If Firecrawl returns ≥5 Vinted prices → confidence can be up to 95
- If Firecrawl returns 3-4 prices → cap confidence at 80
- If Firecrawl returns <3 prices (fallback to Perplexity only) → cap confidence at 60 and flag in response

---

## Why This Is The Right Fix

The current system is fundamentally asking the wrong question: "What does Perplexity think this item costs on Vinted?" — when Perplexity doesn't have access to live Vinted listings. The fix is to ask the right question: "What is Vinted actually showing for this item right now?" — which Firecrawl can answer directly by rendering the search results page.

The Perplexity layer becomes contextual enrichment (platform comparisons, demand signals, trend context) rather than the primary price source. The AI analysis becomes grounded in real Vinted prices rather than eBay-biased estimates.

**Expected accuracy improvement:**
- Nike crewneck jumper, very good: current output £20-26 → expected output £8-14 (matching the £6-15 reality)
- High-demand items (e.g., Carhartt WIP jacket) will still reflect premium pricing because Vinted itself prices those higher
- Low-demand items will correctly show lower prices rather than being inflated by eBay comparables

**Risk of Firecrawl not rendering Vinted properly:**
Vinted uses JavaScript rendering, and Firecrawl's `waitFor: 3000` may not always be sufficient. The fallback (Perplexity-only + explicit 50-60% discount instruction in the AI prompt) ensures the system degrades gracefully rather than returning wrong prices. The confidence score will reflect data quality — users will see "Low confidence" when we're working from limited data.
