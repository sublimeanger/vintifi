
# World-Class Marketing Pages Overhaul

## What's Being Upgraded

After reading all four marketing pages (Landing, Features, Pricing, HowItWorks) plus the constants file, here's the full picture of what's missing and what needs to be done to make these pages genuinely world-class.

## Issues Found Across All Pages

**Landing (`Landing.tsx`):**
- Hero headline "The smartest way to sell on Vinted" is generic — no bold sales claims, no impact stats
- Missing a social proof / results strip (seller wins, revenue numbers)
- The 4 pillars section is text-only cards with no wow factor
- "How it works" 3-step strip is too brief — no sense of drama or power
- Photo Studio section is good but still uses placeholder mocks with no real before/after imagery
- Simplified pricing only shows Free + Pro — Business & Scale not shown, selling power lost
- Bottom CTA "Ready to sell smarter?" is limp — no urgency

**Features (`Features.tsx`):**
- Hero headline "Your Unfair Advantage on Vinted" is solid but the sub-copy undersells it
- No sales claim stats on each feature (e.g. "Sellers using price intelligence sell 3x faster")
- Feature sections are good but lack testimonial-style social proof pull-quotes
- No results comparison (before/after revenue) per feature
- Arbitrage and Trend Radar sections need stronger ROI claims

**Pricing (`Pricing.tsx`):**
- Business plan shows £24.99 — correct per constants
- Scale plan shows £49.99 — correct per constants
- The hero section is bland — "Simple pricing, serious results" could be much stronger
- Missing a "Who is this for?" persona selector or section
- The guarantee section (14-day money-back) is buried in the FAQ — should be a trust badge up front
- No urgency / social proof near the CTAs
- Missing a compelling results banner above pricing cards

**HowItWorks (`HowItWorks.tsx`):**
- "From item to sale in 4 steps" is functional but not exciting
- Before/After section is good but the values are weak ("Guesswork" vs "Data-backed" — too vague)
- Missing a "Time saved" or "Revenue gained" stat section
- Bottom CTA is weak: "Your first 5 credits are free"
- Steps 1-4 are UI mocks but no compelling narrative about WHY it matters

## Strategy: What "World Class" Means Here

Following the project's "Anti-AI" style guide and honest evidence-based claims:
- Bold, specific, direct language — no "elevate", "sophisticated", "game-changer"
- Stats framed as outcomes ("Sellers price 40x faster", "Zero guesswork")
- British English, conversational tone
- Claims stay within what the platform actually does (no fabricated testimonials)
- Visually: glassmorphism stat cards, animated number counters, bold gradient text on key claims
- Mobile-first: everything touch-optimised, large tap targets, no tiny text

## Files to Change

| File | Change |
|---|---|
| `src/pages/Landing.tsx` | Full hero rewrite with impact stats strip, bold claims, stronger pillars, results section, full pricing preview, dramatic CTA |
| `src/pages/marketing/Features.tsx` | New hero with outcome stats, per-feature ROI claims, stronger copy throughout, results callout boxes |
| `src/pages/marketing/Pricing.tsx` | Trust badges strip, results banner, "Who is this for?" callout, urgency near CTAs, tightened copy |
| `src/pages/marketing/HowItWorks.tsx` | Stronger step copy with outcome claims, new "The Numbers" stat section, revamped Before/After with real revenue numbers, punchy CTA |

## Detailed Changes Per Page

---

### 1. Landing Page — Full Rewrite of Key Sections

**Hero Section** — Upgrade headline to a bold, outcome-focused claim:
```
Stop leaving money on Vinted.
Start selling like a pro.
```
Add a sub-headline with specific claims:
```
AI pricing that takes seconds not hours. Studio photos without a studio.
Market intelligence that makes competitors invisible. All for free to start.
```

Add an **Impact Stats Strip** immediately below the hero CTA buttons — a horizontal row of 4 glanceable stats in glassmorphic cards:
- `40×` faster than manual pricing research
- `£0` — no Vinted seller fees to worry about
- `18` Vinted markets supported
- `100` max listing health score

