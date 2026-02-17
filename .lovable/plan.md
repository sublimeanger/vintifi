

# Photo Studio Revamp: Fixing the Garment Fidelity Problem

## The Problem

The Virtual Model operation tells the AI to put a model "wearing this exact garment," but generative image models like Gemini don't copy the garment pixel-perfectly -- they **re-imagine** it based on the prompt. This means a Nike crewneck sweatshirt can become a Nike hoodie, colours shift, logos move, and details are lost. This is a fundamental limitation of text-to-image generation, not a prompt-tuning issue.

## The Solution: A Three-Part Revamp

### 1. Inject Garment Context Into Prompts

When Photo Studio is opened from an item (via `itemId`), the system already loads the item data but only uses `image_url` and `images`. We will also load the item's `title`, `brand`, `category`, and `description` and inject these details directly into the AI prompt so it knows *exactly* what the garment is.

**Before:** "Create a photo of a model wearing this exact garment"
**After:** "Create a photo of a model wearing this Nike crewneck sweatshirt (Menswear, size M, good condition). NOT a hoodie, NOT a jacket -- a crew-neck sweatshirt with no hood and a round neckline..."

This won't guarantee perfection, but it dramatically reduces misidentification.

### 2. Add a Garment Description Input for Standalone Use

When users upload photos without linking to an item, add a small optional text field: **"Describe your item"** (e.g., "Black Nike crewneck sweatshirt, size M"). This text gets injected into the prompt as explicit garment identity context. For item-linked usage, this auto-fills from the listing data.

### 3. Set Honest Expectations in the UI

- Rename "Virtual Model" to **"AI Model Concept"** with updated description: "AI-generated model wearing your style of garment"
- Add a small disclaimer badge on the Virtual Model card: "AI interpretation -- garment details may vary"
- Update the processing tips for virtual_model to be honest about the capability
- Add a post-result feedback nudge: "Not quite right? Try **Clean Background** or **Enhance** for pixel-perfect results"

## Technical Changes

### Edge Function (`supabase/functions/vintography/index.ts`)

- Accept a new optional `garment_context` field in the request body (string)
- Inject the garment context into the `model_shot` prompt as an explicit garment identity block with negative instructions (e.g., "This is NOT a hoodie")
- Also inject into `smart_bg` and `flatlay_style` prompts for consistency
- Strengthen the `GARMENT_PRESERVE` constant with explicit anti-hallucination language

### Frontend (`src/pages/Vintography.tsx`)

- Extend the item data fetch to load `title`, `brand`, `category`, `description` from the listing
- Add a `garmentContext` state variable that auto-populates from item data
- Add a small text input below the operation cards (visible for `virtual_model`, `lifestyle_bg`, `flatlay_style`) for manual garment description
- Pass `garment_context` in the `processImage` call
- Rename "Virtual Model" label to "AI Model Concept" and update description/detail text
- Add a disclaimer `Badge` on the Virtual Model operation card

### ComparisonView (`src/components/vintography/ComparisonView.tsx`)

- Update the `TIPS` for `virtual_model` to set honest expectations
- Add a post-result suggestion when operation is `virtual_model`: "For pixel-perfect results, try Clean Background or Enhance instead"

### Model Picker (`src/components/vintography/ModelPicker.tsx`)

- Add a small info note at the top: "The AI creates a concept based on your garment style. Exact details like logos may differ."

## Summary of Files Changed

| File | Change |
|------|--------|
| `supabase/functions/vintography/index.ts` | Accept `garment_context`, inject into prompts, strengthen anti-hallucination language |
| `src/pages/Vintography.tsx` | Load item metadata, add garment description input, rename Virtual Model, pass context to edge function |
| `src/components/vintography/ComparisonView.tsx` | Update tips, add post-result suggestion for model shots |
| `src/components/vintography/ModelPicker.tsx` | Add expectation-setting info note |

