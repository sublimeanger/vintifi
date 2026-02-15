

# Guided Tooltip Tour on First Dashboard Visit

## Overview
Add a lightweight, 4-step guided tooltip tour that appears on a user's first dashboard visit. It highlights the key features (Price Check, Listings, Trends, Arbitrage) in sequence with dismiss/next/skip controls. No features are blocked -- purely educational.

## Tour Steps
1. **Price Check input bar** -- "Paste any Vinted URL here to get AI-powered pricing intelligence in seconds."
2. **My Listings quick action card** -- "Track all your active listings, views, favourites, and health scores here."
3. **Trend Radar quick action card** -- "Discover rising brands and styles before they peak."
4. **Arbitrage Scanner quick action card** -- "Find profitable buy-low-sell-high opportunities across platforms."

## Implementation

### 1. New component: `src/components/GuidedTour.tsx`
A self-contained tour component using Radix Popover (already installed) for tooltip positioning:
- Accepts an array of step definitions, each with a `targetId` (DOM element ID), title, and description
- Renders a popover anchored to the current step's target element
- Shows step counter ("1 of 4"), Next/Back buttons, and a Skip link
- Styled using existing Card, Button, and design tokens
- On completion or skip, sets `localStorage` flag `vintifi_tour_completed` to prevent re-showing

### 2. Update `src/pages/Dashboard.tsx`
- Add `id` attributes to 4 target elements:
  - `id="tour-price-check"` on the Price Intelligence Engine card
  - `id="tour-listings"` on the My Listings quick action card
  - `id="tour-trends"` on the Trend Radar quick action card
  - `id="tour-arbitrage"` on the Arbitrage Scanner quick action card
- Import and render `<GuidedTour />` conditionally (only when `localStorage` flag is not set and data has loaded)

### 3. Tour persistence
- Uses `localStorage` only -- no database changes needed
- Key: `vintifi_tour_completed`
- Checked on mount; if not set, tour starts after a short delay (500ms) to let the dashboard render

### No database or backend changes required.

## Files to create
- `src/components/GuidedTour.tsx`

## Files to modify
- `src/pages/Dashboard.tsx` -- add element IDs and render tour component

