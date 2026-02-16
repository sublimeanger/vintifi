

# Vintifi World-Class UX Revamp — Sprint Plan

This is a major architectural revamp that transforms Vintifi from a feature-directory into a workflow-first command centre. The spec is excellent and well-structured. Here is how we break it into 4 sprints, each delivering a shippable increment.

---

## Sprint 1: Foundation (App Shell + Navigation + Dashboard)
**Goal:** New layout, 5-workspace navigation, and the "Today" command centre replace the current feature-menu dashboard.

### 1.1 Database Migration
Add columns to `listings` table:
- `source_type` TEXT (trend/charity/arbitrage/manual/vinted_url)
- `source_meta` JSONB
- `images` JSONB (array of photo URLs)
- `last_price_check_at` TIMESTAMPTZ
- `last_optimised_at` TIMESTAMPTZ
- `last_photo_edit_at` TIMESTAMPTZ

Add `watchlist` and `draft` as valid status values (no constraint change needed -- status is TEXT).

Create new `item_activity` table:
- `id` UUID PK
- `user_id` UUID (FK profiles)
- `listing_id` UUID (FK listings)
- `type` TEXT (price_check, optimise, photo_edit, relist, status_change, created)
- `payload` JSONB
- `created_at` TIMESTAMPTZ

RLS: users can only read/write their own activity rows.

### 1.2 AppShellV2 Component
Create `src/components/AppShellV2.tsx` — a single unified layout replacing the per-page sidebar/header/bottom-nav code.

Structure:
- **Desktop**: Left sidebar with 5 workspace icons (Today, Items, Opportunities, Automation, Analytics) + user menu footer with plan/credits/upgrade
- **Mobile**: Top header (logo + credits pill + notifications bell) + bottom nav with 5 items: Today, Items, **New** (centre FAB), Opportunities, More (sheet)
- **Content area**: Replaces PageShell's container logic

### 1.3 Rename Labels Throughout
- "My Listings" becomes "Items"
- "Inventory Health" replaces "Dead Stock" everywhere
- "Optimise" becomes "Improve Listing"
- "Vintography" gets subtitle "Photo Studio"
- "Arbitrage" becomes "Deals" in nav

### 1.4 Route Restructuring (App.tsx)
- Keep all existing routes working (no breaking changes)
- Add `/items/:id` route (Item Detail page — placeholder initially)
- Move Settings out of primary nav into user menu
- Update `navSections` to use 5 workspaces
- Add redirects: `/dead-stock` stays but nav label changes

### 1.5 New "Today" Dashboard
Replace the current Dashboard content with the spec's layout:

**A) "New Item" primary card** — paste URL or start wizard
**B) "Your Next Actions" inbox** — max 5 items needing attention, queried from real data (items without price checks, stale items, items missing photos). Each row shows image + title + stage + one primary CTA + snooze/dismiss
**C) "Pipeline Snapshot"** — compact row showing counts: Watchlist, Drafts, Live, Stale, Sold. Each clickable to filter Items view
**D) "Opportunities For You"** — 3 cards max from trends/watchlist/arbitrage
**E) "Performance Quick"** — 4 compact metrics (revenue 7d, profit 30d, sell-through rate, avg days to sell)
**F) "Recent Activity"** — last 5 actions from `item_activity` table

### 1.6 Delete Obsolete Components
- Delete `SellSmartProgress.tsx`
- Delete `DashboardForYou.tsx`
- Remove SellSmartProgress imports from PriceCheck, OptimizeListing, Listings
- Simplify `DashboardIntelligence.tsx` (trending strip only, attention cards absorbed into Next Actions)

### 1.7 Update All Feature Pages
Replace `PageShell` + per-page `MobileBottomNav` with `AppShellV2` wrapper so every page gets consistent navigation without duplicating sidebar code.

---

## Sprint 2: Item-Centric Workflow (The Keystone)
**Goal:** Item Detail page, New Item Wizard, and fixing the 3 broken flows.

### 2.1 New Item Wizard Component
Create `src/components/NewItemWizard.tsx` — a multi-step modal/dialog:

1. **Start**: Choose input method (paste Vinted URL, upload photos, manual details, from opportunity)
2. **Research** (optional): Runs Price Check, shows recommended price, "Use this price" CTA
3. **Listing Copy** (optional): Runs Improve Listing, shows optimised title/description, "Apply" CTA
4. **Photos** (optional): Opens Vintography "Marketplace Ready" preset
5. **Save**: Choose status (Draft/Live/Watchlist), optional relist strategy, CTA: "Go to Item"

All outputs save to the SAME listing record. Wizard accessible from: "New" button (mobile), "New Item" button (desktop), "Add to inventory" from Price Check results, "Save to watchlist" from Trends/Charity Briefing.

### 2.2 Item Detail Page (`/items/:id`)
Create `src/pages/ItemDetail.tsx`:

**Header**: Item name + status badge + quick action buttons (Price, Improve, Photos, Publish, More) + "Next best action" pill

**Tabbed body**:
1. **Overview** — primary image, current vs recommended price, health score, views/favourites, next action CTA
2. **Price** — last price report, "Recheck price" button, comparable items, profit calculator
3. **Listing** — current title/description/tags, "Generate improved copy", apply buttons, health score breakdown
4. **Photos** — image gallery, before/after, run Vintography in context
5. **Sell Everywhere** (Business+) — cross-list connections, publish/sync status
6. **Activity** — timeline from `item_activity` table

### 2.3 ItemWorkflowStepper Component
Replace SellSmartProgress with a data-driven stepper:
- Checks: has_price_report, has_optimized_copy, has_processed_photos, is_listed
- Only renders when in item context (Item Detail page)
- Shows accurate completion state

