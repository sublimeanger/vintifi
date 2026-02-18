
# Listing Wizard — "Get Ready to Sell" Full Guided Flow

## The Idea in Plain English

Right now, Vintifi's four pillars (Add Item → Price → Optimise → Photo Studio) are powerful individually, but they demand the user to *self-navigate* between separate pages. A seller has to understand the workflow, know where to go next, and not get lost. Most won't.

The **Listing Wizard** is a single, modal-based experience that takes any item and marches the user through every step in order — inside one sheet that never leaves the page. The user doesn't navigate anywhere. The wizard brings each tool *to them*, one step at a time, with hand-holding copy, progress indicators, and blocked-forward logic (can't advance until the step is genuinely done). At the end, they get their completed Vinted-Ready Pack directly inside the wizard.

This works as a **companion overlay on top of the existing Item Detail page**, so all the existing tabs, cards, and tools remain — the wizard is additive, not a replacement. A user can close it at any time and continue using the normal interface.

---

## Entry Points

Three natural entry points:

1. **Item Detail Overview tab** — a prominent "🚀 Start Wizard" card/button for items that don't yet have a Vinted-Ready Pack. This replaces (or sits above) the existing "Next Action" button for items that are incomplete.
2. **Items list page** — a "Guide me through this" action on each item row.
3. **After adding a new item** — the wizard auto-launches when a new item is created via the New Item Wizard, since those items always need the full flow.

---

## The 5 Wizard Steps

The wizard has 5 clearly labelled steps shown as a numbered progress strip at the top:

```text
① Details  ②  Price  ③  Optimise  ④  Photos  ⑤  Pack Ready ✓
```

### Step 1 — Details Review

**Purpose:** Make sure the item has everything the AI tools need before spending credits.

**What the user sees:**
- Item photo (primary image) on the left, item details on the right.
- A checklist of the 5 key fields: Title, Brand, Category, Condition, Price.
- Any missing field shows an inline editable input (not a separate page). The user fills it in directly inside the wizard card.
- A "confidence score" chip: "AI has what it needs ✓" (all 5 filled) or "Missing 2 fields — fill them for better results."
- **CTA:** "Looks good, run Price Check →" (enabled only when title + condition filled as minimum).

### Step 2 — Price Check

**Purpose:** Get an AI-recommended sell price and lock it in.

**What the user sees:**
- This step *embeds* the price check result directly inside the wizard — it calls the same `price-check` Edge Function the Price Check page uses, but the results render inside the wizard step as a compact version: recommended price chip, market range bar, confidence badge, and 3-line AI insight.
- Auto-starts immediately on entering this step if the item has enough data.
- A green "Use this price (£XX) →" button accepts the recommended price and writes it to the listing in the DB before advancing.
- If already price-checked, shows last result with "Update or Continue →".
- **CTA:** "Use £XX as my listing price →"

### Step 3 — Optimise Listing

**Purpose:** AI-generate an SEO-ready title and description.

**What the user sees:**
- Calls the same `optimize-listing` Edge Function the Optimise page uses.
- Auto-starts when entering the step (same auto-start logic already used in OptimizeListing.tsx).
- Results shown as two compact copy blocks: Title and Description, both with individual copy buttons.
- Health score gauge shown inline (compact version already exists as `HealthScoreMini`).
- A "Save & Continue →" button writes `optimised_title`, `optimised_description`, and `health_score` to DB before advancing.
- If already optimised, shows the saved optimised content with "Looks good, Continue →".
- **CTA:** "Save optimised listing →"

### Step 4 — Photo Studio

**Purpose:** Get at least one AI-enhanced photo saved to the item.

**What the user sees:**
- If the item has no photos: an upload prompt (same pattern as PhotosTab) with a note: "Add your primary photo first so AI can enhance it."
- If the item has photos: shows the primary image (thumbnail) with two prominent option buttons:
  - "Enhance in Photo Studio →" — opens Photo Studio in a new tab/window targeting this specific item and photo. A "I've done this, continue →" button lets them advance manually after returning.
  - "Skip for now →" — marks the step as optionally skipped (the step indicator shows amber rather than green).
- **Design note:** The Photo Studio step is the only one we can't fully embed inside the wizard (Photo Studio is a complex full-screen tool). Instead, the wizard acts as a launch pad + return detector: it polls the item's `last_photo_edit_at` field every 5 seconds while showing a waiting state ("Waiting for photo studio... Return here when done"). When `last_photo_edit_at` updates, the wizard auto-advances to step 5.
- **CTA:** "Open Photo Studio →" + "Continue without photo enhancement →"

### Step 5 — Vinted-Ready Pack

**Purpose:** Show the completed pack and get the user ready to list on Vinted.

**What the user sees:**
- The complete `VintedReadyPack` component rendered inside the wizard — exactly the same component already used on the Overview tab.
- A final "🎉 You're ready to list!" celebration header with a confetti animation (framer-motion).
- A prominent external link button: "Open Vinted & list this now →" (links to vinted.co.uk/upload).
- A "Mark as Listed" button that lets them paste their Vinted listing URL and saves it to `vinted_url` in the DB, completing the workflow tracker.
- **CTA:** "Mark as Listed on Vinted →"

---

## Component Architecture

