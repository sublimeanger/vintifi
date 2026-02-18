
# Full Credit System Audit & Real-Time Balance Fix

## What the Audit Found

### Backend Security — Current State

**`vintography` edge function** (lines 454–476, 594–597):
- Credit gate reads from DB using service role (secure — no client manipulation possible)
- Weighted deduction is correctly implemented: `creditsToDeduct = operation === "model_shot" ? 4 : 1`
- Credit check: `totalUsed + creditsToDeduct > limit` — **CORRECT**
- Deduction: `vintography_used: used + creditsToDeduct` — **CORRECT**
- The credit is written AFTER the AI succeeds — so a failed generation does NOT consume credits. Good.
- **VULNERABILITY FOUND:** The `used` variable on line 460 reads only `vintography_used`, but the credit write on line 596 uses `used + creditsToDeduct` where `used = vintography_used`. This is correct for the vintography counter itself. However, the gate check uses `totalUsed` (all three counters combined) while the deduction updates only `vintography_used`. This is consistent and correct — no bug here.

**`price-check` edge function** (lines 237–253, 509–520):
- Credit gate reads all three counters and checks `totalUsed >= credits_limit` — **CORRECT**
- Deduction: `price_checks_used: (creditsData[0]?.price_checks_used || 0) + 1` — **CORRECT**
- **POTENTIAL STALE READ VULNERABILITY:** The credit data is read once at line 237, then the deduction at line 519 uses the stale `creditsData[0]?.price_checks_used` value. If two simultaneous requests arrive, both could read the same count, both pass the gate check, and both increment using the same stale base value — resulting in only +1 total instead of +2. This is a **race condition / double-spend** vulnerability.

**`optimize-listing` edge function** (lines 213–229, 505–516):
- Same pattern and **same race condition vulnerability** as price-check.

**`generate-hashtags`**: Does NOT check or deduct credits at all — it's used inline within the optimise-listing flow. Fine as-is since the parent call gates it.

**`translate-listing`**: Tier-gated (Business+) but does NOT deduct credits. This is a feature-access bypass concern but a separate issue from the credit deduction system.

### The Race Condition Fix

The fix is to replace the `PATCH` style deduction (which uses a stale client-side value) with a database-level atomic increment using Postgres's `+` operator in a `UPDATE ... SET x = x + 1` pattern, via an RPC function. This way, even if two requests arrive simultaneously, Postgres serialises the update correctly.

We need a new database function `increment_usage_credit(user_id uuid, column_name text, amount int)` that runs an atomic `UPDATE usage_credits SET <col> = <col> + amount WHERE user_id = $1` — preventing any race condition.

### Frontend Credit Display — Current State

**`AuthContext.tsx`:** `credits` is fetched once on mount and on `onAuthStateChange`. `refreshCredits()` re-fetches from DB. No real-time subscription to `usage_credits` table — credits only update in the UI when `refreshCredits()` is explicitly called.

**`AppShellV2.tsx` (sidebar/header):** Shows `checksRemaining` computed from `credits` context. Updates only when `refreshCredits()` is called after an action. The balance correctly shows in both desktop sidebar and mobile header.

**`Vintography.tsx`:** Uses `vintographyUsed` (only the vintography counter) for the `CreditBar` — but the `CreditBar` shows `used/limit` which is the vintography-only used count, NOT the total pool. This is **misleading** — if a user has 5 credits and does 3 price checks + 1 vintography edit, the CreditBar shows `1/5 edits` but they actually only have 1 credit left.

**`CreditBar` component:** Receives `used` and `limit` props. Currently only `vintographyUsed` is passed as `used` — not `totalUsed`.

**`PriceCheck.tsx`:** Does a front-end credit check before calling the function (lines 150–157). After completion, calls `refreshCredits()`. The UI credit display in AppShell updates as a result. Good — but the front-end check uses potentially stale cached data from context.

**`OptimizeListing.tsx`:** Same pattern as PriceCheck — calls `refreshCredits()` after success.

### What "Real-Time" Means Here

True real-time via Supabase Realtime subscriptions is the proper fix: subscribe to changes on `usage_credits` WHERE `user_id = current_user`. Then whenever ANY credit deduction happens (on any device/tab), the balance updates instantly in the UI without needing `refreshCredits()` to be manually called.

## All Issues Summary

| Issue | Severity | Location |
|-------|----------|----------|
| Race condition: stale read used as base for increment | HIGH | `price-check`, `optimize-listing` edge functions |
| CreditBar shows vintography-only count, not total pool | MEDIUM | `Vintography.tsx` → `CreditBar` |
| Credits only refresh on explicit call, not live | MEDIUM | `AuthContext` — no realtime subscription |
| translate-listing does not deduct credits | LOW | `translate-listing` edge function |

## Implementation Plan

### 1. Database — Atomic Increment Function (Migration)

Create a PostgreSQL function `increment_usage_credit` that performs a safe atomic `UPDATE`:

