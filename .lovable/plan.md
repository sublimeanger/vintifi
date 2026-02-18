
# Desktop Polish: Sell Wizard Responsive Upgrade

## Root Cause

The entire Sell Wizard is locked inside `max-w-lg mx-auto` (512px max-width) with typography written exclusively for mobile — `text-[10px]`, `text-xs`, `text-[9px]`, `text-[8px]` everywhere — and zero `lg:` responsive variants. On a 1440px desktop screen, this creates a tiny narrow column with barely readable text surrounded by dead whitespace.

The wizard was built mobile-first but never graduated to responsive — it needs desktop breakpoint scaling across:
1. Container width
2. Typography (headings, labels, body text)
3. Spacing and padding
4. Step progress bar
5. Entry method cards
6. Form fields and grid layout
7. Step-specific content (price hero, health score card, photo preview)
8. Header bar
9. Footer navigation bar
10. CTA buttons

---

## Layout Strategy: Centred Wide Column (Not 2-Column Split)

The wizard is a linear flow — a 2-column split would add complexity and risk breaking step logic. Instead, the fix is:

- Widen the content column from `max-w-lg` (512px) to `max-w-lg lg:max-w-2xl` (672px desktop)
- Scale all typography with `lg:` variants
- Increase spacing and padding at `lg:` breakpoint
- Make the progress bar, cards, and form fields feel "web-scale"

This preserves all existing logic while delivering a dramatically improved desktop experience.

---

## Specific Changes by Section

### 1. Content Container (Line 1522)
```
Before: max-w-lg mx-auto px-4 py-6 pb-32
After:  max-w-lg lg:max-w-2xl mx-auto px-4 lg:px-8 py-6 lg:py-10 pb-32 lg:pb-36
```

### 2. Header Bar (Line 1495)
```
Before: px-4 h-14
After:  px-4 lg:px-8 h-14 lg:h-16
```
Header title text:
```
Before: font-bold text-sm
After:  font-bold text-sm lg:text-base
```

### 3. Progress Bar (ProgressBar component, lines 107–147)
- Step circle: `w-7 h-7` → `w-7 h-7 lg:w-10 lg:h-10`
- Step number font: `text-[10px]` → `text-[10px] lg:text-sm`
- Step label: `text-[8px] sm:text-[9px]` → `text-[8px] sm:text-[9px] lg:text-xs`
- Check icon: `w-3.5 h-3.5` → `w-3.5 h-3.5 lg:w-4 lg:h-4`
- Overall padding: `px-3 pt-2.5 pb-1` → `px-3 lg:px-8 pt-2.5 lg:pt-3 pb-1 lg:pb-2`

### 4. Step Header (Lines 1534–1540)
- Title: `text-xl` → `text-xl lg:text-3xl`
- Subtitle: `text-xs` → `text-xs lg:text-sm`
- Bottom margin: `mb-5` → `mb-5 lg:mb-8`

### 5. Step 1 — Entry Method Cards (Lines 761–778)
- Card padding: `p-4` → `p-4 lg:p-6`
- Icon container: `w-10 h-10` → `w-10 h-10 lg:w-14 lg:h-14`
- Icon size: `w-5 h-5` → `w-5 h-5 lg:w-6 lg:h-6`
- Title: `text-sm` → `text-sm lg:text-base`
- Subtitle: `text-[11px]` → `text-[11px] lg:text-sm`
- Arrow icon: `w-4 h-4` → `w-4 h-4 lg:w-5 lg:h-5`
- Container gap: `space-y-3` → `space-y-3 lg:space-y-4`

### 6. Details Form (renderDetailsForm, lines 871–999)

**Labels:**
- `text-xs font-semibold uppercase tracking-wider` → `text-xs lg:text-[11px] font-semibold uppercase tracking-wider` (uppercase labels are intentionally small, but can gain a touch on desktop)

**Inputs:**
- Height: `h-10` → `h-10 lg:h-12`
- The title input already has `text-base` (good)

**Grid layout for fields:**
- Current `grid-cols-2` pairs (Condition/Category, Brand/Size) → on desktop, keep 2-col but give more vertical space

**Colour chip row:**
- Chip text: `text-[11px]` → `text-[11px] lg:text-xs`
- Chip padding: `px-2.5 py-1` → `px-2.5 py-1 lg:px-3 lg:py-1.5`

