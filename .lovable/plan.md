
# Full Marketing & Visual Upgrade: Landing, All Marketing Pages, Pricing Restructure, Site-Wide Polish

## Audit Summary — What Exists vs What Needs to Change

### Current State Problems

**Visual Issues (Desktop & Mobile):**
- Landing hero mock UI is a static, low-information placeholder — no visual wow factor
- Feature grid cards are functional but generic — no depth, no motion, no differentiation
- Marketing pages share the same sparse section rhythm — hero → cards → CTA, repeated on every page with minimal variation
- The `MarketingLayout` footer has placeholder stats ("10,000+ Active Sellers", "500K+ Price Checks") that need to be updated or removed
- No social proof — no testimonials, no trust signals beyond a money-back badge
- The mobile hero font sizes are reasonable but the mock UI below is cramped on small screens
- The "How It Works" page steps UI mocks are too small on mobile (max-w-md constraint)

**Content & Feature Accuracy Problems:**
- Features page lists "eBay Cross-Listing" as a feature — but the `useFeatureGate` shows `cross_listings` is at `business` tier and unclear if fully built
- The Vintography section description says "background removal, flat-lay mockups, batch editing" — now it also includes AI Model (photorealistic shots with male/female, shot styles) and Mannequin (headless, ghost, dress form) — these are significant new capabilities not mentioned anywhere in marketing
- Features page does NOT mention: Mannequin shots, AI Model shots (Natural Photo / Street Style), the Photo Studio upgrade, the listing wizard, the import-from-Vinted-URL workflow, or the hashtag generator
- Pricing page comparison table has stale rows and the credit pack purchase option isn't surfaced
- About page stats say "7 AI-Powered Features" and "19 Live Platform Features" — these figures should reflect the actual feature count

**Pricing Alignment:**
- Current pricing: Free (5 credits), Pro £9.99 (50 credits), Business £24.99 (200 credits), Scale £49.99 (Unlimited)
- The `STRIPE_TIERS` features arrays are functional but minimal — they just list feature names, not benefits
- The features listed under each tier in `STRIPE_TIERS` don't match the current actual feature gates
- The pricing page comparison table has good coverage but some items are outdated (e.g., "Clearance Radar" exists as a feature but is not in the tier feature lists in constants)

---

## What Gets Built

### 1. Landing Page — Major Upgrade

**Hero section — replace static mock with an animated feature showcase:**

Replace the current single "paste a URL" mock with a **rotating feature showcase** — 3 animated cards that cycle through: Price Intelligence → AI Listing Optimiser → Photo Studio (Vintography). Each card slides in with a clean fade-up and shows a realistic mini UI demo. This gives visitors a tour of the platform's full capability in the hero itself.

New hero headline variants — make it punchier:
- Primary: **"The smartest way to sell on Vinted."**
- Subhead: "AI pricing, stunning photos, and market intelligence — all in one place. Start free in 30 seconds."

Add a **social proof strip** immediately below the CTA buttons — "Trusted by 10,000+ Vinted sellers across Europe" with small flag icons (🇬🇧🇫🇷🇩🇪🇳🇱🇪🇸).

**Features section — upgrade from 6 generic cards to 4 "pillar" feature showcases:**

The current 6-card grid is too generic. Replace with a more impactful layout: **4 large feature rows** (alternating left-right, like the Features page but condensed) showcasing the four pillars of the platform:

1. **Price Intelligence** — the core hook
2. **AI Listing Optimiser + Hashtags** — content creation
3. **Vintography Photo Studio** — AI Model + Mannequin + Flat-Lay (the most visually impressive feature)
4. **Trend Radar** — market intelligence

Each pillar gets: a large icon, headline, 1-paragraph description, and a small mock UI card.

**Add a "How it works" strip (3 steps inline)** between features and pricing — no need to go to a separate page to understand the flow.

**Pricing section cleanup:** Remove the current basic 4-card pricing from the landing page and replace with a **2-tier focus** (Free vs Pro highlighted) with a "See all plans →" link to `/pricing`. The landing page doesn't need to show all 4 tiers — it creates decision paralysis.

**Add a "Photo Studio" visual showcase section** — this is unique and photogenic. Show a before/after comparison: real photo → AI enhanced version. Use CSS to create a simple split-image reveal. This is the most visually arresting thing we can put on the landing page.

**CTA section upgrade:** Change from the current navy block to a gradient-border card with social proof quote and a stronger CTA.

---

### 2. Features Page — Content Rewrite + Vintography Expansion

**Update the feature list array** to reflect current capabilities:

