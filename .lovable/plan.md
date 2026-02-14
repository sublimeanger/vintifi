

# Fix Lobstr.io Integration and Improve Trend Data Quality

## Problem Summary

Two issues found:

1. **Wrong API endpoint**: The edge function calls `POST /v1/squids/{id}/launch` which doesn't exist. The correct Lobstr.io endpoint is `POST /v1/runs` with the squid ID in the request body.
2. **Trend data quality gaps**: The AI-generated trends (from Firecrawl fallback) have some issues -- missing Accessories category, generic item names instead of specific brands, and wrong year in peak dates (2024 instead of 2026).

## Changes

### 1. Fix `supabase/functions/lobstr-sync/index.ts`

**Launch action** -- change the API call from:
```text
POST https://api.lobstr.io/v1/squids/{squidId}/launch
```
to:
```text
POST https://api.lobstr.io/v1/runs
Body: { "squid_id": squidId }
```

**Poll action** -- verify `GET /v1/runs/{run_id}` is correct (it is).

**Process action** -- verify `GET /v1/runs/{run_id}/results` is correct (it is). Also improve the AI prompt to:
- Require specific brand names (not generic categories like "Baby & Kids Clothing")
- Ensure `estimated_peak_date` uses 2026 dates
- Require at least 1 trend per category including Accessories
- Add more variance to opportunity scores (range 20-98 instead of clustering 70-98)

### 2. No frontend changes needed

The `TrendRadar.tsx` polling logic is already correct for the async flow. Once the API endpoint is fixed, Lobstr.io runs will actually launch and the existing poll/process flow will work.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/lobstr-sync/index.ts` | Update | Fix launch endpoint to `POST /v1/runs`, improve AI prompt for better data quality |

## Expected Result

After this fix, clicking "Scan Market" will successfully launch a real Lobstr.io run, poll until complete, fetch actual Vinted listing data, and generate trends with `data_source: "lobstr"` instead of falling back to Firecrawl every time.

