
# Fix: Colour Guardrails + AI Insights "Read More" in Sell Wizard

## What's Broken (Root Cause Analysis)

### Bug 1: AI Invents Wrong Colour
When the user uploads a photo and leaves the Colour field blank, the `optimize-listing` edge function passes `colour: "Not specified"` to the AI. The AI system prompt explicitly instructs: *"Opening: Describe the item naturally. What is it, **what colour**, what brand."* With no colour data provided but a photo attached, the AI looks at the photo and guesses — and can guess wrong (e.g., seeing the Nike logo against a light background and calling a black jumper "grey").

This is a two-part failure:
- Colour is not a required field in Step 1, so users skip it
- The AI prompt instructs the AI to include colour even when it was not provided by the user, leading to hallucination

### Bug 2: AI Insights "Read More" toggle
Looking at the code at lines 977-987, the `insightsExpanded` state and "Read more" button are already implemented. However, the trigger condition `priceResult.ai_insights.length > 160` may be too low — the text uses `line-clamp-3` which can show roughly 200-250 characters depending on screen width, so short insights may show the button unnecessarily. This is a minor polish fix.

---

## The Fix: 3-Part Solution

### Part 1: Make Colour a Required Field with AI Auto-Detection on Photo Upload

**In `SellWizard.tsx` — Step 1 form:**

Add a `Colour` input field to the details form (`renderDetailsForm`). Currently, `colour` exists in the form state but there is no visible input for it in the wizard form — it only gets populated via URL import. The field needs to be surfaced prominently.

Add a "Detect from photo" button next to the Colour field. When the user has uploaded a photo, clicking this button calls a lightweight AI vision check (via the `optimize-listing` edge function in a new `detectColourOnly` mode, or directly via a small Supabase Edge Function call) to detect the primary colour from the uploaded image.

**Alternatively** (simpler and faster): When photos are uploaded in Step 1, automatically trigger a colour detection call using a vision model. This runs in the background and pre-fills the Colour field before the user even sees the details form.

The Colour field should also show a yellow pulsing ring (same as Condition) when it's empty and photos have been uploaded — prompting the user to fill it in.

### Part 2: Strict Guardrails in the `optimize-listing` Edge Function

Three changes to the AI prompt in `supabase/functions/optimize-listing/index.ts`:

**Change 1 — Colour instruction becomes conditional:**
Replace the unconditional "what colour" instruction with a conditional one:

```
COLOUR RULE (CRITICAL):
${colour && colour !== "Not specified"
  ? `The seller has confirmed the colour is: ${colour}. You MUST use this exact colour in the title and description. Do NOT use any other colour.`
  : `The seller has NOT specified a colour. You MUST NOT mention any colour in the title or description. Omit colour entirely. Do NOT guess or infer colour from photos.`
}
```

**Change 2 — Add to banned behaviour list:**
Add a "NEVER INVENT" section to the system prompt:

```
NEVER INVENT:
- NEVER assume or guess the colour if it was not explicitly provided by the seller
- NEVER infer colour from photos (lighting, shadows, and screen calibration make photo colour unreliable)
- NEVER add any attribute (colour, material, style) that the seller did not provide
- If colour is "Not specified", leave it out of title and description entirely
```

**Change 3 — Colour-aware title formula:**
Update the title formula section to make colour conditional:

Replace:
```
[Brand] [Item Type] [Key Detail/Colour] [Size] [Condition Word]
```
With:
```
[Brand] [Item Type] [Colour if provided — omit if not] [Size] [Condition Word]
```

### Part 3: Colour Field UI in Step 1 Wizard Form

**In `renderDetailsForm()`** — add a full-width Colour field (currently the field exists in state but has no UI input):

- Position: below the Size/Brand row, as a full-width text input (or a colour chip selector for common colours)
- Label: "Colour" with a "(helps AI accuracy)" hint
- When photos are uploaded and colour is blank: show a subtle "Detect from photo" button that calls a quick vision check
- When colour is blank and photos exist: show the same yellow pulsing ring treatment as the Condition field

**UI for colour chips** (optional enhancement): show a horizontal scroll of colour chips (Black, White, Grey, Navy, Blue, Green, Red, Pink, Brown, Beige, Cream, Purple, Yellow, Orange, Multi) as quick-tap options, with a text override. This makes filling in colour fast and eliminates typos.

---

## Files to Change

| File | Change |
|------|---------|
| `supabase/functions/optimize-listing/index.ts` | Add conditional colour rule, NEVER INVENT section, colour-aware title formula |
| `src/pages/SellWizard.tsx` | Add Colour field to `renderDetailsForm`, yellow pulsing ring when colour blank + photos exist, "Detect from photo" button logic, pass `colour` from `form` not just `createdItem` to optimise call |

---

## Technical Details

### Colour Detection Flow

When user uploads photos in Step 1 (photo entry method), after photos are set via `handlePhotoSelect`, trigger a background colour detect:

```typescript
const detectColourFromPhoto = async (photoUrl: string) => {
  // Only run if colour is still blank
  if (form.colour) return;
  setColourDetecting(true);
  const { data } = await supabase.functions.invoke("optimize-listing", {
    body: {
      photoUrls: [photoUrl],
      detectColourOnly: true,  // new lightweight mode flag
    },
  });
  if (data?.detected_colour) {
    setForm(f => ({ ...f, colour: data.detected_colour }));
    toast.success(`Colour detected: ${data.detected_colour}`);
  }
  setColourDetecting(false);
};
```

In `optimize-listing`, handle `detectColourOnly: true` — send only the photo to the vision model with a minimal prompt asking for the primary colour, return just `{ detected_colour: "Black" }`. This costs minimal credits and runs in ~1 second.

### State Additions to SellWizard

```typescript
const [colourDetecting, setColourDetecting] = useState(false);
// Computed: true when photos exist but colour is blank
const colourNeedsAttention = photoUrls.length > 0 && !form.colour && !colourDetecting;
```

### Colour Pulsing Ring (same CSS as Condition)

Apply the same `condition-pulse` animation already defined in `src/index.css` to the Colour input when `colourNeedsAttention` is true. The ring clears as soon as colour is filled.

### guardrail in prompt — exact wording

In the optimize-listing system prompt, change:

**Before:**
```
Colour: ${colour || "Not specified"}
```

**After:**
```
Colour: ${colour || "NOT PROVIDED — DO NOT INCLUDE COLOUR IN TITLE OR DESCRIPTION"}
```

And in the title formula instructions, add:

```
CRITICAL COLOUR RULE: If the Colour field above says "NOT PROVIDED", you MUST omit colour 
from the title entirely. The formula becomes: [Brand] [Item Type] [Size] [Condition Word].
Never substitute a guessed colour. The seller will be angry if you get the colour wrong.
```

---

## Expected Outcome

| Scenario | Before | After |
|----------|--------|-------|
| Black jumper, colour field blank | AI guesses "Grey" from photo | AI omits colour: "Nike Crewneck Jumper M Very Good" |
| Black jumper, colour = "Black" entered | AI uses "Black" correctly | AI uses "Black" correctly |
| Photo uploaded | No colour detection | Background colour detect auto-fills "Black" |
| Colour field | Hidden (no UI) | Visible with colour chip selector + detect button |

The primary fix is the guardrail in the edge function: if colour is not explicitly provided, the AI must not mention any colour. This is a one-line change with massive impact — it prevents hallucination from photos where lighting, shadows, and screen calibration make colour detection unreliable.
