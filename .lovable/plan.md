
# Final Gap Audit — Brief v3.0 vs Current Codebase

## Confirmed: What Is Already Done

Every item that has been implemented in previous sessions is confirmed complete. Here is the full confirmed list:

**Navigation** — Desktop sidebar (Dashboard → Photo Studio → Sell → My Items → "More tools" section), mobile bottom nav (Home → Photos → Sell FAB → Items → More), More sheet (Trends, Price Check, Optimise, Settings, Sign Out). ✓

**Sell Wizard** — Add → Photos → Optimise → Price → Pack. Progress bar labels correct. Version flag `v3`. Quick Remove Background inline option. "I've finished editing" fallback button. Before/after comparison on Pack step. ✓

**Credit System** — `first_item_pass_used` column exists in the `profiles` table. `handle_new_user()` gives 3 credits. `enforce_listing_limit()` set to 10 free items. Credits display fix (`>= 999999`). Low-credit amber banner in Photo Studio (≤2). Post-Pack low-credit nudge (≤5). Translation credit fix. ✓

**Credit Exhaustion Inline Prompt** — `UpgradeModal.tsx` already has the dual-card layout (Buy 10 credits / Upgrade to Pro) when `isZeroCredits === true`. This is confirmed done. ✓

**Scrape Tier Monitoring** — `scrape-vinted-url` edge function already parses the `Authorization` header, extracts `userId`, and calls `logScrapeJob(tierNumber, url)` which inserts to `scrape_jobs`. The `scrape_jobs` table exists in the database with the `raw_results` JSONB column. ✓

**Dashboard** — First-item-free banner (shows when `first_item_pass_used === false`). "Enhance Photos" quick action → `/vintography`. Trending Now horizontal scroll strip (queries `trends` table top 3 by opportunity score, tap → `/trends`, "See all" link for Pro+). ✓

**Onboarding Tour** — `TOUR_STEPS` in `AppShellV2.tsx` has 4 steps: Step 2 references Photo Studio, Step 3 references Sell Wizard. Tour triggers on `profile.tour_completed === false` and first dashboard visit. ✓

**Hashtag Rate Limiting** — `VintedReadyPack.tsx` has 5-second debounce and 3-per-session max with "Max regenerations reached" state. ✓

**Marketing pages** — Auth page photo-first messaging, About page mission statement, Welcome page photo-first rebuild, Landing page "Turn phone photos into sales", Features page (Photo Studio leads), How It Works page (5-step flow). ✓

**Vintography tier gating** — `useFeatureGate.ts` has `vintography_flatlay` (Pro), `vintography_mannequin` (Pro), `vintography_ai_model` (Business). Lock overlays + UpgradeModal on click. ✓

**Pricing page** — Shows only Free, Pro, Business (`PUBLIC_TIERS = ["free", "pro", "business"]`). Scale/Enterprise hidden. FAQ section included. Credit pack mention included. ✓

---

## GENUINE REMAINING GAPS

After the full read-through, there are **2 confirmed remaining gaps** plus **1 intentionally omitted item to discuss**.

---

### GAP 1 — Landing Page: Pricing Preview shows all 4 tiers (should be 3)

**Section 5.1, Section 5.3**

The Pricing page (`/pricing`) correctly shows only 3 tiers (Free, Pro, Business). However, the Landing page (`/`) has its own inline pricing section that reads:

```typescript
const tiers = Object.entries(STRIPE_TIERS);
// No filter applied — renders all 4 tiers
```

At line 207 in `Landing.tsx`:
```typescript
const tiers = Object.entries(STRIPE_TIERS);
```

This renders a **4-column pricing grid** at the bottom of the landing page, including Scale (£49.99). The brief says: "Show 3 tiers only: Free, Pro, Business" everywhere. Scale and Enterprise should be hidden from all public-facing pages.

**Fix:** Apply the same filter used on the Pricing page:
```typescript
const PUBLIC_TIERS: TierKey[] = ["free", "pro", "business"];
const tiers = (Object.entries(STRIPE_TIERS) as [TierKey, typeof STRIPE_TIERS[TierKey]][])
  .filter(([key]) => PUBLIC_TIERS.includes(key));
```

**File:** `src/pages/Landing.tsx` line 207

