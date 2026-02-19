

## Fix Ghost Mannequin Quality + Credit Cost Update

### Problem
The "Ghost to Clean" preset produces poor results because it chains two AI generation passes (mannequin_shot + remove_bg), each degrading the garment. The mannequin_shot prompt is too long with competing mandates, and the dedicated ghost_mannequin operation was locked to Business tier.

### Changes

**1. Rewrite ghost_mannequin prompt** (`supabase/functions/vintography/index.ts`)
- Replace the existing ~10-line generic ghost_mannequin prompt with a shorter, focused prompt that specifically instructs:
  - Remove mannequin/hanger/support, keep garment in 3D worn shape
  - Fill neckline, sleeve, and hem openings with interior fabric views
  - Pure white background with soft grounding shadow
  - Uses existing GARMENT_PRESERVE and NO_TEXT constants

**2. Add ghost_mannequin to Pro tier** (`supabase/functions/vintography/index.ts`)
- Move from Business-only to Pro tier access
- Before: `pro: ["remove_bg", "enhance", "decrease", "smart_bg", "flatlay_style", "mannequin_shot", "selfie_shot"]`
- After: adds `"ghost_mannequin"` to the pro array

**3. Set ghost_mannequin credit cost to 2** (`supabase/functions/vintography/index.ts`)
- Change: `const creditsToDeduct = operation === "model_shot" ? 4 : 1;`
- To: `const creditsToDeduct = operation === "model_shot" ? 4 : operation === "ghost_mannequin" ? 2 : 1;`

**4. Update Ghost to Clean preset** (`src/components/vintography/QuickPresets.tsx`)
- Replace the 2-step chain (mannequin_shot + remove_bg) with a single ghost_mannequin step
- Update description from "Invisible Mannequin + Remove BG" to "Invisible mannequin -- 1 step"
- Keep tier as "Pro"

**5. Fix preset credit cost display** (`src/components/vintography/QuickPresets.tsx`)
- Update the credit calculation on line 226 to also account for ghost_mannequin costing 2 credits
- Before: `s.operation === "model_shot" ? 4 : 1`
- After: `s.operation === "model_shot" ? 4 : s.operation === "ghost_mannequin" ? 2 : 1`

### What stays the same
- MODEL_MAP -- ghost_mannequin already points to gemini-3-pro-image-preview (set in previous fix)
- The mannequin_shot prompt (other mannequin types still use it)
- The frontend reducer, operation bar, and config components
- All other presets and edge function logic

### Deployment
Redeploy the vintography edge function after changes.

### Technical details

Files modified:
- `supabase/functions/vintography/index.ts` -- prompt rewrite, tier access, credit cost
- `src/components/vintography/QuickPresets.tsx` -- preset simplification, credit display fix

