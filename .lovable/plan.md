

# Richer Trend Radar from Existing Data (Zero Extra Scraping Cost)

## The Problem
The Lobstr Squid already returns ~500 listings per run across 21 URLs. That data is plenty. The bottleneck is the AI processing step, which currently generates only **16 trends** spread across 8 categories — resulting in 1-2 per tab.

## The Fix (No additional scraping cost)

### 1. Increase trend count from 16 to 40
Update the AI prompt in `lobstr-sync/index.ts` to generate **40 trends** instead of 16:
- Minimum 3 per category (8 categories x 3 = 24 baseline)
- Remaining 16 distributed to categories with the most data
- Distribution: ~25 rising, 10 peaking, 5 declining

This uses the same single AI call — the cost difference is negligible (slightly longer output).

### 2. Feed more data to the AI
Currently only 200 of 500 scraped items are passed to the prompt. Increase this to all 500 by compressing each item to a shorter format (brand + price + category only), keeping the prompt within token limits.

### 3. Add trend count badges to category tabs
Show a count next to each tab name (e.g. "Womenswear (7)") so users can see at a glance which categories are richest.

## Files Changed
- `supabase/functions/lobstr-sync/index.ts` — update AI prompt (trend count, distribution, data formatting)
- `src/pages/TrendRadar.tsx` — add count badges to tabs

## Cost Impact
- Scraping: **No change** (same Squid, same daily run)
- AI: **Negligible** (~2x more output tokens per daily run, pennies)
- Net result: 2-3x more trends per category tab from the same data you already pay for