**Additional note on Landing page CTA text:** The final CTA section reads "Your first 3 credits are free" — the brief specifies "Your next listing deserves better photos" as the final CTA headline. This is a minor copy gap to also fix.

---

### GAP 2 — Photo Studio Entry State: Missing headline/subheadline copy from Section 7.1

**Section 7.1**

The brief specifies a specific entry state headline when no photo is loaded:

> **"Transform your Vinted photos"**
> "Professional listings get 3x more views."

Currently the upload zone shows:
```
"Drop your photos here"
"or tap to upload · JPG, PNG, WebP · Max 10MB"
```

The brief also specifies the entry state should show **Quick Presets** below the upload zone (even before a photo is loaded): `[Marketplace Ready] [Model Shot] [Flat-Lay]` — giving the user a sense of what they're about to use before committing to uploading.

The "From My Items" button IS already implemented (`ItemPickerDialog` with "or pick from your items" link) — that part is done.

**Missing elements:**
1. Headline: "Transform your Vinted photos" (currently "Drop your photos here")
2. Subtext: "Professional listings get 3x more views." (currently "or tap to upload...")
3. Quick Presets strip below upload: 3 preset buttons showing available operation types before photo upload

**File:** `src/pages/Vintography.tsx` lines 729–774 (the upload zone card)

---

### ONE ITEM THAT IS PARTIALLY IMPLEMENTED — Vintography entry state "From My Items" button prominence

The `ItemPickerDialog` exists and is linked via a small text link "or pick from your items". The brief specifies this as a **dedicated equal-weight button** next to the Upload button:

```
┌──────────────────┐  ┌─────────────────┐
│  📸 Upload Photo │  │  📋 From My     │
│  (drag or tap)   │  │  Items          │
└──────────────────┘  └─────────────────┘
```

Currently the "From My Items" link is a plain text link below the Choose Photos button. This is functionally correct but visually deprioritised vs. the spec's equal-weight two-button layout.

---

## Summary Table

| # | Gap | File | Effort | Priority |
|---|---|---|---|---|
| 1 | Landing page pricing shows 4 tiers instead of 3 | `src/pages/Landing.tsx` | 2 lines — add PUBLIC_TIERS filter | High — Scale tier visible to new prospects |
| 1b | Landing page final CTA copy | `src/pages/Landing.tsx` | Copy swap only | Low |
| 2 | Photo Studio entry state: wrong headline, missing Quick Presets strip, "From My Items" deprioritised | `src/pages/Vintography.tsx` | Medium — UI update to upload zone | Medium |

---

## Implementation Plan

### File 1: `src/pages/Landing.tsx`

Line 207: Replace `const tiers = Object.entries(STRIPE_TIERS);` with a filtered version that only includes Free, Pro, Business.

Also update the final CTA headline from "Your first 3 credits are free." to "Your next listing deserves better photos." with the button remaining "Get Started Free".

### File 2: `src/pages/Vintography.tsx`

Update the empty-state upload zone (lines 729–774) to:
1. Show "Transform your Vinted photos" as the headline
2. Show "Professional listings get 3× more views." as subtext
3. Promote the "From My Items" link to a proper equal-weight Button (outlined) alongside the existing "Choose Photos" primary button
4. Add a Quick Presets strip below the two buttons: 3 clickable preset chips — "Marketplace Ready" (→ selects `clean_bg`), "Flat-Lay" (→ selects `flatlay`, gated if not Pro), "AI Model Shot" (→ selects `ai_model`, gated if not Business) — that pre-select an operation when the user uploads. These chips give users an intent before they upload.

---

## What Does NOT Need Changing

Everything else in the brief is confirmed implemented:

- All nav changes ✓
- All credit system logic ✓  
- All marketing pages (Auth, About, Welcome, Features, How It Works, Pricing) ✓
- All wizard changes ✓
- All bug fixes (translation credit, AppShellV2 bug, hashtag rate limiting) ✓
- All tier gating in Photo Studio ✓
- Dashboard (banner, quick actions, Trending Now, tour) ✓
- Scrape tier monitoring ✓
- Credit exhaustion inline prompt ✓
- Onboarding tour updated to Photo Studio + Sell nav references ✓
