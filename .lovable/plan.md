

# Marketing Upgrade — Phase B1 + C1/C4 Hero Swaps

## Overview
Build the reusable `<BeforeAfterSlider />` component using the existing `clip-path: inset()` pattern from ComparisonView, then swap the fake mockup heroes on the Landing and Pricing pages with real before/after imagery.

## Step 1: Save the real assets

Copy the two uploaded images into the project:
- `user-uploads://ChatGPT_Image_Feb_19_2026_05_55_39_PM-2.png` to `public/marketing/hoodie-before.png` (the original phone snap)
- `user-uploads://vintography-1771523921635-2.png` to `public/marketing/hoodie-cleanBG-steam.png` (the processed result)

## Step 2: Build `<BeforeAfterSlider />`

Create `src/components/marketing/BeforeAfterSlider.tsx` — a lightweight, reusable image comparison slider.

**Props:**
- `beforeSrc` / `afterSrc` — image URLs
- `beforeLabel` / `afterLabel` — optional labels (default "Before" / "After")
- `aspectRatio` — CSS aspect-ratio string (default "4/5")
- `badge` — optional mode badge text (e.g. "Clean BG + Steam & Press")
- `className` — pass-through

**Implementation details:**
- Uses the same `clip-path: inset()` technique already proven in ComparisonView.tsx
- Mouse drag on the handle + touch swipe support for mobile
- "Drag me" bounce animation on first view using Framer Motion + useInView
- Labels rendered as small semi-transparent badges in the corners
- No zoom/pan — this is a marketing component, not a tool
- Lazy-loaded images via `loading="lazy"`
- Approximately 80-100 lines — much simpler than ComparisonView

## Step 3: Landing Page hero swap

In `src/pages/Landing.tsx`, replace the rotating feature showcase card (lines ~283-343) — the fake mockup with emoji rectangles — with:

- A single large `<BeforeAfterSlider />` using the hoodie before/after pair
- Below: the existing tab strip remains but simplified to three small mode badges (Clean BG, AI Model, Flat-Lay) as visual indicators
- The feature showcase card with its "Phone snap" / "Studio quality" emoji placeholders is removed entirely

The hero section keeps: headline, subtext, CTA buttons, impact stats strip, market flags. Only the visual showcase changes.

## Step 4: Landing Photo Studio showcase swap

Replace the fake before/after cards in the Photo Studio showcase section (lines ~501-531) — the "Phone snap" / "Studio shot" emoji rectangles — with a `<BeforeAfterSlider />` using the same real assets. Badge: "Clean BG + Steam & Press".

## Step 5: Pricing page hero swap

In `src/pages/marketing/Pricing.tsx`, replace the static side-by-side image comparison in the hero (which currently uses `nike-front.jpeg` with CSS filters on both sides to fake a before/after) with a `<BeforeAfterSlider />` using the real hoodie pair.

## What this does NOT change
- All copy, CTAs, pricing cards, FAQ, footer — untouched
- The Listing Optimiser and Price Intelligence showcase cards in the hero rotation — kept as-is (they're illustrative UI mockups, not photo claims)
- Page routing, MarketingLayout, animations — all preserved

## Technical notes
- The BeforeAfterSlider is intentionally separate from ComparisonView (which has zoom, pan, variations, processing overlays). The marketing slider is ~80 lines vs ComparisonView's 500+ lines.
- Images served from `/public/marketing/` for simplicity — no bundling needed for marketing assets that may be swapped frequently.
- As more before/after pairs are added later, they go into the same `/public/marketing/` directory and can be plugged into any page's slider.

