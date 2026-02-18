
# End-to-End Audit & Fix Plan

## What Was Tested

Full browser walkthrough performed:
- Listings page loads clean
- New Item Wizard: all 3 methods visible, manual entry form fills correctly, Photo Nudge dialog triggers correctly, item saves and redirects to Item Detail
- Item Detail: all 4 tabs render, badge row, workflow progress, quick action CTAs all correct
- Trend Radar: loads with real data, Hot Right Now strip scrolling, category/direction filters, "I have this" and "Optimise" CTAs, Category Heat Map at the bottom — all working
- Price Check: input modes, "pick from your items" link, page structure all correct
- Navigation: Trends correctly in both desktop sidebar and mobile bottom nav

## Bugs Found

### Bug 1 — VintedReadyPack: Broken Tailwind condition badge class
**File:** `src/components/VintedReadyPack.tsx` line 232

The condition block generates a background class like this:
```
${cond.badge.split(" ").slice(0, 1).join(" ")}/20
```
`cond.badge` = `"bg-success/10 border-success/30 text-success"` so `.split(" ").slice(0, 1)` = `["bg-success/10"]`, then appending `/20` produces `bg-success/10/20` — a completely invalid Tailwind class. The condition block background renders as transparent/broken on every item.

**Fix:** Replace the broken inline style + classname combo with a clean, direct approach using a `conditionBg` key in each `conditionMap` entry.

### Bug 2 — ItemDetail: Target price card shows green dash when null
**File:** `src/pages/ItemDetail.tsx` around line 339

The Target card always applies `text-success` styling even when `recommended_price` is null, making the `—` dash render green — implying positive data when there is none.

**Fix:** Only apply `text-success` when the value is not null.

### Bug 3 — TrendRadar: "Balanced" saturation uses `text-accent` 
**File:** `src/pages/TrendRadar.tsx` line 44

`text-accent` renders as a muted teal that has poor contrast on white card backgrounds in the current design system. "Balanced" should use `text-primary` to stay consistent with the colour system.

### Bug 4 — PriceCheck: "or pick from your items" spacing
**File:** `src/pages/PriceCheck.tsx` around line 370

The `mt-1 sm:-mt-1 mb-1` negative margin on the "or pick from your items" container creates an awkward floating gap between the input and the link on mobile. Should be a simple `text-center pt-1` without negative margins.

### Bug 5 — TrendRadar: Filter chips overflow on mobile
The direction filter row (`DIRECTIONS`) and category filter row sit in a `flex flex-wrap` container but aren't separated visually — on small screens they all run together. Should be separated with a divider line or rendered in a `space-y-2` stack.

## Files to Change

| File | Changes |
|------|---------|
| `src/components/VintedReadyPack.tsx` | Fix condition badge classname generation (add explicit `conditionBg` field to conditionMap) |
| `src/pages/ItemDetail.tsx` | Fix Target card colour when null |
| `src/pages/TrendRadar.tsx` | Fix "Balanced" colour; separate category/direction filter rows with spacing |
| `src/pages/PriceCheck.tsx` | Fix "or pick from your items" spacing |

## Technical Detail

**VintedReadyPack fix** — Replace dynamic classname slicing with an explicit `bg` key:
```ts
const conditionMap = {
  new_with_tags: { ..., bg: "bg-success/8" },
  very_good:     { ..., bg: "bg-primary/8" },
  good:          { ..., bg: "bg-accent/8"  },
  satisfactory:  { ..., bg: "bg-warning/8" },
}
// Then use: className={`rounded-lg border p-3.5 ${cond.bg} ${cond.border}`}
```

**ItemDetail fix:**
```tsx
<p className={`text-sm sm:text-xl font-display font-bold text-success truncate`}>
  {item.recommended_price != null ? `£${item.recommended_price.toFixed(0)}` : "—"}
</p>
```
Change to apply `text-success` only when not null:
```tsx
<p className={`text-sm sm:text-xl font-display font-bold truncate ${item.recommended_price != null ? "text-success" : "text-muted-foreground"}`}>
```

**TrendRadar filter layout fix** — Wrap category and direction filters in a `space-y-2` container instead of a single `flex flex-wrap gap-2`:
```tsx
<div className="space-y-2 mb-4">
  <div className="flex gap-1 flex-wrap">{CATEGORIES filters}</div>
  <div className="flex gap-1 flex-wrap">{DIRECTIONS filters}</div>
</div>
```

**PriceCheck spacing fix** — Remove the negative margin:
```tsx
<div className="text-center pt-1">
  <ItemPickerDialog ...>
    <button className="text-xs text-primary hover:underline font-medium">
      or pick from your items
    </button>
  </ItemPickerDialog>
</div>
```

## Scope

- 4 files modified
- No database changes
- No edge function changes
- Pure frontend bug fixes — all visual/UX
