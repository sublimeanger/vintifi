
# Phase 2 — Credit System & Free Tier Rework

This plan covers every item in Part 11, Phase 2 of the Vintifi Repositioning Brief v3.0. Phase 1 is confirmed complete. Phase 2 is self-contained — it touches the database trigger, one edge function guard, the feature gate hook, and the sell wizard's first-item-free UI branch. Nothing from Phase 3 (wizard reorder), Phase 4 (navigation), or Phase 5 (marketing) is in scope.

---

## What is changing and why

### Change 1 — Database: `handle_new_user` trigger grants 3 credits, not 5

**Current state:** The `handle_new_user` function inserts a `usage_credits` row with `credits_limit = 5`.

**New state:** New signups get `credits_limit = 3`.

Rationale: The repositioning brief changes the Free tier from "5 credits per month" to "3 credits per month" (enough for: 1 remove-background, 1 optimise, 1 price check — a complete single-item trial). This makes the upgrade case sharper.

**Migration SQL:**
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    upper(substr(md5(random()::text), 1, 8))
  );

  INSERT INTO public.usage_credits (user_id, credits_limit)
  VALUES (NEW.id, 3);

  RETURN NEW;
END;
$$;
```

**Important:** Existing user credit limits are NOT changed — this only affects new signups from this point forward. Current free users keep their existing credits_limit value.

---

### Change 2 — Database: `enforce_listing_limit` trigger: Free tier cap drops from 20 to 10

**Current state:** Free tier allows 20 active+reserved listings.

**New state:** Free tier allows 10 active+reserved listings.

Rationale: The brief reduces the free item cap to 10 to create a tighter conversion moment. Users who hit 10 items and want to track more must upgrade to Pro (200 items).

**Migration SQL:**
```sql
CREATE OR REPLACE FUNCTION public.enforce_listing_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_tier TEXT;
  current_count INTEGER;
  max_allowed INTEGER;
BEGIN
  SELECT subscription_tier INTO current_tier
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  SELECT count(*) INTO current_count
  FROM public.listings
  WHERE user_id = NEW.user_id
    AND status IN ('active', 'reserved');

  max_allowed := CASE current_tier
    WHEN 'free'       THEN 10
    WHEN 'pro'        THEN 200
    WHEN 'business'   THEN 1000
    WHEN 'scale'      THEN 5000
    WHEN 'enterprise' THEN 999999
    ELSE 10
  END;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Listing limit reached for your % plan (% of % allowed). Upgrade to add more items.',
      COALESCE(current_tier, 'free'), current_count, max_allowed;
  END IF;

  RETURN NEW;
