
## Dashboard Navigation Audit and Fix

### Issues Found

**1. Metric cards ALL go to /analytics (the main bug you reported)**
All four metric cards (Active Items, Portfolio Value, Sold 7d, Profit MTD) navigate to `/analytics` regardless of which card you click. "Active Items" should go to your listings page, not P&L analytics.

**2. DashboardIntelligence "Pending Relists" links to /relist (dead route)**
The "Pending Relists" attention card links to `/relist`, which is a redirect to `/dead-stock`. This works but is indirect and confusing.

**3. Trending cards go to /price-check instead of /trends**
In `DashboardIntelligence.tsx`, clicking a trending brand card takes you to Price Check pre-filled with that brand. This is debatable, but arguably clicking a trend card should go to the trends page with that brand highlighted, not straight to price check.

### Fixes

**File: `src/pages/Dashboard.tsx`**

Change each metric card to navigate to a logical destination instead of all going to `/analytics`:

| Card | Current Destination | Correct Destination |
|------|-------------------|-------------------|
| Active Items | /analytics | /listings?status=active |
| Portfolio Value | /analytics | /analytics |
| Sold (7d) | /analytics | /listings?status=sold |
| Profit (MTD) | /analytics | /analytics |

This means adding a `path` property to each metric object and using it in the `onClick`. "Active Items" and "Sold" go to filtered listings views, while "Portfolio Value" and "Profit" stay on analytics since those are financial metrics.

**File: `src/components/DashboardIntelligence.tsx`**

- Change "Pending Relists" path from `/relist` to `/dead-stock` (direct route instead of going through a redirect).

### Everything Else: Already Correct

- **Pipeline Snapshot**: Watchlist, Drafts, Live, Stale, Sold all link to the correct filtered views.
- **Next Actions Inbox**: Card click goes to item detail, action button goes to the tool with proper params (fixed in previous update).
- **Opportunities section**: Trend cards go to `/trends` -- correct.
- **Recent Price Checks**: Clicking a report re-runs that price check -- correct.
- **eBay Status Card**: Goes to `/platforms` -- correct.
- **"See all" buttons**: All point to their correct parent pages.