### 2.4 Fix Price Check to Item Flow
- If Price Check opened with `?itemId=...`: update that item's `recommended_price`, `last_price_check_at`, and link `price_reports.listing_id`
- If standalone: show two clear CTAs — "Create new item" (default) + "Attach to existing item" (search/select)

### 2.5 Fix Optimiser to Item Flow
- If opened with `?itemId=...`: button reads "Apply to Item" (updates existing listing fields)
- If no itemId: prompt to create new item or attach to existing
- Never create duplicate listings

### 2.6 Fix Vintography to Item Flow
- Always ask "Save results to which item?" when not in item context
- Save processed URLs to item's `images` JSONB array

---

## Sprint 3: Workspaces + Progressive Disclosure
**Goal:** Opportunities tabs, Automation workspace, Items board view, and cognitive load reduction.

### 3.1 Opportunities Workspace (Tabbed)
Convert the current separate pages into tabs under one "Opportunities" workspace:

1. **Trending** (existing Trend Radar)
2. **Seasonal** (existing Seasonal Calendar content)
3. **Niches** (existing Niche Finder content)
4. **In-Store List** (existing Charity Briefing)
5. **Deals** (Arbitrage + Clearance Radar, gated to Business+)

Every opportunity card gets 2 standard actions: "Add to Watchlist" + "Price Check"

### 3.2 Automation Workspace (Tabbed)
Combine existing pages:

1. **Relist Queue** (existing Relist Scheduler, showing upcoming/success/fail)
2. **Rules** (future — placeholder with "Coming Soon")
3. **Cross-Listings** (existing, Business+)
4. **Connections** (existing Platform Connections, Business+)

### 3.3 Items Board View
Add a Kanban-style board view toggle to the Items page:
- Columns: Watchlist, Draft, Live, Stale, Sold
- Drag-and-drop to change status
- Each card shows: image, title/brand, price, health score, next action CTA

### 3.4 Command Palette
Add a global Cmd/Ctrl+K command palette using the existing `cmdk` dependency:
- Navigate to any workspace or page
- Start actions: "New item", "Price check", "Improve listing"
- Search items by name/brand

### 3.5 Cognitive Load Reduction
- Remove all 12 quick-action cards from the old dashboard (already done in Sprint 1)
- Add "More" collapse sections on power-user features (bulk actions, advanced filters)
- Replace educational blocks with 1-sentence microcopy + expandable "Show me more"

---

## Sprint 4: Polish, Credits, and Scale
**Goal:** Unified credits, billing UX, dark mode prep, and performance.

### 4.1 Unified AI Credits
- Rename all credit references to "AI Credits" (one pool)
- Show action cost BEFORE execution on every AI action (price check: 1 credit, improve listing: 2 credits, translate: 1 credit, photo edit: 1-2 credits)
- Update the credits pill in AppShellV2 to show unified count

### 4.2 Upgrade Moments (Contextual)
- Only show upgrade prompts when user tries a locked action or hits a limit
- Show what they get immediately + why it matters for their item
- 1-click upgrade that returns to where they were

### 4.3 Pricing Constants Single Source of Truth
- Ensure the marketing pricing page and feature gating both read from `STRIPE_TIERS` in `lib/constants.ts`
- Fix any discrepancies between displayed limits and enforced limits

### 4.4 Back Button Context
- Track referrer page so back buttons return to the correct context (e.g., Item Detail after running Price Check from within an item)

### 4.5 Performance
- Split the 1,069-line `Listings.tsx` into smaller components (ItemsListView, ItemsBoardView, ItemsFilters, ItemCard)
- Lazy-load workspace tab contents
- Add loading skeletons for all new components

### 4.6 Cleanup
- Remove all dead imports and unused components
- Update the platform audit document
- Ensure all routes have proper mobile responsiveness

---

## Files Changed Summary

| Sprint | New Files | Modified Files | Deleted Files |
|--------|-----------|----------------|---------------|
| 1 | AppShellV2.tsx, NextActionsInbox.tsx, PipelineSnapshot.tsx | App.tsx, Dashboard.tsx, all feature pages (PageShell swap), MobileBottomNav.tsx, constants.ts | SellSmartProgress.tsx, DashboardForYou.tsx |
| 2 | NewItemWizard.tsx, ItemDetail.tsx, ItemWorkflowStepper.tsx, ItemActivityTimeline.tsx | PriceCheck.tsx, OptimizeListing.tsx, Vintography.tsx, App.tsx (new route) | -- |
| 3 | OpportunitiesWorkspace.tsx, AutomationWorkspace.tsx, ItemsBoardView.tsx, CommandPalette.tsx | TrendRadar.tsx, CharityBriefing.tsx, ArbitrageScanner.tsx, ClearanceRadar.tsx, Listings.tsx | -- |
| 4 | ItemsListView.tsx, ItemsFilters.tsx, ItemCard.tsx | UpgradeModal.tsx, constants.ts, Listings.tsx (split), Pricing.tsx | -- |

## Database Changes Summary

| Change | Sprint | Type |
|--------|--------|------|
| Add 6 columns to `listings` | 1 | Migration |
| Create `item_activity` table + RLS | 1 | Migration |
| Ensure `price_reports.listing_id` is reliably populated | 2 | Edge function update |

## Risk Considerations

- **No feature loss**: Every existing feature remains accessible, just reorganised into workspaces
- **Route compatibility**: All existing routes kept; new routes added alongside
- **Data safety**: Schema changes are additive only (new columns, new table) -- no destructive changes
- **Sprint independence**: Each sprint delivers a shippable state; no sprint depends on a later one being complete

