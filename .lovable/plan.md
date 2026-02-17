
# Bulletproof Cohesion: The Vintifi Flow Rebuild

## The Core Problem

Every page operates as an isolated island. Data doesn't flow between pillars. When a user clicks "Photo Studio" from their item, they arrive at an empty upload zone instead of seeing their photos. When they finish optimising, there's no clear "you're done, here's your pack" moment. The four pillars (Add > Price > Optimise > Photos) exist but they don't talk to each other.

Here is every specific break I found:

### Break 1: Photo Studio ignores item photos
`Vintography.tsx` line 104 only reads `searchParams.get("image_url")` -- a single URL param. When navigating from ItemDetail Photos tab via `/vintography?itemId=xxx`, the Photo Studio shows an **empty upload zone** because it never fetches the item's photos from the database. This is the exact issue you experienced.

### Break 2: Optimise results don't chain to Photo Studio with images
`OptimizeListing.tsx` line 452 navigates to `/vintography` or `/vintography?itemId=xxx` but passes zero image data. The user arrives at Photo Studio with nothing loaded.

### Break 3: Photo Studio has no "next step" after processing
After processing a photo, the only CTA is "Back to Item" (line 477-486, only if itemId exists). Standalone users have no forward path. There's no "Now optimise your listing" or "Your photos are ready" completion moment.

### Break 4: "All Done" card on ItemDetail is a dead end
Line 692-702 just shows a green card saying "All Done!" with no actionable content. No copy buttons, no download-all, no assembled pack. The user's entire workflow culminates in... nothing.

### Break 5: Two competing bottom nav systems
`AppShellV2.tsx` has its own `BOTTOM_TABS` (4 tabs: Home, Items, Photos, Settings) while `MobileBottomNav.tsx` has 5 tabs (Home, Items, Optimise, Photos, Settings). AppShellV2 is used by Dashboard. MobileBottomNav is standalone. They don't match, and AppShellV2's version is missing Optimise and Price Check.

### Break 6: Dashboard Quick Price Check creates orphan data
When a user does a price check from the dashboard (no itemId), they can "Save to Inventory" from the results. But the saved item has no link back to the price report, no photos, and the user is dumped on the listings page with no next step.

### Break 7: No "pick from my items" on standalone pages
Price Check and Optimise pages accessed from nav require manual entry or URL paste. Users with existing inventory can't select an item to work on.

---

## Sprint Plan

### Sprint 1: Fix the Photo Studio Data Pipeline (highest impact)

**Problem**: Photo Studio doesn't load item photos when navigated from ItemDetail.

**Fix in `Vintography.tsx`**:
- Add a `useEffect` that fires when `itemId` is present
- Fetch the listing's `image_url` and `images` array from the database
- Auto-populate the first photo as `originalUrl` and create `batchItems` from the rest
- User arrives at Photo Studio with all their photos pre-loaded and ready to process

**Fix in `OptimizeListing.tsx`**:
- When the "Enhance Photos" button navigates to Photo Studio, also pass `image_url` as a fallback URL param for immediate display while the DB fetch loads

**Result**: Click "Photo Studio" from any item -- photos are already loaded, ready to enhance.

---

### Sprint 2: Add Forward CTAs to Photo Studio

**Problem**: After processing photos, there's no next step.

**Fix in `Vintography.tsx`**:
- After a successful process (when `processedUrl` is set), show a "Next Steps" card below the download button:
  - If `itemId` exists and item has no optimisation: Show "Next: Optimise Your Listing" CTA linking to `/optimize?itemId=xxx`
  - If `itemId` exists and item IS optimised: Show "Your item is ready! View Vinted-Ready Pack" linking to `/items/xxx`
  - If standalone (no itemId): Show "Save & Optimise" that saves the processed photo to a new listing and navigates to optimise

**Result**: Every Photo Studio session ends with a clear forward path.

---

### Sprint 3: Build the Vinted-Ready Pack on ItemDetail

**Problem**: The "All Done" card is anticlimactic -- no actionable export.

