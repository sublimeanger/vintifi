
# Plan: Photo Count Badge on Tab + Explicit "Save to Item" CTA in Photo Studio

## Change 1 — Photos tab count badge (`src/pages/ItemDetail.tsx`)

**Where:** Line 367 — the Photos `TabsTrigger`

**What:** Compute `photoCount` from the already-loaded `item` state (same logic as PhotosTab: `image_url` as first + `images` array deduplicated). Render it as a small pill badge inline in the tab label, only when count > 0.

**Computed value:**
```ts
const rawImages = Array.isArray(item.images) ? (item.images as string[]) : [];
const photoCount = [
  ...(item.image_url ? [item.image_url] : []),
  ...rawImages.filter(u => u && u !== item.image_url)
].length;
```

This value is derived from data already in state — no extra network call needed.

**Rendered tab:**
```tsx
<TabsTrigger value="photos" className="min-w-fit text-xs h-9 sm:h-8">
  Photos
  {photoCount > 0 && (
    <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary/15 text-primary text-[9px] font-bold w-4 h-4 leading-none">
      {photoCount}
    </span>
  )}
</TabsTrigger>
```

The badge uses `bg-primary/15 text-primary` — matches the app's colour language (same as the Trending chip uses primary), is visually distinct but not intrusive, and disappears cleanly when there are zero photos.

---

## Change 2 — Explicit "Save to [item name]" CTA button in Photo Studio (`src/pages/Vintography.tsx`)

**Where:** Lines 599–627 — the "Action Buttons" block after the comparison view

**Current state:**
- `updateLinkedItem(result)` is called automatically inside `handleProcess` at line 306 (silently saves photo and shows a toast)
- The buttons shown after `processedUrl` is set are: "Try Again", "Download", and "New Photo"
- The issue: users don't have a clear, deliberate "save this to my item" button — it happens silently/automatically, and there's no persistent UI confirmation

**Fix: Add a visible "Save to [item name]" button, and change the auto-save behaviour**

Two-part approach:
1. **Track whether the photo has already been saved** to the linked item for the current `processedUrl` using a `savedToItem` boolean state that resets on new processing.
2. **Remove the auto-save from `handleProcess`** — instead, the save only happens when the user explicitly clicks the green "Save to [item name]" button. This gives clear user intent.
3. **Show the button** prominently in the action row when `processedUrl && itemId`:

```tsx
{processedUrl && itemId && (
  <Button
    onClick={handleSaveToItem}
    disabled={savedToItem || saving}
    className={`flex-1 sm:flex-none h-12 sm:h-11 font-semibold active:scale-95 transition-transform ${
      savedToItem
        ? "bg-success text-success-foreground hover:bg-success/90"
        : "bg-success text-success-foreground hover:bg-success/90"
    }`}
  >
    {saving ? (
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
    ) : savedToItem ? (
      <Check className="w-4 h-4 mr-2" />
    ) : (
      <ImageIcon className="w-4 h-4 mr-2" />
    )}
    {savedToItem ? "Saved to item ✓" : `Save to ${linkedItemTitle || "item"}`}
  </Button>
)}
```

**State additions:**
```ts
const [savedToItem, setSavedToItem] = useState(false);
const [savingToItem, setSavingToItem] = useState(false);
```

Reset `savedToItem = false` whenever `processedUrl` changes (new result = needs saving again).

**`handleSaveToItem` function:**
```ts
const handleSaveToItem = async () => {
  if (!processedUrl || !itemId) return;
  setSavingToItem(true);
  await updateLinkedItem(processedUrl);
  setSavedToItem(true);
  setSavingToItem(false);
};
```

**`handleProcess` change:** Remove the `await updateLinkedItem(result)` call at line 306 so auto-save no longer happens silently. The toast that said "Photo saved to item" that was shown inside `updateLinkedItem` now only fires on explicit button press.

**Button placement in the action row:**
```
[ Apply Clean Background ] (primary, full-width in single mode)
[ Save to Anne Klein ✓ ] (green, shows only when processedUrl + itemId)
[ Try Again ]  [ Download ]
[ New Photo ]
```

On mobile this stacks vertically — the green Save button is visually prominent and immediately below the result.

---

## Files Changed

| File | Lines | Change |
|------|-------|--------|
| `src/pages/ItemDetail.tsx` | ~367 | Compute `photoCount`, add count pill badge to Photos `TabsTrigger` |
| `src/pages/Vintography.tsx` | ~80–90 (state), ~304–312 (handleProcess), ~599–627 (action buttons) | Add `savedToItem` + `savingToItem` state; remove auto-save from `handleProcess`; add explicit green "Save to [item name]" button in action row |

## Scope
- 2 files modified
- No database changes
- No edge function changes
- No new dependencies
