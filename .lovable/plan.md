

# Enterprise Launch Audit — Vintifi Platform

This audit covers every layer of the platform: pricing, billing, credit engine, navigation, data integrity, security, and dead code. Issues are grouped into **3 priority sprints**.

---

## Sprint 1: Critical Fixes (Must-Fix Before Launch)

### 1.1 Missing Edge Function Config Entries

**Problem:** Two edge functions (`buy-credits` and `ebay-preview`) exist in code but are missing from `supabase/config.toml`. Without config entries, these functions may fail to deploy or behave unexpectedly.

**Fix:** Add both to `supabase/config.toml`:
- `[functions.buy-credits]` with `verify_jwt = false`
- `[functions.ebay-preview]` with `verify_jwt = false`

### 1.2 Pricing Page Annual Price Inconsistency

**Problem:** The **Landing page** and **Marketing Pricing page** both calculate annual prices using `tier.price * 0.8`, which is a dynamic calculation. The **Settings page** uses `annual_price / 12` from constants. While both currently produce the same numbers (e.g. Pro: 9.99 * 0.8 = 7.99 and 95.88/12 = 7.99), the Landing/Pricing pages are fragile -- if `annual_price` in constants ever changes, they'll show different prices from Settings.

**Fix:** Unify all three pages to use the authoritative `annual_price / 12` from constants instead of `price * 0.8`. This ensures a single source of truth.

### 1.3 Vintography Credit Type Mismatch in Feature Gate

**Problem:** In `useFeatureGate.ts`, the Vintography feature is configured with `creditType: "price_checks"` (line 52). While the unified credit pool means this doesn't affect the actual gating logic (all types sum together), the `reason` message when credits are exhausted says "You've used all your price checks this month" instead of something relevant to Vintography.

**Fix:** Either change the `creditType` to a generic label or update the exhausted-credits message to say "credits" instead of type-specific language, since the system uses a unified pool.

### 1.4 `DashboardIntelligence` Component is Orphaned

**Problem:** `src/components/DashboardIntelligence.tsx` exists (246 lines) but is **never imported** by any page or component. It contains an "Attention Needed" section and a "Trending Now" section that duplicate functionality already in `Dashboard.tsx` (which has its own trends preview and the `NextActionsInbox`).

**Fix:** Delete the orphaned `DashboardIntelligence.tsx` file. The Dashboard already covers its functionality via `NextActionsInbox` (stale items, needs-price, needs-optimise) and the Opportunities section (trends).

### 1.5 Trending Cards in DashboardIntelligence Navigate to Price Check Instead of Trends

**Problem:** While `DashboardIntelligence` is currently unused (see 1.4), if it were ever re-enabled, its trend cards navigate to `/price-check?brand=...` which is inconsistent with the main dashboard's Opportunities section that navigates to `/trends`. This was flagged in the previous audit but only partially addressed.

**Fix:** Resolved by deleting the orphaned component (1.4).

---

## Sprint 2: Data Integrity & Credit Engine Hardening

### 2.1 Credit Usage Display Doesn't Refresh After Actions

**Problem:** After a user performs a price check or optimisation, the credit count in the sidebar/header doesn't automatically update. The user must navigate away and back (or refresh) for `AuthContext.refreshCredits()` to be called. Individual pages do call `refreshCredits()` after actions, but the sidebar's display relies on the context state which may be stale.

**Fix:** Ensure `refreshCredits()` is called after every credit-consuming action (price check, optimise, vintography). Verify this is already happening in each page -- and if not, add the call.

### 2.2 Stripe Webhook: User Lookup by Email is Fragile

**Problem:** The `stripe-webhook` function finds users by iterating through `supabase.auth.admin.listUsers()` and matching by email. This approach:
- Doesn't scale (lists all users every webhook call)
- Could miss users if there are more than the default page size
- Is slow and wasteful

**Fix:** Use `supabase.auth.admin.listUsers({ filter: email })` or better yet, look up the user via the `profiles` table which has a direct email/stripe reference. Alternatively, store `stripe_customer_id` on the profiles table during checkout and look up by that directly.

