
# Phase 4 — Navigation Restructure

This plan covers every item in Part 2 (Navigation & Information Architecture) of the Vintifi Repositioning Brief v3.0. All changes are contained in a single file: `src/components/AppShellV2.tsx`. No routes are added or removed. All existing pages remain accessible.

---

## What is changing and why

The sidebar currently lists 7 items (Dashboard, Items, Sell, Price Check, Optimise, Trends, Photo Studio). The brief reduces this to 4 primary items to eliminate decision paralysis and make Photo Studio the second most prominent entry point after Dashboard — reflecting the platform's new "photo studio first" identity.

The mobile bottom nav currently shows Home, Items, [Sell FAB], Trends, Optimise. "Optimise" is being removed (it's accessed via the Sell Wizard and item detail) and "Photo Studio" replaces "Trends" in the high-visibility second slot. A new "More" tab replaces the last slot and opens a sheet containing the secondary navigation items.

---

## Change 1 — `NAV_ITEMS` array (Desktop sidebar + mobile hamburger sheet)

**Current (7 items):**
```
Dashboard, Items, Sell, Price Check, Optimise, Trends, Photo Studio
```

**New (4 items):**
```
Dashboard, Photo Studio, Sell, My Items
```

The `NAV_ITEMS` constant drives both the desktop sidebar nav loop and the mobile hamburger sheet nav loop. Both will be updated by this single array change.

Icons:
- Dashboard → `LayoutDashboard` (unchanged)
- Photo Studio → `ImageIcon` (currently last, moves to position 2)
- Sell → `Rocket` (unchanged, position 3)
- My Items → `Package` (label changes from "Items" to "My Items" for clarity, per brief)

Removed from `NAV_ITEMS`: `Search` (Price Check), `Sparkles` (Optimise), `TrendingUp` (Trends)

These routes remain active in `App.tsx` — they're just no longer primary nav items. They're accessible from Dashboard, Sell Wizard, item detail pages, and the new "More" sheet.

---

## Change 2 — `BOTTOM_TABS` array (Mobile bottom nav)

**Current (4 tabs + centre FAB):**
- Left 2: Home (`/dashboard`), Items (`/listings`)
- Centre: Sell FAB (`/sell`) — unchanged
- Right 2: Trends (`/trends`), Optimise (`/optimize`)

**New (4 tabs + centre FAB):**
- Left 2: Home (`/dashboard`), Photos (`/vintography`)
- Centre: Sell FAB (`/sell`) — unchanged
- Right 2: Items (`/listings`), More (sheet trigger — no path)

The `BOTTOM_TABS` array currently has 4 items that are split [0,1] and [2,3] around the FAB. The 4th tab (index 3, currently "Optimise") becomes a special "More" tab that is not a navigation link but a sheet trigger.

New `BOTTOM_TABS` (nav items only — "More" is handled separately):
```
{ icon: LayoutDashboard, label: "Home",   path: "/dashboard" }
{ icon: ImageIcon,       label: "Photos", path: "/vintography" }
{ icon: Package,         label: "Items",  path: "/listings" }
```

The "More" tab is the 4th slot (right of the FAB) and is rendered as a special non-link button.

---

## Change 3 — "More" sheet in mobile bottom nav

The 4th bottom nav tab (right of Items) becomes a "More" button (`MoreHorizontal` icon from lucide-react) that opens a sheet from the bottom.

The sheet contains:
- Trends → `/trends`
- Price Check → `/price-check`
- Settings → `/settings`
- Sign Out (calls `signOut()`)

This uses the existing `Sheet`/`SheetContent`/`SheetHeader` components already imported. A new state variable `moreSheetOpen` is added alongside the existing `sheetOpen` for the hamburger.

The "More" sheet slides in from the bottom (`side="bottom"`), with a handle at the top, and a list of items using the same button styling as the hamburger sheet.

---

## Change 4 — Desktop sidebar footer — Settings link update

The brief confirms the sidebar footer is unchanged. The existing Settings + Sign Out buttons in the sidebar footer remain exactly as-is. No change needed here.

---

## Change 5 — Mobile hamburger sheet — content update

The hamburger sheet (triggered by the `Menu` button in the mobile header) currently lists all 7 `NAV_ITEMS`. After Change 1, it will automatically list the new 4 `NAV_ITEMS` because it loops over the same array. The Settings and Sign Out buttons at the bottom of the sheet remain.

The brief states the hamburger should "contain the full nav for discoverability." To satisfy this, Trends, Price Check, and Optimise are added as secondary items below a visual separator in the hamburger sheet, clearly labelled (e.g. a subtle divider with "More tools" text). This ensures the hamburger still provides full app access while the primary 4 items get top billing.

---

## Lucide icon imports

New import needed: `MoreHorizontal` (for the "More" tab button).

Removed imports that are no longer in any nav array: `Search` (was Price Check), `Sparkles` (was Optimise), `TrendingUp` (was Trends).

However, these icons may be used elsewhere in the component. A quick check: none of `Search`, `Sparkles`, or `TrendingUp` are used outside the `NAV_ITEMS` and `BOTTOM_TABS` arrays within this file — they can be safely removed from the import. `TrendingUp` appears in the secondary "More tools" section of the hamburger sheet, so it stays. `Search` and `Sparkles` are used in the secondary section too — all three stay imported.

---

## Exact file change summary

**`src/components/AppShellV2.tsx`** — 4 targeted edits:

1. **Line 15–18 (imports):** Add `MoreHorizontal` to lucide-react import
2. **Lines 26–34 (`NAV_ITEMS`):** Replace with 4-item array: Dashboard, Photo Studio, Sell, My Items
3. **Lines 36–41 (`BOTTOM_TABS`):** Replace with 3-item array: Home, Photos, Items (More is rendered separately)
4. **Lines 52 (state):** Add `const [moreSheetOpen, setMoreSheetOpen] = useState(false);`
5. **Lines 192–265 (mobile bottom nav JSX):** 
   - Update slice logic: left 2 are BOTTOM_TABS[0,1], centre FAB unchanged, right renders BOTTOM_TABS[2] (Items) then the "More" button
   - Add "More" sheet trigger as the 4th tab slot
   - Add `Sheet`/`SheetContent` for the "More" sheet with Trends, Price Check, Settings, Sign Out
6. **Lines 155–170 (hamburger sheet nav):** Add secondary section below the primary 4 items — a thin separator line and a "More tools" label with Trends, Price Check, and Optimise listed below it

---

## Files NOT being changed in Phase 4

- No database migrations
- No edge function changes
- No route changes in `App.tsx`
- No changes to individual page files
- No marketing pages (Phase 5)
- No changes to `SellWizard.tsx`, `MobileBottomNav.tsx`, or any other navigation component

---

## Risk assessment

All changes are additive or reordering within a single file. Risk is low:

- **Removed nav items are still accessible:** All routes remain in `App.tsx`. Users who bookmarked `/price-check` or `/optimize` can still navigate directly. The "More" sheet and hamburger sheet provide UI access.
- **`BOTTOM_TABS` slice change:** The current bottom nav uses `BOTTOM_TABS.slice(0, 2)` for left tabs and `BOTTOM_TABS.slice(2)` for right tabs. After the change, BOTTOM_TABS has 3 items. `slice(0, 2)` gives Home + Photos (correct). The right side renders BOTTOM_TABS[2] (Items) explicitly and the "More" button as a separate hardcoded element — this is cleaner than relying on slice for a mixed content area.
- **"More" sheet state:** `moreSheetOpen` is a separate boolean from `sheetOpen` (hamburger). They are fully independent and cannot interfere with each other.
- **No layout breakage:** The bottom nav height (`h-14`) and FAB positioning are unchanged. The 4-tab + FAB structure remains identical — only the content of tabs 2 and 4 changes.