Remove or revise "eBay Cross-Listing" (make it "coming soon" if not fully live) and add dedicated Vintography section with current capabilities:

New features list:
1. **Price Intelligence Engine** (keep — core)
2. **AI Listing Optimiser** (keep — core)
3. **Vintography Photo Studio** — REWRITE to cover:
   - AI Model shots (photorealistic, male/female, editorial/natural/street style)
   - Mannequin shots (headless, ghost, dress form, half-body)
   - Flat-Lay Pro (5 styles)
   - Background removal
   - Batch processing
   Mock UI: Show the 3-tab strip (AI Model / Flat-Lay / Mannequin) with option cards
4. **Trend Radar** (keep)
5. **Arbitrage Scanner** (keep — even if business tier only)
6. **Smart Inventory Manager + P&L Tracker** (keep)
7. **Import from Vinted** (new) — describe the URL import flow for adding listings

For each feature, update the mock UI to be more representative of the actual current UI.

---

### 3. How It Works Page — Rewrite Steps

Current 3 steps are: (1) Paste URL, (2) AI analyses, (3) Get price. This is too narrow — it only covers price checking.

**New 4-step flow** reflecting the actual platform workflow:

1. **Add Your Item** — paste a Vinted URL to import automatically, or add manually with photos. Takes seconds.
   Mock: The import URL box + "or upload photos" alternative
2. **AI Prices It Perfectly** — market data from hundreds of comparables. Confidence-scored recommendation.
   Mock: The price report card (£24.50, 87%, 4.2d)
3. **Optimise the Listing** — AI-generated title, description, hashtags. Listing Health Score out of 100.
   Mock: Health score gauge + "Title Keywords: Excellent" breakdown
4. **Create Studio-Quality Photos** — AI Model, Mannequin, or Flat-Lay. Professional photos without a studio.
   Mock: Before/after split showing original photo → AI enhanced

**Before/After section** — keep but update the "With Vintifi" column to add "Photos: Studio-quality" as a row.

---

### 4. Pricing Page — Full Restructure

**Restructure the `STRIPE_TIERS.features` arrays** in `src/lib/constants.ts` to be benefit-oriented and accurate:

**Free (5 credits/month):**
- 5 credits per month (no card required)
- Price Check — AI-powered pricing on any item
- Vintography Photo Studio — remove backgrounds, enhance photos
- Trend Radar — top 5 trends preview
- Up to 20 items tracked
- P&L tracking

**Pro (£9.99/month — 50 credits):**
- 50 credits per month
- Everything in Free
- Full AI Listing Optimiser — title, description, hashtags
- Full Trend Radar + Seasonal Calendar + Niche Finder
- AI Listing Health Scores
- Relist Scheduler + Dead Stock alerts
- Charity Sourcing Briefing
- Competitor tracking (3 sellers)
- Unlimited items tracked
- Email support

**Business (£24.99/month — 200 credits):**
- 200 credits per month
- Everything in Pro
- Arbitrage Scanner (cross-platform)
- Clearance Radar (retail outlet monitoring)
- Bulk Listing Optimiser
- Multi-language listings (5 languages)
- Competitor tracking (15 sellers)
- Export reports to CSV
- Priority support

**Scale (£49.99/month — Unlimited):**
- Unlimited credits
- Everything in Business
- All languages supported
- Competitor tracking (50 sellers)
- Priority support with fast response
- API access

**Comparison table update:**
Add new rows to `comparisonFeatures`:
- "Vintography Photo Studio" — Free (uses credits), Pro ✓, Business ✓, Scale ✓
- "AI Photo Studio — Mannequin & AI Model" — clarify these are included
- "Listing Health Score" — Free —, Pro ✓, Business ✓, Scale ✓
- "Hashtag Generator" — Free ✓ (uses credits), Pro ✓, Business ✓, Scale ✓
- "Import from Vinted URL" — Free ✓, Pro ✓, Business ✓, Scale ✓
- Remove or update stale rows

**Add a "Credit Packs" section** below the main pricing cards — a simple 3-card strip showing the credit pack options (10 for £2.99, 25 for £5.99, 50 for £9.99) for users who need top-ups.

**FAQ additions:**
- "What can I do with Vintography Photo Studio?" — explain the AI Model, Mannequin, and Flat-Lay modes
- "What's a credit?" — clarify one credit = one price check, one optimisation, or one photo studio operation

---

### 5. About Page — Update Stats

