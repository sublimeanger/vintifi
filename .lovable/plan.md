
# Phase 3 — Sell Wizard Reorder: Add → Photos → Optimise → Price → Pack

This plan covers the wizard step reorder defined in Part 11, Phase 3 of the Vintifi Repositioning Brief v3.0. This is the riskiest change in the entire repositioning — it touches the core flow, all step-advance logic, session recovery, `stepStatus` tracking, and `canAdvance`. Every moving part is identified below.

---

## What is changing and why

The current step order is: **Add → Price → Optimise → Photos → Pack**

The new step order is: **Add → Photos → Optimise → Price → Pack**

The repositioning brief moves Photos to Step 2 because the platform's new identity is "photo studio first." The pitch is that users enhance their photos before the AI optimises the listing, so the AI can see the enhanced image when generating the description and health score. Price moves to Step 4 because it is a downstream action — set the price once you know what your listing looks like.

---

## Full Impact Mapping

### 1 — `STEPS` constant (line 60–66 in SellWizard.tsx)

Current:
```
{ id: 1, label: "Add Item",  shortLabel: "Add",      icon: Plus }
{ id: 2, label: "Price",     shortLabel: "Price",     icon: Search }
{ id: 3, label: "Optimise",  shortLabel: "Optimise",  icon: Sparkles }
{ id: 4, label: "Photos",    shortLabel: "Photos",    icon: Camera }
{ id: 5, label: "Pack ✓",    shortLabel: "Pack",      icon: Rocket }
```

New:
```
{ id: 1, label: "Add Item",  shortLabel: "Add",      icon: Plus }
{ id: 2, label: "Photos",    shortLabel: "Photos",    icon: Camera }
{ id: 3, label: "Optimise",  shortLabel: "Optimise",  icon: Sparkles }
{ id: 4, label: "Price",     shortLabel: "Price",     icon: Search }
{ id: 5, label: "Pack ✓",    shortLabel: "Pack",      icon: Rocket }
```

---

### 2 — `canAdvance()` (lines 315–322)

The `canAdvance` function references step IDs to know what "done" means for each step. All step-id conditions must be remapped:

Current logic:
- Step 2 → `priceAccepted`
- Step 3 → `optimiseSaved`
- Step 4 → `photoDone || stepStatus[4] === "skipped"`

New logic:
- Step 2 → `photoDone || stepStatus[2] === "skipped"`
- Step 3 → `optimiseSaved`
- Step 4 → `priceAccepted`

---

### 3 — `advanceBlockedReason()` (lines 324–330)

Same step-id remapping:

Current:
- Step 2 → "Accept a price to continue"
- Step 3 → "Save optimised listing to continue"
- Step 4 → "Enhance or skip photos"

New:
- Step 2 → "Enhance or skip photos"
- Step 3 → "Save optimised listing to continue"
- Step 4 → "Accept a price to continue"

---

### 4 — Auto-fire useEffects (lines 356–367)

Currently the wizard auto-fires price-check when entering step 2 and optimise when entering step 3. These must move:

Current:
- `currentStep === 2` → `runPriceCheck()`
- `currentStep === 3` → `runOptimise()`

New:
- `currentStep === 3` → `runOptimise()`  (optimise is now step 3, same)
- `currentStep === 4` → `runPriceCheck()` (price moves to step 4)
- Step 2 (Photos) has no auto-fire — user initiates by clicking "Open Photo Studio"

---

### 5 — Session restore on mount (lines 244–276)

The session restore on mount re-navigates back to step 4 when returning from Photo Studio. Since Photos moves to step 2, this must save and restore step 2 instead:

Line 268: `setStepStatus((s) => ({ ...s, 1: "done", 2: "done", 3: "done" }));`
This resets steps 1-3 as done. After reorder, when returning from Photo Studio (step 2), only step 1 should be marked done: `{ ...s, 1: "done" }`

Line 271: `setCurrentStep(parseInt(savedStep, 10) || 4);`
The fallback step is currently 4 (Photos). After reorder it becomes 2 (Photos): `|| 2`

The `sessionStorage.setItem("sell_wizard_step", "4")` in `renderStep4` (line 1409) must become `"2"`.

---

### 6 — Re-entry detection useEffect (lines 399–442)

This effect checks `if (currentStep !== 4 ...)`. After reorder it must check `currentStep !== 2`. The same effect also checks `hasNavigatedToPhotoStudioRef.current` — no change needed there.

