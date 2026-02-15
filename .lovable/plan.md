# Bulletproof Vintography: Complete Stability Sweep

## Problems Found

### Critical: Flickering

1. **Infinite rAF loop** -- The animation loop in `ComparisonView` runs `requestAnimationFrame` on every frame forever, calling `setDisplayZoom` and `setDisplayPan` continuously. Even when zoom=1 and pan=0,0, React re-renders 60 times per second. This is the primary flickering source.
2. **State thrashing on generate** -- When pressing "Apply", `handleProcess` sets `processedUrl(null)` immediately, which:
  - Makes ComparisonView flash to the original-only view
  - Triggers gallery re-fetch (which depends on `processedUrl` in its useEffect)
  - Gallery shows skeleton placeholders during re-fetch
  - All of this happens in a split second, creating visible flicker
3. **Gallery re-fetches on every variation change** -- The gallery `useEffect` at line 98 has `processedUrl` as a dependency, so clicking between variations triggers full gallery reloads with skeleton flashes.

### Flow Issues

4. **Parameter panel layout jumps** -- `AnimatePresence` with `height: 0` to `height: auto` causes layout shifts when switching operations. Content below jumps up and down.
5. **Stale variation index** -- Line 180 uses `variations.length` before the `setVariations` state update from line 179 has applied, causing the wrong variation to be selected after generation.
6. **No processing state in the comparison view** -- When clicking "Apply", the processed image disappears (null) and only the processing overlay appears. Better flow: keep showing the original image with a clear overlay rather than flashing to nothing.

### Console Errors

7. **"Function components cannot be given refs"** -- `OptionGrid` in ModelPicker and `BackgroundPicker` itself receive refs from `AnimatePresence`/`motion` but are plain function components. Needs `forwardRef` or restructured wrapping.

### Robustness

8. **No try/catch on async gallery fetch** -- If the gallery fetch fails, it silently breaks without setting `galleryLoading` back to false, leaving permanent skeleton state.
9. **Unhandled rejections in batch processing** -- No global error handling; a failed upload in batch can leave the UI in an inconsistent state.

---

## Fixes

### Fix 1: Smart Animation Loop (ComparisonView.tsx)

Replace the always-running rAF loop with one that only runs when there is a difference between target and display values. When target equals display, the loop stops. Any new interaction restarts it.

```
- Remove the useEffect that starts rAF unconditionally
- Add a "needsAnimation" ref that gates the loop
- Only call setDisplayZoom/setDisplayPan when values actually change
- When both zoom and pan reach their targets, stop the loop
- Restart the loop on any user interaction (wheel, pinch, double-click, button)
```

This eliminates 60fps React re-renders when the user is not interacting.

### Fix 2: Eliminate processedUrl Null Flash (Vintography.tsx)

Instead of setting `processedUrl(null)` at the start of processing, keep the current processed image visible behind the processing overlay. Only update `processedUrl` when the new result arrives.

```
Before: setProcessing(true); setProcessedUrl(null);
After:  setProcessing(true); // keep current processedUrl visible
```

The ComparisonView already shows a processing overlay, so the user sees "AI is working..." over the current state instead of a blank flash.

### Fix 3: Decouple Gallery from processedUrl (Vintography.tsx)

Remove `processedUrl` from the gallery `useEffect` dependency array. Instead, after a successful process, append the new job to the gallery state directly (optimistic update) or call a targeted refetch function only on success.

```
Before: useEffect(() => { fetchGallery(); }, [user, processedUrl]);
After:  useEffect(() => { fetchGallery(); }, [user]);
        // After successful process, manually prepend to gallery
```

### Fix 4: Smooth Parameter Panel Transitions (Vintography.tsx)

Replace `height: 0` animation with opacity-only transitions. Use `AnimatePresence mode="wait"` with `opacity` and a small `y` offset instead of height animation, which avoids layout thrash.

```
Before: initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
After:  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
```

### Fix 5: Fix Variation Index (Vintography.tsx)

Use a callback form or compute the new index from the new array length directly.

```
Before:
setVariations((prev) => [...prev.slice(-2), result]);
setCurrentVariation(variations.length > 1 ? Math.min(variations.length, 2) : 0);

After:
setVariations((prev) => {
  const next = [...prev.slice(-2), result];
  setCurrentVariation(next.length - 1);
  return next;
});
```

### Fix 6: Fix forwardRef Warnings (ModelPicker.tsx, BackgroundPicker.tsx)

Wrap the outer motion.div elements that AnimatePresence wraps with forwardRef, or restructure the JSX so AnimatePresence wraps a `motion.div` directly rather than the picker components.

The simplest fix: in Vintography.tsx, ensure the `motion.div` wrapper inside AnimatePresence is the direct child (it already is), but the console error comes from the picker components themselves receiving refs. The pickers just need to accept and forward a ref.

### Fix 7: Add Error Handling (Vintography.tsx)

- Wrap gallery fetch in try/catch with `finally { setGalleryLoading(false) }`
- Add try/catch around all async operations in batch processing
- Prevent double error toasts in preset flow

### Fix 8: Add Global Rejection Handler (Vintography.tsx)

Add a useEffect with `window.addEventListener("unhandledrejection")` as a safety net to prevent white-screen crashes from any missed async errors.

---

## Files Changed


| File                                              | Changes                                                                                                                |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `src/components/vintography/ComparisonView.tsx`   | Smart rAF loop that stops when idle; eliminate 60fps re-renders                                                        |
| `src/pages/Vintography.tsx`                       | Remove processedUrl null flash; decouple gallery refetch; fix variation index; smooth panel animations; error handling |
| `src/components/vintography/ModelPicker.tsx`      | Add forwardRef to component                                                                                            |
| `src/components/vintography/BackgroundPicker.tsx` | Add forwardRef to component                                                                                            |
| `src/components/vintography/FlatLayPicker.tsx`    | Add forwardRef to component                                                                                            |


No database changes. No new dependencies. No edge function changes.  
  
I;ve also noticed when you click 'oresets' it automatically generates the image using credits, this is a POOR experience. 