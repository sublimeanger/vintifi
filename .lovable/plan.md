
# Credit Engine & Tier Gating — Full Fix Plan

## Issues Found

### 1. CRITICAL: Scale tier `credits: 999` causes wrong display everywhere
**Root cause:** `STRIPE_TIERS.scale.credits` is `999` and the webhook sets `credits_limit` to `999` in the database for Scale users. But your actual DB `credits_limit` is `999999` or `1000049` (from credit pack purchases stacking on top). The sidebar in `AppShellV2.tsx` shows raw `credits_limit - price_checks_used` which could show `999`, `999999`, or `1000030` — all confusing.

**The real problem is architectural:** Scale tier means "unlimited" but the system stores a finite number (999) and credit packs ADD to it, creating absurd numbers like 1,000,049.

**Fix:**
- In `constants.ts`: Change `credits: 999` to `credits: -1` (sentinel for unlimited)
- In `AppShellV2.tsx`: When credits_limit >= 999 OR tier is "scale", display "Unlimited" instead of a number
- In `SettingsPage.tsx`: Same — show "Unlimited" for scale users instead of raw numbers
- In `PriceCheck.tsx`: Skip credit exhaustion check for scale tier
- In `Vintography.tsx` / `CreditBar.tsx`: Show "Unlimited" when limit >= 999
- In `UpgradeModal.tsx`: Already handles 999 -> "Unlimited" but should use the sentinel too
- In `useFeatureGate.ts`: When tier is "scale", skip credit exhaustion entirely (set `creditsExhausted = false`)

### 2. MEDIUM: Credit pool is shared but checked separately
**Problem:** All three usage types (price_checks, optimizations, vintography) share ONE `credits_limit` pool, but the sidebar only shows `credits_limit - price_checks_used`. If a user does 40 optimisations and 5 price checks with a 50-credit limit, the sidebar says "45 credits remaining" — wrong.

**Fix:**
- Calculate `totalUsed = price_checks_used + optimizations_used + vintography_used`
- Display remaining as `credits_limit - totalUsed`
- Apply this everywhere: AppShellV2, SettingsPage, PriceCheck subtitle, useFeatureGate

### 3. MEDIUM: Credit pack purchases create absurdly high limits
**Problem:** In `stripe-webhook`, credit packs ADD to `credits_limit` (line 82: `newLimit = currentCredits.credits_limit + creditsToAdd`). For a Scale user with `credits_limit: 999`, buying a 50-pack makes it `1049`. Multiple purchases balloon it to `1000049`. This is the source of the "1000030" display.

**Fix:** Credit packs should add to a separate `bonus_credits` column, OR the display logic should cap at "Unlimited" for scale users regardless of the raw number. The simplest fix is the display-side: treat any `credits_limit >= 999` as unlimited.

### 4. LOW: Vintography CreditBar shows raw numbers for unlimited users
**File:** `src/components/vintography/CreditBar.tsx`
**Fix:** Accept an `unlimited` prop and show "Unlimited" text instead of the progress bar.

---

## Technical Implementation

### `src/lib/constants.ts`
- Change Scale `credits: 999` to `credits: -1`

### `src/components/AppShellV2.tsx` (lines 93-96)
```typescript
const isUnlimited = tier === "scale" || (credits?.credits_limit ?? 0) >= 999;
const totalUsed = credits ? credits.price_checks_used + credits.optimizations_used + credits.vintography_used : 0;
const checksRemaining = isUnlimited ? Infinity : (credits ? credits.credits_limit - totalUsed : 0);
const creditsLow = !isUnlimited && checksRemaining <= 2;
```
- Line 200: Display `isUnlimited ? "Unlimited" : checksRemaining` + " AI credits"
- Line 241: Display `isUnlimited ? "∞" : checksRemaining`

### `src/hooks/useFeatureGate.ts` (lines 64-76)
- Add unlimited check: if user tier is "scale", set `creditsExhausted = false` and `creditsRemaining = Infinity`
- For other tiers, calculate remaining using ALL usage types combined: `credits_limit - (price_checks_used + optimizations_used + vintography_used)`

### `src/pages/SettingsPage.tsx` (lines 255-265)
- When `credits_limit >= 999` or tier is "scale", show "Unlimited" badge instead of progress bar
- Otherwise show `totalUsed / credits_limit` (not just price_checks_used)

### `src/pages/PriceCheck.tsx`
- Line 106: Add scale tier bypass — skip the `>= credits_limit` check for unlimited users
- Line 204: Show "Unlimited checks" for scale users, otherwise `credits_limit - totalUsed`

### `src/pages/Vintography.tsx` (line 76)
- Pass `isUnlimited` flag to CreditBar when tier is scale or limit >= 999

### `src/components/vintography/CreditBar.tsx`
- Accept `unlimited?: boolean` prop
- When unlimited, show a simple "Unlimited edits" label instead of the progress bar

### `src/components/UpgradeModal.tsx` (line 122)
- Change `t.credits === 999` to `t.credits === -1 || t.credits >= 999` to handle both sentinel and legacy values

### `supabase/functions/stripe-webhook/index.ts`
- Change all Scale tier entries from `credits: 999` to `credits: 9999` (a high but displayable cap) — OR keep 999 and rely on frontend "unlimited" logic
- The simplest approach: keep webhook as-is, handle everything on the display side

---

## Summary

| Issue | Severity | Fix Location |
|-------|----------|-------------|
| "999" shown instead of "Unlimited" for Scale users | CRITICAL | AppShellV2, SettingsPage, PriceCheck, Vintography, UpgradeModal |
| Credits pool checked per-type, not combined | MEDIUM | useFeatureGate, AppShellV2, SettingsPage, PriceCheck |
| Credit packs inflate limit to absurd numbers | MEDIUM | Display-side fix (treat >= 999 as unlimited) |
| CreditBar shows raw numbers for unlimited | LOW | CreditBar component |

### Files to Modify
- `src/lib/constants.ts`
- `src/components/AppShellV2.tsx`
- `src/hooks/useFeatureGate.ts`
- `src/pages/SettingsPage.tsx`
- `src/pages/PriceCheck.tsx`
- `src/pages/Vintography.tsx`
- `src/components/vintography/CreditBar.tsx`
- `src/components/UpgradeModal.tsx`
