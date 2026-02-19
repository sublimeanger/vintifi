
# Final Audit — Brief v3.0 vs Current Codebase (v5 document)

## What Is Confirmed Implemented

Going through every section of the v5 brief against actual file contents:

**Part 1 — Strategic Repositioning:** Photo-first hierarchy throughout Landing, Features, Auth, About, Welcome pages. ✓

**Part 2 — Navigation:** Desktop sidebar (Dashboard → Photo Studio → Sell → My Items). Mobile bottom nav (Home / Photos / [Sell FAB] / Items / More). More sheet with Trends, Price Check, Settings, Sign Out. ✓

**Part 3 — Sell Wizard:** Steps are Add → Photos → Optimise → Price → Pack (confirmed in `STEPS` const, line 60–66). Progress bar labels match. Version flag handling in place. Quick Remove Background inline option. Before/after on Pack step. ✓

**Part 4 — Credit System:** `first_item_pass_used` column exists. `handle_new_user()` gives 3 credits. `enforce_listing_limit()` at 10 items. `AppShellV2` credits display fix (`>= 999999`). Low-credit amber banner in Photo Studio (≤2). Post-Pack low-credit nudge (≤5, confirmed lines 1769–1794 of SellWizard.tsx). Translation credit fix. Hashtag rate limiting (5-second debounce + max 3, confirmed lines 102–115 of VintedReadyPack.tsx). ✓

**Credit Exhaustion Inline Prompt:** `UpgradeModal.tsx` has the dual-card layout (`isZeroCredits` check, lines 109–149). ✓

**Part 5 — Marketing Pages:** Auth left panel ("Professional Vinted listings start here." + 4 photo-first bullets, confirmed lines 117–134 of Auth.tsx). About page mission statement updated (confirmed lines 86–109 of About.tsx). Welcome page photo-first (Upload photo → /sell, Paste URL → /sell, Skip → /dashboard, confirmed). Landing hero headline confirmed. Final CTA: "Your next listing deserves better photos." (confirmed line 617 of Landing.tsx). ✓

**Part 6 — Dashboard:** First-item-free banner present. "Enhance Photos" quick action (confirmed lines 286–293). Trending Now strip (confirmed lines 390–446). ✓

**Part 7 — Vintography:** Tier gating confirmed (flatlay/mannequin = Pro, AI model = Business). Upload zone headline "Transform your Vinted photos" confirmed (line 750). Quick Presets strip below upload zone confirmed (lines 783–812). "From My Items" promoted to equal-weight outlined Button (confirmed lines 763–775). ✓

**Part 9 — Bug Fixes:** Translation credit fix done. AppShellV2 bug fixed. Scrape tier monitoring implemented. Hashtag rate limiting done. Wizard version flag done. ✓

**Onboarding Tour:** `TOUR_STEPS` in `AppShellV2.tsx` confirmed (lines 28–55) — Step 2 references Photo Studio, Step 3 references Sell Wizard with the new nav hints. ✓

---

## GENUINE REMAINING GAPS

After reading every relevant file, there are **2 minor remaining items**:

---

### GAP 1 — Landing Page Pricing Grid: Still shows `lg:grid-cols-4` layout (cosmetic bug)

**Section 5.6 / Section 6**

The `tiers` variable is correctly filtered to 3 tiers (line 209: `PUBLIC_TIERS = ["free", "pro", "business"]`). However, the grid container at **line 545** still reads:

```typescript
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-5xl mx-auto mb-6 sm:mb-8">
```

With only 3 tiers rendering, `lg:grid-cols-4` leaves an empty 4th column slot, making the 3 cards look oddly spaced on large screens. The comment above the section (line 538) also still says `── All 4 plans pricing ──`.

**Fix needed:**
- Change `lg:grid-cols-4` → `lg:grid-cols-3`
- Change the comment from `── All 4 plans pricing ──` to `── Pricing (3 tiers) ──`

**File:** `src/pages/Landing.tsx` line 545

---

### GAP 2 — About Page: "Data-Driven" value card still uses old analytics language

**Section 5.5**

The brief says to update the About page to photo-first language. The hero and mission statement are correctly updated. However, the **Values section** (lines 53–57 of About.tsx) still has the old positioning in the "Data-Driven" value card:

```typescript
{ icon: Database, title: "Data-Driven", desc: "Every recommendation is backed by real market data, not gut feeling. We analyse thousands of comparable listings to give you pricing confidence." },
```

This is an analytics/data framing from the old "AI-powered reselling intelligence" era. The brief's messaging rules say: "NEVER lead with 'AI-powered SaaS' or 'data-driven reselling'". The values section should reflect the photo-first mission.

**Fix needed:** Update the "Data-Driven" value card to align with photo-first positioning. For example:

```typescript
{ icon: Camera, title: "Photo-First", desc: "The photo is what buyers see first. We built the best AI photo studio for Vinted sellers because a professional photo is the single highest-impact upgrade you can make to any listing." },
```

The `Database` import can be removed from About.tsx if no longer used (replaced with `Camera` from lucide-react, which is already imported elsewhere in the marketing pages).

**File:** `src/pages/marketing/About.tsx` lines 53–57

---

## What Does NOT Need Changing

Everything else in the v5 brief is confirmed implemented:

- Navigation structure (desktop + mobile) ✓
- Sell Wizard step order (Add → Photos → Optimise → Price → Pack) ✓
- All credit system logic ✓
- All marketing pages (Auth, Welcome, Landing, Features, How It Works, Pricing) ✓
- All wizard changes (Quick Remove BG, fallback button, before/after on Pack) ✓
- All bug fixes ✓
- All tier gating in Photo Studio ✓
- Dashboard (banner, quick actions, Trending Now, onboarding tour) ✓
- Scrape tier monitoring ✓
- Credit exhaustion inline prompt ✓
- Hashtag rate limiting ✓
- Vintography entry state (headline, two equal buttons, Quick Presets strip) ✓
- About page hero + mission statement ✓
- Auth page left panel messaging ✓

---

## Implementation Plan

### File 1: `src/pages/Landing.tsx` — 2-line fix

Line 538: Change comment from `── All 4 plans pricing ──` to `── Pricing (3 tiers) ──`
Line 545: Change `lg:grid-cols-4` to `lg:grid-cols-3`

### File 2: `src/pages/marketing/About.tsx` — 1 value card update

Lines 53–57: Replace the "Data-Driven" value card with a "Photo-First" card using the Camera icon and photo-first description text. Remove `Database` import if it's no longer used elsewhere in the file.

These are the final 2 remaining gaps. After these are done, the brief is 100% implemented.
