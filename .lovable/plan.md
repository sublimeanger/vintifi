
# Photo Studio Upgrade: Remove Selfie Mode + Massively Expanded Mannequin + Photorealistic AI Model

## Full System Analysis

### Current State

The "Photorealistic" operation has 3 sub-modes in a tab strip:
1. **Selfie Style** — 4 scenes: Bedroom Mirror, Bathroom Mirror, Fitting Room, Outdoor. Maps to `selfie_shot` in the edge function.
2. **AI Model** — Uses `ModelPicker` with gender, look, pose, and background. Maps to `model_shot`.
3. **Flat-Lay Pro** — 5 styles. Maps to `flatlay_style`.

The `mannequin_shot` operation **already exists in the edge function** (with a basic prompt) but is **completely absent from the UI**. It's dead code — only accessible if you know the operation name and call the function directly.

### The Problems You've Identified

1. **Selfie mode cuts off the garment** — The phone being "visible at the top of the frame" and mirror selfie framing inherently clips the garment. A mirror selfie is portrait-cropped and the phone arm obscures the top of the item.

2. **Selfie ≠ a distinct category anymore** — If we make the AI Model tab produce photorealistic, natural-looking shots in real-world settings (a park, a dressing room, brick wall), the selfie mode offers nothing unique that can't be done better without the phone-in-frame constraint. It should be dissolved into better AI Model backgrounds.

3. **Mannequin is completely missing from UI** — Yet it's a hugely valuable shot type: neutral, shows garment shape perfectly, no body proportion concerns, works for any gender of clothing, beloved by professional resellers.

---

## What Changes

### 1. Remove the Selfie Tab entirely

Delete the `selfie` tab from the 3-tab strip in `Vintography.tsx`. This removes:
- The `SELFIE_SCENES` array
- The `PhotorealisticTab = "selfie" | "ai_model" | "flatlay"` type (becomes `"ai_model" | "flatlay" | "mannequin"`)
- The `selfieScene` state and the `selfie` branch in `getParams()` / `getOperation()`
- The `selfie_shot` operation path

The edge function `selfie_shot` prompt can remain in the function for legacy gallery jobs to still display correctly — we just stop dispatching new ones from the UI.

### 2. Add a "Mannequin" tab — fully expanded

The 3-tab strip becomes:
```
[ AI Model ]  [ Flat-Lay Pro ]  [ Mannequin ]
```

The Mannequin tab is **comprehensively designed** — not the sparse 2-option version in the current edge function. Here's what it exposes:

**Mannequin Type** (new dimension)
- `headless` — Classic retail headless mannequin (matte white, no face). Industry standard. Clean, no distraction.
- `ghost` — Ghost/invisible mannequin effect. Garment floats in 3D as if worn by an invisible person. Premium e-commerce look (think Net-a-Porter, ASOS).
- `dress_form` — Traditional fabric-covered dress form / tailor's dummy. More artisanal, craft-studio feel.
- `half_body` — Waist-up mannequin only. Ideal for tops, jackets, shirts.

**Setting/Environment** (7 options, reusing `model_bg` state)
- Studio White, Grey Studio (already in ModelPicker)
- Living Room, Dressing Room, Brick Wall (lifestyle options)
- Flat surface (marble/wood — for ghost mannequin especially)
- Outdoor / Park

**Lighting Style** (new dimension — 3 options)
- `soft_studio` — Wraparound even lighting, no shadows. Clean e-commerce.
- `dramatic` — Single key light from one side, visible shadows for editorial feel.
- `natural` — Simulated window light, warm and organic.

**New state variables:**
```tsx
const [mannequinType, setMannequinType] = useState<string>("headless");
const [mannequinLighting, setMannequinLighting] = useState<string>("soft_studio");
// Reuses modelBg for the environment/background
```

### 3. Upgrade the AI Model tab — add "Natural / Photorealistic" looks

The current AI Model tab exposes: Gender, Model Look (6 options), Pose (6 options), Background (8 options).