### 2.3 `customer-portal` Uses Service Role Key for Auth

**Problem:** The `customer-portal` edge function creates the Supabase client with `SUPABASE_SERVICE_ROLE_KEY` (line 16) but then uses the auth token from the request header to get the user (line 23). Using the service role key is correct here since it needs admin access, but it's worth noting this is intentional and correct.

**Status:** No action needed -- working correctly.

### 2.4 No Credit Reset Mechanism

**Problem:** The `usage_credits` table tracks `price_checks_used`, `optimizations_used`, and `vintography_used`, but there's no visible mechanism to reset these counters monthly. Without a `pg_cron` job or similar, users' usage counts accumulate forever, eventually exhausting credits permanently.

**Fix:** Verify that a `pg_cron` job exists to reset usage counters monthly. If not, create one that runs on the 1st of each month to reset `price_checks_used`, `optimizations_used`, and `vintography_used` to 0 for all users.

### 2.5 Listings Page Status Filter from URL

**Problem:** The Dashboard now correctly links to `/listings?status=active` and `/listings?status=sold`, but need to verify the Listings page actually reads and applies the `status` query parameter on load.

**Fix:** Verify that `Listings.tsx` reads `searchParams.get("status")` and sets the initial filter state accordingly. The file does import `useSearchParams` so this likely works, but should be confirmed.

---

## Sprint 3: Polish & Cohesion

### 3.1 Free Tier Item Limit (20) Not Enforced Server-Side

**Problem:** The Listings page has client-side `LISTING_LIMITS` (free: 20, pro: 200, business: 1000, scale: 999999) but this is only enforced in the UI. Nothing prevents a Free user from inserting more than 20 items via the API or by bypassing the frontend check.

**Fix:** Add a database trigger or RLS policy that enforces the listing count limit per tier. Alternatively, add server-side validation in the insert path.

### 3.2 Missing `subscriptions` Table

**Problem:** The spec mentions a `subscriptions` table for tracking Stripe subscription status, but the database only has `profiles.subscription_tier` and `usage_credits`. This means there's no record of Stripe subscription IDs, billing cycles, or cancellation dates. The webhook updates `profiles.subscription_tier` directly.

**Status:** This is a simplification that works for the current feature set. Consider adding a `subscriptions` table later for audit trail purposes.

### 3.3 `lobstr-sync` Edge Function is Deprecated but Still Configured

**Problem:** Per the project memory, "Lobstr.io is deprecated" and replaced by Apify. However, `lobstr-sync` still exists as an edge function and has a config entry in `config.toml`.

**Fix:** Remove the `lobstr-sync` edge function directory and its config entry since it's deprecated. Also remove the `LOBSTR_API_KEY` secret if no longer used.

### 3.4 `sync-platform-status` Config Entry Has No Matching Function

**Problem:** `supabase/config.toml` has an entry for `[functions.sync-platform-status]` but no corresponding directory exists in `supabase/functions/`.

**Fix:** Remove the orphaned config entry.

### 3.5 Bulk Optimize Route Exists But Has No Navigation Path

**Problem:** `/bulk-optimize` is a valid route in `App.tsx` (line 80) but there's no sidebar link, bottom nav, or obvious navigation to reach it. Users on the Business+ tier who should have access to bulk optimisation have no way to discover it.

**Fix:** Add a link to Bulk Optimise from the Listings page (e.g. a "Bulk Improve" button when multiple items are selected) or add it as a sub-item under the Tools section in the sidebar.

---

## Summary

| Sprint | Items | Effort |
|--------|-------|--------|
| Sprint 1: Critical Fixes | 4 actionable items | ~1 hour |
| Sprint 2: Data Integrity | 3 actionable items | ~2 hours |
| Sprint 3: Polish | 4 actionable items | ~2 hours |

**Overall Assessment:** The platform is in solid shape architecturally. Auth, RLS policies, Stripe billing, and the credit engine are all functional. The main risks are the missing config entries (Sprint 1), the potential lack of monthly credit reset (Sprint 2), and some dead code cleanup (Sprint 3). None of these are showstoppers, but the Sprint 1 items should be addressed before launch.

