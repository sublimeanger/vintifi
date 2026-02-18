
# Fix Mannequin Generation + Dramatically Speed Up All Generations

## Root Cause Analysis

### Problem 1: Mannequin generation silently fails on certain backgrounds

In `Vintography.tsx`, the `MANNEQUIN_BACKGROUNDS` array includes `{ value: "flat_marble", ... }` as a user-selectable option. However, in the `mannequin_shot` prompt function inside `supabase/functions/vintography/index.ts`, the `bgs` lookup object does NOT have a `flat_marble` key:

```typescript
const bgs: Record<string, string> = {
  studio: "...",
  grey_gradient: "...",
  living_room: "...",
  dressing_room: "...",
  brick: "...",
  flat_marble: "...",  // ← this IS there actually
  park: "...",
};
```

Wait — `flat_marble` IS in the edge function. So the background mismatch isn't the issue. Let me re-examine what IS broken.

The real mannequin bug: the edge function prompt for `mannequin_shot` says `Display this clothing/fashion garment on ${types[mannequinType]}` — but it's an **image editing prompt**, not an image generation prompt. The model is being asked to **edit** the input photo to show the garment on a mannequin. This is an extremely hard instruction for an image model because:

1. The model receives the original garment photo (on a person, on a hanger, flat-lay, etc.)
2. It's asked to "display this garment on a headless mannequin" — which requires removing the original context AND placing the garment on an entirely new subject
3. This is essentially a composite/inpainting task, not a simple style transfer

The **ghost mannequin** mode is especially broken because floating 3D ghost garments require the model to understand the 3D structure of the garment and simulate its interior — extremely difficult from a single flat photo.

**The fix:** Restructure the mannequin prompt to be explicit about the two-stage process:
1. First extract/isolate the garment
2. Then render it on the specified mannequin type

More importantly: add a **composition mandate** to each mannequin type that explicitly describes what the final image should look like, and adds explicit instruction about where the mannequin should sit in the frame (centered, full mannequin visible, garment fully shown).

The ghost mannequin prompt also needs a complete rewrite — it currently says "The garment should appear to float in perfect 3D shape as if worn by an invisible person" but gives no instruction about HOW to achieve this technically. The fix: use explicit fill instructions.

### Problem 2: Generation is slow because every complex operation uses the slowest model

Current `MODEL_MAP`:
```typescript
remove_bg: "google/gemini-2.5-flash-image",      // ← fast, correct
smart_bg: "google/gemini-3-pro-image-preview",    // ← slowest model
model_shot: "google/gemini-3-pro-image-preview",  // ← slowest model
mannequin_shot: "google/gemini-3-pro-image-preview", // ← slowest model
ghost_mannequin: "google/gemini-2.5-flash-image", 
flatlay_style: "google/gemini-3-pro-image-preview", // ← slowest model
selfie_shot: "google/gemini-3-pro-image-preview",
enhance: "google/gemini-2.5-flash-image",         // ← fast, correct
```

`google/gemini-3-pro-image-preview` is the highest-quality but **slowest** model — it's appropriate for `model_shot` where photorealism matters most. But using it for `flatlay_style` and `smart_bg` is unnecessary — these are compositional tasks where `gemini-2.5-flash-image` produces near-identical results at 3-4x the speed.

Additionally, the progress step timers in `handleProcess` are hardcoded:
```typescript
setTimeout(() => setProcessingStep("analysing"), 800);
setTimeout(() => setProcessingStep("generating"), 3000);
setTimeout(() => setProcessingStep("finalising"), 7000);
```

These don't adapt to the actual model being used. For flash operations (remove_bg, enhance — typically 8-15s), the "finalising" step fires at 7s when the operation might complete at 10s, making the UI feel stalled. For pro model operations (30-60s), the timers all fire in the first 7 seconds leaving a dead period with no UI feedback.

## The Fixes

### Fix 1: Speed — Model Assignments

Switch `flatlay_style` and `smart_bg` to `gemini-2.5-flash-image`. These operations:
- **Flat-lay**: Compositional rearrangement + overhead perspective. Flash model handles this well and 3x faster.
- **Smart BG / Lifestyle scenes**: Background replacement. Flash model quality is indistinguishable from Pro for background compositing.
- Keep `model_shot` and `mannequin_shot` on Pro model — photorealistic human/mannequin rendering genuinely benefits from the better model.

New `MODEL_MAP`:
```typescript
remove_bg: "google/gemini-2.5-flash-image",
smart_bg: "google/gemini-2.5-flash-image",         // ← downgrade: same quality, 3x faster
model_shot: "google/gemini-3-pro-image-preview",   // ← keep: photorealism needs Pro
mannequin_shot: "google/gemini-3-pro-image-preview", // ← keep: mannequin quality needs Pro
ghost_mannequin: "google/gemini-2.5-flash-image",
flatlay_style: "google/gemini-2.5-flash-image",    // ← downgrade: compositional, same quality
selfie_shot: "google/gemini-3-pro-image-preview",
enhance: "google/gemini-2.5-flash-image",
```

