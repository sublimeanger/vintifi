
# Complete Gap Audit: Brief v3.0 vs Current Codebase

## What's Already Implemented (Confirmed ✓)

Going through the brief section by section:

**Part 1 — Strategic Repositioning:** Messaging, hero headline, photo-first hierarchy — all reflected in Landing, Features, and marketing pages. ✓

**Part 2 — Navigation:** Desktop sidebar order (Dashboard → Photo Studio → Sell → My Items), mobile bottom nav (Home / Photos / [Sell FAB] / Items / More), More sheet contents (Trends, Price Check, Optimise, Settings, Sign Out). ✓

**Part 3 — Sell Wizard Reorder:** Steps are Add → Photos → Optimise → Price → Pack. Progress bar labels match. Session recovery with version flag `v3`. Quick Remove Background inline option. "I'm done — Continue" fallback button while polling. Before/after comparison on Pack step. ✓

**Part 4 — Credit System:**
- `first_item_pass_used` column added + migration run. ✓
- `handle_new_user()` updated to 3 credits. ✓
- `enforce_listing_limit()` updated to free=10. ✓
- `AppShellV2` credits display bug fixed (`>= 999999`). ✓
- Low-credit amber banner in Photo Studio (≤2 credits). ✓
- Post-wizard low-credit nudge in Pack step (≤5 credits). ✓
- Translation credit deduction fix. ✓

**Part 5 — Marketing Pages:**
- Auth page left panel: photo-first messaging. ✓
- About page mission statement updated. ✓
- Welcome page photo-first rebuild. ✓
- Landing page: photo-first hero, "Turn phone photos into sales." ✓
- Features page: Photo Studio leads. ✓
- How It Works page: 5-step flow with photo-first framing. ✓

**Part 6 — Dashboard:**
- First-item-free banner. ✓
- Enhance Photos quick action. ✓

**Part 7 — Vintography:**
- Tier gating (flatlay/mannequin = Pro, AI Model = Business) with lock overlays. ✓

**Part 9 — Bug Fixes:**
- Translation credit deduction. ✓
- AppShellV2 bug. ✓
- Hashtag rate limiting (5-second debounce, 3-per-session max). ✓
- Wizard version flag. ✓

---

## GENUINE REMAINING GAPS

After a full read of all relevant files, there are **4 remaining gaps**:

---

### GAP 1 — Dashboard: "Trending Now" strip missing
**Section 6.1, item 8**

The brief specifies a horizontal scroll strip at the bottom of the Dashboard showing the top 3 trending brands from the `trends` table. Each card shows: brand name, trend direction arrow, opportunity score. Tap → navigates to `/trends` with that brand filtered.

**Current state:** The Dashboard ends at the Recent Items card. There is no trending strip whatsoever — not in `src/pages/Dashboard.tsx`, not in `AppShellV2`. The word "trend" does not appear in `Dashboard.tsx`.

**Brief says:**
> "Show top 3 trending items/brands from the `trends` table as a horizontal scroll strip. Each card shows: brand name, trend direction arrow, opportunity score. Tap → navigates to `/trends` with that brand filtered. Free users see 3 trends. Pro+ see 3 trends with a 'See all trends →' link to `/trends`."

**File:** `src/pages/Dashboard.tsx`
**Change:** After the Recent Items card, add a horizontal scroll "Trending Now" strip. Query the `trends` table for top 3 by opportunity score. Each card: brand name, direction icon (TrendingUp/TrendingDown), opportunity score badge. Tap navigates to `/trends`. Pro+ users get a "See all →" link. Free users see the 3 cards without the "See all" link (natural upsell via discovery).

---

### GAP 2 — Dashboard Onboarding Tour: references old nav items
**Section 6.2**

The brief specifies updating the 4-step onboarding tour so that:
- Step 3 references "Photo Studio nav link" (was: Trends nav link)
- Step 4 references "Sell nav link" (was: Optimise nav link)

**Current state:** There is no tour component in `Dashboard.tsx`. A search for `tour`, `TourStep`, `showTour`, `vintifi_tour`, `tour_step` in `Dashboard.tsx` returns zero matches. However, `SettingsPage.tsx` has a "Replay the onboarding tour" button that clears `localStorage.removeItem("vintifi_tour_completed")`.

**This means the tour is likely rendered elsewhere** — probably inside `AppShellV2` or triggered from the dashboard via localStorage. A search for `vintifi_tour_completed` should reveal it.

**Action needed:** Find where the tour renders and update step 3 and 4 text to reference Photo Studio and Sell nav links. If the tour doesn't exist as a component (only the replay button exists), this gap is moot — the tour was never implemented and the replay button is an orphan. In that case, either implement the tour or remove the replay button from Settings.

---