```sql
CREATE OR REPLACE FUNCTION public.increment_usage_credit(
  p_user_id uuid,
  p_column text,
  p_amount int DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_column = 'price_checks_used' THEN
    UPDATE usage_credits SET price_checks_used = price_checks_used + p_amount, updated_at = now() WHERE user_id = p_user_id;
  ELSIF p_column = 'optimizations_used' THEN
    UPDATE usage_credits SET optimizations_used = optimizations_used + p_amount, updated_at = now() WHERE user_id = p_user_id;
  ELSIF p_column = 'vintography_used' THEN
    UPDATE usage_credits SET vintography_used = vintography_used + p_amount, updated_at = now() WHERE user_id = p_user_id;
  END IF;
END;
$$;
```

Using an explicit column whitelist (not dynamic SQL) eliminates SQL injection risk.

We also need to enable Realtime on the `usage_credits` table so the frontend subscription works:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.usage_credits;
```

### 2. Fix Race Condition in `price-check/index.ts`

Replace the stale-value PATCH at the bottom:
```ts
// OLD — stale base value
body: JSON.stringify({ price_checks_used: (creditsData[0]?.price_checks_used || 0) + 1 })

// NEW — atomic RPC call
await fetch(`${supabaseUrl}/rest/v1/rpc/increment_usage_credit`, {
  method: "POST",
  headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
  body: JSON.stringify({ p_user_id: userId, p_column: "price_checks_used", p_amount: 1 }),
});
```

### 3. Fix Race Condition in `optimize-listing/index.ts`

Same atomic RPC replacement for `optimizations_used`.

### 4. Fix Race Condition in `vintography/index.ts`

Replace the `vintography_used: used + creditsToDeduct` PATCH with the atomic RPC, passing `p_amount: creditsToDeduct` so the 4-credit model shot is also atomic.

### 5. Real-Time Credit Subscription in `AuthContext.tsx`

Add a Supabase Realtime channel subscription to `usage_credits` after the user is authenticated. When a `UPDATE` event fires on the user's row, update the `credits` state directly from the payload — no additional DB fetch needed:

```ts
// Subscribe once user is known
const channel = supabase
  .channel(`credits-${userId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'usage_credits',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    const newRow = payload.new as UsageCredits;
    setCredits({
      price_checks_used: newRow.price_checks_used,
      optimizations_used: newRow.optimizations_used,
      vintography_used: newRow.vintography_used,
      credits_limit: newRow.credits_limit,
    });
  })
  .subscribe();
```

Clean up channel on user change/sign-out.

### 6. Fix `CreditBar` in `Vintography.tsx` — Show Total Pool Not Just Vintography

The `CreditBar` currently receives:
- `used={vintographyUsed}` — only the vintography counter
- `limit={creditsLimit}` — the total pool limit

This is wrong. It should show the user's **total remaining credits** across all features, because the pool is unified. Change to:

```ts
const totalUsed = credits
  ? (credits.price_checks_used + credits.optimizations_used + credits.vintography_used)
  : 0;

<CreditBar used={totalUsed} limit={creditsLimit} unlimited={isUnlimited} />
```

The label in `CreditBar` also changes from `X/Y edits` to `X/Y credits` to be consistent with the app-wide terminology.

### 7. Add Realtime Credit Display to `AppShellV2`

The sidebar credit indicator already reads from context. With the realtime subscription added in step 5, it will automatically update in real-time without any additional changes — no `refreshCredits()` calls needed.

However, we should make the sidebar credit button more informative: show total used vs limit (not just remaining), and add a subtle pulsing animation when a deduction has just occurred (detect via `useEffect` watching the credits value change).

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/` | New migration: `increment_usage_credit` RPC + enable realtime on `usage_credits` |
| `supabase/functions/price-check/index.ts` | Replace stale PATCH increment with atomic RPC call |
| `supabase/functions/optimize-listing/index.ts` | Replace stale PATCH increment with atomic RPC call |
| `supabase/functions/vintography/index.ts` | Replace stale PATCH increment with atomic RPC call (passes `creditsToDeduct` as amount) |
| `src/contexts/AuthContext.tsx` | Add Realtime channel subscription for `usage_credits`; remove `refreshCredits()` dependency where possible since realtime handles it |
| `src/pages/Vintography.tsx` | Fix `CreditBar` to use `totalUsed` across all credit types, not just `vintographyUsed` |
| `src/components/vintography/CreditBar.tsx` | Change `X/Y edits` label to `X/Y credits` for consistency |

## What This Achieves

- **No double-spend possible**: Atomic DB-level increment eliminates race condition — concurrent requests cannot both pass the gate and both write the same stale base value.
- **Real-time balance**: Any credit deduction (price check, optimise, photo edit) instantly updates the balance in the sidebar, header, and CreditBar without waiting for a page action.
- **Accurate CreditBar**: Photo Studio now shows the true pool balance, not a misleading per-feature count.
- **Consistent terminology**: "credits" everywhere instead of "edits" in CreditBar.
- **No circumvention possible**: All gates are server-side with service role keys — frontend credit state is display only. A user manipulating the frontend cannot bypass the backend gate check.
