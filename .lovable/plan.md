
# Phase 5 — Marketing Repositioning: Photo Studio First

This plan covers a complete rewrite of the public marketing pages to lead with Vintography Photo Studio as Vintifi's core value proposition. Every copy string, section order, stat, and feature hierarchy is updated to reflect the "Turn phone photos into sales" positioning.

---

## The Core Repositioning

**Old story:** "Stop leaving money on Vinted" — a pricing tool that also has photos
**New story:** "Turn phone photos into sales" — a photo-first platform where AI imagery is the hook, and pricing/optimisation are the system that converts that attention into revenue

The photo is the first thing a buyer sees. It determines whether they click. Everything else — price, title, description — only matters if the photo stops the scroll. This is the new hierarchy.

---

## Files Being Changed

| File | Scope |
|---|---|
| `src/pages/Landing.tsx` | Full page rewrite — hero, pillars, stats, how-it-works, photo studio section, CTAs |
| `src/pages/marketing/Features.tsx` | Feature order rewrite — Photo Studio moves to #1, new hero copy, features reordered |
| `src/pages/marketing/Pricing.tsx` | Copy updates — credit count from 5 to 3, persona descriptions, FAQs, CTA strings |
| `src/lib/constants.ts` | `STRIPE_TIERS.free.features` array — fix "5 credits/month" to "3 credits/month" and "Up to 20 items" to "Up to 10 items" |

---

## Change 1 — `Landing.tsx`: Complete page rewrite

### Hero section

**Current H1:** "Stop leaving money on Vinted."
**New H1:** "Turn phone photos into sales."

**Current subheading:** "AI pricing that takes seconds, not hours. Studio photos without a studio."
**New subheading:** "Point your phone. Tap once. Your bedroom floor becomes a professional studio shot that stops scrollers cold."

**Current secondary subheading:** "Market intelligence that makes every competitor invisible. All free to start."
**New secondary subheading:** "AI pricing and listing optimisation built in — so the right buyer finds your item at exactly the right price."

**Current badge text:** "AI Model & Mannequin shots — now live"
**New badge text:** "Vintography Photo Studio — AI Model, Mannequin & Flat-Lay"

**CTA primary:** unchanged — "Start Free — No Card Required"
**CTA secondary:** unchanged — "See How It Works"

### Hero rotating feature showcase

**Current order:** Price Intelligence → AI Listing Optimiser → Vintography Photo Studio
**New order:** Vintography Photo Studio → AI Listing Optimiser → Price Intelligence

The Photo Studio card is now first (and the default active state). This means buyers arriving on the page see the photo studio immediately on load.

New Photo Studio card content: Keep the before/after grid but add a clearer "AI Model · Mannequin · Flat-Lay" tab strip preview as the primary visual. The "3 modes" tab row is the hero UI element.

### Impact stats strip

**Current 4 stats:**
- 40× Faster pricing than manual research
- £0 Extra fees on top of Vinted
- 18 Vinted markets supported
- 100 Max listing Health Score

**New 4 stats:**
- 3 modes — AI Model, Mannequin, Flat-Lay
- 1-tap — Phone snap to studio shot
- 18 — Vinted markets supported
- 40× — Faster than manual research

This puts the photo studio capabilities front-and-centre in the impact strip.

### Results strip (the "What Vintifi sellers say happens" section)

**Current 4 items:**
1. ⚡ Price any item in under 30 seconds
2. 📸 Professional photos stop the scroll
3. 📈 Catch trends 2–4 weeks early
4. 🎯 Stop leaving money on the table

**New order and copy:**
1. 📸 "The photo is the first thing buyers see — and the only thing that makes them click" (new headline, same sub)
2. ✨ "One tap from phone snap to studio shot — no setup, no equipment, no experience"
3. ⚡ "Price any item in under 30 seconds — AI analyses hundreds of comparables"
4. 🎯 "Stop leaving money on the table — AI pricing means you're never 20% under market"

Photo comes first. Pricing moves to #3.

### "Four tools. Zero guesswork." pillars section

**Current order:** Price Intelligence → AI Listing Optimiser → Vintography Photo Studio → Trend Radar

**New order:** Vintography Photo Studio → AI Listing Optimiser → Price Intelligence → Trend Radar

The pillar card for Photo Studio gets a new badge: **"Start here"** (in success/green) instead of "New".

New Photo Studio pillar copy:
- Title: "Vintography Photo Studio"
- Desc: "Your phone snap is already good enough — Vintifi turns it into a studio shot. AI Model puts your clothes on a photorealistic model. Mannequin and Flat-Lay give you clean product shots. Buyers click on professional photos. It's as simple as that."
- Outcome: "AI Model · Mannequin · Flat-Lay Pro"
- Badge: "Start here" (success colour)

New Price Intelligence pillar: moves to position 3 — copy unchanged, badge changes from "Core" to "Built in".

### How it works strip

**Current 3 steps:**
1. Add your item
2. AI prices it
3. Optimise & shoot