---

### 7 — `startPhotoPolling()` callback (lines 718–736)

This polls `last_photo_edit_at` and calls `goNext()` when a photo edit is detected. After reorder this advances from step 2 to step 3 (Optimise). That is the correct behaviour — no logic change needed here, `goNext()` just works on whatever the current step is.

---

### 8 — `skipPhotos()` (lines 738–745)

Currently hardcodes `setCurrentStep(5)`. After reorder photos is step 2 and skipping should advance to step 3. Replace the hardcoded jump with `goNext()` or `setCurrentStep(3)`. Using `setCurrentStep(3)` is cleaner as it avoids the `canAdvance` check which requires `stepStatus[2] === "skipped"` to already be set.

The skip function already calls `setStepStatus((s) => ({ ...s, 4: "skipped" }))`. After reorder it must set step 2 as skipped: `{ ...s, 2: "skipped" }`.

---

### 9 — `createItem()` advance logic (lines 554–608)

After creating the item, currently advances to step 2 (Price). After reorder it should advance to step 2 (Photos — same step number, just different content). No change to the step number needed, but the toast message on line 597 should update: "Item created — let's enhance your photos!" instead of "let's set the price!".

The "Continue to Price" button text in `renderDetailsForm()` (line 1040) must also change to "Continue to Photos".

---

### 10 — `renderStep2`, `renderStep3`, `renderStep4` render functions

The render functions must be swapped:
- `renderStep2()` → becomes the current `renderStep4()` content (Photos)
- `renderStep3()` → stays the same (Optimise content, was step 3)
- `renderStep4()` → becomes the current `renderStep2()` content (Price)

The `renderStepContent()` switch block (lines 1650–1659) must update accordingly:
```
case 2: return renderStep2(); // Photos
case 3: return renderStep3(); // Optimise
case 4: return renderStep4(); // Price
```

The function names can stay as `renderStep2/3/4` since they map to step IDs — just swap the content inside them.

---

### 11 — `stepMeta` titles/subtitles (lines 1662–1670)

Current:
- Step 2: "Price it right"
- Step 3: "Optimise your listing"
- Step 4: "Enhance your photos"

New:
- Step 2: "Enhance your photos"
- Step 3: "Optimise your listing" (same)
- Step 4: "Price it right"

---

### 12 — `VintedReadyPack` back-links in Step 5 (lines 1520–1524)

Currently `onOptimise={() => setCurrentStep(3)}` and `onPhotoStudio={() => setCurrentStep(4)}`.

After reorder:
- `onOptimise={() => setCurrentStep(3)}` — same, still step 3
- `onPhotoStudio={() => setCurrentStep(2)}` — Photos is now step 2

---

### 13 — Inline Remove-Background in Step 2 (new feature)

The brief specifies that Step 2 (Photos) should contain a quick inline remove-background button — a "one-tap" entry point to Photo Studio's most-used operation, so users don't have to leave the wizard to try it.

Implementation:

The current Step 4 (Photos) shows a full-width portrait image preview and an "Open Photo Studio" button. After reorder, this becomes Step 2 and gains an additional "Quick Remove Background" button alongside the existing "Open Photo Studio" button.

The "Quick Remove Background" button will:
1. Call `supabase.functions.invoke("vintography", { body: { operation: "clean_bg", imageUrl: createdItem.image_url, itemId: createdItem.id } })` inline
2. Show a small inline processing state (spinner + "Removing background…" text)
3. On success, update `createdItem.image_url` locally and show a before/after inline comparison using a simplified two-image side-by-side layout (not the full `ComparisonView` component — just two `<img>` tags with "Before" / "After" badges, sized appropriately for the wizard column width)
4. Deduct 1 credit from `vintography_used` (this is handled server-side by the vintography edge function already)
5. Mark `photoDone = true` and `stepStatus[2] = "done"` automatically

The Quick Remove Background button is gated: only shows if `createdItem.image_url` exists (i.e., user uploaded a photo in Step 1). If no photo, only the "Open Photo Studio" button is shown (same as today).

A new state variable `quickBgResult` (string | null) holds the processed URL for the inline before/after. A new boolean `quickBgProcessing` tracks loading state.

---

### 14 — Before/After comparison in Step 5 (Pack) — new feature

The brief specifies adding a photo before/after comparison in the Pack step. This uses the existing `ComparisonView` component (already built in `src/components/vintography/ComparisonView.tsx`) in a simplified read-only mode.

