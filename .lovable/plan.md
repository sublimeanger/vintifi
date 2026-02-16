

# Enterprise Audit — Remaining Issues and Cohesion Fixes

## Issues Found

### 1. CRITICAL: Listings page Price Check and Optimise don't pass `itemId`
**Files:** `src/pages/Listings.tsx` (lines 202-211, 214-222)

When clicking "Run Price Check" or "Optimise Listing" from the Listings page dropdown menu, neither `handlePriceCheck` nor `handleOptimiseListing` includes `itemId` in the URL params. This means:
- Price check results won't update `recommended_price` or `last_price_check_at` on the listing
- Optimisation results won't update `health_score`, `last_optimised_at`, `title`, or `description` on the listing
- No `item_activity` record gets created
- The workflow stepper on ItemDetail stays stale

This is a major data-linking gap. Every action taken from the Listings page is "orphaned" — it runs but the results are never saved back to the item.

**Fix:** Add `itemId` to both handlers:
```
// handlePriceCheck: add params.set("itemId", listing.id)
// handleOptimiseListing: add params.set("itemId", listing.id)
```

---

### 2. MEDIUM: Pipeline Snapshot "Stale" links to `/listings` with no filter
**File:** `src/components/PipelineSnapshot.tsx` (line 49)

The "Stale" pipeline stage has `filter: ""`, so clicking it navigates to `/listings` with no filter — showing all listings. The user expects to see only stale items.

The Listings page filter system uses `statusFilter` which reads from the URL `?filter=` param, but "stale" isn't a recognized filter value (the page only checks for status values like "active", "sold", "needs_optimising").

**Fix:** Either:
- A) Add a `?filter=stale` URL param and handle it in Listings (filter by `status === "active"` AND `getDaysListed >= 30`)
- B) Navigate to `/dead-stock` which is specifically designed for stale inventory analysis

Option B is simpler and more cohesive with the workspace architecture — Dead Stock/Inventory Health is the correct destination for stale items.

Change line 49: `filter: ""` to `filter: "/dead-stock"` and update the navigate call to use `navigate(s.filter || "/listings")` pattern, OR just hardcode the stale path.

---

### 3. MEDIUM: Dead code — `expandedId` and `toggleExpand` still declared in Listings.tsx
**File:** `src/pages/Listings.tsx` (lines 108, 260-262)

The expanded panel UI was removed in the last fix, but the state variable `expandedId` (line 108) and the `toggleExpand` function (lines 260-262) are still declared and never used. This is dead code that should be cleaned up.

**Fix:** Remove lines 108, 260-262.

---

### 4. LOW: Duplicate `MobileBottomNav` import in multiple pages
**Files:** `src/pages/TrendRadar.tsx` (line 16), `src/pages/Analytics.tsx` (line 3), `src/pages/SettingsPage.tsx` (line 16), `src/pages/ArbitrageScanner.tsx` (line 25)

These pages import `MobileBottomNav` but never use it — all pages go through `PageShell` which wraps `AppShellV2`, which already renders its own bottom navigation. These are unused imports.

**Fix:** Remove the unused `MobileBottomNav` imports from these files.

---

### 5. MEDIUM: Activity timeline event types don't match logged types
**File:** `src/pages/ItemDetail.tsx` (lines 619-627)

The activity timeline UI checks for event types `"price_check"`, `"optimise"`, `"photo_edit"`, `"status_change"`. But the actual events logged in `item_activity` use different type strings: `"price_checked"`, `"optimised"`, `"photo_edited"`. The suffix `_ed` vs no suffix means the colour-coded icons never match — all events fall through to the default grey `Clock` icon.

**Fix:** Update the activity timeline to check for the correct type strings: `"price_checked"`, `"optimised"`, `"photo_edited"`.

---

### 6. LOW: Dashboard "New Item" CTA label says "Analyse" but actually navigates to Price Check
**File:** `src/pages/Dashboard.tsx` (lines 107-123)

The card is titled "New Item" but the input + button only navigates to `/price-check`. There's no way to actually create a new item from this card. The label is misleading — users expect to add a new listing here but instead get redirected to price check.

The heading says "New Item" but the functionality is purely "Price Check". This is confusing.

**Fix:** Either rename the card to "Quick Price Check" for clarity, or add a secondary "Add New Listing" button that opens the NewItemWizard alongside the price check input.

---

### 7. MEDIUM: Listings page "Add & Enhance Photo" (no image) navigates to Vintography without `itemId`
**File:** `src/pages/Listings.tsx` (line 738)

When a listing has no `image_url`, the dropdown shows "Add & Enhance Photo" which navigates to `/vintography` with no params at all. Even the `itemId` is missing, so any photo work done won't link back.

**Fix:** Change to `navigate(\`/vintography?itemId=\${listing.id}\`)`.

---

## Summary Table

| # | Issue | File | Severity | Type |
|---|-------|------|----------|------|
| 1 | Price Check / Optimise from Listings don't pass `itemId` | Listings.tsx | CRITICAL | Data linking |
| 2 | Pipeline "Stale" links to unfiltered Listings | PipelineSnapshot.tsx | MEDIUM | Navigation |
| 3 | Dead `expandedId` / `toggleExpand` code | Listings.tsx | LOW | Cleanup |
| 4 | Unused `MobileBottomNav` imports | 4 files | LOW | Cleanup |
| 5 | Activity timeline event type mismatch | ItemDetail.tsx | MEDIUM | Display bug |
| 6 | Dashboard "New Item" card is misleading | Dashboard.tsx | LOW | UX clarity |
| 7 | "Add & Enhance Photo" missing `itemId` | Listings.tsx | MEDIUM | Data linking |

## Technical Implementation

### Listings.tsx
- `handlePriceCheck` (line 202): Add `params.set("itemId", listing.id)` before the navigate
- `handleOptimiseListing` (line 214): Add `params.set("itemId", listing.id)` before the navigate
- Line 108: Remove `const [expandedId, setExpandedId] = useState<string | null>(null);`
- Lines 260-262: Remove `const toggleExpand = ...`
- Line 738: Change `/vintography` to `/vintography?itemId=${listing.id}`

### PipelineSnapshot.tsx
- Line 49: Change `filter: ""` to something like `path: "/dead-stock"` and update the click handler for the "Stale" stage to navigate to `/dead-stock` instead of `/listings`

### ItemDetail.tsx (Activity Timeline)
- Line 619: Change `"price_check"` to `"price_checked"`
- Line 622: Change `"optimise"` to `"optimised"`
- Line 623: Change `"photo_edit"` to `"photo_edited"`

### Dashboard.tsx
- Line 107: Rename heading from "New Item" to "Quick Price Check"
- Update helper text to match

### Unused imports cleanup
- Remove `MobileBottomNav` import from TrendRadar.tsx, Analytics.tsx, SettingsPage.tsx, ArbitrageScanner.tsx

