
# Photo Studio Mobile Scroll Choreography Overhaul

## Problem

The current scroll logic has multiple competing `setTimeout` calls that fire at arbitrary delays (100ms, 250ms, 450ms, 800ms, 2500ms), creating a "bouncing" effect on mobile where the page jumps down to config, then back up, then down again. The core issue is that scroll intent is scattered across different handlers with no coordination.

## Current Scroll Triggers (All Problematic)

1. **`handleSelectOp`** (line 298-315): Scrolls to config panel at 450ms, then scrolls *back up* at 800ms -- this double-scroll is the main "clunky" feeling
2. **Chain suggestion click** (line 700-704): Scrolls to top, then calls `handleSelectOp` at 100ms, which triggers *another* scroll to config at 450ms
3. **Processing complete** (line 396-406): Scrolls to result at 250ms, then nudges to chain suggestions at 2500ms

## Redesigned Scroll Logic

Replace all scattered scrolls with a single, intentional state machine approach:

### Principle: One scroll per user action, to the thing that matters most

| User Action | What Matters | Scroll Target |
|---|---|---|
| Select op WITHOUT config (remove_bg, sell_ready, studio_shadow) | The process button | No scroll (button is sticky at bottom on mobile) |
| Select op WITH config (put_on_model, swap_model, virtual_tryon, ai_background) | Config panel (gender/pose/selfie) | Scroll config panel into view, positioned so user can still see the photo above it |
| Tap "Process" | The photo preview (processing overlay) | Scroll to photo preview top |
| Processing completes | The before/after result | Scroll to result area |
| After 2.5s admiring result | Chain suggestions | Gentle nudge only if chain section is below fold |
| Chain suggestion tap | New photo + config | Scroll to top, then after content settles, scroll config into view (if op has config) |

### Implementation Details

**1. Clean up `handleSelectOp` (remove the double-scroll)**

Remove the "scroll back" logic at 800ms entirely. Instead, use a single scroll with `block: "nearest"` which keeps the config panel visible without yanking the page around:

```typescript
const handleSelectOp = (op: PhotoOperation) => {
  // ... tier check, state updates ...

  const hasConfig = op === "put_on_model" || op === "virtual_tryon" 
    || op === "swap_model" || op === "ai_background";

  if (hasConfig && window.innerWidth < 1024) {
    // Single scroll after AnimatePresence mounts the config panel
    setTimeout(() => {
      configPanelRef.current?.scrollIntoView({ 
        behavior: "smooth", 
        block: "nearest"  // <-- key change: doesn't yank to center
      });
    }, 450);
    // REMOVE the second setTimeout at 800ms entirely
  }
};
```

**2. Fix chain suggestion handler**

When chaining (e.g., remove_bg result -> "Put on Model"), the flow should be:
- Scroll to top so user sees their new input photo
- Wait for scroll + content to settle
- ONLY THEN scroll to config if the new op needs it

```typescript
// Chain suggestion onClick:
setPhotoLoading(true);
setSelectedPhoto(resultPhoto);
setResultPhoto(null);
setOpParams({});
clearSession();

// Step 1: Go to top to see the new input photo
window.scrollTo({ top: 0, behavior: "smooth" });

// Step 2: Select op after scroll settles (longer delay)
const hasConfig = ["put_on_model", "virtual_tryon", "swap_model", "ai_background"].includes(s.op);
setTimeout(() => {
  setSelectedOp(s.op as PhotoOperation);
  setOpParams({});
  
  // Step 3: Scroll to config ONLY if needed, after it renders
  if (hasConfig && window.innerWidth < 1024) {
    setTimeout(() => {
      configPanelRef.current?.scrollIntoView({ 
        behavior: "smooth", 
        block: "nearest" 
      });
    }, 500); // wait for AnimatePresence
  }
}, 600); // wait for scroll-to-top to finish
```

This replaces calling `handleSelectOp` from the chain handler (which was causing the double-scroll inside `handleSelectOp` to also fire).

**3. Add scroll-to-photo on process start**

When the user taps "Process", scroll so they can see the processing overlay on their photo:

```typescript
const handleProcess = async () => {
  // ... validation ...
  setIsProcessing(true);
  
  // Scroll to photo preview so user sees the processing animation
  if (window.innerWidth < 1024) {
    const preview = document.querySelector("[data-photo-preview]");
    preview?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  // ... rest of processing ...
};
```

**4. Keep result scroll and chain nudge as-is**

The post-processing scrolls (result at 250ms, chain nudge at 2500ms) work well and don't conflict since processing is a blocking state.

### Files Changed

- `src/pages/Vintography.tsx` -- all scroll logic consolidated

### Summary

- Remove the "scroll down then back up" double-scroll from `handleSelectOp`
- Use `block: "nearest"` instead of `block: "center"` for config panel scrolling
- Decouple chain suggestion handler from `handleSelectOp` to avoid nested scroll chains
- Add scroll-to-photo on process start so the user always sees the transformation happening
- Result: one smooth, intentional scroll per user action
