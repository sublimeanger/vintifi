

# Fix: Arbitrage Scanner Accuracy Overhaul

## Root Cause

The current flow is:

```text
1. Firecrawl SEARCH (returns titles + snippets + URLs, almost NO prices)
2. AI receives snippets like "Gucci Belt | Great condition | ebay.co.uk/itm/254667692479"
3. Prompt says "extract price OR estimate" 
4. AI INVENTS a price (£100 for a $599 item)
5. User sees fake opportunity
```

The AI has no actual price data to work with. It's hallucinating buy prices.

## The Fix: Scrape Before You Score

The new flow should be:

```text
1. Firecrawl SEARCH (get URLs of relevant listings)
2. Firecrawl SCRAPE top URLs individually (get REAL prices via structured extraction)  
3. Apify gets Vinted baseline prices (already works)
4. AI receives ACTUAL source prices + Vinted prices
5. AI only calculates margin, never guesses prices
6. Post-AI validation rejects any opportunity where source_price wasn't from real data
```

## Technical Changes

### File: `supabase/functions/arbitrage-scan/index.ts`

**1. Add a structured scrape step after search**

After Firecrawl search returns URLs, scrape the top 3-5 actual listing pages using Firecrawl `/v1/scrape` with a structured extraction schema to pull real prices:

```typescript
const LISTING_PRICE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    price: { type: "number", description: "Current listing price in local currency" },
    currency: { type: "string", description: "Currency code e.g. GBP, USD, EUR" },
    condition: { type: "string" },
    shipping_cost: { type: "number" },
    seller_location: { type: "string" },
    is_auction: { type: "boolean" },
    buy_it_now_price: { type: "number" },
  },
  required: ["title", "price", "currency"],
};
```

For each search result URL, fire a quick scrape to get the real price. This adds latency but gives accurate data.

**2. Convert foreign currencies to GBP**

eBay listings in USD or EUR need converting. Add a simple hardcoded rate map (updated periodically):

```typescript
const TO_GBP: Record<string, number> = {
  GBP: 1, USD: 0.79, EUR: 0.85, // approximate
};
```

**3. Rewrite the AI prompt to be strict about prices**

The prompt must explicitly forbid price invention:

```text
CRITICAL RULES:
- source_price MUST be the exact price from the structured data below. 
- DO NOT estimate or invent any buy prices.
- If a listing has no confirmed price, SKIP IT entirely.
- Convert all prices to GBP using the rates provided.
- Only include opportunities where BOTH source price AND Vinted price are from real data.
```

**4. Add post-AI validation**

After parsing the AI JSON response, validate each opportunity:

```typescript
// Cross-reference AI output against actual scraped prices
opportunities = opportunities.filter(opp => {
  const scrapedItem = scrapedListings.find(s => 
    s.url === opp.source_url || s.title === opp.source_title
  );
  if (!scrapedItem) return false; // AI invented this listing
  
  // Check price is within 10% of what was actually scraped
  const priceDiff = Math.abs(opp.source_price - scrapedItem.price_gbp) / scrapedItem.price_gbp;
  if (priceDiff > 0.1) {
    opp.source_price = scrapedItem.price_gbp; // Correct it
    opp.estimated_profit = opp.vinted_estimated_price - opp.source_price;
    opp.profit_margin = ((opp.estimated_profit / opp.source_price) * 100);
    opp.net_profit = opp.estimated_profit - (opp.shipping_estimate || 5);
  }
  
  // Reject if margin is now below threshold
  return opp.profit_margin >= minMargin;
});
```

**5. Limit concurrent scrapes to manage API credits**

Only scrape the top 5 URLs per platform (20 max total across 4 platforms) to keep Firecrawl credit usage reasonable. Each scrape costs 1 credit.

### Revised `searchPlatform` function

The function should now return both search snippets AND extracted listing URLs for follow-up scraping:

```typescript
async function searchPlatform(platform, searchTerm, apiKey) {
  // Step 1: Search (as before)
  const searchResults = await firecrawlSearch(...);
  
  // Step 2: Extract top 5 URLs that look like individual listings
  const listingUrls = searchResults
    .filter(r => r.url && isListingUrl(r.url, platform.name))
    .slice(0, 5)
    .map(r => r.url);
  
  // Step 3: Scrape each URL for structured price data
  const scrapedListings = await Promise.all(
    listingUrls.map(url => scrapeListingPrice(url, apiKey))
  );
  
  return { platform: platform.name, searchResults, scrapedListings };
}
```

### New helper: `isListingUrl`

Filter out category/search pages and only scrape actual item listings:

```typescript
function isListingUrl(url: string, platform: string): boolean {
  if (platform === "eBay") return url.includes("/itm/");
  if (platform === "Depop") return url.includes("/products/");
  if (platform === "Facebook Marketplace") return url.includes("/item/");
  if (platform === "Gumtree") return /\/p\//.test(url);
  return false;
}
```

### New helper: `scrapeListingPrice`

```typescript
async function scrapeListingPrice(url: string, apiKey: string) {
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      formats: ["extract"],
      extract: { schema: LISTING_PRICE_SCHEMA },
    }),
  });
  // ... parse and return with GBP conversion
}
```

## Summary of Changes

| Problem | Fix |
|---------|-----|
| AI invents buy prices | Scrape actual listing pages for real prices |
| USD/EUR listings shown as GBP | Currency conversion step |
| No validation of AI output | Post-AI cross-reference against scraped data |
| Prompt allows "estimation" | Strict prompt forbids price invention |
| Category URLs scraped instead of listings | `isListingUrl` filter |

### Impact on API Credits

Current: ~5 Firecrawl search calls per scan (1 per platform + 1 Vinted)
New: ~5 searches + up to 20 individual scrapes = ~25 Firecrawl credits per scan

This is still well within the 100K monthly allowance. At 200 scans/month that's 5,000 credits — 5% of the budget.

### Files to Modify

- `supabase/functions/arbitrage-scan/index.ts` — Complete rewrite of the data pipeline

### Files NOT Changed

- `src/pages/ArbitrageScanner.tsx` — Frontend stays the same, it already displays the fields correctly
- `supabase/functions/clearance-radar/index.ts` — Already uses structured extraction (better architecture), but could benefit from the same validation pattern in future