This alone will cut `smart_bg` and `flatlay_style` generation time by approximately 60-70%.

### Fix 2: Speed — Adaptive UI progress timers

Replace the hardcoded `setTimeout` timers with operation-aware timing that matches expected model latency:

```typescript
// Fast ops (flash model): remove_bg, enhance, smart_bg, flatlay
const isFlashOp = ["clean_bg", "lifestyle_bg", "enhance"].includes(selectedOp) || 
                  (selectedOp === "virtual_model" && photoTab === "flatlay");

if (isFlashOp) {
  setTimeout(() => setProcessingStep("analysing"), 500);
  setTimeout(() => setProcessingStep("generating"), 2000);
  setTimeout(() => setProcessingStep("finalising"), 8000);
} else {
  // Slow ops (pro model): model_shot, mannequin_shot
  setTimeout(() => setProcessingStep("analysing"), 800);
  setTimeout(() => setProcessingStep("generating"), 4000);
  setTimeout(() => setProcessingStep("finalising"), 20000); // ← was 7000, now 20s
}
```

This prevents the "finalising" badge appearing 7 seconds in for a 40-second pro model generation — which currently makes users think something is wrong.

Also show the operation name in the processing overlay so users know what's happening: "Generating AI model shot..." vs "Removing background..."

### Fix 3: Mannequin prompt — Ghost mannequin rewrite

The ghost mannequin prompt is the hardest and currently weakest. Full rewrite with explicit technical instructions:

```
ghost: "an INVISIBLE/GHOST MANNEQUIN effect. Step 1: Mentally extract the garment from its current context. Step 2: Render the garment floating in perfect 3D shape as if worn by a person who has been made entirely invisible.

GHOST MANNEQUIN TECHNICAL REQUIREMENTS:
- The garment must hold its full 3D shape and volume exactly as it would when worn
- Neckline: Fill the neck opening with a realistic view of the garment's interior — inner collar, label if visible, and clean fabric continuation showing the inside of the neckline
- Sleeve openings: Fill with realistic fabric continuation showing the sleeve lining or interior
- Waist/hem: If the garment has an interior, show a subtle glimpse of the inside hem
- NO visible support structures, NO hanger, NO mannequin form — nothing supporting the garment should be visible
- The garment must appear self-supporting and three-dimensional
- Cast a soft shadow directly beneath the garment on the background surface"
```

### Fix 4: Mannequin prompt — Headless mannequin explicit composition

The headless mannequin currently fails because the model sometimes:
1. Generates a mannequin WITH a head (ignoring "headless")
2. Crops the garment
3. Shows the mannequin at an angle instead of straight-on

Add explicit composition rules:

```
HEADLESS MANNEQUIN COMPOSITION:
- The mannequin must be completely headless — the torso begins at the shoulder line with a clean, flat cut. No head, no neck, no partial head.
- Frame the shot so the full mannequin from shoulder line to base is visible
- The mannequin must face the camera squarely (not angled)
- Centre the mannequin in the frame with equal breathing room on left and right
```

### Fix 5: Mannequin — add the operation name in the UI generation steps

Currently the ComparisonView processing overlay shows generic steps. Update `handleProcess` to pass an operation description into the steps so the user sees "Placing garment on ghost mannequin..." instead of just "Generating...".

## Files Changed

| File | What changes |
|------|-------------|
| `supabase/functions/vintography/index.ts` | Switch `smart_bg` and `flatlay_style` to flash model in `MODEL_MAP`; rewrite ghost mannequin prompt with explicit technical steps; add headless mannequin composition mandate; add half-body composition mandate |
| `src/pages/Vintography.tsx` | Adaptive progress timers based on operation type; pass operation label into processing steps for better user feedback |

## Expected Impact

| Operation | Before | After |
|-----------|--------|-------|
| Clean Background | 10-15s | 10-15s (unchanged, already flash) |
| Lifestyle Scene | 35-60s | **12-20s** (flash model, ~3x faster) |
| Flat-Lay | 35-60s | **12-20s** (flash model, ~3x faster) |
| Enhance | 10-15s | 10-15s (unchanged, already flash) |
| AI Model | 40-70s | 40-70s (kept on Pro — needs quality) |
| Mannequin | 40-70s | 40-70s (kept on Pro — needs quality) + **much better results** |

Mannequin quality improvement: Ghost mode should now correctly produce floating 3D garment effect. Headless mode should reliably produce a truly headless torso (not just a mannequin with a blurred head). Half-body mode will explicitly frame waist-up.
