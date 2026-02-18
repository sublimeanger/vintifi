
# Photo Studio: Comprehensive Options Overhaul

## What's Changing and Why

The current Photo Studio has two critical gaps:

1. **The "info" disclaimer on AI Model Concept** — the ℹ️ banner is distracting and undermines confidence. It gets removed entirely.

2. **The options are generic and confusing** — "Autumn", "Summer", "Bedroom", "Café" as Lifestyle backgrounds tell the user almost nothing. They don't know what they'll get. And crucially, the **entire photorealistic dimension is missing**: sellers taking selfies in their bedroom, mirror shots in their bathroom, styled shots in their kitchen, hand-held lifestyle — these are the photos that perform best on Vinted because they feel *real*. The current system doesn't address this at all.

The overhaul restructures Photo Studio around **four clearly differentiated modes**, dramatically expands the options within each with logical, descriptive names, and introduces a brand new **Photorealistic / Real-Life Selfie** mode.

---

## The Four Modes (Replacing the Current Four)

The current four operations (`clean_bg`, `lifestyle_bg`, `virtual_model`, `enhance`) stay as IDs and edge function operations — no backend breaking changes. The UI labels, descriptions, sub-options, and prompts are all upgraded.

### 1. Clean Background (unchanged in function, polished in label)
No changes needed to core function. Remove the generic description "White or solid background" and replace with something that sells the benefit: **"Pure white — Vinted's favourite"**.

### 2. Lifestyle Scenes (complete overhaul of options)

**Current problem:** 12 options with vague names like "Summer", "Autumn", "Winter", "Bedroom", "Café". Users don't know what these will look like. The preview gradients are meaningless colour blocks.

**Upgraded approach — organised into 3 logical groups with 16 total options:**

**Studio & Clean** (for sellers who want professional but not clinical):
- `studio_white` — "White Studio" (clean seamless backdrop, softbox lit)
- `studio_grey` — "Grey Gradient" (mid-grey with subtle vignette)
- `marble_luxury` — "White Marble" (Carrara marble surface, luxury feel)
- `linen_flat` — "Natural Linen" (Belgian linen texture, warm side-light)

**Indoor Lifestyle** (specific, recognisable rooms):
- `living_room_sofa` — "Living Room" (styled sofa, plant, afternoon light)
- `bedroom_mirror` — "Bedroom Mirror" (wall mirror, morning light, aspirational)
- `kitchen_counter` — "Kitchen / Brunch Vibes" (marble counter, coffee, Sunday morning)
- `dressing_room` — "Dressing Room" (clothing rail, full-length mirror, warm bulb lighting)
- `reading_nook` — "Reading Nook" (armchair, bookshelves, lamp glow)
- `bathroom_shelf` — "Bathroom Shelf" (clean white tiles, soft vanity lighting)

**Outdoor & Location**:
- `golden_hour_park` — "Golden Hour Park" (bokeh green foliage, warm rim light)
- `city_street` — "City Street" (blurred urban architecture, natural daylight)
- `beach_summer` — "Beach / Summer" (sand, turquoise bokeh ocean)
- `brick_wall` — "Brick Wall" (red-brown brick, editorial)
- `autumn_leaves` — "Autumn Leaves" (golden leaves on ground, warm ambient)
- `christmas_market` — "Winter Market" (fairy lights bokeh, cold air atmosphere)

Each option gets a **descriptive subtitle** (e.g. "Perfect for streetwear and vintage") instead of a vague label. Options are grouped with section headers inside the picker.

### 3. Photorealistic / Real-Life (BRAND NEW — this is the missing piece)

**Replaces the current "AI Model Concept"** approach for users who want images that look like *real photos*, not AI-generated. The current Virtual Model mode is labelled "AI concept" with a disclaimer — it's underpowered for what sellers actually need.

This new mode is split into **three distinct sub-modes** via tabs within the operation:

