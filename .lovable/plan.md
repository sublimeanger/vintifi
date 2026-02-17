
# Full System Audit: Cohesion Flaws, Bugs, and UX Issues

After a thorough code review of every page, component, and data flow, here is everything that needs fixing to make the core workflow bulletproof.

---

## Critical Cohesion Breaks

### 1. NewItemWizard doesn't accept user-uploaded images from chat
The user has provided 3 photos of a Nike crewneck. There's no way to directly use these uploaded images in the wizard -- the wizard only supports file uploads via browser or Vinted URL scraping. The photos need to be copied into the project and then uploaded through the app.

### 2. `window.location.reload()` on Item Picker selection (2 locations)
Both `PriceCheck.tsx` line 330 and `OptimizeListing.tsx` line 598 call `window.location.reload()` after selecting an item from the picker. This is a jarring full-page reload that destroys React state, shows a flash of white, and feels extremely broken. Should be replaced with proper React state updates.

### 3. VintedReadyPack shows even without photos
`ItemDetail.tsx` line 284 shows the pack whenever `last_optimised_at` is set, regardless of whether photos exist. An optimised listing with zero photos shows the pack with an empty photos section -- confusing because users expect the "Ready to Post" celebration to mean everything is complete.

### 4. Bottom nav missing Price Check
`BOTTOM_TABS` in `AppShellV2.tsx` has 5 tabs: Home, Items, Optimise, Photos, Settings. Price Check is only in the sidebar (`NAV_ITEMS`) and the hamburger menu. On mobile, there's no quick access to Price Check from the bottom nav -- the second most important feature is hidden.

### 5. Photo Studio `originalUrl` guard prevents item photo load
In `Vintography.tsx` line 115: `if (!itemId || !user || originalUrl) return;` -- the `originalUrl` check means if you navigate to Photo Studio, then go back, then return with an itemId, the photos won't reload because `originalUrl` was already set from the previous session. The guard is too aggressive.

### 6. Batch items created from DB photos have `file: null as any`
`Vintography.tsx` line 144: `file: null as any` -- this violates the `BatchItem` type which expects `file: File`. If any downstream code tries to read `.file.name` or `.file.size`, it will crash. The type needs a nullable file field.

### 7. No "Add Item" button on Dashboard
The Dashboard has Quick Price Check and Recent Items, but no prominent "Add Item" CTA. New users with zero items have to find the Items page first, then find the Add button. The most common starting action should be front and centre.

### 8. Optimise page `handleSaveAsListing` navigates to `/listings` not `/items/:id`
`OptimizeListing.tsx` line 280: `navigate("/listings")` -- after saving a standalone optimisation as a new listing, the user is dumped on the full listings page. It should navigate to the newly created item detail page (like Price Check does).

### 9. Photos tab "Photo Studio" button doesn't pass images
`PhotosTab.tsx` line 281: `onEditPhotos` just calls `handlePhotoStudio()` which navigates to `/vintography?itemId=${item.id}`. The Photo Studio then fetches photos from DB. But if the user just uploaded new photos via the PhotosTab upload button and hasn't saved yet, those new photos won't appear in Photo Studio because they're already saved to DB immediately. This is actually fine -- just worth noting.

### 10. No loading state for VintedReadyPack image downloads
`VintedReadyPack.tsx` line 109-120: The download loop silently catches errors with empty catch blocks. If a photo URL is expired or CORS-blocked, the user gets no feedback.

---

## UX/UI Issues

### 11. Dashboard "Needs Attention" card navigates to `/listings` without a filter
Line 111: `onClick={() => navigate("/listings")}` -- should navigate with `?filter=needs_optimising` to show only items needing work.

### 12. Item Picker Dialog missing from standalone Photo Studio
Price Check and Optimise both have "or pick from your items" links, but the Photo Studio upload zone does not. Users arriving at Photo Studio from the nav with no item context can't easily select an existing item.

### 13. Duplicate "Next: Optimise Listing" CTAs on PriceCheck results
After a price report, there are TWO identical CTAs: the primary "Next: Optimise Listing" button in the actions bar (line 648-664) AND a separate "Ready to list?" card at the bottom (line 676-697). Redundant and confusing.

### 14. Auto-start on Optimise page doesn't trigger
`OptimizeListing.tsx` lines 89-95: The auto-start `useEffect` sets `autoStartReady = true` when `remotePhotoUrls.length > 0`, but it never actually auto-triggers `handleOptimize()`. It just shows a card with a manual "Optimise Now" button. This is arguably fine (avoids accidental credit spend) but the plan said "auto-trigger after 1-second delay."

### 15. Listings page card click area inconsistency
On the Listings page, clicking the listing card background navigates to item detail, but there are inline edit interactions (price, status) that intercept clicks. The tap targets are confusing on mobile.

---

## Sprint Breakdown

### Sprint A: Fix Critical Cohesion (highest priority)

**Files:** `AppShellV2.tsx`, `PriceCheck.tsx`, `OptimizeListing.tsx`, `ItemDetail.tsx`, `Vintography.tsx`, `Dashboard.tsx`

1. **Fix `window.location.reload()`** in PriceCheck and OptimizeListing item pickers -- replace with state-driven navigation using `useNavigate` and resetting component state
2. **Fix VintedReadyPack visibility** -- only show when `last_optimised_at` is set AND at least one image exists (`image_url || images.length > 0`)
3. **Fix Photo Studio photo load guard** -- remove the `originalUrl` check so DB photos reload when itemId changes
4. **Fix batch item type** -- make `file` optional/nullable in `BatchItem` type
5. **Fix Dashboard "Needs Attention"** -- add `?filter=needs_optimising` to the navigation
6. **Fix Optimise save flow** -- navigate to `/items/:id` instead of `/listings` after standalone save
7. **Add "Add Item" CTA to Dashboard** -- prominent button in the empty state AND a quick action when items exist

### Sprint B: Remove Redundancy and Polish Navigation

**Files:** `AppShellV2.tsx`, `PriceCheck.tsx`, `Vintography.tsx`

1. **Add Price Check to bottom nav** -- Replace Settings with Price Check in bottom tabs (Settings stays in hamburger and sidebar). New tabs: Home, Items, Price, Optimise, Photos
2. **Remove duplicate CTA** on PriceCheck results -- keep only the prominent "Next: Optimise Listing" button, remove the redundant bottom card
3. **Add Item Picker to Photo Studio** -- add "or pick from your items" link in the upload zone

### Sprint C: User's Nike Test Item

**Files:** Multiple (project assets + NewItemWizard flow)

1. Copy the 3 Nike crewneck photos into the project's storage
2. Create a test listing via the New Item Wizard with: Title "Nike Crewneck Sweatshirt", Brand "Nike", Size "M", Category "Jumpers", Condition "Very Good", Colour "Black", Material "80% Cotton, 20% Polyester"
3. Run the complete flow: Price Check > Optimise > Photo Studio > verify Vinted-Ready Pack
4. Document any additional issues found during the live test

---

## Technical Notes

- No database schema changes required
- No edge function changes required
- All fixes are frontend state management and navigation
- The `window.location.reload()` fix is the single most impactful change -- it breaks the SPA feel completely
- The bottom nav change (adding Price Check) requires removing one tab since 6 tabs is too many on mobile. Settings is the least-used action and belongs in the hamburger menu
