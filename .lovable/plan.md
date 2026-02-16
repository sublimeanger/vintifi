

# Comprehensive Cohesion Audit and Fix Plan

## Full User Flow Map (Current State)

```text
Landing (/) --> Auth (/auth) --> Onboarding (4 steps) --> Welcome (/welcome) --> Dashboard (/dashboard)
                                                                                      |
                                            +------------------------------------------+
                                            |
                        +-------------------+-------------------+-------------------+
                        |                   |                   |                   |
                   Price Check         Optimise            Trends             Arbitrage
                        |                   |                   |                   |
                   [Report]            [Result]            [Cards]           [Opportunities]
                        |                   |                   |                   |
                   Save to             Save to            Price Check          Price Check
                   Inventory           Inventory                               
                        |                   |
                   Optimise            Vintography
                        |                   |
                   Vintography         Price Check
                        |                   |
                   Inventory           Inventory
```

---

## BUGS FOUND

### BUG 1: Guided Tour Reappears (Critical)
**File**: `src/components/GuidedTour.tsx`
**Problem**: Tour dismissal is stored in `localStorage` under key `vintifi_tour_completed`. This is fragile -- it resets when browser data is cleared, on different devices, or when the preview iframe has separate storage from the published app. This is why the tour keeps restarting.
**Fix**: Add a `tour_completed` boolean column to the `profiles` table. The GuidedTour reads from `profile.tour_completed` (via AuthContext) as the authoritative source, with localStorage as a fast cache. The `finish()` function updates both the database and localStorage. The Settings page "Restart Tour" button resets the DB field.

### BUG 2: Feature Unlock Toasts Use localStorage (Same Problem)
**File**: `src/hooks/useFeatureUnlocks.ts`
**Problem**: Milestone unlock toasts (e.g., "You've unlocked Arbitrage Scanner!") are tracked via localStorage keys like `unlock_arbitrage_{userId}`. Same fragility as the tour -- these milestones will re-trigger on new browsers/devices.
**Fix**: Track unlocked milestones in the database. Add a `milestones_shown` text array column to `profiles`. Check this array instead of localStorage.

### BUG 3: Dead Routes in App.tsx
**File**: `src/App.tsx` (lines 82-83, 87, 93-95)
**Problem**: Three routes are defined TWICE -- first as actual pages, then as redirects. React Router matches the first definition, so the redirects on lines 93-95 are unreachable dead code:
- `/portfolio` renders `PortfolioOptimizer` (line 82) -- redirect to `/dead-stock` on line 93 never fires
- `/seasonal` renders `SeasonalCalendar` (line 83) -- redirect to `/trends` on line 94 never fires
- `/niche-finder` renders `NicheFinder` (line 87) -- redirect to `/trends` on line 95 never fires

**Fix**: Remove the standalone page routes (lines 82, 83, 87) and keep only the redirects. These features were merged into other pages (Portfolio into Dead Stock, Seasonal and Niches into Trends tabs).

### BUG 4: DashboardIntelligence Links to Dead `/portfolio` Route
**File**: `src/components/DashboardIntelligence.tsx` (line 137)
**Problem**: The "Portfolio Health" attention card always shows and links to `/portfolio`, which (once Bug 3 is fixed) will redirect to `/dead-stock`. But the intent is different -- Portfolio Optimiser analyses pricing, while Dead Stock handles stale inventory.
**Fix**: Change the path to `/dead-stock` and update the label to "Inventory Health" to match the sidebar label. Update the description too.

### BUG 5: Dashboard Metric Card Links to Dead `/portfolio`
**File**: `src/pages/Dashboard.tsx` (line 96)
**Problem**: The "Portfolio Value" metric card links to `/portfolio` (dead route).
**Fix**: Change to `/analytics` since the P&L Analytics page is the right destination for portfolio value context.

### BUG 6: DashboardForYou Links to Dead `/portfolio`
**File**: `src/components/DashboardForYou.tsx` (line ~result.push with path `/portfolio`)
**Problem**: The "Check your portfolio health" suggestion links to `/portfolio`.
**Fix**: Change to `/dead-stock`.

---

## COHESION ISSUES FOUND

### ISSUE 1: No "Workflow Funnels" for Common User Journeys
**Problem**: The spec calls for users to "funnel themselves into common workflows." Currently, a user who wants to sell something intelligently has to figure out the right sequence themselves. There's no guided workflow for the most common scenario: "I have an item, I want to sell it smart."