**CTA button:**
- `h-11` → `h-11 lg:h-12`
- `text` at default → add `lg:text-base`

### 7. Step 2 — Price Check

**Loading spinner area:**
- `py-12` → `py-12 lg:py-20`
- `w-8 h-8` → `w-8 h-8 lg:w-12 lg:h-12`
- `text-xs` → `text-xs lg:text-sm`

**Recommended price hero:**
- `p-4` → `p-4 lg:p-8`
- `text-[10px] uppercase` label → `text-[10px] lg:text-xs uppercase`
- Price: `text-4xl` → `text-4xl lg:text-6xl`
- Confidence: `text-xs` → `text-xs lg:text-sm`

**Market range bar:**
- `p-3` → `p-3 lg:p-5`
- Range numbers: `text-xs font-bold` → `text-xs lg:text-sm font-bold`
- Range bar height: `h-2` → `h-2 lg:h-3`
- The dot marker: `w-3.5 h-3.5` → `w-3.5 h-3.5 lg:w-5 lg:h-5`

**AI insights:**
- `text-xs` → `text-xs lg:text-sm`
- Container: `p-3` → `p-3 lg:p-5`

**Accept price button:**
- `h-11` → `h-11 lg:h-13`

### 8. Step 3 — Optimise

**Loading:**
- `py-12` → `py-12 lg:py-20`

**Health score card:**
- `p-3` → `p-3 lg:p-5`
- Health score text: `text-xs font-semibold` → `text-xs lg:text-sm font-semibold`
- Score sub: `text-[10px]` → `text-[10px] lg:text-xs`
- Breakdown grid: `grid-cols-4` stays, but `text-[9px]` → `text-[9px] lg:text-xs`

**Optimised Title:**
- `p-3` → `p-3 lg:p-5`
- Title text: `text-sm font-semibold` → `text-sm lg:text-base font-semibold`
- Label: `text-[10px]` → `text-[10px] lg:text-xs`

**Optimised Description:**
- `p-3` → `p-3 lg:p-5`
- Body: `text-xs` → `text-xs lg:text-sm`
- Read more button: `text-[10px]` → `text-[10px] lg:text-xs`

### 9. Step 4 — Photos

**Photo preview:**
- `max-w-[220px]` → `max-w-[220px] lg:max-w-[320px]`
- Photo caption: `text-[10px]` → `text-[10px] lg:text-xs`

**Buttons:**
- `h-11` → `h-11 lg:h-12`

### 10. Step 5 — Pack Ready

**Celebration header:**
- Emoji: `text-3xl` → `text-3xl lg:text-5xl`
- Title: `text-lg` → `text-lg lg:text-2xl`
- Sub: `text-xs` → `text-xs lg:text-sm`

**Listed URL section:**
- `p-4` → `p-4 lg:p-6`
- Title: `text-xs font-semibold` → `text-xs lg:text-sm font-semibold`

**Bottom action buttons:**
- `h-11` → `h-11 lg:h-13`

### 11. Footer Nav Bar (Lines 1550–1571)
```
Before: px-4 pt-3 pb-4
After:  px-4 lg:px-8 pt-3 lg:pt-4 pb-4 lg:pb-6
```
- Buttons: `h-12` → `h-12 lg:h-13`
- Blocked reason: `text-[11px]` → `text-[11px] lg:text-xs`

### 12. CopyBtn helper (Lines 81–101)
- Container text: `text-[10px]` → `text-[10px] lg:text-xs`

---

## Files to Change

| File | Change |
|------|--------|
| `src/pages/SellWizard.tsx` | All responsive `lg:` additions described above — no logic changes, pure CSS class upgrades |

---

## What This Achieves

| Aspect | Before | After |
|--------|--------|-------|
| Max content width | 512px (max-w-lg) | 672px desktop (max-w-2xl) |
| Step heading | 20px (text-xl) | 20px mobile / 30px desktop (text-3xl) |
| Body text | 12px (text-xs) | 12px mobile / 14px desktop (text-sm) |
| Labels | 10-11px | 10-11px mobile / 12px desktop |
| Price display | 36px (text-4xl) | 36px mobile / 60px desktop (text-6xl) |
| Step circles | 28px | 28px mobile / 40px desktop |
| Cards | Compact 12px padding | 12px mobile / 20px desktop |
| Buttons | 44px (h-11) | 44px mobile / 48px desktop (h-12) |

No logic, state, or routing changes. Pure responsive polishing.