**New 3 steps:**
1. Add your item — "Paste a Vinted URL or upload photos. Brand, size, condition, all set in seconds."
2. Enhance your photos — "One tap. AI Model, Mannequin, or Flat-Lay. Your phone snap becomes a studio shot."
3. Price & optimise — "AI prices it to sell fast. AI-written title and description. Ready to post."

### Photo Studio showcase section (large dedicated section)

**Current headline:** "Buyers scroll fast. Studio photos stop them."
**New headline:** "Turn any phone snap into a studio shot."

**Current subheading:** "A professional product image is the single highest-impact change a Vinted seller can make. Vintography transforms your phone snap into a studio shot — in one tap."
**New subheading:** "Buyers decide in under 2 seconds. A professional photo is the difference between a click and a scroll-past. Vintography does it in one tap — no studio, no kit, no experience."

New feature checklist (same items, reordered and refined):
- ✓ AI Model — male & female · Editorial, Natural Photo, Street Style
- ✓ Mannequin Ghost — headless, dress form, half-body shots
- ✓ Flat-Lay Pro — clean overhead · 5 styling presets
- ✓ 16 background scenes · Batch processing · Gallery included

### Pricing preview section (landing page version)

**Current CTA headline:** "Start free. Scale when you're ready."
**Current subheading:** "5 free credits every month — no card, no catch."

**New CTA headline:** "Start free. Studio shots included."
**New subheading:** "3 free credits — enough to try Photo Studio, price an item, and optimise a listing."

### Bottom CTA section

**Current:** "Your first 5 credits are free. That's 5 price checks. 5 optimised listings. 5 studio-quality photos."
**New:** "Your first 3 credits are free. One studio shot. One price check. One optimised listing. A complete first sell — on us."

---

## Change 2 — `Features.tsx`: Feature order + hero rewrite

### Features page hero

**Current H1:** "Your Unfair Advantage on Vinted"
**Current subheading:** "Seven precision tools. One platform. Built exclusively for Vinted sellers..."

**New H1:** "Professional photos. AI pricing. Built for Vinted."
**New H1 gradient span:** "Your phone is all you need."

**New subheading (single line):** "Vintography turns your phone snap into a studio shot in one tap. AI pricing and listing optimisation do the rest. Everything in one place, built exclusively for Vinted."

### Feature `outcomeStats` bar (the 6-stat strip below the hero)

**Current 6 stats:**
1. < 30 sec — Average time to price an item
2. 100/100 — Max achievable Health Score
3. 18 — Vinted markets covered
4. 3 modes — AI Model, Mannequin, Flat-Lay
5. 40× — Faster than manual research
6. £0 — Extra fees on top of Vinted

**New 6 stats (reordered — photo stats first):**
1. 3 modes — AI Model, Mannequin & Flat-Lay
2. 1-tap — Phone snap to studio shot
3. 16 — Background scenes available
4. 40× — Faster than manual research
5. 100/100 — Max listing Health Score
6. £0 — Extra fees on top of Vinted

### Feature chapters order

**Current order:** Price Intelligence → Import from Vinted → AI Listing Optimiser → Vintography Photo Studio → Trend Radar → Arbitrage Scanner → Smart Inventory Manager

**New order:** Vintography Photo Studio → AI Listing Optimiser → Price Intelligence → Import from Vinted → Trend Radar → Arbitrage Scanner → Smart Inventory Manager

Photo Studio is now Feature Chapter 1. The left/right alternating layout means it renders on the left (text) and right (mock) on desktop — the most prominent position.

### Vintography feature chapter copy update

**Current headline:** "Professional product photos — powered by AI"
**New headline:** "Your phone snap. Studio quality. One tap."

**Current desc1:** "Three shooting modes, one platform. AI Model places your garment on a photorealistic male or female model..."
**New desc1:** "Buyers scroll through hundreds of listings in minutes. The photo is the first thing they see — and the only thing that makes them click. Vintography takes your phone snap and produces the kind of shot you'd expect from a professional product photographer."

**Current desc2:** "16 background scenes, batch processing for multiple images at once..."
**New desc2:** "Three modes built for Vinted. AI Model places your garment on a photorealistic model — choose male or female, Editorial, Natural Photo, or Street Style. Mannequin gives you ghost, headless, and dress form effects. Flat-Lay Pro creates clean overhead compositions in 5 styles. 16 background scenes, batch processing, and a full gallery included."

**Current callout:** "Buyers scroll fast. Studio-quality photos stop the scroll."
**New callout:** "You don't need a studio, a mannequin, or any experience. You need Vintifi and five seconds. Tap once — your bedroom floor becomes a professional product shot."

**Current stat:** "3 modes"
**New stat:** "1 tap"
**New statLabel:** "from phone snap to studio-quality product shot"

### AI Listing Optimiser feature chapter copy update

**Current headline:** "Listings that sell themselves — written by AI"
**New headline:** "Once buyers click, the listing closes the sale."

**New desc1:** "The photo gets the click. The listing closes the sale. Vintifi's AI generates a complete, search-optimised listing for Vinted — keyword-rich title, compelling description, and a hashtag set ready to copy-paste directly into your listing."

**New callout:** "Vinted's search algorithm reads your listing title first. An AI-optimised title means more buyers find your item before they ever see a competitor's."

