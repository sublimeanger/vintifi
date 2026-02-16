

# eBay Integration Cohesion -- Full Plan

## Problems to Fix

1. **Broken messaging**: Settings page says "Connect your eBay, Vinted Pro, and Depop accounts" -- only eBay is supported. The "View Cross-Listings" button links to `/cross-listings` which redirects to `/listings` (confusing).
2. **eBay is buried**: Only accessible via Settings -> eBay Connection. No visibility in the main navigation or dashboard.
3. **No dashboard presence**: Users can't see their eBay connection status or cross-listed items at a glance.

## Changes

### 1. Fix Settings Page Messaging

In `src/pages/SettingsPage.tsx`, update the "Cross-Platform Publishing" section:
- Change title from "Cross-Platform Publishing" to "eBay Connection"
- Change description from "Connect your eBay, Vinted Pro, and Depop accounts..." to "Connect your eBay seller account to publish listings with one click."
- Remove the "View Cross-Listings" button (that route just redirects to /listings anyway)
- Keep only the "Manage Connection" button pointing to `/platforms`

### 2. Add eBay to Sidebar Navigation

In `src/components/AppShellV2.tsx`, add an "eBay" item under the Tools section:
- Icon: `ShoppingBag` (already imported)
- Label: "eBay"
- Path: `/platforms`
- This makes eBay a first-class citizen in the navigation, always one click away

### 3. Add eBay Status Card to Dashboard

In `src/pages/Dashboard.tsx`, add a compact eBay connection status card between the Pipeline and Next Actions sections:
- If **not connected**: Shows "Connect eBay" with a brief value prop and a button linking to `/platforms`
- If **connected**: Shows "eBay Connected" with a count of items listed on eBay and a quick-action button to view cross-listed items in the listings page
- Small, unobtrusive -- fits the existing dashboard card style

### 4. Fix PlatformConnections Page Title

In `src/pages/PlatformConnections.tsx`, the page already says "eBay Connection" which is correct. The `UseCaseSpotlight` description is also eBay-specific. No changes needed here.

## Technical Details

**Files to modify:**
- `src/pages/SettingsPage.tsx` -- Fix messaging (lines 237-257)
- `src/components/AppShellV2.tsx` -- Add eBay to TOOL_ITEMS array (line 62-66)
- `src/pages/Dashboard.tsx` -- Add eBay status card with a query to `platform_connections` and `cross_listings` tables

**No backend changes needed.** All data already exists in the database -- we just need to query `platform_connections` for connection status and `cross_listings` for item counts.

