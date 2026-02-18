
# End-to-End Audit Results — Bugs Found & Fix Plan

## What Was Tested

Full live browser audit across desktop (1280px) and mobile (390px iPhone viewport):

- Listings page — clean, both items visible correctly
- Per Una Denim Shirt item detail — opens correctly, no Vinted-Ready Pack (correct, not optimised yet)
- Anne Klein dress item detail — Vinted-Ready Pack shows, but **2 bugs found**
- Trend Radar — desktop and mobile, both working. Filters, Hot Right Now strip, Category Heat Map all render correctly. "Balanced" now correctly uses `text-primary`
- Price Check — desktop, layout and "or pick from your items" link spacing correct

---

## Bugs Found

### Bug 1 — VintedReadyPack: Condition block shows generic note for most real items

**File:** `src/components/VintedReadyPack.tsx` lines 223–230

**Root cause:** The `conditionMap` keys are all snake_case (`very_good`, `new_with_tags`, etc.), but the database contains a mix of formats from different entry points:

From live DB query:
```
"Very Good"   ← title case (older items / Vinted import)
"Very good"   ← sentence case (older items)
"good"        ← lowercase (some older items)
"Good"        ← title case
"very_good"   ← snake_case (new wizard)
"new_with_tags" ← snake_case (new wizard)
```

The `conditionMap` lookup `conditionMap[item.condition]` fails for anything not snake_case, so it falls to the fallback `"Condition as described."` note, stripping all colour coding and descriptive context.

**Fix:** Add a normalisation step before the lookup — convert the condition string to lowercase with underscores replacing spaces:
```ts
const normKey = (item.condition || "")
  .toLowerCase()
  .replace(/\s+/g, "_");
const cond = conditionMap[normKey] || { fallback... };
```

This handles all variants in the DB: `"Very Good"` → `"very_good"`, `"Good"` → `"good"`, `"very good"` → `"very_good"`, etc.

---

### Bug 2 — VintedReadyPack: Condition block background renders as transparent

**File:** `src/components/VintedReadyPack.tsx` line 224–229

**Root cause:** The `bg` values use non-standard Tailwind opacity fractions:
```ts
bg: "bg-success/8"   // ← /8 is NOT in Tailwind's default opacity scale
bg: "bg-primary/8"   // ← same issue
bg: "bg-accent/8"    // ← same issue
bg: "bg-warning/8"   // ← same issue
```

Tailwind's default opacity scale includes: 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95. `/8` is not included, so in a project without JIT arbitrary-value mode enabled (or with PurgeCSS removing unrecognised classes), these render as transparent backgrounds. Looking at the screenshot — the condition block background appears white/borderless, confirming the background colour is not rendering.

**Fix:** Change all `/8` values to `/10` (the next standard step up, which is already used elsewhere in the app for the same decorative tint purpose):
```ts
bg: "bg-success/10"
bg: "bg-primary/10"
bg: "bg-accent/10"
bg: "bg-warning/10"
```

---

### Bug 3 — ItemDetail: Per Una shirt condition `"good"` stored in DB (from the import)

The Per Una shirt has `condition: "good"` (lowercase) in the database. This would also fail the `conditionMap` lookup. The fix in Bug 1 (normalisation) handles this automatically.

---

## What's Working Well (No Changes Needed)

- Trend Radar: Hot Right Now strip scrolls, filter chips wrap to two rows on mobile, "Balanced" uses `text-primary` (correct), Category Heat Map at bottom renders, "I have this" and "Optimise" CTAs navigate correctly
- Price Check: "or pick from your items" spacing correct with `pt-2`, no negative margins
- Navigation: Trends in sidebar + mobile bottom tabs, active state pill animation works
- Item Detail: Target price card correctly shows grey `—` when `recommended_price` is null (Anne Klein correctly shows `£20` in green)
- Mobile responsiveness: Single-column cards, bottom nav, trend filter rows all correct on 390px

---

## Files to Change

| File | Change |
|------|--------|
| `src/components/VintedReadyPack.tsx` | Bug 1: Add condition normalisation step before map lookup. Bug 2: Change all `bg-*/8` to `bg-*/10` |

Just one file, two targeted fixes.

---

## Technical Detail

**Normalisation fix (Bug 1):**
```ts
// Before the conditionMap lookup, normalise to snake_case
const normKey = (item.condition || "")
  .toLowerCase()
  .trim()
  .replace(/\s+/g, "_");

const cond = conditionMap[normKey] || {
  label: item.condition || "Unknown",
  note: "Condition as described.",
  color: "text-muted-foreground",
  badge: "bg-muted/40 border-border text-muted-foreground",
  bg: "bg-muted/20",
  border: "border-border",
};
```

**Background opacity fix (Bug 2):**
Replace all 4 `bg: "bg-*/8"` entries in the conditionMap with `bg: "bg-*/10"` — matching the opacity already used by `badge` values like `"bg-success/10"` in the same map.

---

## Scope

- 1 file modified (`src/components/VintedReadyPack.tsx`)
- No database changes
- No edge function changes
- Approximately 8 lines changed total
