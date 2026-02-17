

# Replace Apify/Firecrawl Scraping with Perplexity AI Search

## Why This Is Better

The current system scrapes Vinted via Apify, which returns irrelevant results (French board games for a Nike sweatshirt) because the search query construction is fundamentally broken. Even if fixed, Apify is a fragile single-platform scraper with a 120-second timeout that returns raw listing data requiring heavy processing.

**Perplexity's `sonar` model** is purpose-built for this: it performs real-time web search and returns grounded, cited answers. One API call can search Vinted, eBay, and Depop simultaneously and return structured market intelligence with source URLs. No scraping, no broken queries, no irrelevant results.

```text
CURRENT FLOW (broken):
User input --> Build search query --> Apify scraper (120s timeout) --> Raw listings --> Format text --> Gemini analysis
                                      ^^ returns board games ^^

NEW FLOW:
User input --> Perplexity sonar search --> Grounded market data with citations --> Gemini analysis
               ^^ searches Vinted + eBay + Depop in one call ^^
```

## What Changes

### 1. Connect Perplexity (one-click)

Use the Perplexity connector to add the API key to the project. No manual key entry needed.

### 2. Rewrite `supabase/functions/price-check/index.ts`

**Remove entirely:**
- `fetchViaApify()` function
- `fetchViaFirecrawl()` function (for search -- keep the single-URL scrape for Vinted URL context)
- `formatApifyComparables()` function
- `formatFirecrawlComparables()` function
- All Apify/Firecrawl hybrid fetching logic

**Add new:**
- `fetchViaPerplexity()` function that calls Perplexity's chat completions API with a carefully crafted prompt asking for current Vinted UK sold and active prices for the specific item
- The Perplexity query will include: brand, category, size, condition
- Domain filter to `vinted.co.uk`, `ebay.co.uk`, `depop.com` for focused results
- Returns grounded market data with citations that Gemini can then analyse

**The Perplexity prompt will ask specifically for:**
- Current active listing prices on Vinted UK for this exact item
- Recent sold prices where available
- Price range (low to high)
- Number of comparable listings currently active
- Any notable price trends
- Cross-platform comparison (eBay, Depop prices for the same item)

This gives Gemini 2.5 Pro real, grounded data to work with instead of garbage.

### 3. Fix VintedReadyPack score gating (`src/components/VintedReadyPack.tsx`)

Add health score thresholds:
- Score 80+: Green "Ready to Post" with celebration (current design)
- Score 60-79: Amber "Nearly Ready" with improvement CTA
- Score below 60 or null: Component hidden

This stops a 75-scored listing from showing the misleading "Ready to Post" celebration.

## Technical Details

| File | Change |
|------|--------|
| `supabase/functions/price-check/index.ts` | Remove Apify + Firecrawl search functions. Add Perplexity sonar search. Keep Firecrawl single-URL scrape for Vinted URL context extraction. Restructure data pipeline. |
| `src/components/VintedReadyPack.tsx` | Add score-based readiness tiers (80+ green, 60-79 amber, below 60 hidden) |

### Perplexity Integration Pattern

```text
const perplexityRes = await fetch('https://api.perplexity.ai/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'sonar',
    messages: [
      { role: 'system', content: 'You are a secondhand clothing market researcher...' },
      { role: 'user', content: 'What are current prices for [brand] [item] size [size] on Vinted UK? Include sold and active listings...' }
    ],
    search_domain_filter: ['vinted.co.uk', 'ebay.co.uk', 'depop.com'],
  }),
});
```

The response includes `citations` (source URLs) which we pass to Gemini as evidence, making the final insights grounded in real, verifiable data.

### VintedReadyPack Readiness Tiers

```text
Score >= 80  -->  Green "Ready to Post", sparkle animation, full celebration
Score 60-79  -->  Amber "Nearly Ready", "Improve your listing" CTA, no sparkles
Score < 60   -->  Component not rendered
No score     -->  Component not rendered
```

### Dependencies

- Perplexity connector must be linked to the project (one-click setup)
- No database changes needed
- No new tables or columns required

