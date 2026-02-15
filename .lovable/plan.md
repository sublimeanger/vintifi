# Vintography World-Class Upgrade

## Current State

Vintography has 4 operations (Remove BG, Smart BG, Virtual Model, Enhance) with minimal configuration options:

- Virtual Model: only gender (male/female) and pose (standing/walking/casual) via plain dropdowns
- Smart BG: only 5 text-based options in a dropdown (studio, wooden floor, outdoor, marble, vintage)
- No visual previews of what you're selecting
- Generic AI prompts that produce inconsistent results

## What Best-in-Class Tools Offer (WearView, Photoroom, Claid)

- Visual model picker with ethnicity, body type, age, and pose selection
- 100+ background scenes with thumbnail previews
- Ghost mannequin removal
- Flat-lay to on-model conversion
- Consistent model personas across products
- Style-aware prompts that preserve garment details (logos, prints, textures)

## Upgrade Plan

We will keep the same Gemini models (no new APIs needed) but dramatically improve the UI and prompt engineering.

### 1. Visual Model Picker (replaces plain dropdowns)

Replace the current gender/pose dropdowns with a rich visual selector card:

**Gender**: Male / Female (toggle buttons with icons)

**Model Look** (new - visual grid of 6 options):

- Classic (clean-cut, neutral styling)
- Editorial (high-fashion feel)
- Streetwear (urban, casual)
- Athletic (sporty, activewear)
- Mature (35-45 age range)
- Youthful (18-25 age range)

**Pose** (expanded from 3 to 6 with descriptive labels):

- Standing front
- Standing angled (3/4 view)
- Walking
- Casual leaning
- Seated
- Action/movement

**Background for model shots** (new):

- White studio (default)
- Grey gradient
- Urban street
- Park/outdoor
- Brick wall
- Plain coloured (user picks colour)

All options displayed as labelled icon cards in a responsive grid rather than dropdowns.

### 2. Smart Background Visual Gallery (replaces dropdown)

Expand from 5 to 12 background scenes, displayed as a scrollable visual grid with thumbnail previews:

- **Studio** - Clean white/grey gradient
- **Wooden Floor** - Warm wood surface
- **Marble** - Elegant white marble
- **Outdoor** - Natural greenery bokeh
- **Vintage** - Warm retro textures
- **Concrete** - Industrial minimalist (new)
- **Linen/Fabric** - Soft textile surface (new)
- **Seasonal: Summer** - Bright beach/sunny (new)
- **Seasonal: Autumn** - Warm leaves/cozy (new)
- **Seasonal: Winter** - Cool tones/festive (new)
- **Lifestyle: Bedroom** - Casual home setting (new)
- **Lifestyle: Cafe** - Coffee shop vibe (new)

Each option rendered as a small card with a colour swatch/icon and label.

### 3. New Operation: Ghost Mannequin Removal

Add a 5th operation specifically for sellers who photograph on mannequins/hangers:

- Takes a mannequin/hanger photo and makes the garment appear to float naturally
- Creates a "hollow man" effect used by professional fashion retailers
- Available on Pro tier and above

### 4. New Operation: Flat-Lay Styling

Add a 6th operation for flat-lay photos:

- Takes a basic flat-lay photo and enhances it with props, shadows, and styling
- Options: Minimal (clean), Styled (with accessories), Seasonal (themed)
- Available on Free tier

### 5. Enhanced Prompts (Edge Function)

Rewrite all AI prompts with fashion-photography-specific language:

- Explicitly instruct preservation of logos, prints, textures, stitching, and brand markers
- Specify lighting direction, shadow quality, and colour accuracy
- Add garment-type awareness (the prompt adapts if user specifies tops vs shoes vs accessories)
- Model shot prompts include skin tone diversity, natural body proportions, and realistic fabric draping instructions

### 6. Quick Presets Expansion

Expand from 3 to 5 presets:

- **Marketplace Ready** (Remove BG + Enhance) - Free
- **Lifestyle Shot** (Smart BG + Enhance) - Pro
- **Premium Listing** (Model Shot + Enhance) - Business
- **Ghost to Clean** (Ghost Mannequin + Remove BG) - Pro (new)
- **Full Studio** (Remove BG + Smart BG + Enhance) - Business (new)

### 7. UI Layout Improvements

- Operations displayed as a horizontal scrollable strip on mobile (instead of 2x2 grid that pushes content down)
- Parameter panels use visual grids with icon cards instead of dropdowns
- Add animated micro-interactions when selecting options
- "Before/After" comparison gets a swipe gesture on mobile (touch-friendly)

## Technical Details

### Files Modified

`**supabase/functions/vintography/index.ts**`:

- Add `ghost_mannequin` and `flatlat_style` to `OPERATION_PROMPTS`
- Expand `smart_bg` styles from 5 to 12
- Add `model_look` and `model_bg` parameters to `model_shot`
- Expand `model_shot` poses from 3 to 6
- Rewrite all prompts with garment-detail preservation language
- Update `TIER_OPERATIONS` to include new operations
- Add `ghost_mannequin` and `flatlay_style` to `MODEL_MAP`

`**src/pages/Vintography.tsx**`:

- Expand `operations` array with 2 new entries
- Add new state for model look, model background
- Expand `bgStyles` to 12
- Replace dropdown-based parameter panels with visual grid selectors
- Add new parameter panel for ghost mannequin and flat-lay

`**src/components/vintography/ModelPicker.tsx**` (new):

- Visual grid component for model configuration
- Gender toggle, look grid, pose grid, background grid
- All as icon/label cards, not dropdowns

`**src/components/vintography/BackgroundPicker.tsx**` (new):

- Visual grid of 12 background options with colour swatches
- Replaces the current Select dropdown

`**src/components/vintography/QuickPresets.tsx**`:

- Add 2 new presets
- Update grid layout for 5 items

`**src/components/vintography/ComparisonView.tsx**`:

- Add touch swipe support for mobile overlay mode

### No Database Changes Required

The existing `vintography_jobs` table stores `parameters` as JSONB, so the new parameters (model_look, model_bg, flatlay_style) are automatically supported.

### No New API Keys Required

All operations use the existing Gemini models via Lovable AI gateway.  
  
I ALSO WANT THE OPTION FOR THE CLOTHING TO BE PUT ON A MANNEQUINN VERY IMPORTANT. 