### GAP 3 — Credit Exhaustion Inline Prompt (Section 4.8, touchpoint 1)
**Section 4.8**

The brief specifies an inline card when a user attempts an action with 0 credits, showing two side-by-side options: "Buy 10 credits — £2.99" and "Upgrade to Pro — £9.99/mo".

**Current state:** The `UpgradeModal` component handles the 0-credit case (it opens when credits are exhausted). The post-wizard low-credit nudge (≤5 credits, touchpoint 3) is implemented. The low-credit banner in Photo Studio (≤2 credits, touchpoint 2) is implemented.

**Touchpoint 1 (credit exhaustion inline prompt) is NOT implemented.** When the UpgradeModal fires for a 0-credit user, it shows the existing tier upgrade UI — not the side-by-side "buy credits OR upgrade" card described in the brief.

**Brief specifies this exact layout:**
```
┌─────────────────────────────────────────────┐
│  You're out of credits                       │
│  ┌──────────────┐  ┌─────────────────────┐  │
│  │ 10 credits   │  │ Upgrade to Pro      │  │
│  │ £2.99        │  │ 50 credits/month    │  │
│  │ [Buy Now]    │  │ [Upgrade]           │  │
│  └──────────────┘  └─────────────────────┘  │
│  Less than a coffee ☕ → 10 more edits       │
└─────────────────────────────────────────────┘
```

**File:** `src/components/UpgradeModal.tsx`
**Change:** When the modal is triggered with 0 credits (i.e., `credits_remaining === 0`), show this dual-card layout at the top of the modal before the standard tier upgrade cards. The "Buy Now" CTA links to `/settings?tab=billing` (which has the credit pack purchase). The "Upgrade" CTA goes to the Stripe checkout for Pro.

---

### GAP 4 — Scrape Tier Monitoring (Section 9.3)
**Section 9.3**

The brief specifies logging to the `scrape_jobs` table after each successful URL import, storing which resolution tier (1–4) was used.

**Current state:** The `scrape-vinted-url` edge function uses `console.log` statements noting "Tier 1 complete", "Tier 2 complete" etc., but there is **zero database logging** — no `scrape_jobs` table insert anywhere in the function. The `scrape_jobs` table itself may not even exist.

**Brief says:**
```typescript
await supabaseAdmin.from('scrape_jobs').insert({
  user_id: userId,
  job_type: 'url_import',
  status: 'completed',
  result_data: { resolution_tier: tierNumber, url: vintedUrl },
  created_at: new Date().toISOString()
});
```

**Note:** The edge function currently has no `user_id` from auth (it receives the URL from the body but no auth header processing). This needs to either pass `user_id` from the frontend or add auth header parsing. Also, the `scrape_jobs` table needs to exist in the schema.

**Files:** `supabase/functions/scrape-vinted-url/index.ts` + a new migration to create the `scrape_jobs` table if it doesn't exist.

---

## Priority Assessment

| Gap | Priority | Effort | User Impact |
|---|---|---|---|
| GAP 1 — Trending Now strip on Dashboard | High | Medium — needs DB query + UI | High — spec says it replaces the need for Trends in sidebar |
| GAP 2 — Onboarding tour nav text | Low | Low (if tour exists) / High (if it doesn't) | Low — only affects first-time users |
| GAP 3 — Credit exhaustion inline prompt | Medium | Low — UI-only UpgradeModal change | Medium — affects monetisation |
| GAP 4 — Scrape tier monitoring | Low | Medium — DB migration + edge function | None for users, internal analytics only |

---

## Implementation Plan

### Files to Change

| # | File | Change |
|---|---|---|
| 1 | `src/pages/Dashboard.tsx` | Add "Trending Now" horizontal scroll strip, query `trends` table top 3, each card taps to `/trends` |
| 2 | `src/components/UpgradeModal.tsx` | Add zero-credit inline dual-card (Buy Credits + Upgrade to Pro) at top of modal when credits = 0 |
| 3 | `src/components/AppShellV2.tsx` | Audit and update onboarding tour step references (or confirm tour doesn't exist) |
| 4 | `supabase/functions/scrape-vinted-url/index.ts` | Add auth header parsing + `scrape_jobs` table insert after each successful tier resolution |
| 5 | New migration | Create `scrape_jobs` table with RLS |

### No Pricing, Stripe, or Wizard Changes Required

All previously identified gaps (wizard reorder, nav structure, credit system, marketing pages, auth messaging, hashtag rate limiting) are fully implemented and confirmed from the code review.

### Execution Order

1. **Trending Now strip** (highest user-facing impact, completes the dashboard spec)
2. **Credit exhaustion prompt** (monetisation touchpoint)
3. **Scrape tier monitoring** (internal analytics, backend only)
4. **Onboarding tour** (lowest priority — confirm if tour component exists first)
