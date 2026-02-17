

# Upgrade to Perplexity sonar-pro for Richer Market Data

## The Problem

Currently using `sonar` (basic model) which performs a single search pass and returns a handful of citations. For pricing intelligence, more data points = more accurate recommendations. A price check based on 5 listings is guesswork; one based on 20+ listings is intelligence.

## The Fix

One-line change: switch `sonar` to `sonar-pro` in the Perplexity API call.

## What sonar-pro Gives Us

| Feature | sonar (current) | sonar-pro (upgrade) |
|---------|----------------|-------------------|
| Search depth | Single pass | Multi-step reasoning |
| Citations | ~5-10 sources | ~15-25 sources (2x more) |
| Cross-referencing | Basic | Compares across sources |
| Speed | ~5-7s | ~7-10s |
| Cost | 1x | ~2x per query |

The extra 2-3 seconds is negligible when the total flow is ~15s, and the quality improvement directly translates to better pricing confidence scores and more comparable items for users.

## Technical Detail

**File:** `supabase/functions/price-check/index.ts`

Single change on line 27:
- Change `model: "sonar"` to `model: "sonar-pro"`

No other changes needed -- the response format (content + citations) is identical.

