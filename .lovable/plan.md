
# Enterprise End-to-End Audit — Issues and Fixes

## Critical Issues Found

### 1. "Photos" button navigates away from the item (THE BUG YOU REPORTED)
**File:** `src/pages/ItemDetail.tsx` (line 213-216, 261-263)

The header "Photos" button calls `handlePhotos()` which navigates to `/vintography?itemId=...` (the Photo Studio upload page). But the Item Detail page already has a **Photos tab** (line 327) with a fully functional `PhotosTab` component that shows the listing's actual uploaded photos with drag-and-drop reordering.

**Fix:** Change the header "Photos" button to switch to the Photos tab instead of navigating away. Only the "Photo Studio" button inside the Photos tab should navigate to Vintography.

---

### 2. "Enhance Photos" next action also navigates away
**File:** `src/pages/ItemDetail.tsx` (line 90, 311)

The workflow stepper's next action "Enhance Photos" (when `last_photo_edit_at` is null) triggers the same `handlePhotos()` — navigating to Vintography instead of switching to the Photos tab where users can upload and manage their listing photos.

**Fix:** Change the next action for "photos" to switch to the Photos tab.

---

### 3. Listing cards have dead expand/collapse code
**File:** `src/pages/Listings.tsx` (line 108, 260-262, 639-644, 722, 868-966)

There's an entire expanded detail panel (~100 lines of UI) with description, metadata grid, health score bar, and action buttons — but it can **never be seen**. The card's `onClick` handler (line 643) always navigates to `/items/${listing.id}`, so `toggleExpand` is never called. The ChevronDown icon (line 722) animates based on `isExpanded` but this state is always false.

**Fix:** Remove the dead expand/collapse code and the ChevronDown icon. The cards already navigate to the Item Detail page on click, which is the correct behaviour. The expand panel is redundant.

---

### 4. Next Actions Inbox: stale items all link to `/dead-stock` instead of the specific item
**File:** `src/components/NextActionsInbox.tsx` (line 75)

When a listing is stale (30+ days), clicking "Review" navigates to the generic Dead Stock page rather than the specific item's detail page. This breaks the item-centric model — the user expects to land on that specific item.

**Fix:** Change `actionPath` to `/items/${item.id}` so stale items link to their own detail page.

---

### 5. Listings page "Enhance Photos" dropdown doesn't link back to the listing
**File:** `src/pages/Listings.tsx` (line 737)

The dropdown menu item "Enhance Photos" navigates to `/vintography?image_url=...` — passing just the image URL but not the `itemId`. This means any photo edits in Vintography won't be linked back to the listing (the `updateLinkedItem` function in Vintography requires `itemId` to save results).

**Fix:** Change to `/vintography?itemId=${listing.id}&image_url=...` so edits are linked.

---

### 6. Workflow stepper "Photos" step only tracks Vintography edits, not direct uploads
**File:** `src/pages/ItemDetail.tsx` (line 447)

The "Photos" workflow step checks `last_photo_edit_at`, which only gets set when using Vintography. If a user uploads photos directly via the PhotosTab component, the step remains unchecked — making it look like photos haven't been added even though they have.

**Fix:** The PhotosTab upload handler should also set `last_photo_edit_at` (or check for the presence of any photos instead of relying solely on this timestamp).

---

### 7. Listings expanded panel has no "View Photos" quick action
**File:** `src/pages/Listings.tsx` (lines 951-963)

The expanded detail panel (if it were reachable — see issue 3) has "Price Check" and "Optimise" buttons but no way to view or manage photos for the listing.

**Note:** This becomes moot if we remove the dead expand code per issue 3, since the Item Detail page has the Photos tab.

---

## Summary of Fixes

| # | Issue | File | Severity | Fix |
|---|-------|------|----------|-----|
| 1 | Photos button navigates to Vintography instead of Photos tab | ItemDetail.tsx | CRITICAL | Switch to Photos tab on click |
| 2 | Next action "Enhance Photos" navigates away | ItemDetail.tsx | HIGH | Switch to Photos tab |
| 3 | Dead expand/collapse code on listing cards | Listings.tsx | MEDIUM | Remove ~100 lines of unreachable code |
| 4 | Stale items link to generic Dead Stock page | NextActionsInbox.tsx | MEDIUM | Link to `/items/${item.id}` |
| 5 | Vintography dropdown missing itemId | Listings.tsx | MEDIUM | Add `itemId` to navigation URL |
| 6 | Photo upload doesn't mark workflow step | ItemDetail.tsx / PhotosTab.tsx | MEDIUM | Set `last_photo_edit_at` on upload |
| 7 | No photo action in expanded panel | Listings.tsx | LOW | Moot if issue 3 is fixed |

## Technical Implementation

### ItemDetail.tsx
- Add tab state: `const [activeTab, setActiveTab] = useState("overview")`
- Make Tabs controlled: `<Tabs value={activeTab} onValueChange={setActiveTab}>`
- Change header Photos button to `onClick={() => setActiveTab("photos")}` instead of `handlePhotos()`
- Rename `handlePhotos` to `handlePhotoStudio` for clarity (only used by PhotosTab's "Photo Studio" button)
- Update next action photos handler to switch tab

### Listings.tsx
- Remove `expandedId`, `toggleExpand`, `isExpanded` state and the entire `AnimatePresence` expanded panel block (~100 lines)
- Remove the ChevronDown icon from listing cards
- Fix Vintography dropdown to include `itemId`

### NextActionsInbox.tsx
- Change stale item `actionPath` from `/dead-stock` to `/items/${item.id}`

### PhotosTab.tsx
- After successful photo upload, also update `last_photo_edit_at` on the listing (already updates `image_url` and `images`, just needs to add the timestamp)
