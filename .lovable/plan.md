

# Enterprise UX Cohesion Audit & Fix Plan

## Audit Findings

After reviewing every page and cross-feature flow, here are all the dead ends, missing links, and broken connections found across the app.

---

## Issue 1: Listings -> Price Check doesn't pre-fill manual data

**Where**: `Listings.tsx` and `PriceCheck.tsx`

When a listing has no Vinted URL, clicking "Run Price Check" from the 3-dot menu navigates to `/price-check` with no data. The Price Check page has a manual entry mode with brand/category/condition fields, but none of the listing's data is passed through.

**Fix**: Pass listing data as URL search params (`?brand=Nike&category=Trainers&condition=Good`) and have Price Check auto-switch to manual mode and pre-fill the fields.

---

## Issue 2: Listings -> Optimise Listing not available

**Where**: `Listings.tsx` dropdown menu

The 3-dot menu on each listing only has "Run Price Check", "View on Vinted", and "Delete". There's no option to optimise an existing listing, even though the Optimise page exists.

**Fix**: Add "Optimise Listing" to the dropdown that navigates to `/optimize?brand=X&category=Y&title=Z` and pre-fills those fields.

---

## Issue 3: Trend Cards have no actions

**Where**: `TrendCard.tsx`

Trend cards show brand/item, opportunity score, and AI summary but have zero interactive elements. Users see "Carhartt WIP is trending" but can't do anything about it.

**Fix**: Add action buttons: "Price Check" (pre-filled with brand), "Find Deals" (arbitrage pre-filled), and "Source It" (charity briefing).

---

## Issue 4: Dead Stock recommendations have no action links

**Where**: `DeadStock.tsx`

Recommendations say "Reduce Price", "Relist", "Crosslist", "Bundle" but none are clickable. They're just labels.

**Fix**: Make each action a clickable link -- "Reduce Price" opens the listing, "Relist" links to the Relist Scheduler, etc.

---

## Issue 5: Portfolio Optimizer recommendations not actionable

**Where**: `PortfolioOptimizer.tsx`

Recommendations say "reduce price" or "relist" but there are no buttons to take action.

**Fix**: Add "Apply Price" button and "View Listing" link.

---

## Issue 6: Arbitrage "Create Listing" button doesn't pre-fill

**Where**: `ArbitrageScanner.tsx`

The "Create Listing" button navigates to `/optimize` but doesn't pass any data (brand, category, suggested title).

**Fix**: Navigate with query params: `/optimize?title=X&brand=Y&category=Z`.

---

## Issue 7: Clearance Radar has no "Create Listing" action

**Where**: `ClearanceRadar.tsx`

Opportunities show brand, category, prices but there's no way to create a listing from a find.

**Fix**: Add "Create Listing" and "Price Check" action buttons.

---

## Issue 8: Charity Briefing items have no action links

**Where**: `CharityBriefing.tsx`

Briefing items show brand, buy/sell prices but no "Price Check this brand" or "I found one" action.

**Fix**: Add "Price Check" button per item that navigates with pre-filled brand/category.

---

## Issue 9: Niche Finder results have no follow-through

**Where**: `NicheFinder.tsx`

Niches are identified but there's no way to act -- no "Search Arbitrage", "Check Trends", or "Price Check" for the niche.

**Fix**: Add action buttons linking to Arbitrage, Trends, and Price Check pre-filtered for the niche.

---

## Issue 10: Seasonal Calendar has no actionable links

**Where**: `SeasonalCalendar.tsx`

Shows demand by month/category but no path to action. "September is peak for coats" should link to sourcing or pricing.

**Fix**: Add "Source Now" -> Charity Briefing and "Check Prices" -> Price Check links.

---

## Issue 11: Competitor Tracker has no cross-links

**Where**: `CompetitorTracker.tsx`

Competitor data doesn't link to Price Check or Trends.

**Fix**: Add "Price Check" and "View Trends" action links.

---

## Issue 12: Dashboard sidebar has no active state

**Where**: `Dashboard.tsx`

Sidebar nav items don't highlight which page you're on.

**Fix**: Use `useLocation()` to add active styling.

---

