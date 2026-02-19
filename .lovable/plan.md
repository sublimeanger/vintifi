

## Analysis: Pipeline Conflicts and Preset Saving

### Part 1: Illogical Operation Pairings

Currently the pipeline allows some combinations that don't make sense:

| Combination | Why it's illogical |
|---|---|
| Flatlay + Mannequin | Both are full re-compositions -- a garment can't be both flat-laid AND on a mannequin |
| Flatlay/Mannequin + Lifestyle BG | These operations already create a complete scene; adding a lifestyle background on top would conflict |
| Lifestyle BG before Clean BG | Lifestyle adds a scene, then Clean BG strips it away -- wasted credits |
| Clean BG before Flatlay/Mannequin | These ops generate their own background, so removing it first is pointless |

**Valid chains** (examples):
- Clean BG then Lifestyle BG (remove, then replace -- logical)
- Clean BG then Enhance
- Steam and Press then Clean BG then Lifestyle BG
- AI Model then Enhance

### Part 2: "Save My Settings" -- Reusable Presets

Allow sellers to save their current pipeline configuration (operations + parameters like background choice) as a named personal preset, then apply it to any future photo with one tap.

---

### Implementation Plan

**Step 1: Strengthen pipeline conflict rules** in `vintographyReducer.ts`

Update `getAvailableOpsToAdd()` and `canAddOperation()` with these new rules:
- Flatlay and Mannequin are mutually exclusive (if one is in the pipeline, the other is hidden)
- If Flatlay or Mannequin is present, Lifestyle BG is blocked (and vice versa)
- If Lifestyle BG is present, Clean BG cannot come AFTER it (order-aware check)
- If Flatlay or Mannequin is present, Clean BG is blocked (redundant step)

These changes ensure the "Add Effect" dropdown and Operation Bar never offer illogical options.

**Step 2: Add a "Saved Presets" feature**

- Create a new database table `user_presets` with columns:
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null)
  - `name` (text, not null) -- e.g. "My Studio Look"
  - `pipeline` (jsonb, not null) -- stores the full pipeline array with operations and params
  - `created_at` (timestamptz)
  - RLS: users can only read/write their own presets

- Add a "Save as Preset" button in the config area (near the Generate button) that captures the current pipeline state and prompts for a name.

- In the `QuickPresets` component, add a "My Presets" section that loads saved presets from the database and renders them alongside the built-in presets. Tapping one calls `REPLACE_PIPELINE` with the saved configuration.

- Add a delete option (swipe or long-press on mobile, hover X on desktop) to remove saved presets.

**Step 3: Wire up the UI**

- After a successful generation, show a subtle "Save this setup" prompt if the pipeline has 2+ steps or custom params, encouraging users to save for reuse.
- Saved presets appear at the top of the Quick Presets area with a "My Presets" label and a distinct visual style (e.g. a small star icon).

---

### Technical Details

**Conflict matrix** (added to `getAvailableOpsToAdd`):

```text
MUTUALLY_EXCLUSIVE groups:
  Group A: flatlay, mannequin, lifestyle_bg
  (only one "scene-setting" operation allowed per pipeline)

REDUNDANCY rules:
  If pipeline contains flatlay OR mannequin -> block clean_bg
  If pipeline contains clean_bg -> block flatlay, mannequin
```

**Database migration SQL:**

```text
CREATE TABLE public.user_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  pipeline jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own presets"
  ON public.user_presets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Files to create/modify:**
- `src/components/vintography/vintographyReducer.ts` -- updated conflict rules
- `src/components/vintography/QuickPresets.tsx` -- add "My Presets" section
- `src/components/vintography/ConfigContainer.tsx` -- add "Save as Preset" button
- `src/pages/Vintography.tsx` -- wire save/load preset handlers
- Database migration for `user_presets` table