### Price Intelligence feature chapter copy update

**Current headline:** "Know exactly what your item is worth — in seconds"
**New headline:** "Priced wrong, it sits. Priced right, it sells."

**New desc1:** "Paste any Vinted listing URL and get an AI pricing report in seconds — comparable sold items, brand desirability, condition, seasonal demand, and market saturation all factored in. Not a guess. A confidence-scored recommendation with a plain-English explanation of why."

**New callout:** "Most Vinted sellers underprice by instinct, or overprice and watch the listing sit for weeks. Vintifi tells you the exact number — and why."

### Features page bottom CTA

**Current:** "Seven tools. Start using them free. 5 free credits. No credit card."
**New:** "Start with the photo. Everything else follows. 3 free credits — try Photo Studio, price an item, optimise a listing. No card."

---

## Change 3 — `Pricing.tsx`: Credit count and persona copy updates

### All "5 credits" references → "3 credits"

Lines affected:
- **Pricing page `usePageMeta`** description: "Start free with 5 credits" → "Start free with 3 credits"
- **`personas[0].desc`** (Free tier): "5 credits every month, no card needed. Enough to price a few items and see if Vintifi is for you." → "3 credits every month — no card needed. Enough to try Photo Studio, price an item, and optimise a listing. A full first sell, on us."
- **`comparisonFeatures[0]`**: `free: "5"` → `free: "3"` (Credits / month row)
- **`comparisonFeatures[11]`**: `free: "20"` → `free: "10"` (Items Tracked row — matches Phase 2 database change)
- **FAQ q2** answer: "Free plan gives you 5 credits" → "Free plan gives you 3 credits — that's one Photo Studio edit, one price check, and one listing optimisation. Enough to try a complete sell."
- **FAQ q6** answer: "Our Free plan gives you 5 credits per month" → "Our Free plan gives you 3 credits per month"
- **Bottom CTA section** on pricing page: "5 free credits" → "3 free credits"

### Pricing page hero copy

**Current H1:** "The plan pays for itself on day one."
This stays — it's strong and accurate.

**Current subheading:** "Sellers on Pro and above price 40× faster than manually browsing Vinted."
**New:** "Studio photos without a studio. AI pricing without the research. Start free — your first complete sell is on us."

### Pricing page results banner

**Current:** "Sellers on Pro and above price 40× faster than manually browsing Vinted."
**New:** "Phone snap to studio shot in one tap. AI pricing in 30 seconds. Your first 3 credits are free."

---

## Change 4 — `constants.ts`: Free tier features array fix

The `STRIPE_TIERS.free.features` array contains two stale strings:
1. `"5 credits/month — no card required"` → `"3 credits/month — no card required"`
2. `"Up to 20 items tracked"` → `"Up to 10 items tracked"`

These are the strings that render on pricing cards throughout the app (pricing page, landing page pricing section, upgrade modal).

Also reorder the free tier features to lead with Photo Studio:
```
"3 credits/month — no card required",
"Vintography Photo Studio (bg removal, flat-lay)",
"AI Price Check on any Vinted item",
"Trend Radar — top 5 trends preview",
"Up to 10 items tracked",
"P&L tracking",
"Import listings from Vinted URL",
```

---

## Anti-AI tone compliance (style guide enforcement)

All new copy follows the "Anti-AI" tone mandate from the memory:
- British English contractions throughout ("you'd", "it's", "you're", "don't")
- No banned words: elevate, sophisticated, timeless, versatile, effortless, staple, investment piece, must-have, stunning, gorgeous, boasts, game-changer, level up
- Full sentences, not bullet-point style prose
- Conversational and honest — "your bedroom floor becomes a professional shot" not "transform your imagery"
- Specific claims only ("one tap", "30 seconds", "3 credits") — no vague superlatives
- No references to specific AI models (GPT, Gemini, etc.) — just "AI"

---

## Files NOT being changed in Phase 5

- `src/pages/marketing/HowItWorks.tsx` — not in scope of this phase
- `src/pages/marketing/About.tsx` — not in scope
- `src/pages/marketing/Privacy.tsx` — not in scope
- `src/components/MarketingLayout.tsx` — announcement bar text may be a separate pass
- All app pages (Dashboard, SellWizard, etc.) — Phase 4 complete
- No database migrations
- No edge function changes

---

## Risk assessment

All changes are pure UI/copy. No logic, no database, no edge functions. Risk is minimal:

- **`constants.ts` array reorder:** The `STRIPE_TIERS.free.features` reorder affects every pricing card in the app that uses `.map()` on this array. The first feature ("3 credits/month") will always be the prominent one — moving it to position 0 improves all pricing card renders. No logic breaks.
- **`heroFeatures` order change:** The `activeFeature` state defaults to 0. After reorder, index 0 is Photo Studio. This is the intended change — first render shows Photo Studio.
- **Features page feature order:** The `features.map()` alternates left/right layout by index. After reorder, Photo Studio (index 0) renders text-left, mock-right — the strongest reading position. All alternation logic remains correct.
- **Pricing page copy:** All "5 credits" references are string literals in the same file — straightforward find-and-replace with context-appropriate rewording.
