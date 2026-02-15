

# Vintography Integration + System Logic Check + Feature Audit

## Part 1: Bake Vintography Into the Ecosystem

Vintography currently lives in isolation at `/vintography`. It should be woven into every place where photos matter.

### 1.1 Listings Page -- "Enhance Photos" action in dropdown menu
In `src/pages/Listings.tsx`, the per-listing dropdown menu (lines ~899-917) has "Run Price Check", "Optimise Listing", "Publish to Platforms", "View on Vinted", and "Delete". Add an **"Enhance Photos"** option that navigates to `/vintography?image_url={listing.image_url}` so users can enhance a listing's photo directly from their inventory.

Also: when a listing has no `image_url`, show a subtle "Add Photo" prompt instead.

### 1.2 Optimise Listing Page -- Journey Banner with Vintography step
The Listing Lifecycle journey banner on `OptimizeListing.tsx` (lines 626-636) currently flows: Optimise -> Price Check -> Inventory. Insert **Vintography** as a step: Optimise -> **Enhance Photos** -> Price Check -> Inventory. This prompts users to polish their photos after writing optimised copy.

### 1.3 Price Check Page -- Journey Banner with Vintography step
Similarly on `PriceCheck.tsx` (lines 397-407), the journey flows: Price Check -> Optimise -> Inventory. Update to: Price Check -> Optimise -> **Enhance Photos** -> Inventory.

### 1.4 Dashboard -- Add Vintography to Intelligence Tools grid
In `Dashboard.tsx` (lines 452-474), the "Intelligence Tools" grid has Price Check, Optimise, Bulk Optimise, and Trend Radar. Add a **Vintography** card to the "Intelligence Tools" section (or create a mini "Studio" row) so it's discoverable from the main dashboard.

### 1.5 Vintography -- Accept `image_url` query param on load
Update `src/pages/Vintography.tsx` to check for `?image_url=` in query params on mount. If present, set it as the `originalUrl` directly so users arriving from Listings or Optimise pages land with their photo pre-loaded, ready to edit.

---

## Part 2: Feature Utility Audit -- What Stays, What Goes, What Upgrades

After reviewing all 20+ feature pages, here is the honest assessment:

### Features with Real Utility (Keep)
| Feature | Verdict | Notes |
|---------|---------|-------|
| Price Check | Core. Keep | Primary conversion driver |
| AI Listing Optimiser | Core. Keep | High daily-use value |
| Vintography | Core. Keep | Just levelled up |
| My Listings / Inventory | Core. Keep | Central data hub |
| Trend Radar | Keep | Unique intelligence |
| Dead Stock Analyser | Keep | Directly saves money |
| P&L Analytics | Keep | Essential for serious sellers |

### Features to Consider Removing or Merging
| Feature | Issue | Recommendation |
|---------|-------|----------------|
| **Portfolio Optimiser** vs **Dead Stock** | Massive overlap. Both analyse your inventory for pricing issues. Portfolio Optimiser does "bulk fix pricing" while Dead Stock does "liquidate stale items" -- these are the same problem. | **Merge** Portfolio Optimiser INTO Dead Stock. Rename the combined page to "Inventory Health" covering both stale item liquidation AND price optimisation in one view. Remove `/portfolio` route. |
| **Seasonal Calendar** vs **Trend Radar** | Seasonal Calendar shows "when demand peaks" and Trend Radar shows "what's trending now". The calendar is useful but rarely visited because Trend Radar already surfaces seasonal shifts. | **Merge** as a tab within Trend Radar. Add a "Seasonal" tab alongside the main trends view. Remove `/seasonal` as a standalone page. |
| **Bulk Optimise** | CSV-based batch listing optimisation. Useful for power users but the UX is heavy (upload CSV, parse, process one by one). Low engagement expected. | **Keep but demote** -- remove from the main dashboard grid and Intelligence Tools. Move it under "My Listings" as a secondary action. It's a power-user tool, not a discovery feature. |
| **Clearance Radar** | Monitors retail clearance pages for flip opportunities. Without actual live scraping connections, this is essentially AI-generated mock data. | **Keep for now** but flag it clearly as "coming soon" if Firecrawl/Lobstr aren't actually connected yet. Don't mislead users. |
| **Niche Finder** | Identifies underserved categories. Overlaps conceptually with Trend Radar's opportunity scores. | **Merge** as a "Niches" tab within Trend Radar. Three tabs: Trending / Seasonal / Niches. |
| **Cross-Listings + Platform Connections** | Cross-platform publishing to eBay/Depop. Without real API integrations, these pages show empty states. | **Keep the pages** but only surface them in the sidebar if the user has connected a platform. Hide from the dashboard until real utility exists. |

### Features to Upgrade
| Feature | Upgrade |
|---------|---------|
| **Charity Briefing** | Add a "Snap & Check" feature: take a photo while at the charity shop and get instant brand/value identification via Vintography's AI vision. Link to Vintography's image analysis. |
| **Relist Scheduler** | Currently manual. Add a one-click "Auto-Relist All Stale" button that queues all 30+ day items. |

---

## Part 3: Technical Implementation Plan

### Files to Modify

1. **`src/pages/Listings.tsx`** -- Add "Enhance Photos" to dropdown menu, add Camera icon import
2. **`src/pages/OptimizeListing.tsx`** -- Update Journey Banner to include Vintography step
3. **`src/pages/PriceCheck.tsx`** -- Update Journey Banner to include Vintography step
4. **`src/pages/Dashboard.tsx`** -- Add Vintography card to dashboard grid, merge sidebar entries
5. **`src/pages/Vintography.tsx`** -- Accept `image_url` query param
6. **`src/pages/TrendRadar.tsx`** -- Add Seasonal and Niche tabs (absorb those pages)
7. **`src/pages/DeadStock.tsx`** -- Rename to "Inventory Health", absorb Portfolio Optimiser logic
8. **`src/App.tsx`** -- Add redirects from old routes (`/portfolio` -> `/dead-stock`, `/seasonal` -> `/trends`, `/niche-finder` -> `/trends`)

### Sidebar Cleanup (in Dashboard.tsx)
Reduce sidebar navigation from 16 items to 12 by:
- Removing Portfolio Optimiser (merged into Dead Stock / "Inventory Health")
- Removing Seasonal Calendar (merged into Trend Radar)
- Removing Niche Finder (merged into Trend Radar)
- Moving Bulk Optimise out of the top-level nav into the Listings page as a secondary action

### No Database Changes Required
All changes are frontend reorganisation and navigation updates.

### Implementation Order
1. Vintography query param support + Listings dropdown integration (quick wins)
2. Journey Banner updates on Price Check + Optimise pages
3. Dashboard grid update with Vintography card
4. Sidebar cleanup and route merges
5. Absorb Seasonal Calendar + Niche Finder into Trend Radar tabs
6. Absorb Portfolio Optimiser into Dead Stock (renamed "Inventory Health")
7. Route redirects in App.tsx for backward compatibility

