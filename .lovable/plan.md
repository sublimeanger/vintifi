
# Fix: Step 6 Pack Renders Correctly + "View Item" Toast

## Root Causes Found

### Issue 1 — VintedReadyPack silently returns null in the wizard

`VintedReadyPack` has a hard gate at lines 101–106:
```ts
const isReady = !!item.last_optimised_at;
if (!isReady) return null;
if (score != null && score < 60) return null;
```

In `SellWizard`, the `saveOptimised()` function (line 445–462) updates the DB with `last_optimised_at: now` correctly, but the local state merge only copies back `optimised_title`, `optimised_description`, and `health_score` — it **never sets `last_optimised_at`** on `createdItem`. So when step 6 renders `<VintedReadyPack item={createdItem} />`, `createdItem.last_optimised_at` is still `null`, the gate fires, and the entire component invisibly returns `null`.

### Issue 2 — "View Item" navigates but shows no success feedback

The "View Item" button (line 994–998):
```tsx
onClick={() => createdItem && navigate(`/items/${createdItem.id}`)}
```
…just navigates silently. No toast, no confirmation.

---

## Fixes

### Fix 1 — Add `last_optimised_at` to the local state merge in `saveOptimised()`

In `src/pages/SellWizard.tsx`, inside `saveOptimised()`, the `setCreatedItem` call needs to include `last_optimised_at: now`:

**Current (line 454–459):**
```ts
setCreatedItem((prev) => prev ? {
  ...prev,
  optimised_title: optimiseResult.optimised_title,
  optimised_description: optimiseResult.optimised_description,
  health_score: optimiseResult.health_score,
} : prev);
```

**Fixed:**
```ts
setCreatedItem((prev) => prev ? {
  ...prev,
  optimised_title: optimiseResult.optimised_title,
  optimised_description: optimiseResult.optimised_description,
  health_score: optimiseResult.health_score,
  last_optimised_at: now,   // ← this was missing
} : prev);
```

This one-line addition means when step 6 renders, `createdItem.last_optimised_at` is truthy, the gate passes, and `VintedReadyPack` renders in full with its title, condition block, description, hashtags, photos, and copy/download buttons.

### Fix 2 — Add success toast to "View Item" button

In `src/pages/SellWizard.tsx`, update the "View Item" button's `onClick` to fire a toast before navigating:

**Current (line 994–998):**
```tsx
<Button
  variant="outline"
  className="flex-1 h-11 font-semibold"
  onClick={() => createdItem && navigate(`/items/${createdItem.id}`)}
>
  View Item
</Button>
```

**Fixed:**
```tsx
<Button
  variant="outline"
  className="flex-1 h-11 font-semibold"
  onClick={() => {
    if (!createdItem) return;
    toast.success("🎉 Listing complete — here's your item!");
    navigate(`/items/${createdItem.id}`);
  }}
>
  View Item
</Button>
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/SellWizard.tsx` | Two edits: add `last_optimised_at: now` to `setCreatedItem` in `saveOptimised()` + add toast to "View Item" button |

No other files need changing. `VintedReadyPack.tsx` is correct as-is — the gate logic is intentional and correct for the Item Detail page. The fix is entirely in how `SellWizard` maintains its local state copy.

## Result

After these two fixes:
- Completing step 4 (Optimise) and clicking "Save optimised listing" will correctly propagate `last_optimised_at` into `createdItem` local state
- Step 6 will render the full `VintedReadyPack` with: celebration header, optimised title with copy button, condition block, description with copy button, hashtags, photo thumbnails with download, and the master "Copy Full Listing" CTA
- Clicking "View Item" fires a green success toast then navigates to `/items/:id`