The wizard is a single new component: `src/components/ListingWizard.tsx`

It uses a Radix `Sheet` (the same one already in the codebase) with `side="right"` on desktop and `side="bottom"` on mobile — making it a full-height side panel on desktop (wide, not modal) and a tall bottom sheet on mobile.

```text
src/components/ListingWizard.tsx      ← New file: all wizard logic & steps
src/pages/ItemDetail.tsx              ← Add wizard launch button on Overview tab
```

Only 2 files total (1 new, 1 edited).

### Internal structure of ListingWizard.tsx

```
<Sheet>
  <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
    ← WizardProgressBar (steps 1–5)
    ← WizardStepContent (renders current step's UI)
    ← WizardNavFooter (Back / Next / primary CTA)
  </SheetContent>
</Sheet>
```

State is entirely local to the wizard component:
- `currentStep: 1 | 2 | 3 | 4 | 5`
- `stepStatus: Record<step, 'pending' | 'loading' | 'done' | 'skipped'>`
- `priceResult` — the price check result from the edge function
- `optimiseResult` — the optimise result
- `localItem` — a local copy of the item, updated in real time as the user fills fields and saves, so the wizard always reflects current state

The component takes `item` and `onItemUpdate` as props (same pattern as `PhotosTab`), so it can update the parent's item state after each step saves.

---

## UX Details That Make This World-Class

**Progress strip:**
- Step numbers shown as circles: grey (pending), blue/primary (current), green (done), amber (skipped).
- Step names shown as small labels below circles on desktop, hidden on mobile (just circles + current step name).
- A connecting line between circles fills green as steps complete.

**Step transitions:**
- `framer-motion` `AnimatePresence` with a horizontal slide — step 1 slides left as step 2 slides in from the right. Backward navigation reverses direction.

**Auto-advance logic:**
- Step 2 (Price): on entering the step, the wizard fires the price-check call immediately (with a loading state). When the result arrives, the "Use this price" CTA becomes active. No manual "run" button needed.
- Step 3 (Optimise): same auto-start — the optimise call fires on entering the step.
- Step 4 (Photos): polls `last_photo_edit_at` every 5 seconds via a `setInterval` that starts when the user clicks "Open Photo Studio". Auto-advances when the timestamp updates.

**Blocking rules:**
- "Next" button is disabled (greyed) until the step's minimum requirement is met. The button label changes to explain why: "Add a title to continue" or "Run price check to continue."

**Wizard launch button placement on ItemDetail:**
- Appears as a full-width card with gradient border at the top of the Overview tab, *above* the VintedReadyPack. Shown only when `!item.vinted_url` (i.e., not yet listed). Label: "🚀 Get ready to list — guided walkthrough".
- Once all 4 steps are green (price + optimise + photos done), the card changes to show the Pack preview inline with a "View Full Pack" link that scrolls to the VintedReadyPack below.

**Mobile behaviour:**
- Sheet opens from bottom, takes up 92% of viewport height.
- The progress bar pins to the top of the sheet.
- Steps are vertically scrollable within the sheet.
- The footer CTA button is sticky at the bottom of the sheet.

---

## Technical Steps

### In ListingWizard.tsx (new file ~400 lines):
1. Accept `item`, `isOpen`, `onClose`, `onItemUpdate` props.
2. Step 1: Render editable field checklist. Inline save to Supabase on blur (same pattern as ItemDetail's inline price editing). Compute `missingFields` array to show confidence chip.
3. Step 2: On `currentStep === 2`, call `supabase.functions.invoke("price-check", {...})` with item data. Render compact price report. On "Use this price" click, update `current_price` + `recommended_price` in DB.
4. Step 3: On `currentStep === 3`, call `supabase.functions.invoke("optimize-listing", {...})`. Render title + description blocks with copy buttons + HealthScoreMini. On save, write `optimised_title`, `optimised_description`, `health_score`, `last_optimised_at` to DB.
5. Step 4: Render photo summary. Launch Photo Studio link with `?itemId=...&image_url=...`. Poll `last_photo_edit_at` every 5 seconds (`setInterval`, clear on unmount/step-change). Auto-advance when it updates. Offer "Skip" button.
6. Step 5: Render `<VintedReadyPack item={localItem} ... />`. Add celebration header. "Mark as Listed" input + save.

### In ItemDetail.tsx (1 addition):
- Import `ListingWizard`.
- Add `const [wizardOpen, setWizardOpen] = useState(false)`.
- Add the wizard launch card above VintedReadyPack in the Overview tab (shown when `!item.vinted_url`).
- Render `<ListingWizard item={item} isOpen={wizardOpen} onClose={...} onItemUpdate={...} />`.

---

## Scope Summary

| File | Action |
|------|--------|
| `src/components/ListingWizard.tsx` | **New file** — ~400 lines, all 5 wizard steps |
| `src/pages/ItemDetail.tsx` | **Edit** — add wizard trigger card + render `<ListingWizard>` |

- No new edge functions (reuses existing `price-check` and `optimize-listing`)
- No database changes
- No new dependencies
- Works on mobile and desktop
- Estimated result: a user can go from a fresh item to a completed Vinted-Ready Pack in under 5 minutes without ever leaving the Item Detail page or having to navigate between tools
