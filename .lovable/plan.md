

# Fix: Unified Credit Engine Across All Edge Functions

## Problem

All three credit-consuming edge functions have **different, broken** credit checking logic:

1. **`optimize-listing`** — Artificially caps optimisations at 60% of `credits_limit` (the `Math.floor(c.credits_limit * 0.6)` bug). A user with 50 credits can only do 30 optimisations.
2. **`price-check`** — Checks only `price_checks_used` against the full `credits_limit`, ignoring optimisations and vintography usage. A user could exhaust their pool via optimisations and still pass the price check gate.
3. **`vintography`** — Uses a completely separate hardcoded `TIER_LIMITS` map (`free: 3, pro: 15, business: 50, scale: 999`) instead of the shared `credits_limit` from the database. Totally disconnected from the unified pool.

None of them bypass the check for Scale/unlimited users.

## Fix (All 3 Edge Functions)

The unified logic for each function should be:

```text
1. Fetch ALL usage columns: price_checks_used, optimizations_used, vintography_used, credits_limit
2. If credits_limit >= 999 -> skip check (unlimited user)
3. totalUsed = price_checks_used + optimizations_used + vintography_used
4. If totalUsed >= credits_limit -> return 403 "Monthly credit limit reached"
5. Otherwise proceed, then increment the relevant counter
```

### File: `supabase/functions/optimize-listing/index.ts`
- **Lines 183-197**: Change the credit check query to fetch all three usage columns
- Remove the `optimLimit = Math.floor(c.credits_limit * 0.6)` line
- Replace with: `totalUsed = price_checks + optimizations + vintography`, check `totalUsed >= credits_limit`
- Add Scale bypass: `if (c.credits_limit >= 999) { /* skip check */ }`

### File: `supabase/functions/price-check/index.ts`
- **Lines 100-112**: Change the credit check query to fetch all three usage columns
- Replace `price_checks_used >= credits_limit` with `totalUsed >= credits_limit`
- Add Scale bypass

### File: `supabase/functions/vintography/index.ts`
- **Lines 114-120**: Remove the separate `TIER_LIMITS` map entirely
- **Lines 198-211**: Replace with unified check — fetch all three usage columns from `usage_credits` plus `credits_limit`
- Add Scale bypass
- This is the biggest change: the function currently doesn't even read `credits_limit` from the database

### Optional: Add `-1 credit` toast on the frontend
- In `src/pages/PriceCheck.tsx`, `src/pages/OptimizeListing.tsx`, and `src/pages/Vintography.tsx`: after a successful action, show a brief toast like "1 credit used" using sonner
- Only show for non-unlimited users
- This gives users clear feedback without cluttering the UI

## Summary

| Function | Current Bug | Fix |
|----------|------------|-----|
| optimize-listing | 60% cap on optimisations | Unified totalUsed check + Scale bypass |
| price-check | Only checks price_checks_used | Unified totalUsed check + Scale bypass |
| vintography | Separate hardcoded limits, ignores credits_limit | Use shared credits_limit + Scale bypass |
| Frontend toast | No feedback on credit spend | Optional `-1 credit` toast |

### Files to Modify
- `supabase/functions/optimize-listing/index.ts` (lines 182-197)
- `supabase/functions/price-check/index.ts` (lines 100-112)
- `supabase/functions/vintography/index.ts` (lines 114-120, 198-211)
- `src/pages/PriceCheck.tsx` (optional toast)
- `src/pages/OptimizeListing.tsx` (optional toast)
- `src/pages/Vintography.tsx` (optional toast)
