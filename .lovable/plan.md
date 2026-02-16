
# Apify Integration Audit: Replacing Lobstr and Upgrading All Features

## Current State Summary

| Edge Function | Vinted Data Source | Other Platform Source | Needs Update? |
|---|---|---|---|
| `price-check` | Apify (primary), Firecrawl (fallback) | N/A | No -- already done |
| `arbitrage-scan` | Apify (primary), Firecrawl (fallback) | Firecrawl (eBay, Depop, etc.) | No -- already done |
| `lobstr-sync` (Trend Radar) | Lobstr (primary), Firecrawl (fallback) | N/A | **YES -- replace Lobstr with Apify** |
| `competitor-scan` | Firecrawl only | N/A | **YES -- add Apify for better data** |
| `niche-finder` | Firecrawl only | N/A | **YES -- add Apify for structured data** |
| `clearance-radar` | Firecrawl (Vinted baseline) | Firecrawl (retailers) | **YES -- Apify for Vinted side** |
| `charity-briefing` | None (reads from trends table) | N/A | No -- uses trend data downstream |
| `dead-stock-analyze` | None (reads from listings table) | N/A | No -- no scraping involved |
| `import-wardrobe` | None (CSV import only) | N/A | No -- already uses Apify separately |
| `fetch-trends` | None (reads from trends table) | N/A | No -- just a DB read |

## Cost Analysis: Apify vs Lobstr vs Firecrawl

### Apify (Vinted Smart Scraper)
- **Pricing**: Pay-per-use based on compute units. The `kazkn~vinted-smart-scraper` actor costs roughly $0.25-0.50 per 100 items scraped (varies by load).
- **For Trend Radar (80 trends)**: Need ~200-500 items across 8 categories = ~$1-3 per full scan.
- **For Price Check**: Already running, ~$0.01-0.03 per check (20 items).
- **Advantage**: Returns **structured JSON** with exact prices, view counts, favourite counts, brand, size, condition. Far superior to Firecrawl's markdown snippets.

### Lobstr.io (Current)
- **Pricing**: ~$30-50/month for scheduled scraping.
- **Problem**: Requires manual Squid configuration, separate polling/launch/process flow, and the LOBSTR_API_KEY is configured but may not be reliably returning data (the fallback to Firecrawl fires frequently).
- **Recommendation**: **Deprecate entirely**. Apify does the same thing better and on-demand.

### Firecrawl
- **Pricing**: $0.01 per search query.
- **Role going forward**: Keep for **non-Vinted** searches only (eBay, Depop, retail clearance sites, competitor web presence). Firecrawl cannot access Vinted's dynamic SPA content -- it returns markdown snippets that lack structured pricing data.

## Recommended Update Schedule for Trend Radar

| Tier | Refresh Frequency | Apify Cost per Refresh | Monthly Cost per User |
|---|---|---|---|
| Free | Weekly (shared/cached) | $0 (uses cached data) | $0 |
| Pro | Daily | ~$1.50 | ~$1.50 |
| Business | Twice daily | ~$3.00 | ~$3.00 |
| Scale | Every 6 hours | ~$6.00 | ~$6.00 |

**Shared cache strategy**: All users share the same trend data (it's market-wide, not user-specific). So one Apify run per refresh cycle serves ALL users on that tier. At 100 Pro users, cost is $1.50/day total, not per user. This makes it extremely cost-efficient.

## Implementation Plan

### Step 1: Rewrite `lobstr-sync` to use Apify as primary source

The current `lobstr-sync` function is 600 lines of complex launch/poll/process/import logic designed for Lobstr's asynchronous workflow. Apify's synchronous `run-sync-get-dataset-items` endpoint eliminates all of this complexity.

**New flow**:
1. Call Apify Vinted Smart Scraper for each category (8 categories, ~50 items each = 400 items total)
2. Pass structured results directly to AI for trend analysis (no polling needed)
3. Write trends to the `trends` table
4. Fall back to Firecrawl web search if Apify fails

This reduces the function from ~600 lines to ~250 lines and eliminates the 3-step launch/poll/process user flow. The frontend `TrendRadar.tsx` will no longer need to track job IDs or poll status.

### Step 2: Add Apify to `competitor-scan`

Currently uses `site:vinted.co.uk username` via Firecrawl, which returns weak markdown snippets. Adding Apify as primary source gives structured listing data with real prices, views, and favourites for much better competitor intelligence.

### Step 3: Add Apify to `niche-finder`

Currently runs two Firecrawl searches per category (supply + demand). Adding Apify provides real listing counts, price distributions, and favourite/view ratios -- making the supply/demand gap analysis data-driven instead of AI-estimated.

### Step 4: Add Apify to `clearance-radar` (Vinted baseline only)

The clearance radar searches retail sites via Firecrawl (correct -- keep this) but also searches `site:vinted.co.uk` via Firecrawl for resale baselines. Replace the Vinted baseline search with Apify for structured price data.

### Step 5: Update `data_source` labels and frontend references

- Change `data_source: "lobstr"` to `data_source: "apify"` throughout
- Update `TrendRadar.tsx` line 179 to show "Real market data" for `apify` source
- Remove `DEFAULT_LOBSTR_SQUID_IDS` from `src/lib/constants.ts`
- Remove the `LOBSTR_API_KEY` secret (can be done later, no rush)

### Step 6: Simplify TrendRadar frontend

The current TrendRadar page has a complex job-tracking UI because Lobstr runs are asynchronous. With Apify's synchronous API, the "Refresh" button can just call the function and get results back directly, removing the polling UX entirely.

## Files Changed Summary

| File | Change |
|---|---|
| `supabase/functions/lobstr-sync/index.ts` | Full rewrite: Apify primary, Firecrawl fallback, synchronous flow, ~250 lines |
| `supabase/functions/competitor-scan/index.ts` | Add Apify Vinted search as primary, Firecrawl as fallback |
| `supabase/functions/niche-finder/index.ts` | Add Apify for structured supply/demand data |
| `supabase/functions/clearance-radar/index.ts` | Replace Vinted Firecrawl search with Apify |
| `src/pages/TrendRadar.tsx` | Update data source label, simplify refresh flow |
| `src/lib/constants.ts` | Remove `DEFAULT_LOBSTR_SQUID_IDS` |

## What Stays the Same

- `price-check` -- already uses Apify primary + Firecrawl fallback
- `arbitrage-scan` -- already uses Apify for Vinted + Firecrawl for other platforms
- `charity-briefing` -- reads from trends table (benefits automatically from better trend data)
- `dead-stock-analyze` -- reads from listings table (no scraping)
- `fetch-trends` -- pure DB read (no scraping)
- `import-wardrobe` -- CSV import only
- All Firecrawl usage for non-Vinted platforms (eBay, Depop, retail sites) stays unchanged
