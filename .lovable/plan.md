
# Photo Studio: World-Class Desktop & Mobile Responsiveness

## What's Wrong Today

The Photo Studio is built with a single-column layout and phone-scale typography that never adapts to desktop. On a typical laptop (1280px+), with the 256px sidebar, the content area is roughly 950px wide — yet the UI reads at `text-[9px]` labels and `text-xs` headings. Everything is too small, too cramped, and the workflow requires constant scrolling even on a large screen.

**The five root problems:**

1. **No desktop split layout** — on lg+ screens, the config panel (operation cards + params) and the preview should sit side-by-side, not stacked. Right now you configure, then scroll to see the result, then scroll back to change settings. That's three scrolls per iteration.

2. **Typography never scales up** — `text-[9px]`, `text-[10px]`, `text-[11px]` everywhere. These look fine on a 390px phone. On a 1440px monitor they're microscopic.

3. **Operation cards are too small on desktop** — the `grid-cols-4` at sm breakpoint means each card is about 200px wide with 9px text on a large screen. They should be taller and more readable at lg+.

4. **Preview image is hard-capped at 500px height** — wastes the desktop canvas. On a desktop the preview should grow to fill the right column properly.

5. **ModelPicker/BackgroundPicker/Mannequin UI** are not scaled for desktop — tiny buttons, tiny icons, text nobody can read without leaning in.

---

## The Fix: Two-Column Desktop Layout + Typography Scaling

### Layout Architecture

```text
Mobile (< lg)                Desktop (lg+)
─────────────────────        ──────────────────────────────────────────
[Credit Bar          ]        [Credit Bar                              ]
[Guidance banner     ]        [Guidance banner                         ]
[Upload Zone / Batch ]        ┌──────────────────────┬─────────────────┐
[Op Cards (2 cols)   ]        │ LEFT CONFIG PANEL    │ RIGHT PREVIEW   │
[Garment input       ]        │                      │                 │
[Params panel        ]        │ Op Cards (2×2 grid)  │ ComparisonView  │
[Preview             ]        │ Garment input        │ (fills height)  │
[Action Buttons      ]        │ Params panel         │                 │
[Next Steps          ]        │ Generate button      │ Action buttons  │
[Gallery             ]        │                      │ Next Steps      │
                              └──────────────────────┴─────────────────┘
                              [Gallery (4-5 cols)                       ]
```

On `lg+`, the editor area becomes a `grid lg:grid-cols-[420px_1fr]` two-column layout. The left column (420px fixed) holds all configuration. The right column (flexible, fills remaining space) holds the comparison preview, action buttons, and next steps card.

### Typography Scale

Every size class gets a desktop upgrade:

| Current | Mobile | Desktop (lg+) |
|---------|--------|---------------|
| `text-[9px]` | keeps | → `lg:text-[11px]` |
| `text-[10px]` | keeps | → `lg:text-xs` |
| `text-[11px]` | keeps | → `lg:text-xs` or `lg:text-sm` |
| `text-xs` | keeps | → `lg:text-sm` |
| `text-sm` | keeps | → `lg:text-base` |
| Heading `font-display` | keeps | → `lg:text-2xl` |
| Section headings `text-xs uppercase tracking-wider` | keeps | → `lg:text-xs` (already fine) |

### Specific Component Changes

#### `src/pages/Vintography.tsx`

**1. PageShell subtitle visibility**
Currently `subtitle` truncates at `text-[10px]`. On desktop, show it at `text-sm` and don't truncate — there's space.

**2. Upload Zone (no image state)**
```
Mobile: compact card, p-6, icons w-14
Desktop: generously padded card, p-16, icons w-20, text-xl heading, text-sm subtext
Button: h-12 lg:h-10 (slightly smaller on desktop since hover states exist)
```

**3. Operation Cards grid**
```
Mobile: grid-cols-2
Desktop: grid-cols-2 (2×2 grid within the 420px left panel — intentional)
Before/after preview strips: h-8 lg:h-12 (taller on desktop)
Label: text-xs lg:text-sm
Desc: text-[10px] lg:text-xs
Detail expansion: text-[10px] lg:text-xs
```

**4. Two-column split wrapper**
The entire `<motion.div className="space-y-3 sm:space-y-4">` editor section becomes:
```tsx
<div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-[420px_1fr] lg:gap-6 lg:items-start">
  {/* LEFT: config */}
  <div className="space-y-3">
    <BatchStrip />
    {/* Op cards */}
    {/* Garment input */}
    {/* Params panel */}
    {/* Generate button — sticky bottom on desktop */}
  </div>
  {/* RIGHT: preview + actions */}
  <div className="lg:sticky lg:top-6 space-y-3">
    <ComparisonView />  {/* remove maxHeight cap on desktop */}
    {/* Download / Save / Try Again buttons */}
    {/* Next Steps card */}
  </div>
</div>
```

**5. Preview image height**
In `ComparisonView.tsx`:
```
style={{ aspectRatio: "4/5", maxHeight: 500 }}
→ 
style={{ aspectRatio: "4/5" }}
className="max-h-[500px] lg:max-h-[700px]"
```
This gives desktop users a proper large preview canvas.

**6. Garment description input**
```
Mobile: h-11 (iOS-safe 16px font)
Desktop: h-10 text-sm (standard desktop input)
Stays at text-base on mobile (prevents iOS zoom)
```

