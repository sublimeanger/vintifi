
# Photo Studio — Full UX Redesign

This plan implements the complete redesign spec from `vintifi-photo-studio-redesign.md` against the current 1,588-line `Vintography.tsx`. It is a significant rebuild — everything visual changes, nothing backend changes.

---

## What the brief is asking for vs. what exists today

**Current architecture (the problems):**
- One giant 1,588-line monolithic file with all state, all UI, all logic flat
- When you select an operation, its config options expand inline using `AnimatePresence height: 0 → auto` — this pushes the Generate button and the entire canvas off screen on mobile
- `secondaryOp` is hardcoded as a single extra slot with no sub-option configuration — you can only chain 2 operations, and the second one always runs with default params
- The AI Model Shot dumps all pickers (gender, look, pose, background) in a single scrolling wall
- The Generate button on mobile is rendered *below* the ComparisonView — if you select AI Model Shot, you scroll through 600px of pickers before you can tap Generate
- No true pipeline state — just `selectedOp` + `secondaryOp`

**What the brief specifies:**
- Three fixed zones: Canvas (always visible) / Operation Bar / Config Drawer
- Mobile: canvas is sticky at the top, config opens in a bottom sheet drawer
- Desktop: two-column layout with sticky Generate button at the bottom of the left panel
- Pipeline array (1–4 steps), each step with its own params, replacing `selectedOp` + `secondaryOp`
- AI Model Shot becomes a 3-step mini-wizard (not a wall of pickers)
- The Generate button is always reachable — pinned to the bottom of the drawer on mobile, sticky on desktop
- `useReducer` replaces the 15+ flat `useState` calls

---

## Implementation Phases

### Phase 1 — State model (foundation everything else builds on)

Replace all the flat state variables with a `useReducer`:

```typescript
interface PipelineStep {
  operation: Operation;
  params: OperationParams;
}
interface VintographyState {
  originalPhotoUrl: string | null;
  resultPhotoUrl: string | null;
  pipeline: PipelineStep[];
  activePipelineIndex: number;
  isProcessing: boolean;
  drawerOpen: boolean;
  itemPhotos: string[];
  photoEditStates: Record<string, PhotoEditState>;
}
```

This replaces: `selectedOp`, `secondaryOp`, `bgStyle`, `modelGender`, `modelPose`, `modelLook`, `modelBg`, `flatlayStyle`, `modelShotStyle`, `modelFullBody`, `mannequinType`, `mannequinLighting`, `decreaseIntensity`, `processing`, `processedUrl`, `resultReady`.

The file fetching, gallery, credits, and auth state stay as they are.

---

### Phase 2 — New sub-components (13 files)

Create these in `src/components/vintography/`:

**`ConfigDrawer.tsx`** — Mobile bottom sheet. Uses Framer Motion `motion.div` with `y` animation. Draggable handle, swipe-to-dismiss, independently scrollable content area, footer slot for Generate button. Variable default heights per operation (`clean_bg: 20vh`, `ai_model: 50vh` etc.).

**`ConfigContainer.tsx`** — Responsive wrapper. On mobile renders `ConfigDrawer`. On desktop renders a plain scrollable `div` inside the left panel with `position: sticky; bottom: 0` Generate button.

**`OperationBar.tsx`** — Horizontal scrollable strip of 7 operation pills (icon + label + lock badge if gated). Replaces the current 2×2 card grid + separate Steam row + separate AI Model card. Tapping a locked pill opens `UpgradeModal`. Tapping the active pill deselects (closes drawer).

**`SimpleOperationConfig.tsx`** — Used for `clean_bg` and `enhance`. Just a description + context tip. Minimal height.

**`SteamConfig.tsx`** — Segmented 3-option control (Light / Steam / Deep). Replaces the current 3-button grid.

**`FlatLayConfig.tsx`** — 5 visual thumbnail cards for style. Replaces current list.

**`LifestyleConfig.tsx`** — 16 background scene thumbnails in a scrollable 3-column grid. Uses existing `BackgroundPicker` data.

**`MannequinConfig.tsx`** — Type (segmented), Lighting (segmented), Setting (thumbnail grid). Replaces the inline expansion.

**`ModelShotWizard.tsx`** — 3-step mini-wizard with `AnimatePresence` horizontal slide transitions. Step 1: Gender + Look. Step 2: Pose + Background. Step 3: Summary + garment description + generate. Footer swaps between "Next →" and "← Back / Generate".

**`PipelineStrip.tsx`** — Horizontal pill strip showing current pipeline steps. Each pill: operation name + × to remove. Active step highlighted. "+ Add Effect" button at the end (hidden if pipeline has 4 steps). Tapping a pill switches `activePipelineIndex`.

**`ProcessingOverlay.tsx`** — On mobile: drawer collapses to 60px strip with progress + step counter. On desktop: left panel shows pipeline step checklist (✓ done, ● running, ○ pending). Canvas gets breathing glow animation during processing.

**`ResultActions.tsx`** — Post-processing buttons: Save to Listing, Download, Try Again. Plus "Next Photo →" if multi-photo item, plus low-credit top-up prompt if ≤5 credits.

**`EmptyState.tsx`** — The no-photo upload zone. Already largely correct; this moves it into its own component and adds the quick-start preset intent tracking.

---

### Phase 3 — Updated `handleProcess`

The current `handleProcess` runs `processImage` once, then optionally a second time for `secondaryOp`. Replace with a loop over the full `pipeline` array:

