

## Mobile Polish: System-Wide UX Audit and Fixes

After reviewing every major page in the app, here are the mobile-specific issues grouped by priority, with the fixes needed for each.

---

### 1. ItemDetail Page -- Action Buttons Overflow on Mobile

**Problem:** The header actions (`Price`, `Improve`, `Photos` buttons) overflow on narrow screens. The `Photos` button is hidden on mobile and only accessible via the overflow menu, but `Price` and `Improve` still show full text buttons that can clip.

**Fix in `src/pages/ItemDetail.tsx`:**
- Change `Price` and `Improve` buttons to icon-only on mobile (use `size="icon"` with `sm:hidden` / `hidden sm:flex` pattern already used for Photos)
- Move all three action buttons into the overflow DropdownMenu on mobile, showing only the primary next-action button inline
- Make the badge row (`Live`, brand, size, condition, colour, material) horizontally scrollable on mobile instead of wrapping into 3+ lines

---

### 2. ItemDetail Tabs -- TabsList Not Scrollable

**Problem:** The 5-tab `TabsList` (Overview, Price, Listing, Photos, Activity) uses `w-full justify-start overflow-x-auto` but the Radix TabsList doesn't scroll cleanly on small phones -- tabs get squished.

**Fix in `src/pages/ItemDetail.tsx`:**
- Add `flex-nowrap` and `gap-1` to the TabsList so tabs scroll horizontally instead of wrapping/compressing
- Ensure `min-w-fit` on individual triggers

---

### 3. ItemDetail Workflow Stepper -- Labels Hidden, Steps Cramped

**Problem:** The workflow stepper (line ~573) hides step labels on mobile (`hidden sm:block`) but the circles and connecting lines still look cramped. On a 375px screen, 4 circles with dividers barely fit.

**Fix:** Make the stepper a compact horizontal scroll strip on mobile with labels always visible at smaller font size, or switch to a condensed "2 of 4 complete" summary on mobile.

---

### 4. Listings Page -- Metrics Row Too Dense on Small Screens

**Problem:** The listing card metrics row (line ~769) wraps price, cost, sale, profit, health score, days, views, and favourites all in one flex-wrap row. On mobile, this creates 2-3 lines of tiny text that's hard to read and looks cluttered.

**Fix in `src/pages/Listings.tsx`:**
- Show only the 3 most important metrics on mobile: price, health dot, and days listed
- Move secondary metrics (cost, sale price, profit, views, favourites) to the item detail page where there's room
- Use `hidden sm:flex` on secondary metrics

---

### 5. PriceCheck Page -- JourneyBanner Missing itemId

**Problem:** The JourneyBanner at the bottom of PriceCheck (line ~701) doesn't pass `itemId` to the Optimise or Vintography paths, breaking the item-centric flow. Photos and optimisation results won't save back to the item.

**Fix in `src/pages/PriceCheck.tsx`:**
- Thread `itemId` through to the JourneyBanner paths:
  - Optimise path: add `&itemId=${itemId}` when itemId is present
  - Enhance Photos path: `/vintography?itemId=${itemId}` when itemId is present
- This mirrors the fix already applied in OptimizeListing.tsx

---

### 6. PriceCheck Page -- Bottom Action Buttons Stack Poorly

**Problem:** After a price report, there are 5 full-width buttons stacked vertically on mobile (line ~623): "New Analysis", "Back to Item", "Save to Inventory", "Find Arbitrage Deals", "Track This Brand", and "Optimise This Listing". That's 6 buttons taking up the entire viewport.

**Fix in `src/pages/PriceCheck.tsx`:**
- Group into primary (Back to Item / Optimise Listing) and secondary actions
- Show primary actions as full-width buttons
- Collapse secondary actions (Arbitrage, Track Brand, Save to Inventory) into a "More Actions" collapsible section or a horizontal scroll row of smaller outline buttons

---

### 7. PriceCheck Comparable Items -- Touch Targets Too Small

**Problem:** Each comparable item row is a tappable area, but the entire row is only ~44px tall with text at 10-12px. On mobile, multiple taps are needed to hit the right row.

**Fix:** Increase mobile padding on comparable rows from `p-3` to `p-4` on mobile for better touch targets.

---

### 8. Dashboard -- Opportunities Cards Scroll Clipping

**Problem:** The horizontal scroll area for trend cards (line ~172) uses `-mx-1 px-1` to allow edge-to-edge scroll, but the last card gets clipped by the container padding on some devices.

**Fix in `src/pages/Dashboard.tsx`:**
- Add `pr-4` padding to the last card or a spacer element at the end of the scroll container

---

### 9. AppShellV2 -- Bottom Nav Safe Area on Newer Phones

**Problem:** The bottom nav uses `pb-[env(safe-area-inset-bottom)]` which is correct, but the main content area uses `pb-24` which may not be enough on phones with large home indicators (iPhone 15 Pro Max has 34px safe area).

**Fix in `src/components/AppShellV2.tsx`:**
- Change `pb-24` to `pb-28` on the main content area to account for the bottom nav height (64px) + safe area + breathing room

---

### 10. Global Touch Target Audit

**Problem:** Several interactive elements across pages use `h-7` or `h-8` sizing which is below the 44px minimum recommended for mobile touch targets.

**Fixes across multiple files:**
- Listing card dropdown trigger: already `h-8 w-8` -- bump to `h-10 w-10` on mobile
- Filter chips on Listings page: `py-1.5` gives ~28px height -- increase to `py-2` on mobile
- Status chips inside listing cards: currently tiny and hard to tap for status changes

---

### Summary of Files to Change

| File | Changes |
|------|---------|
| `src/pages/ItemDetail.tsx` | Scroll badges, mobile-compact action bar, scrollable TabsList, workflow stepper |
| `src/pages/Listings.tsx` | Slim down mobile metrics row, improve touch targets |
| `src/pages/PriceCheck.tsx` | Fix JourneyBanner itemId threading, collapse bottom actions, improve comparable item touch targets |
| `src/pages/Dashboard.tsx` | Fix trend card scroll clipping |
| `src/components/AppShellV2.tsx` | Increase bottom padding for safe area |

### What This Achieves
- Every screen will feel purposeful and uncluttered on a 375px phone
- Touch targets will meet the 44px minimum throughout
- The item-centric flow will be preserved across all navigation paths (itemId threading)
- Secondary information is deferred rather than deleted -- still accessible but not crowding the primary experience

