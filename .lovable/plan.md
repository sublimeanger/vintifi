

# eBay Integration + Feature Cleanup

## What's Happening

Since you've been accepted for eBay API access, the eBay integration is genuinely valuable and worth building out properly. Meanwhile, the other "fake plumbing" features (Vinted Pro, Depop, generic cross-listings dashboard) should be removed, and the Relist Queue should become Relist Reminders inside Inventory Health.

## What eBay Integration Actually Enables

With real eBay API access, you can offer sellers something powerful: **one-click cross-listing to eBay** directly from their item detail page or listings view. This is a genuine competitive advantage. Here's what makes it worth doing well:

- **Publish to eBay** from any listing with auto-mapped condition, category, price, and photos
- **eBay price comparison** shown alongside Vinted pricing in Price Check reports (what's it worth on eBay vs Vinted?)
- **Status sync** -- when an item sells on eBay, mark it sold in Vintifi; when sold on Vinted, delist from eBay
- **eBay earnings** tracked in your existing P&L Analytics

## The Plan

### 1. Remove Redundant Features

**Delete pages:**
- `CrossListings.tsx` -- the generic multi-platform dashboard (eBay tracking moves to a simpler view)
- `VintedProModal.tsx` -- non-functional placeholder

**Simplify PlatformConnections page:**
- Remove Vinted Pro and Depop cards -- keep only eBay
- Rename page to "eBay Connection" or fold it into Settings
- Remove edge functions: `connect-vinted-pro`, `sync-platform-status` (rebuild sync specifically for eBay)

**Clean up Listings page:**
- Remove the generic `PublishModal` (multi-platform publish)
- Replace with a simpler "List on eBay" action in the item dropdown menu
- Delete `PublishModal.tsx`

### 2. Relist Reminders into Inventory Health

- Add a **Relist Reminders** tab or section to the `DeadStock.tsx` (Inventory Health) page
- Move the useful AI logic from `RelistScheduler.tsx` (optimal timing suggestions) into this section
- Delete `RelistScheduler.tsx` page and `/relist` route
- Update the `relist-scheduler` edge function to return reminders only (no crosslist strategies)

### 3. Navigation Cleanup

Update `AppShellV2.tsx` sidebar:
- Remove the entire **Automation** workspace (Relist Queue, Cross-Listings, Connections)
- Move **Inventory Health** into Analytics (it's already there, just remove duplicates)
- Add **eBay** as a simple link in Settings or as a connection badge in the sidebar footer
- Remove routes: `/cross-listings`, `/platforms` (or redirect `/platforms` to settings)
- Redirect `/relist` to `/dead-stock`

### 4. Build Out eBay Properly

**On the Item Detail page:**
- Add an "eBay" section or button showing: not listed / listed (with link) / sold
- One-click "List on eBay" that calls the existing `publish-to-platform` edge function (simplified to eBay only)
- Show eBay listing status with a link to view on eBay

**On the Listings page:**
- Add an eBay status indicator (small icon/badge) on each listing card
- Dropdown menu item: "List on eBay" / "View on eBay" / "Remove from eBay"

**eBay Connection management:**
- Move into Settings page as a dedicated section (or keep a simplified standalone page)
- Show connection status, connected eBay username, token expiry
- Connect / Disconnect / Re-authorise buttons

**Price Check enhancement:**
- When running a price check, optionally show "eBay value" alongside Vinted value
- This uses the same Firecrawl scraping but targets eBay search results
- Helps sellers decide whether to list on eBay, Vinted, or both

### 5. Route & Code Cleanup

- Remove routes: `/cross-listings`, `/relist`
- Redirect `/platforms` to `/settings` (or keep as `/ebay-connection`)
- Delete edge functions: `connect-vinted-pro`, `sync-platform-status`
- Simplify `publish-to-platform` to eBay-only (remove Depop/Vinted Pro adapters)
- Clean up `useSidebarBadges.ts` (remove relist/cross-listing badge counts)
- Clean up `NextActionsInbox.tsx` (remove cross-listing actions, keep eBay-specific ones if relevant)

## Technical Details

**Files to delete:**
- `src/pages/CrossListings.tsx`
- `src/pages/RelistScheduler.tsx`
- `src/components/PublishModal.tsx`
- `src/components/VintedProModal.tsx`
- `supabase/functions/connect-vinted-pro/index.ts`
- `supabase/functions/sync-platform-status/index.ts`

**Files to modify heavily:**
- `src/components/AppShellV2.tsx` -- remove Automation workspace
- `src/pages/PlatformConnections.tsx` -- simplify to eBay-only, possibly merge into Settings
- `src/pages/Listings.tsx` -- remove PublishModal, add eBay status indicators
- `src/pages/DeadStock.tsx` -- add Relist Reminders section
- `src/App.tsx` -- remove routes, add redirects
- `supabase/functions/publish-to-platform/index.ts` -- strip to eBay adapter only
- `src/pages/ItemDetail.tsx` -- add eBay listing status and action button

**Files to modify lightly:**
- `src/hooks/useSidebarBadges.ts`
- `src/components/NextActionsInbox.tsx`
- `src/lib/constants.ts` (remove VINTED_PRO feature flag)
- `supabase/config.toml` (remove deleted function configs)

