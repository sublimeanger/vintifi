

# World-Class Mobile & Desktop Polish for Vintifi

## Overview
A comprehensive polish pass across all pages to ensure pixel-perfect, flawless UX on both mobile (375px+) and desktop (1280px+). The changes focus on fixing layout overflow issues, improving touch targets, ensuring consistent spacing, and refining the responsive behaviour of every page.

## Pages & Issues Identified

### 1. Dashboard (`Dashboard.tsx`)
- **Mobile sidebar overlay** uses `bg-secondary/95` which is very dark and jarring -- switch to a proper sheet/drawer pattern
- **Mobile header** has no safe area padding and overlaps content
- **Quick action cards grid** renders as 2-col on mobile which is fine, but 12 cards is overwhelming -- group them with section headings
- **Price Check CTA input + button** wraps awkwardly on very narrow screens -- stack vertically below 640px
- **Nav items** list is very long (16 items) -- add scroll to mobile overlay, group items with section dividers

### 2. Price Check (`PriceCheck.tsx`)
- **Manual entry grid** uses `grid-cols-2` without responsive breakpoint -- stack on mobile
- **Hero metrics grid** `grid-cols-1 md:grid-cols-3` is fine but cards could use tighter padding on mobile
- **Comparable items** price text overflows on narrow screens when prices are large
- **Action buttons** at bottom should be full-width on mobile

### 3. Listing Optimiser (`OptimizeListing.tsx`)
- **Split-screen layout** works well but the right panel slides in from x:20 which causes a horizontal scroll flash
- **Photo grid** `grid-cols-2 sm:grid-cols-4` is good but aspect-ratio images need `overflow-hidden` consistently
- **Multi-language tabs** can overflow on mobile -- needs horizontal scroll

### 4. Bulk Optimise (`BulkOptimize.tsx`)
- **Table** has columns hidden with `hidden sm:table-cell` which is correct, but on very narrow phones the remaining columns are cramped
- **Expanded row content** has `px-6` which is too wide on mobile -- reduce to `px-3` on small screens
- **Action buttons row** wraps awkwardly -- stack on mobile

### 5. My Listings (`Listings.tsx`)
- **Header** has too many inline buttons (Bulk Upload + Add Listing) -- collapse to icon-only on mobile
- **Listing card metrics row** has many inline-flex items that overflow on mobile -- needs better wrapping
- **P&L grid** `grid-cols-3` needs to be `grid-cols-1 sm:grid-cols-3` or similar on mobile
- **Inline edit inputs** are very small on mobile -- increase touch target

### 6. Trend Radar (`TrendRadar.tsx`)
- **Header** has two buttons (Refresh + Scan Market) that crowd on mobile -- stack or use icon-only
- **Category filter pills** scroll works but needs `scrollbar-hide` utility (may not exist in CSS)
- Generally well-structured

### 7. Arbitrage Scanner (`ArbitrageScanner.tsx`)
- **Summary stats** `grid-cols-3` has very cramped text on mobile -- text is `text-[10px]` which is too small
- **Opportunity cards** price comparison section works but the flex layout can wrap oddly on 375px
- Generally solid

### 8. Competitor Tracker (`CompetitorTracker.tsx`)
- **3-column grid** `lg:grid-cols-3` is appropriate but the alerts sidebar column on mobile renders at full width -- needs separator or visual distinction
- **Add form grid** `grid-cols-2` should stack on mobile
- **Competitor card stats** flex items overflow on narrow screens

### 9. Dead Stock (`DeadStock.tsx`)
- **Recommendation cards** have dense content that wraps poorly on mobile
- **Expanded sections** (price schedule table) has fixed-width columns that overflow on mobile
- **Summary grid** `grid-cols-2 md:grid-cols-3` leaves a single orphan column on mobile

### 10. P&L Analytics (`Analytics.tsx`)
- **KPI grid** `grid-cols-2 md:grid-cols-4` renders 8 cards in 4 rows on mobile -- consider showing only top 4 on mobile
- **Chart containers** have fixed `h-64` / `h-56` heights that are appropriate
- **Pie chart labels** overflow on mobile due to long category names
- **Top performers table** headers may overflow

### 11. Relist Scheduler (`RelistScheduler.tsx`)
- **Schedule cards** have dense badge + text layouts that wrap poorly on very narrow screens
- **Header** Generate Schedule button text is long -- abbreviate on mobile

### 12. Portfolio Optimiser (`PortfolioOptimizer.tsx`)
- **Filter buttons** row wraps on mobile -- needs horizontal scroll
- **Recommendation cards** have many inline badges that create messy wrapping
- Generally well-structured

