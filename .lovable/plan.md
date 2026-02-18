
# Crease Remover — "Steam & Press" Tool for Photo Studio

## What We're Building

A new AI-powered tool inside Photo Studio (Vintography) that removes all creases, wrinkles, and fold marks from garment photos — making clothes look freshly steamed and pressed without the seller needing to iron or steam-clean anything in real life. This is a standalone fifth operation card alongside the existing four (Clean Background, Lifestyle Scenes, Photorealistic, Enhance).

---

## Why This Deserves Its Own Operation (Not a Prompt Tweak)

The `enhance` operation already applies general improvement but its mandate is: "correct lighting, sharpen fabric, fix colour." It explicitly does NOT remove structural wrinkles because those are treated as honest fabric information. A deliberate "de-crease" operation needs its own AI prompt with a completely different intent: **restructure fabric surface geometry** rather than enhance what's already there.

Also practically: sellers photograph their items, then realise they're creased, then face the choice of (a) re-photographing after ironing, or (b) the item looking bad on Vinted. This tool eliminates that choice — they process the photo and the AI renders the fabric smooth. This is one of the highest-value time-saving features possible for a Vinted seller.

---

## Architecture Overview

The change touches exactly two files — same pattern as every other Vintography tool:

```text
supabase/functions/vintography/index.ts   ← new operation: "decrease"
src/pages/Vintography.tsx                  ← new operation card + UI card + flash model timing
```

No new DB tables, no new edge functions, no schema changes needed. `vintography_jobs` table already stores operation name as free text. The `TIER_OPERATIONS` map already controls which tiers get which ops.

---

## Edge Function Changes: `supabase/functions/vintography/index.ts`

### 1. New Operation Prompt: `decrease`

Add to `OPERATION_PROMPTS`:

```typescript
decrease: (p) => {
  const intensity = p?.intensity || "standard";

  const intensities: Record<string, string> = {
    light: "Remove only the most prominent creases — deep fold lines, sharp compression creases from storage, and crumpling wrinkles. Preserve gentle natural drape folds that occur when fabric hangs — these show fabric character. The result should look like the garment was gently hand-pressed but not dry-cleaned.",
    standard: "Remove all storage creases, fold lines, compression wrinkles, and crumpling. Preserve only the structural fabric drape that occurs naturally from gravity — the way fabric hangs from shoulders or drapes over a body form. The result should look like the garment was professionally steamed for 60 seconds.",
    deep: "Remove every wrinkle, crease, fold line, and texture distortion caused by storage, folding, handling, or poor presentation. The fabric surface should appear immaculate — as if the garment is brand new, freshly pressed, and on a high-street shop display rail for the first time. Preserve fabric texture (weave, knit pattern, cord ridges) but eliminate all deformation of that texture.",
  };

  return `You are a professional fashion retoucher specialising in fabric smoothing for e-commerce photography. Your task is to remove creases, wrinkles, and fold lines from this garment photo.

INTENSITY: ${intensities[intensity] || intensities.standard}

WHAT TO REMOVE — CREASES (eliminate these):
- Sharp fold lines from being stored folded in a drawer or shipped in packaging
- Compression wrinkles from being packed tightly
- Crumpling wrinkles across the body of the fabric
- Horizontal banding wrinkles across chest/sleeves from hanging or folding
- Packing creases — the very defined lines from cardboard fold points
- Any fabric deformation caused by poor storage, handling, or transit

WHAT TO KEEP — NATURAL FABRIC BEHAVIOUR (preserve these):
- The garment's overall silhouette and shape — do NOT change how the garment looks
- Natural gravitational drape — the gentle curves of fabric as it hangs or is laid flat
- Fabric texture: weave patterns, knit structure, corduroy ridges, denim twill lines — these are texture, not creases
- Intentional design elements: pleats, gathers, ruched seams, smocking, or fabric tucks that are part of the garment's design
- The accurate colour and shading of the fabric — do NOT bleach or overexpose
- Any deliberate faded or distressed areas (important for denim/vintage)

RETOUCHING TECHNIQUE:
- Work methodically across the fabric surface — chest first, then sleeves, then body
- Smooth fabric by "filling in" the crease valleys to match the surrounding fabric height and texture
- Maintain consistent fabric texture across previously creased areas — the smoothed area should be indistinguishable from uncreased areas
- Preserve natural lighting falloff across the garment — do NOT flatten the lighting or create an artificial airbrushed look
- The final garment should look like it was pressed in a professional steamer for 2–3 minutes

BACKGROUND: Leave the background completely unchanged — only edit the garment itself
GARMENT IDENTITY: The garment type, colour, brand marks, logos, prints, fit, and silhouette must remain 100% identical to the original. Only the fabric surface texture (crease removal) changes.