**Fix in `ItemDetail.tsx`**:
- Replace the "All Done" card (lines 692-702) with a full "Vinted-Ready Pack" component
- When all 3 steps are complete (priced + optimised + photos), show:
  - Optimised title with copy button
  - Optimised description with copy button (first 3 lines visible, expandable)
  - Hashtags row with copy-all
  - Photo grid (max 4) with "Download All" button
  - Master "Copy Full Listing" button that copies title + description + hashtags
  - If item has a Vinted URL: "Open on Vinted" link for easy paste-in
- This is the payoff moment -- the reason users go through the entire workflow

**Result**: The four-pillar workflow culminates in a beautiful, actionable export pack.

---

### Sprint 4: Unify Navigation

**Problem**: Two competing bottom nav systems, AppShellV2 missing core tools.

**Fix**:
- Update `AppShellV2.tsx` `BOTTOM_TABS` to match `MobileBottomNav.tsx`: 5 tabs (Home, Items, Optimise, Photos, Settings)
- Remove the standalone `MobileBottomNav.tsx` component since AppShellV2 handles it
- Ensure all pages that use `PageShell` also get the correct bottom nav (PageShell uses AppShellV2)

**Result**: Consistent 5-tab mobile nav everywhere with one-tap access to all core tools.

---

### Sprint 5: Save-to-Inventory from Price Check creates a linked item

**Problem**: Dashboard price check "Save to Inventory" creates an orphan listing.

**Fix in `PriceCheck.tsx`**:
- When "Save to Inventory" is clicked, after inserting the listing:
  1. Get the new listing ID from the insert response
  2. Update the price_report with the new `listing_id`
  3. Navigate to `/items/[newId]` instead of just showing a toast
  4. The user lands on their new item's detail page with the price data already linked

**Result**: Every saved item from Price Check is immediately actionable with its price data attached.

---

### Sprint 6: "Pick from My Items" Quick Picker

**Problem**: Standalone Price Check and Optimise pages require manual entry.

**Fix**:
- Create a shared `ItemPickerDialog` component: a simple modal with a scrollable list of the user's recent items (image, title, brand, status)
- Add a small "or pick from your items" link below the URL input on both `PriceCheck.tsx` and `OptimizeListing.tsx`
- When an item is selected, auto-populate all fields (brand, category, condition, vintedUrl, itemId) and auto-focus the submit button
- On Optimise page, also load the item's photos

**Result**: Users with existing inventory can jump into any tool with one tap instead of re-entering data.

---

### Sprint 7: Optimise Page Auto-Start When Item Context Exists

**Problem**: When navigating from ItemDetail to Optimise with full item context (itemId, photos in DB), the user still sees an input form they need to submit.

**Fix in `OptimizeListing.tsx`**:
- When `itemId` is present AND the item has photos in the database, skip the input form entirely
- Show a brief "Ready to optimise" confirmation card with the item's photo, title, and brand
- Auto-trigger `handleOptimize()` after a 1-second delay (with a "Cancel" button)
- Or show a prominent single "Optimise Now" button instead of the full form

**Result**: Coming from ItemDetail, the optimisation starts immediately instead of showing a redundant form.

---

## Technical Details

### Files Modified Per Sprint

| Sprint | Files | Scope |
|--------|-------|-------|
| 1 | `Vintography.tsx`, `OptimizeListing.tsx` | Add DB fetch for item photos on mount |
| 2 | `Vintography.tsx` | Add Next Steps card after processing |
| 3 | `ItemDetail.tsx` | Replace "All Done" with Vinted-Ready Pack component |
| 4 | `AppShellV2.tsx`, possibly remove `MobileBottomNav.tsx` | Unify bottom nav |
| 5 | `PriceCheck.tsx` | Fix Save-to-Inventory flow with navigation |
| 6 | New `ItemPickerDialog.tsx`, `PriceCheck.tsx`, `OptimizeListing.tsx` | Add item picker |
| 7 | `OptimizeListing.tsx` | Auto-start when item context exists |

### No database changes needed
All fixes are frontend data-passing and UI flow improvements.

### Recommended implementation order
Sprints 1-3 first (fix the core broken chain), then Sprint 4 (nav), then Sprints 5-7 (polish).
