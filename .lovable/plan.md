

# Increase Trends to 80 (Max Useful from 500 Listings)

## Why 80, not 500?
- 500 scraped listings contain roughly 50-80 unique brands
- Asking for more trends than unique brands forces the AI to hallucinate fake data
- 80 trends = ~10 per category tab, which looks rich and full
- AI cost increase is negligible (extra ~6,000 output tokens, pennies per run)

## Changes

### 1. Update AI prompt in `supabase/functions/lobstr-sync/index.ts`
- Change "exactly 40" to "exactly 80" trends
- Update minimum per category from 3 to 6 (8 categories x 6 = 48 baseline, 32 distributed)
- Update distribution: ~50 rising, 20 peaking, 10 declining
- Update "no more than 5 trends above 90" to "no more than 10 trends above 90"
- Add instruction: "Each brand_or_item should appear at most twice across different categories"

### 2. No frontend changes needed
- The TrendRadar page already dynamically filters and counts — more trends will automatically populate the tabs and badges

## Cost Impact
- One daily AI call goes from ~6K to ~12K output tokens
- At Gemini Flash pricing, this is fractions of a penny difference
- Zero additional scraping cost
