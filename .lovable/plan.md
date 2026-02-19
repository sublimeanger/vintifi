
# Phase 1 — Critical Fixes Implementation Plan

This plan covers every item defined in Part 11, Phase 1 of the Vintifi Repositioning Brief v3.0. There are four distinct fixes, two of which are live bugs affecting real users right now. No other phases will be touched until these are verified.

---

## What is being fixed and why

### Bug 1 — Translation credit deduction is completely missing (CRITICAL)

**File:** `supabase/functions/translate-listing/index.ts`

The function reaches line 120 and returns a successful translation response without ever calling `increment_usage_credit`. Every Business+ user who triggers a translation consumes real AI compute (Gemini 2.5 Flash) at our cost, but zero credits are deducted from their account. They can translate unlimited times for free.

**Fix:** After the AI call succeeds and translations are parsed (line 113–118), insert a call to the `increment_usage_credit` RPC before the return on line 120. Charge 1 credit per language translated (not 1 per call), which aligns with the credit cost table in Section 4.5.

The RPC signature is: `increment_usage_credit(p_user_id, p_column, p_amount)`. Column: `optimizations_used`. Amount: `languages.length` (number of target languages, defaulting to 4 if none specified).

The credit check (does the user have enough credits before we even call the AI?) should also be added, pulling their usage record first, to prevent a race where a user with 0 credits still gets a translation because we didn't check before firing the AI request.

---

### Bug 2 — Scale tier users see "Unlimited" instead of their credit balance

**File:** `src/components/AppShellV2.tsx`, line 56

Current broken code:
```
const isUnlimited = tier === "scale" || (credits?.credits_limit ?? 0) >= 999;
```

This has two problems:
1. `tier === "scale"` — hardcoded: all Scale users (600-credit cap) see "Unlimited ∞" and never see low-credit warnings
2. `>= 999` — the threshold is too low: any user with 999+ credits would be treated as unlimited, which catches the Scale tier (600-credit cap would not, but Enterprise at 1500 would incorrectly trigger this)

Fixed code per the brief:
```
const isUnlimited = (credits?.credits_limit ?? 0) >= 999999;
```

This restricts the "Unlimited" display exclusively to manually gifted accounts (the 999999 sentinel). Scale users (600 credits) and Enterprise users (1500 credits) will correctly see their numeric balance and low-credit amber warnings when ≤2 credits remain.

---

### Phase 1 Item 3 — Add `first_item_pass_used` column to `profiles` table

**Database migration required.**

This column gates the "First Item Free" experience that will be fully implemented in Phase 2. It needs to exist in the schema now so Phase 2 can be built against it without a blocking migration later.

SQL:
```sql
ALTER TABLE profiles ADD COLUMN first_item_pass_used BOOLEAN DEFAULT false;
```

The column defaults to `false` for all rows, including new ones created by the `handle_new_user()` trigger. No trigger update is needed at this stage — that is Phase 2's job.

---

### Phase 1 Item 4 — Existing user migration for `first_item_pass_used`

**Data migration (SQL run as part of the same migration file).** This sets the correct initial value for all existing users so Phase 2's logic starts from a known-good state:

- Free users with **no listings** → `first_item_pass_used = false` (they haven't used their free pass yet, they still get it)
- Free users **with ≥1 listing** → `first_item_pass_used = true` (they have already listed items, the pass is considered consumed)
- Paid users (Pro/Business/Scale/Enterprise) → `first_item_pass_used = true` (they have a paid plan, the free pass concept doesn't apply to them)

```sql
-- Free users with no listings get the pass
UPDATE profiles
SET first_item_pass_used = false
WHERE subscription_tier = 'free'
  AND user_id NOT IN (SELECT DISTINCT user_id FROM listings);

-- Free users with listings have implicitly used it
UPDATE profiles
SET first_item_pass_used = true
WHERE subscription_tier = 'free'
  AND user_id IN (SELECT DISTINCT user_id FROM listings);

-- All paid users mark as used (pass is irrelevant for them)
UPDATE profiles
SET first_item_pass_used = true
WHERE subscription_tier IN ('pro', 'business', 'scale', 'enterprise');
```

---

## Files being changed

| File | Change |
|---|---|
| `supabase/functions/translate-listing/index.ts` | Add credit pre-check + `increment_usage_credit` RPC call |
| `src/components/AppShellV2.tsx` | Fix `isUnlimited` line 56 |
| Database migration (new file) | Add `first_item_pass_used` column + run user migration |

## Files NOT being changed in Phase 1

Everything else. No wizard changes, no navigation, no marketing pages, no other edge functions.

---

## Technical implementation detail — translate-listing fix

The full logic sequence in the edge function after this fix:

1. Auth check (already exists)
2. Tier check — Business+ required (already exists)
3. **NEW:** Fetch user's `usage_credits` row via service role client
4. **NEW:** Check if `credits_limit - (price_checks_used + optimizations_used + vintography_used) >= languages.length` — if not enough credits, return 402 with a clear message
5. Call AI (already exists)
6. Parse response (already exists)
7. **NEW:** Call `increment_usage_credit(user.id, 'optimizations_used', languages.length)`
8. Return translations (already exists)

The unlimited sentinel check (999999) is also applied here so gifted accounts bypass the credit check entirely.

---

## Risk assessment

All four changes are low-risk:

- The `translate-listing` fix adds behaviour (credit deduction) that was always supposed to be there. The only risk is it could now reject users who have 0 credits, which is the correct behaviour.
- The `AppShellV2` fix is a one-line change to a display condition with no side effects on data.
- The DB column addition uses `DEFAULT false`, so it cannot break any existing query (existing rows get `false`, new rows get `false`).
- The data migration uses simple UPDATE statements with explicit WHERE clauses. No joins, no subqueries that could affect unintended rows.

No Phase 2, 3, 4, 5 or 6 items are in scope here.
