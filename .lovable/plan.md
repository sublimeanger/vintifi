

# Fix Vintography: Image Viewer + Label Issue

## Problem 1: Buggy Zoom/Pan/Scroll

The current `ComparisonView` has multiple interaction bugs:

- **Pan uses raw mouse coordinates** without clamping, so the image flies off-screen
- **Scroll zoom has no smoothing** -- jumps in 0.2 increments, feels jerky
- **No pinch-to-zoom** on touch devices
- **Wheel event conflicts** with page scroll -- `e.preventDefault()` in a passive listener causes console errors
- **Pan doesn't reset when zoom returns to 1x**, leaving the image offset
- **No pan boundaries** -- you can drag the image completely out of view
- **Overlay slider and pan conflict** -- mouse events fight each other in overlay mode

### Fix: Complete rewrite of interaction logic

Replace the current mouse/wheel handlers with a clean, professional implementation:

1. **Smooth zoom** using `requestAnimationFrame` and interpolation (target zoom vs current zoom) for buttery transitions
2. **Clamped panning** that constrains the image within visible bounds based on current zoom level -- you can never lose the image off-screen
3. **Pinch-to-zoom on mobile** using touch distance calculation between two fingers
4. **Double-click/tap to zoom** to 2x centred on click point, double-click again to reset
5. **Zoom centred on cursor/pinch point** rather than always scaling from centre
6. **Auto-reset pan when zoom returns to 1x**
7. **Disable pan in overlay mode at 1x zoom** so it doesn't conflict with the comparison slider
8. **Non-passive wheel handler** attached via `useEffect` + `addEventListener` to avoid browser warnings

### File: `src/components/vintography/ComparisonView.tsx`

---

## Problem 2: AI Adding Labels to Garments

The AI model is adding text labels/watermarks onto the generated garment images. This is caused by the prompts not explicitly forbidding it.

### Fix: Add anti-label instruction to the global GARMENT_PRESERVE constant

Add this to the existing `GARMENT_PRESERVE` string in the edge function:

```
"NEVER add any text, labels, watermarks, captions, annotations, or overlays to the image. The output must contain zero added text of any kind."
```

This single change propagates to every operation prompt since they all use `GARMENT_PRESERVE`.

### File: `supabase/functions/vintography/index.ts`

---

## Summary of Changes

| File | Change |
|------|--------|
| `ComparisonView.tsx` | Full rewrite of zoom/pan/touch interaction with smooth animations, clamped bounds, pinch-to-zoom, double-tap zoom, and cursor-centred scaling |
| `vintography/index.ts` | Add explicit "no labels/text/watermarks" instruction to GARMENT_PRESERVE constant |

No database changes. No new dependencies.