${GARMENT_PRESERVE}
${QUALITY_MANDATE}`;
},
```

### 2. Model Assignment in `MODEL_MAP`

```typescript
decrease: "google/gemini-2.5-flash-image",
```

Rationale: This is a fabric surface retouching task — no photorealistic human rendering, no complex compositional scene-building. The Flash model handles texture smoothing very well and will complete in ~10–18 seconds (same category as `enhance` and `remove_bg`). Using the Pro model here would add 40-60s of unnecessary latency for no quality benefit.

### 3. Tier Access in `TIER_OPERATIONS`

```typescript
free:     [..., "decrease"],   // Add — this is a direct listing-quality tool, good free-tier hook
pro:      [..., "decrease"],
business: [..., "decrease"],
scale:    [..., "decrease"],
```

Making it available on **all tiers including Free** is the correct call. Here's why:

- It's a pure listing-quality tool — creases make photos look bad and discourage buyers. A better photo = higher conversion = happier seller = they upgrade
- It's the kind of feature that makes a free user say "oh wow, this actually works" — highest activation potential of any feature
- It uses 1 credit (same as Clean Background, which is also free-tier accessible)
- It becomes a conversion vector: "To also add a Lifestyle Background to this freshly pressed photo, upgrade to Pro"

### 4. Prompt Augmentation with `_decrease_with_context`

Since the edge function already has a pattern of injecting `garment_context` for operations that need it, add decrease to the operations that benefit from garment context. When `garment_context` is provided (i.e., when coming from a linked item), the context helps the AI distinguish intended design elements from storage creases:

```typescript
// In the garment_context injection logic:
if (garment_context && !["model_shot"].includes(operation)) {
  prompt += buildGarmentContext(garment_context);
}
```

The existing logic already handles this — `decrease` will automatically get garment context appended when available, without any additional code.

---

## Frontend Changes: `src/pages/Vintography.tsx`

### 1. New Operation in `OPERATIONS` Array

The existing 4 operations are displayed as a `grid grid-cols-2` — adding a 5th would break the layout to an asymmetric 5-card grid. The solution: **keep the 2x2 grid and make the 5th card (Crease Remover) a full-width card below** — visually distinct, clearly a utility/finishing tool rather than a transformation. This is also better UX: it groups "transformation" tools (4-card grid) vs "finishing" tools (wide card below).

The wide card design mirrors the visual weight of the tool — it's a workhorse utility, not a creative mode.

Add to the `OPERATIONS` array:

```typescript
{
  id: "decrease",
  icon: Shirt,  // or Wind — we'll use Wind (already imported, suggests smoothness/air)
  label: "Steam & Press",
  desc: "Remove all creases, instantly",
  detail: "AI-powered crease removal — makes every garment look freshly steamed. No iron needed. Preserves fabric texture, logo, and colour perfectly.",
  beforeGradient: "from-stone-300/60 via-stone-400/40 to-stone-300/60",  // wrinkly grey
  afterGradient: "from-sky-50 via-white to-sky-50",  // smooth, clean
}
```

Add `"decrease"` to the `Operation` type union:

```typescript
type Operation = "clean_bg" | "lifestyle_bg" | "virtual_model" | "enhance" | "decrease";
```

Update `OP_MAP`:

```typescript
const OP_MAP: Record<Operation, string> = {
  clean_bg: "remove_bg",
  lifestyle_bg: "smart_bg",
  virtual_model: "model_shot",
  enhance: "enhance",
  decrease: "decrease",
};
```

### 2. Intensity Selector State + UI

Add state:

```typescript
const [decreaseIntensity, setDecreaseIntensity] = useState<"light" | "standard" | "deep">("standard");
```

Add intensity to `getParams()`:

```typescript
if (selectedOp === "decrease") {
  params.intensity = decreaseIntensity;
}
```

**UI for when `decrease` is selected** — shown inside `AnimatePresence` below the operation cards, same pattern as `lifestyle_bg` shows `BackgroundPicker`:

A simple 3-option intensity selector with descriptive labels:

```
[ Light Press ]    [ Steam — Standard ]    [ Deep Press ]
  Gentle only        All storage creases     Showroom perfect
  (removes sharp     removed. Looks pro      Brand new look.
  packing lines)     steamed.                Immaculate.
```

Selected card highlights with the primary ring pattern used throughout.

The intensity control card is **minimal** — this operation has very few parameters by design. No garment description needed (unlike model shots), no background picker, no lighting. Just the intensity. Clean, fast, purposeful.

### 3. Full-Width Operation Card Rendering

Update the operation cards render section. Instead of rendering all 5 in the same grid, split:

- First 4 in `grid grid-cols-2` (existing layout, unchanged)
- 5th (decrease) as a **separate full-width card** below the grid, with a slightly different visual treatment:
  - Wide layout with icon+label on the left, detail text on the right
  - "New ✦" badge since it's new
  - The before/after gradient strip runs full-width (wider canvas to suggest the smoothing sweep)