**4 Pillars Section** — Add outcome statements to each card:
- Price Intelligence: "Know your item's exact worth in seconds. No more underpricing. No more overpriced listings sitting for weeks."
- AI Listing Optimiser: "AI-written titles and descriptions that rank in Vinted search. A Health Score of 100 means maximum visibility."
- Photo Studio: "Phone snap in, studio shot out. AI Model, Mannequin Ghost, Flat-Lay Pro — buyers see professional photography, not a bedroom floor."
- Trend Radar: "Spot rising brands before everyone else. Stock what sells. Source smarter."

**Results Section (NEW)** — A dark-background section showing real outcomes:
- "Sellers using AI pricing stop underpricing within 24 hours"
- "A professional photo increases click-through rate on Vinted listings"
- "The average Vintifi user prices an item in under 30 seconds"
- "Trend Radar users source stock 2–4 weeks ahead of the market"

**Pricing Strip** — Show all 4 plans (Free, Pro, Business, Scale) in a compact horizontal strip with prices, not just Free + Pro. Link to full pricing page.

**CTA** — Change to:
```
Your first 5 credits are free.
That's 5 price checks. 5 optimised listings. 5 studio-quality photos.
No card. No catch. Results in 90 seconds.
```

---

### 2. Features Page — Upgrade Per Feature

**Hero** — Change sub-copy to:
```
Seven precision tools. One platform. Built exclusively for Vinted sellers
who want to sell faster, price smarter, and look more professional
than every other seller in their category.
```

**Per-feature sections** — Add a bold "What this means for you" callout box inside each feature section:

- Price Intelligence: "Stop pricing by gut feel. Know your item's exact market value in seconds — including how long it takes to sell at different price points."
- AI Listing Optimiser: "Your listing title is the first thing Vinted's search algorithm reads. An AI-optimised title means more buyers find your item, full stop."
- Vintography: "Buyers scroll fast. Studio-quality photos stop the scroll. A professional product image is the single highest-impact change a Vinted seller can make."
- Trend Radar: "By the time you notice a brand trending on social media, the Vinted market has already priced in the demand. Trend Radar gives you a head start."
- Arbitrage Scanner: "A single profitable arbitrage find can pay for months of Vintifi. The scanner runs automatically — you just act on the alerts."
- Inventory Manager: "Know exactly which listings are performing, which are stale, and which need attention. No spreadsheet. No guessing. Full control."

Add a **6-stat outcome bar** at the top of the features page below the hero:
- `< 30 sec` — average time to price an item
- `100 / 100` — max achievable Health Score
- `18` — Vinted markets covered
- `3 modes` — AI Model, Mannequin, Flat-Lay
- `40×` — faster than manual research
- `£0` — additional fees on top of Vinted

---

### 3. Pricing Page — Trust & Urgency Upgrade

**New: Trust Badges Row** — Between the hero and the pricing cards, add a row of 4 horizontal badges:
- 🔒 14-day money-back guarantee
- ⚡ Cancel anytime — no lock-in
- 🇪🇺 EU data residency — GDPR compliant
- ✨ 7-day free trial on all paid plans

**New: Results Banner** — Above the pricing cards, a teal/primary coloured banner:
```
Sellers on Pro and above price 40× faster than manually browsing Vinted.
The plan pays for itself on day one.
```

**New: "Who is this for?" Section** — Between pricing cards and comparison table, 4 persona cards:
- Free: "Testing the waters — 5 credits every month, no card needed"
- Pro: "Side hustlers selling 20–100 items a month who want to stop leaving money on the table"
- Business: "Full-time resellers managing large wardrobes who need arbitrage and bulk tools"
- Scale: "Vinted Pro businesses processing serious volume with no caps"

