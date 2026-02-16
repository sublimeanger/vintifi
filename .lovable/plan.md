

# Accuracy Audit: Fix Hallucination Risks Across All Edge Functions

## The Pattern

The arbitrage scanner was the worst case, but **5 other functions have the same fundamental problem**: the AI is asked to generate specific numeric values (prices, margins, scores) without enough real data to ground them.

## Risk Assessment

| Function | Real Data In? | AI Invents Prices? | Severity | Fix Needed? |
|----------|--------------|-------------------|----------|-------------|
| clearance-radar | Retail prices via Firecrawl (good) | Vinted resale prices invented | HIGH | Yes |
| niche-finder | Listing titles/prices from Apify | avg_price, monthly_sales, competition_count invented | MEDIUM | Yes |
| charity-briefing | Trend scores from DB | max_buy_price AND estimated_sell_price both invented | MEDIUM | Yes |
| competitor-scan | Real Apify seller data | avg_price could deviate from actual data | LOW | Light fix |
| portfolio-optimizer | Real DB listing data | suggested_price has no market validation | LOW | Light fix |
| dead-stock-analyze | Real DB listing data | suggested_price invented | LOW | Light fix |

## Fixes (Priority Order)

### 1. Clearance Radar (HIGH priority)

**Problem**: Retail prices are real (Firecrawl structured scrape), but the AI invents Vinted resale values with no validation.

**Fix**:
- After scraping retail products, also fetch Vinted baseline prices via Apify for the same brands/items (this code already exists but results aren't cross-referenced)
- Add post-AI validation: cross-reference `vinted_resale_price` against actual Apify baseline data
- If AI's resale estimate deviates more than 30% from the Apify median, correct it
- Recalculate `estimated_profit` and `profit_margin` after correction
- Reject opportunities that fall below `min_margin` after correction

**File**: `supabase/functions/clearance-radar/index.ts`

### 2. Niche Finder (MEDIUM priority)

**Problem**: AI generates `avg_price`, `estimated_monthly_sales`, and `competition_count` from thin air. A niche could show "avg_price: £45" when real data shows £15.

**Fix**:
- After Apify returns listings per category, calculate REAL statistics from the scraped data: actual average price, actual listing count, actual favourites-to-listing ratio
- Pass these pre-computed stats to the AI alongside the raw data
- Update the prompt to say: "Use the pre-computed statistics below. Do NOT invent your own values for avg_price or competition_count."
- Add post-AI validation: reject any niche where `avg_price` deviates more than 30% from the pre-computed average

**File**: `supabase/functions/niche-finder/index.ts`

### 3. Charity Briefing (MEDIUM priority)

**Problem**: Both `max_buy_price` and `estimated_sell_price` are completely invented. A briefing might say "buy Carhartt WIP jacket for £5, sell for £60" when the real Vinted average is £25.

**Fix**:
- Before calling the AI, fetch current Vinted prices for the trending brands/items using Apify (quick search for each of the top 10 trending items)
- Pass actual price ranges to the AI: "Carhartt WIP jackets currently sell for £20-£35 on Vinted (median £28)"
- Update prompt: "estimated_sell_price MUST be within the Vinted price range provided. Do NOT invent prices."
- This adds latency (~5-8s for Apify calls) but makes the briefing trustworthy

**File**: `supabase/functions/charity-briefing/index.ts`

### 4. Competitor Scan (LOW priority - light fix)

**Problem**: Mostly fine because Apify returns real prices and the AI prompt receives them. But `avg_price` could still deviate.

**Fix**:
- Pre-compute `avg_price` from the scraped listings before sending to AI
- Pass the pre-computed value in the prompt and tell the AI to use it
- After AI response, overwrite `analysis.avg_price` with the real computed value

**File**: `supabase/functions/competitor-scan/index.ts`

### 5. Portfolio Optimizer (LOW priority - light fix)

**Problem**: `suggested_price` has no market grounding. The AI guesses based on brand/category but doesn't know current Vinted market rates.

**Fix**:
- For listings classified as OVERPRICED or UNDERPRICED, the `suggested_price` is the key output
- Add a note in the prompt: "If you cannot determine a confident market price, set suggested_price to null rather than guessing"
- Add validation: reject any `suggested_price` that is more than 3x or less than 0.2x the current price (obviously wrong)
- A future enhancement could scrape Vinted comparables for the top 5 flagged items, but that's a bigger change

**File**: `supabase/functions/portfolio-optimizer/index.ts`

### 6. Dead Stock Analyzer (LOW priority - light fix)

**Problem**: Same as portfolio optimizer. `suggested_price` and `estimated_days_to_sell` are guesses.

**Fix**:
- Add validation: reject `suggested_price` values that are more than 2x the current price or negative
- Add prompt instruction: "suggested_price must be LOWER than current_price for price_reduction actions"
- Sanity-check `estimated_days_to_sell` is between 1 and 90

**File**: `supabase/functions/dead-stock-analyze/index.ts`

## Implementation Order

1. Clearance Radar - highest user-facing impact, same pattern as the arbitrage fix
2. Niche Finder - pre-compute stats from real data
3. Charity Briefing - fetch real Vinted prices for trending items
4. Competitor Scan - overwrite avg_price with computed value
5. Portfolio Optimizer - add sanity bounds
6. Dead Stock Analyzer - add sanity bounds

## Files to Modify

- `supabase/functions/clearance-radar/index.ts`
- `supabase/functions/niche-finder/index.ts`
- `supabase/functions/charity-briefing/index.ts`
- `supabase/functions/competitor-scan/index.ts`
- `supabase/functions/portfolio-optimizer/index.ts`
- `supabase/functions/dead-stock-analyze/index.ts`

## No Frontend Changes Required

All fixes are backend-only. The frontends already display whatever the edge functions return -- the data just needs to be accurate.