This separation creates a natural visual hierarchy:
- **Transformation tools** (2×2 grid): Change what the photo looks like
- **Finishing tools** (full-width): Polish the photo as-is

### 4. Progress Timer Classification

Add `decrease` to `isFlashOp()` since it uses the Flash model:

```typescript
const isFlashOp = (): boolean => {
  if (selectedOp === "clean_bg" || selectedOp === "enhance" || selectedOp === "decrease") return true;
  if (selectedOp === "lifestyle_bg") return true;
  if (selectedOp === "virtual_model" && photoTab === "flatlay") return true;
  return false;
};
```

### 5. Processing Label

Add to `getOperationLabel()`:

```typescript
if (selectedOp === "decrease") return "Steaming & pressing garment...";
```

### 6. ComparisonView Tips

In `ComparisonView.tsx`, add tips for the `decrease` operation ID:

```typescript
decrease: [
  "Works best with full garment photos — front view, hanger or flat-lay shots",
  "Deep Press mode is perfect for items that came direct from storage or shipping",
  "Fabric texture, logos, and prints are preserved — only creases are removed",
  "Chain with Clean Background for a perfect Vinted listing in 2 credits",
],
```

---

## UX Detail: The "Steam & Press" card visual design

The before/after gradient strip for this operation needs to communicate "wrinkled → smooth" visually. Use:

- **Before**: A `from-stone-300 via-stone-400/60 to-stone-300` with an extra CSS pattern overlay (multiple thin diagonal gradient strips to simulate crease lines) using a `repeating-linear-gradient` inline style on the before div
- **After**: A clean `from-sky-50 via-white to-sky-50` — smooth, pure, fresh

This visual immediately communicates what the tool does without words.

---

## Summary Table: All Changes

| Location | Change | Detail |
|---|---|---|
| `supabase/functions/vintography/index.ts` | Add `decrease` prompt | 3 intensity levels with detailed crease removal instructions |
| `supabase/functions/vintography/index.ts` | `MODEL_MAP` | `decrease: "google/gemini-2.5-flash-image"` (fast flash model) |
| `supabase/functions/vintography/index.ts` | `TIER_OPERATIONS` | Add `decrease` to all 4 tiers including Free |
| `src/pages/Vintography.tsx` | `Operation` type | Add `"decrease"` |
| `src/pages/Vintography.tsx` | `OPERATIONS` array | New operation card definition for Steam & Press |
| `src/pages/Vintography.tsx` | `OP_MAP` | `decrease: "decrease"` |
| `src/pages/Vintography.tsx` | State | `decreaseIntensity` state (light/standard/deep) |
| `src/pages/Vintography.tsx` | `getParams()` | Pass `intensity` param for decrease |
| `src/pages/Vintography.tsx` | `getOperation()` | Include decrease in operation resolution |
| `src/pages/Vintography.tsx` | `isFlashOp()` | Classify decrease as flash op (10-18s timers) |
| `src/pages/Vintography.tsx` | `getOperationLabel()` | "Steaming & pressing garment..." |
| `src/pages/Vintography.tsx` | Operation card render | Full-width card below 2×2 grid |
| `src/pages/Vintography.tsx` | Intensity selector UI | 3-option card strip inside `AnimatePresence` |
| `src/components/vintography/ComparisonView.tsx` | Tips | Add `decrease` tip array |

---

## What It Looks and Feels Like

1. User lands on Photo Studio with a creased garment photo
2. They scroll down past the 4 operation cards and see the **full-width "Steam & Press" card** — visually distinct, with a wrinkle-to-smooth gradient and a "New ✦" badge
3. They click it — it selects and expands to reveal a simple 3-card intensity picker (Light / Standard / Deep) with a one-line description of each
4. They hit Generate — the flash model completes in ~12-18 seconds
5. The comparison view loads — they drag the overlay slider and see the garment transform from creased to smooth
6. They download or save to item

Total user time from "noticing the tool" to "processed photo": under 45 seconds including upload.

---

## Edge Cases and Guards

- **Completely smooth garment photo**: The model will correctly detect no significant creases and return an image near-identical to the input. No harm done, 1 credit used.
- **Photo with intentional distressing (vintage denim)**: The "light" intensity option handles this — it's described as preserving "deliberate faded or distressed areas (important for denim/vintage)". The standard prompt also includes this.
- **Non-garment photo**: The `GARMENT_PRESERVE` mandate ensures the model won't do anything destructive. It may just enhance without major change.
- **Logos and prints**: `GARMENT_PRESERVE` is explicitly included in the prompt — this prevents the model from smoothing away logos or prints thinking they're "wrinkles".