**The ideal "Sell Smart" workflow is**:
1. Price Check (what's it worth?)
2. Optimise Listing (write the perfect title/description)
3. Enhance Photos (Vintography)
4. Add to Inventory (save it)
5. Publish (list on Vinted)

The JourneyBanner on Price Check and Optimise pages partially does this, but there are gaps:
- The Welcome page doesn't mention the Optimiser or Vintography at all
- Vintography has no JourneyBanner connecting to the next step
- There's no reverse link from Inventory back to "optimise this item"

**Fix**: Add a JourneyBanner to Vintography results. Ensure the Welcome page mentions the full workflow, not just price checking. These are small additions.

### ISSUE 2: Welcome Page is Too Narrow
**File**: `src/pages/Welcome.tsx`
**Problem**: The Welcome page only offers "Paste a Vinted URL for a price check" or shows existing items. For a new user with NO items and NO Vinted URL, the page feels like a dead end. They have to skip to the dashboard and figure things out.
**Fix**: Add a third option: "Or explore trending items to find what to sell" with a link to Trends. This gives every user type an entry point: sellers with items (price check), sellers with URLs (paste URL), and new sellers looking for ideas (trends).

### ISSUE 3: Charity Briefing Not Connected to Inventory
**File**: `src/pages/CharityBriefing.tsx`
**Problem**: The Charity Briefing generates a sourcing list (what to look for at charity shops), but after the user finds those items, there's no CTA to add them to inventory or run a price check. The briefing items have `max_buy_price` and `estimated_sell_price` but no "Save to Watchlist" or "Price Check This" action.
**Fix**: Add a "Price Check" button on each briefing item that pre-fills brand/category. Add a "Save to Sourcing List" action that creates a listing with status "watchlist".

### ISSUE 4: Arbitrage Results Don't Connect Forward
**File**: `src/pages/ArbitrageScanner.tsx`
**Problem**: Arbitrage opportunities show source prices and estimated Vinted sell prices, but there's no CTA to save the item to inventory or optimise a listing for it. The user sees a deal, then has to manually go create a listing.
**Fix**: Add "Save to Inventory" and "Create Listing" CTAs on arbitrage opportunity cards.

### ISSUE 5: Sidebar Has Duplicate "Billing" and "Settings" Links
**File**: `src/pages/Dashboard.tsx` (lines 76-78)
**Problem**: The Account section has both "Billing" and "Settings" -- but they both navigate to `/settings`. Redundant.
**Fix**: Remove the "Billing" entry since Settings already has the subscription section prominently displayed.

---

## IMPLEMENTATION PLAN

### Step 1: Database Migration
Add two columns to the `profiles` table:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tour_completed boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS milestones_shown text[] DEFAULT '{}';
```

### Step 2: Update AuthContext Profile Type
Add `tour_completed` and `milestones_shown` to the Profile type definition so they're available app-wide.

### Step 3: Fix GuidedTour (Database-backed)
- Read `profile.tour_completed` from AuthContext instead of localStorage
- On `finish()`, update DB (`profiles.tour_completed = true`) AND set localStorage cache
- On mount: if `profile.tour_completed === true`, don't show. If `false`, check localStorage cache as fallback for speed, then show if neither says completed.
- Keep mobile exclusion logic.

### Step 4: Fix useFeatureUnlocks (Database-backed)
- Read `profile.milestones_shown` from AuthContext
- On unlock, update DB (append to array) AND set localStorage
- Prevents re-showing milestones across devices

### Step 5: Fix Settings Tour Reset
Change the "Restart Tour" button to update `profiles.tour_completed = false` in the database and clear localStorage.

### Step 6: Fix App.tsx Dead Routes
Remove lines 82, 83, 87 (standalone page routes for `/portfolio`, `/seasonal`, `/niche-finder`). Keep only the redirect routes on lines 93-95. Also remove unused imports for `PortfolioOptimizer`, `SeasonalCalendar`, `NicheFinder`.

### Step 7: Fix All `/portfolio` Links
- `DashboardIntelligence.tsx` line 137: `/portfolio` to `/dead-stock`, update label to "Inventory Health"
- `DashboardForYou.tsx`: `/portfolio` to `/dead-stock`
- `Dashboard.tsx` line 96: `/portfolio` to `/analytics`
- `useFeatureUnlocks.ts` line 9: `/portfolio` to `/dead-stock`

### Step 8: Remove Duplicate Sidebar Entry
Remove the "Billing" nav item from Dashboard sidebar (lines 76-77), keeping only "Settings".

### Step 9: Enhance Welcome Page
Add a third option below the URL input: "Or explore what's trending right now" linking to `/trends`. This ensures no user hits a dead end.

### Step 10: Add Vintography JourneyBanner
After Vintography produces a result, add a JourneyBanner showing the next step (Save to Inventory / Price Check).

## Files Changed Summary

| File | Change |
|------|--------|
| `profiles` table (migration) | Add `tour_completed` boolean, `milestones_shown` text array |
| `src/contexts/AuthContext.tsx` | Add 2 fields to Profile type |
| `src/components/GuidedTour.tsx` | Read from profile DB, update DB on finish |
| `src/hooks/useFeatureUnlocks.ts` | Read from profile DB, update DB on unlock |
| `src/pages/SettingsPage.tsx` | Tour reset updates DB |
| `src/App.tsx` | Remove 3 dead routes + unused imports |
| `src/components/DashboardIntelligence.tsx` | Fix `/portfolio` link |
| `src/components/DashboardForYou.tsx` | Fix `/portfolio` link |
| `src/pages/Dashboard.tsx` | Fix metric card link, remove duplicate sidebar entry |
| `src/pages/Welcome.tsx` | Add "explore trends" fallback option |
| `src/pages/Vintography.tsx` | Add JourneyBanner after results |

