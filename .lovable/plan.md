
# Fix Photo Studio Economics — Mannequin to Flash + AI Model as Premium Separated Section

## What's Happening & Why

Right now, the `MODEL_MAP` in the edge function routes three operations to the expensive `google/gemini-3-pro-image-preview` model:

- `model_shot` → Gemini 3 Pro (~£0.20–0.30 per generation)
- `mannequin_shot` → Gemini 3 Pro (~£0.20–0.30 per generation)
- `selfie_shot` → Gemini 3 Pro (~£0.20–0.30 per generation)

Everything else already uses `google/gemini-2.5-flash-image` (~£0.01–0.02 per generation).

**The mannequin fix is a one-line change.** Mannequin shots render a garment onto a headless form or ghost shape — there is no photorealistic human face or skin involved. Flash handles this at the same quality level. This saves ~93% per mannequin generation.

**AI Model shots are different.** They generate a full photorealistic human wearing the garment. This genuinely needs the Pro model. The answer isn't to remove it — it's to make the economics work by charging 4 credits, positioning it correctly as a premium feature, and educating users on when it's worth using.

## Credit Economics Check — Is 4 Credits Right?

Working from the Pro tier to sense-check:
- Pro tier (£9.99): 50 credits → £0.20 per credit in revenue
- 4 credits charged = £0.80 revenue per AI Model shot
- API cost = £0.20–0.30 per generation
- **Gross margin per AI Model shot: 62–73%** — always profitable, no downside scenario

Compared to current situation:
- 1 credit charged = £0.20 revenue
- API cost = £0.20–0.30
- **Current margin: -0% to -50%** — we lose money on every single AI Model shot

4 credits is the right number. It's the minimum that guarantees profitability across all tiers.

## Technical Changes

### 1. Edge Function — `supabase/functions/vintography/index.ts`

**MODEL_MAP change:**
```
mannequin_shot: "google/gemini-2.5-flash-image"  // was gemini-3-pro-image-preview
selfie_shot: "google/gemini-2.5-flash-image"      // was gemini-3-pro-image-preview
model_shot: "google/gemini-3-pro-image-preview"   // stays on Pro — justified at 4 credits
```

**Credit deduction logic — add weighted deduction:**
Currently line 590: `vintography_used: used + 1`

We need to change this to check the operation and deduct 4 credits for `model_shot`, 1 credit for everything else:
```
const creditsToDeduct = operation === "model_shot" ? 4 : 1;
vintography_used: used + creditsToDeduct
```

We also need to update the credit check gate (currently line 463–471) to check remaining credits are sufficient:
- For `model_shot`: check `totalUsed + 4 <= limit` 
- For everything else: check `totalUsed + 1 <= limit`

**TIER_OPERATIONS — no change needed.** `model_shot` already requires `pro` tier minimum.

### 2. UI — `src/pages/Vintography.tsx`

**The key UI change:** Move AI Model out of the "Photorealistic" tab panel and into its own dedicated section, visually separated from the 1-credit operations.

**Current layout:** 4 operation cards (2×2 grid) + Steam & Press full-width + tabs inside the Photorealistic card (AI Model | Flat-Lay | Mannequin)

**New layout:**
```
[Clean BG] [Lifestyle Scenes]     ← 1 credit each
[Flat-Lay Pro] [Mannequin]        ← 1 credit each
[Steam & Press ————————————]     ← 1 credit, full-width

───── PREMIUM AI FEATURE ─────
[AI Model Shot — Powered by our most advanced AI]  ← 4 credits, own card with premium styling
```

The AI Model card needs:
- Distinct visual treatment (subtle gradient border, premium feel — not the same grey card as the others)
- "4 credits" badge clearly visible (instead of "1")
- A "When to use this" section with 3–4 bullet points explaining its value proposition
- The existing ModelPicker config shows when this card is selected

**The `OP_MAP` and `getOperation()` logic needs updating** because currently `virtual_model` maps to different operations based on `photoTab`. After the refactor:
- `clean_bg` → `remove_bg` (unchanged)
- `lifestyle_bg` → `smart_bg` (unchanged)  
- `flatlay` → `flatlay_style` (was inside virtual_model tab)
- `mannequin` → `mannequin_shot` (was inside virtual_model tab)
- `ai_model` → `model_shot` (was inside virtual_model tab, now its own top-level operation)
- `enhance` → `enhance` (unchanged)
- `decrease` → `decrease` (unchanged)

So `Operation` type changes from `"clean_bg" | "lifestyle_bg" | "virtual_model" | "enhance" | "decrease"` to `"clean_bg" | "lifestyle_bg" | "flatlay" | "mannequin" | "ai_model" | "enhance" | "decrease"`.

The `photoTab` state and `PhotorealisticTab` type are no longer needed — they get removed.

**Credit indicator in Generate button:** When `selectedOp === "ai_model"`, the Generate button shows "Generate · 4 credits" and the processing label adapts.

**Toast update:** When AI Model completes, the toast reads "Done! −4 credits used" instead of "−1 credit used".

**`processImage()` call:** Pass the credits deducted back from the edge function response and update the toast dynamically.

## Files to Change

| File | Change |
|---|---|
| `supabase/functions/vintography/index.ts` | Switch `mannequin_shot` and `selfie_shot` to Flash model; add weighted credit deduction (4 for `model_shot`, 1 for everything else); update credit sufficiency check before processing |
| `src/pages/Vintography.tsx` | Remove `virtual_model` operation and `photoTab` state; add `flatlay`, `mannequin`, `ai_model` as top-level operations; restructure operation cards into standard section + premium AI Model section; update `OP_MAP`, `getOperation()`, credit badge display, Generate button label, and toast message |

## UI Detail — The AI Model Premium Card

The card will look distinct from the standard operations:

```
┌─────────────────────────────────────────────────────────────┐
│  ✦ PREMIUM AI FEATURE                                        │
│                                                              │
│  AI Model Shot                              [4 credits]      │
│  Generate a photorealistic model wearing your garment        │
│                                                              │
│  Best for:                                                   │
│  • Designer & premium items (£30+) — justify the price       │
│  • Items where fit & drape are the selling point             │
│  • Hero photos on your listing's first position              │
│  • Brands that buyers want to see "worn" (Nike, Levi's, etc) │
│                                                              │
│  [Shot Style picker + ModelPicker config when selected]      │
└─────────────────────────────────────────────────────────────┘
```

The card uses a subtle `from-primary/5 to-purple-50/10` gradient background and a `border-primary/30` ring to visually separate it from the standard white cards, making the premium nature immediately obvious without being loud.

## What Doesn't Change

- All existing AI model shot prompts — quality stays identical
- Mannequin prompts — same quality, just routed to a cheaper model that handles it equally well
- All other operations — untouched
- The ModelPicker component — reused as-is
- Tier gating — `model_shot` still requires Pro+ tier
- Gallery and save-to-item functionality — unchanged
