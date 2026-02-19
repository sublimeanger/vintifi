
## Fix Pricing Page — Accurate Features, Clean 3-Tier Layout

### What's Wrong Now

The pricing page has multiple inaccuracies versus what actually exists in the product and what the repositioning doc specifies:

**`src/lib/constants.ts` — STRIPE_TIERS features are wrong:**
- **Free:** Lists "flat-lay" (gated to Pro+), "AI Price Check" (gated after first item), "top 5 trends" (should be top 3)
- **Pro:** Lists "Relist Scheduler", "Dead Stock alerts", "Charity Sourcing Briefing", "Competitor tracking" — none of these are working features
- **Business:** Lists "Arbitrage Scanner", "Clearance Radar", "Competitor tracking (15)", "Export reports to CSV" — none are working features. Missing AI Model Shots and translations.

**`src/pages/marketing/Pricing.tsx` — comparison table is wrong:**
- References unbuilt features (Arbitrage Scanner, Clearance Radar, Relist Scheduler, Dead Stock, Charity Briefing, Competitor Tracking)
- "Trend Radar" shows "Top 5" for Free (should be top 3)
- "Items Tracked" shows "Unlimited" for Pro/Business (should be 200/1,000 per the tier enforcement)
- Personas section describes features that don't exist

**`src/components/MarketingLayout.tsx` footer:**
- Says "5 free credits" — should be "3 free credits"

---

### The Correct Feature Set (from user brief + repositioning doc)

**Free — £0**
- Your first item is completely free — photos, listing, pricing
- 3 credits/month after that
- Photo Studio — background removal, smart backgrounds, enhance
- Trend Radar — top 3 trends preview
- Up to 10 items tracked
- Import listings from Vinted URL

**Pro — £9.99/mo (or £7.99/mo billed annually) — Most Popular**
- 7-day free trial included
- 50 credits/month
- Everything in Free
- Full Photo Studio — flat-lay, mannequin, ghost mannequin
- AI Listing Optimiser — titles, descriptions, health scores
- AI Price Check with market comparables
- Full Trend Radar + Niche Finder
- Up to 200 items tracked

**Business — £24.99/mo (or £19.99/mo billed annually)**
- 7-day free trial included
- 200 credits/month
- Everything in Pro
- AI Model Shots — virtual model wearing your garment
- Multi-language listings (FR, DE, NL, ES)
- Bulk Listing Optimiser
- Up to 1,000 items tracked
- Priority support

---

### Files to Change

**1. `src/lib/constants.ts`**

Replace the `features` arrays for `free`, `pro`, and `business` with the correct, honest lists above. This is the single source of truth used by the pricing cards and potentially other parts of the app.

Note: Annual prices need a check — the doc specifies £7.99/mo annually for Pro (= £95.88/yr, which matches `annual_price: 95.88`) and £19.99/mo annually for Business (= £239.88/yr, which matches `annual_price: 239.88`). These are already correct in Stripe — no Stripe changes needed.

**2. `src/pages/marketing/Pricing.tsx`**

- **`comparisonFeatures` array:** Replace entirely with an accurate, lean table:
  - Credits / month: `3` / `50` / `200`
  - Photo Studio (remove bg, enhance): `✓` / `✓` / `✓`
  - Photo Studio (flat-lay, mannequin): `—` / `✓` / `✓`
  - AI Model Shots: `—` / `—` / `✓`
  - AI Price Check: First item / `✓` / `✓`
  - AI Listing Optimiser: First item / `✓` / `✓`
  - Trend Radar: Top 3 / Full / Full
  - Niche Finder: `—` / `✓` / `✓`
  - Multi-language listings: `—` / `—` / `✓`
  - Bulk Optimiser: `—` / `—` / `✓`
  - Import from Vinted URL: `✓` / `✓` / `✓`
  - Items tracked: `10` / `200` / `1,000`
  - Support: Community / Email / Priority

- **`personas` array:** Update descriptions to match real features and correct item limits (Pro = up to 200 items, not "20–100 items a month"; Business unlocked by AI Model Shots)

- **Annual price display for Pro:** The toggle currently computes `annual_price / 12` = `95.88 / 12` = `£7.99`. This is correct, no change needed.

- **Business annual:** `239.88 / 12` = `£19.99`. Also correct.

- **FAQ answers:** Update any references to incorrect feature sets (e.g. "Vintography photo edit costs 1 credit — AI Model costs 4 credits", credit counts must say 3 not 5)

**3. `src/components/MarketingLayout.tsx`**

- Footer tagline: Change `"5 free credits"` → `"3 free credits"` (appears in the Get Started column)

---

### What Is NOT Changing

- Stripe price IDs and product IDs — already correct
- Annual pricing math — already resolves to £7.99/mo and £19.99/mo correctly
- The card layout, animations, trust badges, credit packs section, FAQ structure
- Scale/Enterprise tiers remain hidden from the public page (already implemented)
- The photo studio before/after comparison visual in the hero

---

### Technical Summary

| File | Change |
|---|---|
| `src/lib/constants.ts` | Replace `features[]` for free, pro, business with accurate 6-7 bullet lists |
| `src/pages/marketing/Pricing.tsx` | Replace `comparisonFeatures`, `personas`, fix FAQ credit references |
| `src/components/MarketingLayout.tsx` | Change "5 free credits" → "3 free credits" in footer |

No database changes, no edge function changes, no Stripe changes required.