**Sub-mode A: Selfie Style**
The user's garment is shown as if photographed in a real everyday environment by a real person. No AI-generated model face — instead, a photorealistic environment is created around the garment as worn:
- `mirror_selfie_bedroom` — "Bedroom Mirror Selfie" (natural morning light, messy-but-aspirational room in background, phone visible at angle like a real selfie)
- `mirror_selfie_bathroom` — "Bathroom Mirror" (clean white tiles, vanity light, honest and relatable)
- `fitting_room` — "Fitting Room" (retail fitting room curtain, honest and authentic)
- `hand_held_outside` — "Outdoor Hand-held" (outside in daylight, held at arm's length, natural candid look)

**Sub-mode B: AI Model Concept** (kept from existing, with upgraded options and removed disclaimer)
Full-figure model shot. Same gender/look/pose options but with massively upgraded backgrounds to match the new Lifestyle list.

Updated backgrounds for model shots:
- `white_studio`, `grey_studio` — Clean studio options
- `living_room`, `city_street`, `golden_park`, `brick_wall`, `dressing_room` — matching Lifestyle backgrounds

**Sub-mode C: Flat-Lay Pro**
(Currently a hidden edge function operation `flatlay_style` — bring this to the surface in the UI)
- `minimal_white` — "Clean White" (professional flat-lay, white, no props)
- `styled_accessories` — "Styled with Accessories" (curated props: sunglasses, watch, wallet)
- `seasonal_props` — "Seasonal Styled" (leaves, flowers, seasonal elements)
- `denim_denim` — "Denim on Denim" (textured fabric background)
- `wood_grain` — "Wood Surface" (warm oak surface, overhead)

### 4. Enhance (polished label and description)

Current function is solid. Just upgrade the label and detail copy. Replace the generic description with: **"Pro retouch — fix lighting, sharpen details, boost colours"**. This sets clear expectations. No changes to the underlying prompt or edge function.

---

## Info Banner Removal

The specific line to remove from `ModelPicker.tsx`:
```
<p className="text-[10px] text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1.5 leading-relaxed">
  ℹ️ The AI creates a concept based on your garment style. Exact details like logos and prints may differ slightly from the original.
</p>
```

This is deleted entirely. The "AI concept" badge already exists on the operation card in the main grid — that's sufficient context.

---

## UI Architecture Changes

### BackgroundPicker.tsx — Complete Rebuild
Current: 12 options in a flat grid.
New: Grouped sections with section headers:
```
[Studio & Clean]    [Indoor Lifestyle]    [Outdoor & Location]
```
Each option shows:
- A colour swatch (more accurate gradient representing the actual scene)
- A bold label
- A 1-line description beneath ("Cosy sofa, afternoon light" not just "Bedroom")

### ModelPicker.tsx — Remove Disclaimer, Expand Backgrounds
- Delete the ℹ️ paragraph entirely
- Expand `bgOptions` to match the new Lifestyle backgrounds (12 options instead of 5)
- Add a `selfieStyle` sub-mode tab at the top of the Model Configuration card

### Vintography.tsx — New Sub-mode Architecture
When `virtual_model` is selected, instead of just showing the ModelPicker, show a **tab strip** at the top:
```
[ Selfie Style | AI Model | Flat-Lay Pro ]
```
Each tab shows its specific picker UI:
- **Selfie Style**: A grid of 4 selfie-scene cards (bedroom mirror, bathroom mirror, fitting room, outdoor)
- **AI Model**: Existing ModelPicker (without disclaimer)
- **Flat-Lay Pro**: Brings the hidden `flatlay_style` edge function into the UI with 5 options

The `OP_MAP` in the frontend needs updating so Flat-Lay and Selfie routes to the correct edge function operations.

### Operation Cards — Updated Labels
| Old | New |
|-----|-----|
| "Lifestyle" / "AI scene placement" | "Lifestyle Scenes" / "Place in a styled environment" |
| "AI Model Concept" / "AI-generated model shot" | "Photorealistic" / "Model, selfie & flat-lay styles" |
| "Enhance" / "Fix lighting & clarity" | "Enhance" / "Pro retouch, lighting & sharpness" |

---

## Edge Function Changes (`supabase/functions/vintography/index.ts`)

### New Operation: `selfie_shot`
A new prompt and model map entry for the selfie-style operation. This operation is deliberately designed to produce images that look like real phone photography:

```typescript
selfie_shot: (p) => {
  const scene = p?.selfie_scene || "mirror_selfie_bedroom";
  const scenes: Record<string, string> = {
    mirror_selfie_bedroom: `A casual bedroom mirror selfie taken on a smartphone. The background is a real, lived-in bedroom — a made bed with neutral linen bedding, a houseplant, some items on a side table. Natural morning window light from camera-left. The phone is visible at the top of the frame at a natural arm's length angle, as if the person is actually taking the selfie. Slightly imperfect framing — not perfectly centred. The overall vibe is authentic, aspirational, and real. Shot at f/2.2 equivalent with natural phone bokeh on a modern iPhone/Samsung camera.`,
    mirror_selfie_bathroom: `A bathroom mirror selfie. Clean white subway tiles, a vanity light strip above the mirror creating flattering even illumination. The phone visible in the reflection at mid-chest height. Clean, honest, relatable. Background slightly blurred as per phone camera behaviour. A few toiletries on the shelf add authenticity. Daylight bulbs (5000K), bright and clear.`,
    fitting_room: `A retail fitting room photo. A curtained fitting room cubicle, warm overhead LED lighting. Shot from slightly below shoulder height, as if self-photographed. Curtain slightly open behind. The kind of photo you'd see on a real Vinted listing — honest, direct, well-lit. The garment is the clear focus.`,
    hand_held_outside: `An outdoor candid photo taken hand-held on a smartphone at arm's length. Natural daylight, slightly overcast (diffused light, no harsh shadows). A softly blurred street, park, or building in the background. The photo has the energy of a real person photographing their outfit — direct camera angle, slight natural shake suggested by authentic framing. Shot equivalent to f/1.8 on a modern smartphone, background softly defocused.`,
  };
  return `You are simulating a photorealistic smartphone photograph. Create an image that is completely indistinguishable from a real photo taken by a real person — NOT a rendered or AI-generated image. The key is authentic imperfection: real lighting variation, natural depth of field from a phone camera, genuine environment with lived-in details.
  
Scene: ${scenes[scene] || scenes.mirror_selfie_bedroom}
  
PHOTOREALISM MANDATE: This image must pass as a real photograph. No AI rendering artefacts. No perfect symmetry. No studio-clean lighting. Real environments, real lighting physics, real phone camera characteristics (slight lens distortion at edges, natural bokeh shape, authentic skin rendering).
  
${GARMENT_PRESERVE}
${QUALITY_MANDATE}`;
}
```

### Updated `flatlay_style` → exposed in UI as "Flat-Lay Pro"
Already exists in the edge function — just needs surface-level UI connection.

### `MODEL_MAP` additions:
```typescript
selfie_shot: "google/gemini-3-pro-image-preview",
```

### `TIER_OPERATIONS` updates:
```typescript
free: ["remove_bg", "enhance"],
pro: ["remove_bg", "enhance", "smart_bg", "selfie_shot", "flatlay_style", "model_shot"],
business: [...all...],
scale: [...all...]
```

---

## Files to Change

| File | Changes |
|------|---------|
| `src/components/vintography/ModelPicker.tsx` | Remove ℹ️ info paragraph, expand bg options, add selfie sub-mode tab |
| `src/components/vintography/BackgroundPicker.tsx` | Complete rebuild with grouped sections, better labels, richer descriptions |
| `src/pages/Vintography.tsx` | New sub-mode tab strip under virtual_model, update OPERATIONS labels/details, update OP_MAP for selfie/flatlay |
| `supabase/functions/vintography/index.ts` | Add `selfie_shot` operation prompt + MODEL_MAP entry, update TIER_OPERATIONS |

---

## What This Achieves

| Before | After |
|--------|-------|
| 12 confusing Lifestyle options ("Autumn", "Summer") | 16 grouped, clearly described scene options |
| No selfie/real-life photography mode | 4 photorealistic selfie scenes (bedroom mirror, bathroom, fitting room, outdoor) |
| Flat-Lay hidden in edge function | Flat-Lay Pro surfaced as a proper UI option with 5 styles |
| Disclaimer on model shot ("logos may differ") | Removed — replaced by "AI concept" badge only |
| Model backgrounds: 5 basic options | 12 rich options matching the full Lifestyle catalogue |
| Generic "AI scene placement" label | "Lifestyle Scenes" with scene-specific descriptions |
| Virtual Model = one mode | Photorealistic = 3 sub-modes: Selfie, AI Model, Flat-Lay |