### 13. Seasonal Calendar (`SeasonalCalendar.tsx`)
- **Heatmap table** has `min-w-[700px]` which forces horizontal scroll -- this is intentional and correct
- **Category deep dive view** works well
- **No sticky header** -- inconsistent with other pages

### 14. Charity Briefing (`CharityBriefing.tsx`)
- **Already mobile-first** with `max-w-lg` -- this is the best-designed mobile page
- Minor: header uses `glass` class directly instead of `border-b border-border glass` pattern

### 15. Settings (`SettingsPage.tsx`)
- **Subscription cards grid** `md:grid-cols-3` works but cards can be very narrow on tablet breakpoint
- **Timezone select** dropdown works fine
- Generally clean

### 16. Landing Page (`Landing.tsx`)
- **Hero text** `text-5xl md:text-7xl` is appropriate
- **Pricing grid** `lg:grid-cols-4` collapses to 1-col on mobile which is fine but cards are very tall
- **Nav** hides links on mobile but has no hamburger menu -- just CTA buttons
- **Mock UI preview** `grid-cols-3` on the demo cards can be cramped on mobile

### 17. Auth & Onboarding
- Both are well-centred card layouts, work well on all sizes

---

## Implementation Plan

### Phase 1: Shared Layout Refactor
**Extract a reusable `PageShell` component** that provides:
- Consistent sticky header with glass effect
- Back button + title + optional actions
- Proper `pt-16 lg:pt-0` for mobile header offset
- Standard `container mx-auto px-4 py-6 max-w-Xll` main content wrapper

This avoids repeating the header pattern 15+ times and ensures consistency.

### Phase 2: Dashboard Mobile Navigation
- Replace the custom mobile sidebar overlay with a proper Drawer component (already available via vaul)
- Group nav items with section labels: "Core", "Intelligence", "Inventory", "Account"
- Add a persistent bottom tab bar on mobile for the 5 most important routes (Dashboard, Price Check, Listings, Trends, Settings)
- Improve the dashboard quick actions: group cards under section headings ("Intelligence Tools", "Inventory Management", "Market Analysis")

### Phase 3: Per-Page Mobile Fixes
Apply targeted responsive fixes to each page:

1. **PriceCheck**: Stack input + button on mobile; make action buttons full-width
2. **OptimizeListing**: Fix animation x-offset causing scroll; improve label spacing
3. **BulkOptimize**: Reduce expanded row padding on mobile; stack action buttons
4. **Listings**: Make header buttons icon-only on mobile; fix metrics row wrapping; fix P&L grid
5. **TrendRadar**: Stack header buttons on mobile; add scrollbar-hide CSS
6. **ArbitrageScanner**: Increase stat text size; fix price comparison layout
7. **CompetitorTracker**: Stack add-form fields on mobile; fix competitor card stats overflow
8. **DeadStock**: Fix summary grid; improve expanded section layout for mobile
9. **Analytics**: Limit visible KPIs on mobile; fix pie chart label overflow
10. **RelistScheduler**: Abbreviate button text on mobile; fix schedule card badge wrapping
11. **PortfolioOptimizer**: Add horizontal scroll to filter row
12. **SeasonalCalendar**: Add sticky header consistent with other pages
13. **Settings**: Minor spacing adjustments

### Phase 4: Global Polish
- Add `scrollbar-hide` utility class to CSS (`-webkit-scrollbar` + `scrollbar-width: none`)
- Ensure all interactive elements have minimum 44px touch targets on mobile
- Add `safe-area-inset` padding for notched devices
- Ensure all text truncates properly with `truncate` or `line-clamp`
- Verify all cards use consistent `rounded-lg` and shadow patterns

## Technical Details

### New Components
- `src/components/PageShell.tsx` -- Reusable page wrapper with header
- `src/components/MobileBottomNav.tsx` -- Persistent bottom tab bar for mobile (5 tabs)
- `src/components/DashboardSidebar.tsx` -- Extract sidebar from Dashboard into reusable component

### CSS Additions (index.css)
```css
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
```

### Files Modified
Every page file listed above will receive targeted responsive fixes. The Dashboard will get the largest refactor to extract the sidebar and add the bottom nav.

### Approach
- Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) consistently
- Prefer `flex-wrap` and `gap` over rigid grids on mobile
- Use `hidden sm:flex` / `flex sm:hidden` for show/hide patterns
- Stack layouts vertically on mobile, horizontally on desktop
- Ensure minimum touch target of `h-10 w-10` (40px) for all interactive elements