The issue is the AI generates photo-studio style shots by default. We're adding a **"Shot Style"** dimension that directly addresses your request for photorealistic natural shots:

**New "Shot Style" selector (3 options):**
- `editorial` — Clean studio/editorial. Professional background lighting. Think campaign imagery. *(Current default behaviour)*
- `natural_photo` — Photorealistic documentary feel. Natural light, real-world setting. Looks like an actual photo taken in that location, not a studio composite.
- `street_style` — Authentic street photography energy. Candid framing, natural pose, urban environment. Think real influencer photo.

This replaces what selfie mode was trying to do — but WITHOUT the phone in frame, without the garment being cut off, and with far better results because the full body is always in frame.

**Also add to AI Model tab: Full-body mandate switch**

A simple toggle: **"Always show full garment"** (on by default). When on, injects into the prompt:
```
CRITICAL COMPOSITION RULE: The model's full body must be visible from head to toe with the complete garment visible. Never crop the garment. The bottom hem must be visible. Leave deliberate negative space below the hem.
```

This is the direct fix for the garment visibility problem across all model shots.

### 4. Upgrade the edge function prompts

#### `model_shot` — Three major upgrades:

**A. Add `shot_style` parameter to the prompt:**
```
shot_style: "natural_photo" →
PHOTOREALISM MANDATE: This image must be completely indistinguishable from a real photograph taken by a professional photographer on location. Natural light physics, real environment texture, authentic depth of field. NO studio compositing artefacts. The model should look like they genuinely exist in this environment.
```

**B. Add the full-body/garment visibility mandate:**
```
COMPOSITION (NON-NEGOTIABLE): The model must be framed head-to-toe. The complete garment from neckline to hem must be fully visible. Never crop the garment. If the background is tight, zoom out. The garment is the product — it must be entirely in frame.
```

**C. Tighten the "5 fingers" / face realism instruction** — these are the main failure modes.

#### `mannequin_shot` — Complete rewrite:

The current mannequin prompt is ~5 lines. Replace with a fully specified prompt that maps to all the new parameters:

```typescript
mannequin_shot: (p) => {
  const mannequinType = p?.mannequin_type || "headless";
  const bg = p?.model_bg || "studio";
  const lighting = p?.lighting_style || "soft_studio";

  const types = {
    headless: "a professional retail display mannequin — sleek, matte white/light grey, headless (no head or neck), with realistic torso, arms, and legs proportioned for an adult. The mannequin should look like a high-end boutique display fixture.",
    ghost: "an invisible/ghost mannequin effect. The garment should appear to float in perfect 3D shape as if worn by an invisible person. Fill the interior of the garment at necklines, sleeve openings, and waistbands with realistic fabric continuation showing the garment's natural inner structure. The result should match Net-a-Porter or ASOS premium product imagery.",
    dress_form: "a traditional tailor's dress form / seamstress dummy — fabric-covered in natural linen or canvas colour. Mounted on a simple black iron stand. The form should look authentic and artisanal, used in a real atelier or dressing room.",
    half_body: "a professional waist-up half-body retail display mannequin — headless, matte white, realistic torso and arm proportions. Perfect for displaying tops, jackets, and shirts."
  };

  const lightings = {
    soft_studio: "perfectly even wraparound studio lighting with two softboxes camera-left and camera-right. No harsh shadows. Clean, bright, professional e-commerce product lighting.",
    dramatic: "a single strong key light from 45° camera-left creating defined, dramatic shadows that give the garment dimension and depth. Fill light only at 1/4 the key light power. Editorial and impactful.",
    natural: "warm, soft window-simulated natural light from camera-left. The light has the quality of afternoon sun through a sheer curtain — directional but diffused. Slightly warm (4000K) colour temperature."
  };

  // ... background map same as model_shot ...

  return `Display this clothing/fashion garment on ${types[mannequinType]}.