**7. Params panels — Virtual Model / Mannequin / Lifestyle**
The sub-tab strip and option buttons scale up:
```
Tab triggers: text-xs lg:text-sm with larger icons w-3 lg:w-4
Shot style cards: p-2.5 lg:p-4, text 11px → lg:text-sm
Mannequin type buttons: p-3 lg:p-4, icon w-4 lg:w-5, labels text-[11px] → lg:text-sm
Lighting buttons: p-2.5 lg:p-4
Background buttons: text-[11px] → lg:text-xs
```

**8. ModelPicker** (`ModelPicker.tsx`)
```
Option button padding: p-2.5 → lg:p-3
Icon: w-4 h-4 → lg:w-5 lg:h-5
Label: text-[11px] → lg:text-xs
Desc: text-[9px] → lg:text-[10px]
Card title "Model Configuration": text-sm → lg:text-base
```

**9. Action buttons**
```
Mobile: full-width stacked (flex-col), h-12
Desktop: flex-row, h-11
Primary "Apply" button: text-sm lg:text-base, icon w-4 lg:w-5
```

**10. Generate button positioning on desktop**
The generate/apply button moves into the left column at the bottom (below params), so the user never has to scroll right to hit it. On mobile it stays below everything as before.

**11. Gallery grid**
```
Mobile: grid-cols-2 sm:grid-cols-3 (was 3 cols on mobile — now 2 for more breathing room)
Desktop: lg:grid-cols-5 xl:grid-cols-6
Gallery heading: text-xs sm:text-base → lg:text-lg
```

**12. Previous Edits gallery cards** (`GalleryCard.tsx`)
The card label below the image:
```
p-2 → lg:p-3
text-xs font-medium → lg:text-sm
time text-[10px] → lg:text-xs
```

**13. Credit Bar** (`CreditBar.tsx`)
```
px-1 → px-2
text-xs → lg:text-sm
icon w-4 → lg:w-5
```

**14. BackgroundPicker** (`BackgroundPicker.tsx`)
The lifestyle scene groups:
```
Grid: grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 (3-col within 420px panel — fits perfectly)
Option card padding: p-2.5 → lg:p-3
Color swatch h-8 → lg:h-10
Label text-[11px] → lg:text-xs
Desc text-[9px] → lg:text-[10px]
Card header with Paintbrush icon: text-sm → lg:text-base
```

**15. Guidance banner**
```
p-2.5 sm:p-3 → lg:p-4
text-xs → lg:text-sm
Icon w-4 → lg:w-5
```

**16. Processing overlay in ComparisonView**
Currently uses text sizes like `text-sm` for the step labels — these are fine but the spinner and step indicator can be slightly larger on desktop:
```
Spinner w-8 h-8 → lg:w-10 lg:h-10
Step dot w-2 h-2 → lg:w-2.5 lg:h-2.5
Step label text-xs → lg:text-sm
Tip text text-xs → lg:text-sm
```

---

## Files Changed

| File | What changes |
|------|-------------|
| `src/pages/Vintography.tsx` | Two-column grid layout at lg+; typography scale-up across all elements; upload zone desktop sizing; gallery grid update; generate button in left panel on desktop; preview sticky on desktop |
| `src/components/vintography/ComparisonView.tsx` | Remove hard 500px height cap on desktop; larger processing overlay elements at lg+ |
| `src/components/vintography/ModelPicker.tsx` | Scale up option buttons, icons, labels at lg+ |
| `src/components/vintography/CreditBar.tsx` | Scale up text and icon at lg+ |
| `src/components/vintography/GalleryCard.tsx` | Scale up card info text at lg+ |
| `src/components/vintography/BackgroundPicker.tsx` | Scale up option cards, swatches, text at lg+ |

---

## Mobile Audit Fixes (while we're at it)

While implementing desktop, these mobile-specific fixes are included:

- **Gallery grid mobile**: change `grid-cols-3` → `grid-cols-2` on mobile — 3 columns at 390px means each card is ~118px, barely showing any image. 2 columns gives 175px cards, proper "Tap to compare" UX.
- **Garment input on iOS**: already has `h-11` and `text-base` — keep this, it prevents the iOS auto-zoom.
- **Action buttons on mobile**: ensure the primary generate button is always `w-full h-12` on mobile, standalone and prominent.
- **BackgroundPicker on mobile**: currently `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` — stays, that's fine.
- **ComparisonView Overlay/Side-by-side toggle**: the `h-7 px-2 text-xs` buttons are fine on mobile. On desktop, scale to `lg:h-9 lg:px-3 lg:text-sm`.
- **Flatlay styles**: mobile `grid-cols-1 sm:grid-cols-2` — add `lg:grid-cols-1` since it's in the narrow 420px left panel.

---

## What the Experience Feels Like After

**Desktop (1280px+):**
- Open Photo Studio → two-column layout immediately visible
- Left: configuration panel with readable 14px text, properly-sized option cards with 5px+ icons
- Right: large comparison preview (up to 700px tall) that stays sticky as you scroll config
- Generate button at the bottom of the left config column — never requires scrolling to find
- Gallery shows 5 columns of edit thumbnails, plenty of space
- Overall feel: professional SaaS tool, not a stretched mobile app

**Mobile (390px):**
- Single-column vertical flow (unchanged structure, refined sizing)
- 2-column gallery instead of cramped 3-column
- Upload zone properly centred, full-width generate button
- All touch targets remain ≥44px
- No change to the workflow order — just tighter, cleaner rendering