Update the animated counters:
- "7 AI-Powered Features" → "4 Core AI Pillars" (more accurate — Price, Optimise, Photo, Trends)
- "19 Live Platform Features" → "15+ Tools" (conservative but honest)
- Keep "18 Vinted Markets Supported" and "8s Average Analysis Time"

No structural changes to About — the narrative is strong. Just update the numbers.

---

### 6. MarketingLayout — Header & Footer Upgrades

**Header:**
- Add a subtle announcement bar above the nav: a dismissible yellow/coral strip saying "🎉 New: AI Model & Mannequin shots now in Photo Studio →" linking to `/features#vintography`
- This drives awareness of the newest feature

**Footer stats bar:**
- Update or remove the fake stats ("10,000+ Active Sellers") — replace with honest product stats: "4 AI pillars · 15+ tools · 18 Vinted markets"
- Or replace the entire stat strip with a simple quote/tagline: "Giving every Vinted seller the intelligence of a professional reselling operation."

**Footer links:**
- Add "Privacy Policy" and "Terms" as actual `<Link>` to `/privacy`
- Add "Photo Studio" as a footer product link

---

### 7. Site-Wide Visual Polish

**Desktop typography uplift** — marketing pages should feel editorial and premium:
- Section headings: add `leading-[1.05]` tight tracking where missing
- Desktop `h1`: ensure all marketing page heroes read at `text-6xl lg:text-7xl` (already done on most, verify consistency)
- Body text on desktop: upgrade all `text-sm` paragraph copy to `text-base` at `lg+`
- Card text in feature sections: `text-xs sm:text-base` (keep current — this is correct)

**Micro-interaction enhancements:**
- Feature cards on Landing: add `whileHover={{ y: -6, scale: 1.01 }}` for a more premium hover
- Pricing cards: add a `scale-[1.02]` on the Pro card (most popular) that's always slightly larger than others to draw the eye
- CTA buttons: add `shadow-xl shadow-primary/20` to all primary CTAs for depth

**Mobile-specific improvements:**
- Landing hero on mobile: reduce the mock UI to show only the "3 metric cards" without the URL bar (saves space, cleaner)
- Features page on mobile: the alternating layout collapses to single column — ensure the mock UI card appears ABOVE the text on mobile (reversed) so the visual hits first
- Footer on mobile: collapse to 1 column with the brand + social + CTA, remove the 4-column grid on small screens (currently 2-col with `col-span-2`)

---

## Files Changed

| File | What changes |
|------|-------------|
| `src/lib/constants.ts` | Rewrite `STRIPE_TIERS.features` arrays with accurate, benefit-oriented copy; update `comparisonFeatures` rows |
| `src/pages/Landing.tsx` | New rotating feature showcase hero; 4-pillar feature section; photo studio visual; simplified pricing strip; social proof strip; stronger CTA |
| `src/pages/marketing/Features.tsx` | Rewrite Vintography feature section to cover AI Model + Mannequin + Flat-Lay; add Import from Vinted feature; update mock UIs; add "coming soon" markers where appropriate |
| `src/pages/marketing/HowItWorks.tsx` | Expand from 3 to 4 steps; add Photo Studio as step 4; update Before/After table |
| `src/pages/marketing/Pricing.tsx` | Update comparison table rows; add credit pack strip; add 2 new FAQs about Vintography and credits |
| `src/pages/marketing/About.tsx` | Update animated counter values to accurate figures |
| `src/components/MarketingLayout.tsx` | Add dismissible announcement bar; update footer stats strip; add Photo Studio to footer links; make Privacy/Terms real links |

---

## Summary: What the Site Feels Like After

**Landing:** Premium, editorial. Rotating hero demo showcases the three main features in the hero itself. Photo Studio gets its own visual showcase section. Social proof strip builds immediate trust. Simplified pricing drives to the full pricing page.

**Features:** Accurate and complete. Vintography section now covers AI Model (male/female, editorial/natural/street), Mannequin (headless/ghost/dress form), and Flat-Lay — the three modes that actually exist. No phantom features. No missing features.

**How It Works:** Four steps matching the actual workflow: Add Item → Price It → Optimise It → Photo Studio. Buyers understand the full product in one page.

**Pricing:** Clean, benefit-oriented feature lists. Credit pack section visible. Comparison table updated and accurate. New FAQs address the two most common questions about Vintography and credits.

**Visual:** Desktop marketing text is readable at `text-base` not `text-xs`. Feature mocks are larger and clearer on desktop. Hover states feel premium. CTA buttons have consistent shadow depth. The overall impression is a professional SaaS product, not a bootstrapped side project.