## Issue 13: MobileBottomNav missing on many pages

**Where**: Approximately 10 feature pages

Pages like ArbitrageScanner, CompetitorTracker, DeadStock, Analytics, ClearanceRadar, NicheFinder, etc. don't have the bottom nav on mobile.

**Fix**: Add `<MobileBottomNav />` to all feature pages.

---

## Implementation Plan

### Phase 1: Cross-Feature Data Passing (Core Fix)

**PriceCheck.tsx** -- Accept and auto-fill from URL params:
- Read `brand`, `category`, `condition` from search params
- If any manual params exist, auto-switch to "Manual Entry" mode and pre-fill fields

**Listings.tsx** -- Upgrade dropdown menu:
- Fix "Run Price Check" to pass `brand`, `category`, `condition` as params
- Add "Optimise Listing" menu item passing listing data as params

**OptimizeListing.tsx** -- Accept pre-fill from URL params:
- Read `title`, `brand`, `category`, `condition` from search params and pre-fill

### Phase 2: Action Buttons on Intelligence Pages

**TrendCard.tsx** -- Add action row:
- "Price Check" button -> `/price-check?brand=X&category=Y`
- "Find Deals" button -> `/arbitrage?brand=X`

**DeadStock.tsx** -- Make recommendations actionable:
- "Reduce Price" -> link to listing
- "Relist" -> `/relist`

**PortfolioOptimizer.tsx** -- Add action buttons:
- "Apply Price" to update listing price
- "View Listing" link

**ArbitrageScanner.tsx** -- Fix "Create Listing" pre-fill:
- Pass brand, category, suggested title to `/optimize`

**ClearanceRadar.tsx** -- Add actions per opportunity:
- "Create Listing" -> `/optimize?brand=X&category=Y`
- "Price Check" -> `/price-check?brand=X&category=Y`

**CharityBriefing.tsx** -- Add actions per briefing item:
- "Price Check" -> `/price-check?brand=X&category=Y`

**NicheFinder.tsx** -- Add actions per niche:
- "Find Deals" -> `/arbitrage?category=X`
- "Price Check" -> `/price-check?category=X`

**SeasonalCalendar.tsx** -- Add contextual links:
- "Source Now" -> `/charity-briefing`
- "Check Prices" -> `/price-check?category=X`

**CompetitorTracker.tsx** -- Add cross-links:
- "Price Check" and "View Trends" actions

### Phase 3: Navigation Consistency

**Dashboard.tsx** -- Add active sidebar state using `useLocation()`

**All feature pages** -- Add `<MobileBottomNav />` to pages missing it (approximately 10 pages)

---

## Files Modified (approximately 14 files)

| File | Changes |
|------|---------|
| `src/pages/PriceCheck.tsx` | Read URL params, auto-switch to manual mode, pre-fill |
| `src/pages/Listings.tsx` | Pass listing data via params, add Optimise menu item |
| `src/pages/OptimizeListing.tsx` | Read URL params, pre-fill fields |
| `src/components/trends/TrendCard.tsx` | Add Price Check and Find Deals buttons |
| `src/pages/DeadStock.tsx` | Make action labels clickable links |
| `src/pages/PortfolioOptimizer.tsx` | Add Apply Price and View Listing buttons |
| `src/pages/ArbitrageScanner.tsx` | Fix Create Listing pre-fill |
| `src/pages/ClearanceRadar.tsx` | Add Create Listing and Price Check actions |
| `src/pages/CharityBriefing.tsx` | Add Price Check action per item |
| `src/pages/NicheFinder.tsx` | Add Find Deals, Trends, Price Check actions |
| `src/pages/SeasonalCalendar.tsx` | Add Source Now and Check Prices links |
| `src/pages/CompetitorTracker.tsx` | Add Price Check and View Trends links |
| `src/pages/Dashboard.tsx` | Add active sidebar state |
| Multiple pages | Add MobileBottomNav to ~10 pages |

## Technical Approach
- All changes are frontend-only -- no database or edge function changes needed
- Use React Router's `useSearchParams` for cross-page data passing
- Use `useLocation` for active nav state
- No new dependencies required