```typescript
const handleProcess = async () => {
  let currentUrl = state.originalPhotoUrl;
  for (let i = 0; i < state.pipeline.length; i++) {
    const step = state.pipeline[i];
    dispatch({ type: 'PROCESSING_STEP_START', step: i });
    const result = await processImage(currentUrl, OP_MAP[step.operation], buildParams(step));
    if (!result) return; // stops on failure, shows partial result if i > 0
    currentUrl = result;
  }
  dispatch({ type: 'PROCESSING_COMPLETE', resultUrl: currentUrl });
};
```

**Pipeline rules enforced in the "+ Add Effect" picker:**
- Max 4 steps
- No duplicate operations
- `ai_model` can only be first; only `enhance` and `decrease` can follow it
- When `ai_model` is not first, `ai_model` is excluded from the picker

---

### Phase 4 — Layout restructure in `Vintography.tsx`

The page shell shrinks to ~200 lines. The three-zone structure:

**Mobile layout:**
```
<PageShell>
  <CreditBar />
  <LowCreditBanner />
  
  {activePhotoUrl ? (
    <>
      <PhotoCanvas sticky />           // Zone 1 — always visible
      <QuickPresets />                 // between canvas and bar
      <OperationBar />                 // Zone 2 — always visible
      <ConfigContainer>               // Zone 3 — bottom sheet on mobile
        <ActiveStepConfig />           //   config for pipeline[activePipelineIndex]
        <PipelineStrip />              //   chain visualiser + add effect
        footer: <GenerateButton />     //   pinned to bottom
      </ConfigContainer>
      <ResultActions />                // after processing
    </>
  ) : (
    <EmptyState />
  )}
  
  <PreviousEdits />
</PageShell>
```

**Desktop layout (≥1024px):**
```
<div className="lg:grid lg:grid-cols-[420px_1fr]">
  <LeftPanel>
    <QuickPresets />
    <OperationBar />
    <ConfigContainer>               // scrollable section
      <ActiveStepConfig />
      <PipelineStrip />
    </ConfigContainer>
    <StickyGenerate />               // sticky bottom of left panel
  </LeftPanel>
  
  <RightPanel>
    <PhotoCanvas />
    <ResultActions />
    <PreviousEdits />
  </RightPanel>
</div>
```

---

## File Changes Summary

| File | Action | Notes |
|---|---|---|
| `src/pages/Vintography.tsx` | Major rewrite (~200 lines) | State → reducer, layout → 3-zone |
| `src/components/vintography/ConfigDrawer.tsx` | Create | Mobile bottom sheet |
| `src/components/vintography/ConfigContainer.tsx` | Create | Responsive wrapper |
| `src/components/vintography/OperationBar.tsx` | Create | Replaces 2×2 card grid |
| `src/components/vintography/SimpleOperationConfig.tsx` | Create | Remove BG + Enhance |
| `src/components/vintography/SteamConfig.tsx` | Create | Steam & Press |
| `src/components/vintography/FlatLayConfig.tsx` | Rewrite existing | From current FlatLayPicker.tsx |
| `src/components/vintography/LifestyleConfig.tsx` | Create | 16 backgrounds |
| `src/components/vintography/MannequinConfig.tsx` | Create | Type + lighting + setting |
| `src/components/vintography/ModelShotWizard.tsx` | Create | 3-step mini-wizard |
| `src/components/vintography/PipelineStrip.tsx` | Create | Chain visualiser |
| `src/components/vintography/ProcessingOverlay.tsx` | Create | Breathing glow + progress |
| `src/components/vintography/ResultActions.tsx` | Create | Post-processing buttons |

**Files that do NOT change:**
- `supabase/functions/vintography/index.ts` — backend unchanged
- `src/components/vintography/ComparisonView.tsx` — works fine as-is
- `src/components/vintography/GalleryCard.tsx` — unchanged
- `src/components/vintography/PhotoFilmstrip.tsx` — unchanged
- `src/components/vintography/CreditBar.tsx` — unchanged
- `src/components/vintography/BackgroundPicker.tsx` — data reused in LifestyleConfig
- `useFeatureGate.ts` — unchanged
- `UpgradeModal.tsx` — unchanged

---

## Key Decisions

**Using `vaul` (already installed) for the mobile drawer.** The project already has `vaul` installed (used in `drawer.tsx`). The `ConfigDrawer` component will use Framer Motion directly for the spring animation rather than Vaul's Drawer, because the drawer needs to be partially visible (not a full overlay) and needs a drag-to-resize behaviour that Vaul doesn't support natively.

**`useIsMobile` hook** (already exists at `src/hooks/use-mobile.tsx`) will drive the `ConfigContainer` rendering decision.

**The pipeline's `params` object** is typed per-operation using the `OperationParams` union from the brief. Each config component receives its own operation's params and an `onChange` callback — no shared global state for sub-options.

**Credit cost calculation** — `getOperationCreditCost(op)` returns 4 for `ai_model`, 1 for everything else. Total shown on the Generate button is `pipeline.reduce((sum, step) => sum + getOperationCreditCost(step.operation), 0)`.

---

## What this does NOT change

- The backend edge function — no changes to `vintography/index.ts`
- Database schema — no migrations needed
- Credit deduction RPC — atomic and correct as-is
- The ComparisonView before/after slider
- Photo upload/storage flow
- Tier gating logic — same `useFeatureGate` hooks, just surfaced differently (lock badges on the OperationBar instead of on cards)
- The existing Save to Listing / Replace Original / Add Alongside logic
- The gallery query and `GalleryCard` component