END;
$$;
```

**Note:** This change is immediate and affects all new listing inserts. Existing users who already have 10-20 items listed are not affected — their listings remain; they simply cannot add new ones until they upgrade or remove some.

---

### Change 3 — `useFeatureGate.ts`: Update free tier credit count to 3 and add first-item-free awareness

**Current state:** `FEATURE_CONFIG.price_check` has `minTier: "free"`. The free tier credit count displayed elsewhere is 5 (from `STRIPE_TIERS.free.credits`).

**Changes to `src/hooks/useFeatureGate.ts`:**

1. The `FEATURE_CONFIG` map needs a new `"sell_wizard"` feature key added — this is the composite key used to gate the full wizard flow for free users. It will represent the "first item free" pass.

2. Return `firstItemPassAvailable` and `firstItemPassUsed` from the hook when the feature is `sell_wizard` — so the wizard UI can conditionally show the "Try it free — first item on us" banner vs the gated state.

3. Update the `useFeatureGate` return to expose a `freePassActive` boolean for the sell_wizard feature — `true` if the user is on free tier AND `first_item_pass_used === false`.

**New FeatureKey added:** `"sell_wizard"` with `minTier: "free"`, `usesCredits: true`.

---

### Change 4 — `src/lib/constants.ts`: Update Free tier credits to 3

**Current state:** `STRIPE_TIERS.free.credits = 5`

**New state:** `STRIPE_TIERS.free.credits = 3`

This ensures the pricing page, upgrade modal, and any UI that reads from this constant reflects the correct 3-credit free tier allowance.

---

### Change 5 — `supabase/functions/optimize-listing/index.ts`: Fix unlimited sentinel threshold

**Current state:** The credit check on line 220 reads `if (c.credits_limit < 999)` — this is the same bug that existed in AppShellV2 before Phase 1. The threshold of `< 999` is too low. It means any account with 999+ credits (e.g. Enterprise at 1500) would bypass the credit check incorrectly.

**Fix:** Change `< 999` to `< 999999` on the unlimited sentinel check.

Same fix applies in `supabase/functions/price-check/index.ts` at line 244 where `c.credits_limit < 999` appears identically.

---

### Change 6 — `SellWizard.tsx`: First-item-free pass UI

**Current state:** The sell wizard has no concept of the first-item-free pass. All free users with 0 credits are blocked by the credit system before they can run a price check (step 2) or optimise (step 3).

**New behaviour:**

The wizard itself does not need gating at the top level because Step 1 (Add Item) is always free — it just writes to the database. The credit-consuming steps are Step 2 (Price Check — 1 credit) and Step 3 (Optimise — 1 credit).

The first-item-free pass works by granting 3 credits at signup (handled by Change 1). The wizard does not need special bypass logic — the 3 credits cover exactly: 1 price check + 1 optimise + 1 vintography operation = 3 credits. This is the intended free trial sequence.

**What does need updating in the wizard:**

1. **Step 2 header** — When a free user enters step 2 and `creditsRemaining <= 1` after using the price check, show a subtle inline nudge: "This used 1 of your 3 free credits — upgrade for unlimited checks."

2. **Step 3 header** — When a free user enters step 3 and `creditsRemaining === 0` after using optimise, the "Save Optimised Listing" step still completes, but upon completion show a conversion banner: "You've completed your free item. Upgrade to Pro to sell more."

3. **Credit exhaustion guard** — If a free user somehow reaches Step 2 or Step 3 with 0 credits (e.g. they ran a standalone price check from the dashboard and burned their credits before using the wizard), the current edge function `403` response will surface as a toast error. This is acceptable — no special UI needed beyond the existing error toast. The wizard is not locked behind `FeatureGate` at the page level since Step 1 is always free.

**Implementation approach:** Read `credits` from `useAuth()` inside the SellWizard component (it's already imported but `credits` isn't destructured). Add `const { user, credits, profile } = useAuth()` and derive `creditsRemaining` inline. Show the nudge banners conditionally in `renderStep2` and `renderStep3`.

---

## Files being changed

| File | Change |
|---|---|
| Database migration (new file) | Replace `handle_new_user` function (3 credits), replace `enforce_listing_limit` (10 free items) |
| `src/lib/constants.ts` | `STRIPE_TIERS.free.credits` → 3 |
| `src/hooks/useFeatureGate.ts` | Add `sell_wizard` FeatureKey, expose `freePassActive` |
| `supabase/functions/optimize-listing/index.ts` | Fix `< 999` → `< 999999` sentinel |
| `supabase/functions/price-check/index.ts` | Fix `< 999` → `< 999999` sentinel |
| `src/pages/SellWizard.tsx` | Destructure `credits` + `profile` from `useAuth`, add nudge banners in steps 2 and 3 |

## Files NOT being changed in Phase 2

- No sidebar/navigation changes (Phase 4)
- No wizard step reorder (Phase 3)
- No marketing pages (Phase 5)
- No changes to `translate-listing` (fixed in Phase 1)
- No changes to `AppShellV2` (fixed in Phase 1)
- No `import-wardrobe` changes

---

## Risk assessment

- **Database functions:** Both `handle_new_user` and `enforce_listing_limit` are replaced in-place using `CREATE OR REPLACE`. No existing data is affected. Existing users keep their credits. Existing listings are not deleted.
- **`< 999` → `< 999999` sentinel fix:** This is a pure bug fix. The only effect is that Enterprise users (1500 credit limit) will now correctly have their credits tracked rather than bypassing the check. This is correct behaviour.
- **Wizard nudge banners:** Purely additive UI — conditional renders that only appear when `creditsRemaining` is low. No wizard flow logic is changed.
- **Constants change:** `STRIPE_TIERS.free.credits = 3` only affects display strings on the pricing page and upgrade modal. No functional logic derives its credit limit from this constant — the database `credits_limit` column is the source of truth.