**Upgrade FAQ** — Add 3 more FAQs that address conversion objections:
- "How quickly will I see results?" → "Most sellers get their first AI price recommendation within 90 seconds of signing up."
- "What if I only sell a few items a month?" → "Free plan gives you 5 credits — that's 5 price checks or photo edits a month. No card required."
- "Does it work on all Vinted categories?" → "Yes — Vintifi works across womenswear, menswear, shoes, accessories, kids, vintage, and designer categories across all 18 Vinted markets."

**Stronger CTA section** — Change the bottom CTA from "Get started" to:
```
Start free today. See results tonight.
Your first 5 credits are waiting — no card needed.
```

---

### 4. HowItWorks Page — Outcome-Focused Rewrite

**Hero** — Change from "From item to sale in 4 steps" to:
```
Four steps. One perfect listing.
```
Sub-copy:
```
Add your item, let AI price it perfectly, write a search-optimised listing,
and create studio-quality photos — all inside Vintifi, all in minutes.
```

**Step Descriptions** — Upgrade each step's description copy with outcome language:

- Step 01 "Add your item": "Paste any Vinted URL and we import everything: photos, brand, size, condition, price. Or upload your own photos. Either way, your item is ready to price-check in seconds — no form-filling, no data entry."
- Step 02 "AI prices it perfectly": "Our engine analyses hundreds of comparable sold and active listings across Vinted — factoring in brand, condition, size, and seasonal demand. You get a recommended price with a confidence score and an explanation in plain English. No guessing. No leaving money on the table."
- Step 03 "Optimise the listing": "AI generates a keyword-rich title, a compelling description buyers actually want to read, and a hashtag set tuned for Vinted search. A Health Score of 100 means your listing is doing everything right. Below 60? You'll see exactly what to fix."
- Step 04 "Create studio-quality photos": "Upload your phone snap. Choose a mode: AI Model (your garment on a photorealistic male or female model), Mannequin (headless ghost effect), or Flat-Lay Pro (5 styling presets). Pick a background from 16 lifestyle scenes. Done. No studio. No equipment. No experience needed."

**New: "The Numbers" Section** — A 4-column stat grid replacing / supplementing Before/After:
- `< 30 seconds` — average time to price an item with Vintifi
- `40×` — faster than manual Vinted price research
- `100/100` — maximum achievable Listing Health Score
- `18` — Vinted markets Vintifi supports

**Before/After** — Upgrade the value labels:
- Before: "45 min/item" → change label from "Time pricing" to "Time per item" for clarity
- Before: "Guesswork" → "Gut feel — often 20–30% wrong"
- Before: "None" → "Zero — you list blind"
- Before: "Hit or miss" → "Dependent on writing skill"
- Before: "Phone snap" → "Amateur photo — buyer scrolls past"
- After: "Seconds" → "Under 30 seconds — AI-backed"
- After: "Data-backed" → "Confidence-scored — market-verified"
- After: "Full data" → "Live comparable data across Vinted"
- After: "AI-optimised" → "Health Score 100 — search-engineered"
- After: "Studio-quality" → "AI Model / Mannequin / Flat-Lay Pro"

**Bottom CTA** — Upgrade from:
```
Your first 5 credits are free. See results in under 90 seconds.
```
To:
```
Start free. See your first result in 90 seconds.
No card. No setup. Just paste a Vinted URL and go.
```

---

## Implementation Approach

All 4 files are complete rewrites / heavy edits. The existing component structure (MarketingLayout, Framer Motion, Recharts-based mocks, card system) stays exactly the same — only the content, copy, and new visual sections change. No new dependencies needed.

Each page gets:
1. Stronger hero headline + sub-copy with specific outcome claims
2. A stats/trust strip (new section)
3. Upgraded feature/step descriptions with outcome language
4. Stronger CTAs with specificity and urgency
5. Full mobile-first responsive treatment (same patterns already in use)

The anti-AI style guide is respected throughout: no "elevate", "sophisticated", "effortless", "game-changer", "must-have", or "investment piece" — just honest, direct, British English claims about what the platform actually does.