GARMENT DISPLAY:
- The garment must be positioned perfectly centred on the mannequin with natural fabric drape and realistic weight
- Show the complete garment from neckline to hem — never crop the garment
- Fabric should show natural gravity, proper drape based on weight, and realistic wrinkle physics
- All buttons, zippers, and closures should be in their natural wearing position

LIGHTING: ${lightings[lighting]}

BACKGROUND: ${bgs[bg]}

SHADOW: Cast a realistic, soft shadow beneath the mannequin that grounds it in the scene convincingly.

${GARMENT_PRESERVE}
${QUALITY_MANDATE}`;
};
```

### 5. UI Changes in `Vintography.tsx`

**Tab strip update:**
```tsx
// REMOVE: value="selfie" tab
// KEEP: value="ai_model" tab
// KEEP: value="flatlay" tab  
// ADD: value="mannequin" tab with Package icon
```

**New type:**
```tsx
type PhotorealisticTab = "ai_model" | "flatlay" | "mannequin";
```

**Default tab:** Change from `"selfie"` to `"ai_model"`.

**AI Model tab — add Shot Style picker above the ModelPicker:**
- 3 cards: Editorial, Natural Photo, Street Style
- Toggle: "Full garment always visible" (default: on)
- New state: `modelShotStyle`, `modelFullBody`

**Mannequin tab — new UI section:**
- Mannequin Type selector (4 options with icons and descriptions)
- Lighting Style selector (3 options)
- Background selector (reuse `modelBg` state — shares with AI Model)

**`getOperation()` update:**
```tsx
// Remove selfie branch
if (photoTab === "mannequin") return "mannequin_shot";
```

**`getParams()` update:**
```tsx
if (photoTab === "mannequin") {
  params.mannequin_type = mannequinType;
  params.lighting_style = mannequinLighting;
  params.model_bg = modelBg; // reused
}
if (photoTab === "ai_model") {
  params.gender = modelGender;
  params.pose = modelPose;
  params.model_look = modelLook;
  params.model_bg = modelBg;
  params.shot_style = modelShotStyle;       // NEW
  params.full_body = modelFullBody ? "true" : "false"; // NEW
}
```

### 6. Tier access update

Add `mannequin_shot` to the pro tier (currently it's only on business/scale):

```typescript
pro: ["remove_bg", "enhance", "smart_bg", "flatlay_style", "model_shot", "mannequin_shot"],
```

Rationale: Selfie mode was on pro. Mannequin replaces it. Pro users shouldn't lose a feature tier.

---

## Summary of Files Changed

| File | What changes |
|------|-------------|
| `src/pages/Vintography.tsx` | Remove selfie tab/state/logic; add mannequin tab with type + lighting pickers; add Shot Style + full-body toggle to AI Model tab; update type, default state, getOperation, getParams |
| `src/components/vintography/ModelPicker.tsx` | No change needed — the mannequin UI is built inline in Vintography.tsx since it has distinct dimensions |
| `supabase/functions/vintography/index.ts` | Rewrite `mannequin_shot` prompt with full type/lighting/bg support; upgrade `model_shot` prompt with `shot_style`, `full_body` mandate; add `mannequin_shot` to pro tier; keep `selfie_shot` prompt for legacy gallery |

---

## What the Experience Looks Like After

**Before:** 3 tabs — Selfie (problematic, cuts garment), AI Model, Flat-Lay

**After:** 3 tabs — AI Model (with natural/street style options + full-body guarantee), Flat-Lay, Mannequin

- A seller with a dress can choose: **AI Model → Female, Natural Photo, Walking, Golden Park** — gets a full-length photorealistic shot of someone wearing the dress in a park, full garment visible, no studio feel.
- A seller wanting clean product shots can choose: **Mannequin → Headless, Studio White, Soft Lighting** — gets a retail-standard mannequin shot indistinguishable from ASOS.
- A designer piece seller can choose: **Mannequin → Ghost, Living Room, Natural Lighting** — gets an invisible mannequin floating in a lifestyle setting, premium e-commerce look.
- All shots: **garment is always fully in frame**. No cropping. No phone in view. No missing hems.