The before/after is shown only when `createdItem.last_photo_edit_at` is set (i.e. the user actually enhanced a photo) AND `createdItem.image_url` is available.

We need to track the original (pre-enhancement) image URL. When Step 2 is first entered, we capture `originalImageUrl` as a new state variable, set from `createdItem.image_url` at that moment. After photo enhancement (photoDone = true), `createdItem.image_url` gets updated to the enhanced version. So Pack step can show `originalImageUrl` vs `createdItem.image_url`.

In `renderStep5()`, before the Profit Estimate card, add a before/after block:
```
{createdItem?.last_photo_edit_at && originalImageUrl && createdItem.image_url !== originalImageUrl && (
  <BeforeAfterPreview 
    beforeUrl={originalImageUrl} 
    afterUrl={createdItem.image_url} 
  />
)}
```

`BeforeAfterPreview` is a simple inline component (defined in the same file, not exported) that renders two `<img>` tags side-by-side in a Card with "Before" and "After" badges — keeps it lightweight for wizard context without pulling in the full `ComparisonView` with its zoom/pan/slider complexity.

---

### 15 — sessionStorage version flag

The brief specifies adding a wizard version flag to sessionStorage so analytics and debugging can identify which wizard version produced a session. Add this on mount:

```ts
sessionStorage.setItem("sell_wizard_version", "v3");
```

This is added in the `useEffect` that runs on mount (the session restore effect). If we're restoring an old session that has no version key, we write it there. For fresh sessions we write it in `createItem()` when the item is successfully created.

---

### 16 — Credit nudge banners — step reassignment

In Phase 2, credit nudge banners were added to `renderStep2` (Price) and `renderStep3` (Optimise). After the reorder:
- The Price nudge banner moves with the Price content into `renderStep4`
- The Optimise conversion banner stays in `renderStep3`
- Step 2 (Photos) does not consume optimisation credits — the `vintography` call consumes `vintography_used`, not `optimizations_used`, so no new nudge is needed here (the credit bar in Photo Studio handles that context)

---

## Files being changed

| File | Change |
|---|---|
| `src/pages/SellWizard.tsx` | Step reorder (13 targeted edits), inline remove-bg in Step 2, before/after in Step 5, version flag |

## Files NOT being changed in Phase 3

- No database migrations
- No edge function changes
- No navigation changes (Phase 4)
- No marketing pages (Phase 5)
- No changes to `ComparisonView`, `VintedReadyPack`, or `PhotosTab`
- No changes to `AppShellV2`, `translate-listing`, or credit logic

---

## Risk assessment

This is a high-complexity change confined to a single file. The risks and mitigations are:

**Risk: Session restore restores wrong step**
The session restore reads `sell_wizard_step` from sessionStorage. If a user navigated to Photo Studio before this deployment and returns after it, their saved step key is `"4"`. After reorder, step 4 is Price — not Photos. Mitigation: add a version check — if the stored step is `"4"` and the stored version is not `"v3"`, clear the session and start fresh.

**Risk: `canAdvance()` mismatch causes footer Continue to be permanently disabled**
The step-id to condition mapping is the most fragile part. Each of the 3 mutable conditions (`priceAccepted`, `optimiseSaved`, `photoDone`) must map to exactly one step ID. Verified mapping above is exhaustive.

**Risk: Quick Remove Background double-fires**
If user clicks "Quick Remove Background" and then navigates to Photo Studio and back, both paths could mark `photoDone = true`. Mitigation: the `hasNavigatedToPhotoStudioRef` already guards the polling path; the quick remove path sets `quickBgProcessing` which disables the button.

**Risk: `originalImageUrl` captured too early (before DB write)**
The original URL must be captured after `createdItem` is set (end of Step 1) but before any photo enhancement. Since Step 2 is now entered immediately after Step 1 completes, capturing on Step 2 entry is safe. A `useEffect` on `currentStep === 2` that sets `originalImageUrl` from `createdItem?.image_url` only if `originalImageUrl` is still null ensures it's captured once.

**Risk: `skipPhotos()` hardcoded step skip**
Currently skips to step 5 directly. After reorder, skip should go to step 3 (Optimise). The fix is straightforward: change `setCurrentStep(5)` to `setCurrentStep(3)` and update the `setStepStatus` key from 4 to 2.

All changes are contained within `SellWizard.tsx`. No database changes, no other files.
