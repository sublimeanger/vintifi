
# Sell Wizard — World-Class Polish & Cohesion Audit

## Full Audit of Current State

After reading every line of `SellWizard.tsx`, `ListingWizard.tsx`, `AppShellV2.tsx`, `Dashboard.tsx`, and `NewItemWizard.tsx`, here is the complete list of gaps, bugs, and UX problems found.

---

## Issues Found (Priority Order)

### Critical — Broken Flow Logic

**Issue 1: Step 2 is a ghost step**
In `renderStepContent()`, `case 2` returns `null`. The step title says "Details" in the progress bar but the wizard jumps directly from step 1 to step 3 via `setCurrentStep(3)` inside `createItem()`. However, the `canAdvance()` check for step 2 references `form.title && form.condition`, and `advanceBlockedReason()` references step 2 — meaning if someone somehow lands on step 2, they see a blank page. The progress bar also shows "Details" as a step dot that never gets content. This needs to be resolved: either remove step 2 from `STEPS` and reindex to 5 steps, or give it real content. The cleanest fix is to collapse it: after `createItem()` succeeds, jump straight to step 3 (already done), and remove step 2 from the `STEPS` array so the progress bar only shows 5 steps: Add → Price → Optimise → Photos → Pack.

**Issue 2: `canAdvance` on step 1 is wrong**
`canAdvance()` for step 1 returns `!!entryMethod` — but this allows advancing as soon as you pick URL/Photo/Manual, before you've actually filled in the form or clicked "Create Item". The real gating on step 1 happens inside `renderDetailsForm` via the "Create Item" button, which is disabled unless `form.title && form.condition`. The "Continue →" footer button on step 1 should either be hidden (since step 1 manages its own CTA inline) or the footer itself should not appear on step 1. Currently `showFooterNav = currentStep !== 1 && currentStep !== 6` — so it IS hidden on step 1 already. But `canAdvance()` returning `true` after just picking a method could still cause issues. This is fine architecturally since the footer is hidden, but needs clean-up for correctness.

**Issue 3: Progress bar step labels are misaligned**
With the ghost step 2, the progress bar shows 6 dots: Add, Details, Price, Optimise, Photos, Pack. But step 2 ("Details") never gets content — it's skipped by jumping to step 3 after createItem. The visual progress bar therefore shows a step that the user never experiences. On mobile this is especially confusing since the dots are tiny and the user can't tell what step 2 was.

---

### High — Missing UX Moments

**Issue 4: No step header for step 2**
In the `renderStepContent()` switch, `case 2` returns `null` and there is no `{currentStep === 2 && "Details"}` text in the step header block. The `h2` step title has entries for 1, 3, 4, 5, 6 — but not 2. If someone reaches step 2 via Back navigation from step 3, they see a blank content area with no heading.

**Issue 5: Back button from step 3 navigates to the empty step 2**
If the user is on step 3 (Price) and taps Back, they go to step 2 (the empty ghost step). They should go back to step 1 (Add Item) or the back button should not be shown when it would lead to an empty step. The fix: on step 3, pressing Back should go to step 1, and re-show the entry form they filled out.

**Issue 6: No "Start over" / "Add another item" CTA on step 6**
Once the user completes the flow and is on the Pack step, there is no way to start a new wizard session. The only options are "View Item" and "List on Vinted". Adding a subtle "Sell another item" link that resets all state is a critical retention feature — sellers frequently list multiple items in one session.

**Issue 7: Photo step (step 5) opens Photo Studio in a new tab**
This is a jarring UX break. On mobile, opening a new tab loses context of the wizard entirely. The better pattern: open it in the same window, but on return detect the change via the existing poll mechanism. The current `window.open(..., "_blank")` should be `navigate('/vintography?itemId=...')` since we poll for `last_photo_edit_at` anyway. This way mobile users stay in the app and the poll detects when they save.

**Issue 8: No explanation of what each step does before the AI runs**
When steps 3 and 4 auto-fire their edge function calls immediately on step entry, the user has zero context for what's happening. A "Loading" spinner appears with "Checking Vinted, eBay & Depop…" — but there's no step intro that sets expectations. World-class onboarding flows (Stripe, Notion, Linear) show a single sentence of context before the loading begins. Currently the loading state just appears with no lead-in.

**Issue 9: Dashboard "Add Item" button still goes to `/listings?action=add`**
In `Dashboard.tsx` line 99, the "Add Item" Quick Action navigates to `/listings?action=add` instead of `/sell`. This is inconsistent — clicking "Sell" in the nav bar goes to the wizard, but clicking "Add Item" on the dashboard goes somewhere else entirely.

**Issue 10: No way to edit item details after step 1**
Once the item is created and the user reaches step 3, they can't change the title, brand, or condition without abandoning the wizard and going to the Item Detail page. If the user typed the title wrong in step 1, they're stuck. A small "Edit details" link on step 3 or 4 that shows an inline edit panel would complete the flow. For now, at minimum there should be a "tap to edit" link on step 3 that links to `/items/:id` in a new tab.

---

### Medium — Polish & Cohesion

**Issue 11: The sticky footer "Continue" button shows the blocked reason as button text**
`{blocked ? blocked : "Continue"}` — so when the user hasn't saved the optimised listing, the button reads "Save optimised listing to continue". This is a poor UX pattern — disabled button text should be a neutral label, with the reason shown as a helper below or in a tooltip. The button should always say "Continue →" and be visually disabled, with the reason appearing below it as a small helper line.

**Issue 12: Step 6 Pack empty state when VintedReadyPack returns null**
If health score is below 60 after optimisation, `VintedReadyPack` returns null silently — and step 6 shows a confetti header + blank space. There should be a fallback: if the pack component returns null (detectable via checking the score client-side), show a simplified manual copy section with just the title and description text boxes.

**Issue 13: Photo step shows an image preview that's tiny (56×56px)**
The current item image thumbnail in step 5 is `w-14 h-14` (56px). On a 390px wide mobile screen this is barely visible and doesn't motivate the user to enhance their photos. It should be a proper portrait-ratio image preview (like a Vinted listing card) at full width or at least half-width, so the user can see their photo and feel the impact of enhancing it.

**Issue 14: The "Sell Wizard" header title is only on desktop — on mobile the header is 14px**
The header title text `font-bold text-sm` renders the "Sell Wizard" label very small. On mobile this is competing with the "← Items" back link and the "Step X of 6" indicator. A cleaner mobile header: just the step name centered (e.g. "Set a price"), with the back arrow left-aligned and the step count top-right. Same pattern as Depop's listing flow.

**Issue 15: Progress bar labels hidden on mobile**
`hidden sm:block` on the step labels means on any screen under 640px (the majority of mobile phones including iPhone SE, 12, 13, 14), no labels appear at all — just the numbered circles. This makes the progress bar feel like floating bubbles with no context. On small screens, show at least a single current-step label below the bar: "Step 3 of 5 — Price".

**Issue 16: Sell Wizard renders inside the AppShell on mobile (double nav bars)**
The `SellWizard` page renders completely standalone (its own header + no AppShell wrapper), but the AppShell's mobile bottom nav still shows because... let me check if `/sell` uses `AppShellV2`. Looking at the code, `SellWizard` does NOT use `AppShellV2` — it's a bare `div.min-h-screen`. So the bottom nav does NOT show. However the AppShell header from `AppShellV2` also doesn't show. This is correct — it's a standalone full-page flow. But the `/sell` route needs to confirm it doesn't get wrapped. Looking at `App.tsx` — the route should be outside `AppShellV2`. This needs verification.

**Issue 17: No item name shown in the header once item is created**
From step 3 onwards, the header just says "Sell Wizard" with no reference to the specific item. This makes the flow feel generic. Once `createdItem` is set, the header should show a truncated item title (e.g. "Nike Air Force 1…") so the user knows which item they're working on.

**Issue 18: No confetti or delight moment on step 6 for fully complete items**
Step 6 shows a 🎉 emoji but no actual animation. The `VintedReadyPack` component itself is visually strong, but arriving at step 6 should feel like a genuine achievement moment. A `framer-motion` scale + fade entrance for the header + `VintedReadyPack` would make it feel world-class.

---

## The Fix Plan

### Changes to `src/pages/SellWizard.tsx`

**1. Fix STEPS array — drop the ghost "Details" step**
Remove step 2 from `STEPS`. Redefine as 5 steps: Add → Price → Optimise → Photos → Pack. Renumber all `currentStep` references accordingly (step 3 becomes step 2, step 4 becomes step 3, etc.). The `createItem()` function which jumps directly to step 3 (price) now jumps to step 2 (price). This removes the ghost step, the blank back-navigation issue, and the misaligned progress bar in one shot.

**2. Fix goBack() on price step to return to step 1**
Since step 2 is now the price step and step 1 is Add Item, pressing Back on step 2 correctly goes to step 1. On step 1, the Back button should not be shown (the "← Items" header link suffices). Hide the Back button when `currentStep === 1`.

**3. Rewrite the sticky footer button — split label from blocked reason**
Change from: `{blocked ? blocked : "Continue"}` inside the button to always showing "Continue →" as button text (disabled when blocked), with the blocked reason shown as a small helper line below the footer: `{blocked && <p className="text-center text-xs text-muted-foreground">{blocked}</p>}`.

**4. Fix Dashboard "Add Item" to go to `/sell`**
In `Dashboard.tsx`, change `navigate("/listings?action=add")` to `navigate("/sell")`.

**5. Fix step 5 Photo Studio to navigate in-app instead of new tab**
Change `window.open(...)` to `navigate(...)` for the Photo Studio link. The polling mechanism already handles the return detection so the UX works identically but without the jarring tab break.

**6. Improve step 5 photo preview to full-width card**
Change the tiny `w-14 h-14` thumbnail to a proper `aspect-[4/5]` card image that fills the width of the content area, matching how the item looks in a Vinted listing. This motivates the user to enhance it.

**7. Upgrade mobile progress bar — add current step label below**
Below the dots progress bar, add a single centered line: `Step 2 of 5 — Price Check` that appears on all screen sizes. This replaces the per-step `hidden sm:block` labels (which can stay for larger screens) with always-visible context.

**8. Update header to show item name once created**
Once `createdItem` is set, change the center header text from "Sell Wizard" to the item's truncated title (max 22 chars + "…") in a smaller font. The rocket icon stays.

**9. Add "Sell another item" reset link on step 6**
Below the CTA buttons on the Pack step, add a small `text-muted-foreground text-xs` link: "Start a new listing →" that calls a `resetWizard()` function setting all state back to initial and returning to step 1. This is critical for high-volume sellers who list 10+ items in a session.

**10. Add entrance animation to step 6 header**
Wrap the "🎉 You're ready to list!" section in a `motion.div` with `initial={{ scale: 0.9, opacity: 0 }}` and `animate={{ scale: 1, opacity: 1 }}` with a spring transition and a short delay, giving the completion moment genuine delight.

**11. Fallback when VintedReadyPack returns null in step 6**
Check `createdItem?.health_score` client-side. If it's below 60 or null, show a manual fallback section with the optimised title and description in copy-able text boxes instead of silently rendering nothing.

**12. Add "Edit details" escape hatch on price step**
Below the loading/result area on step 2 (price), add a small footer link: `Having second thoughts? Edit item details` that navigates to `/items/:id` in a new tab so the user can fix a typo without losing wizard context.

---

## Files to Change

| File | Changes |
|------|---------|
| `src/pages/SellWizard.tsx` | Remove ghost step 2, fix step numbering (5 steps total), fix footer button pattern, fix Photo Studio navigation, improve photo preview, header shows item name, add step label under progress bar, add "Sell another" reset, add step 6 entrance animation, add health score fallback |
| `src/pages/Dashboard.tsx` | Fix "Add Item" quick action to navigate to `/sell` |

No new files. No database changes. No edge function changes.

---

## Result

After these changes the wizard will be:
- **5 clean steps** with no ghost steps: Add → Price → Optimise → Photos → Pack
- **Mobile-perfect**: visible step context at all times, in-app Photo Studio navigation, proper image previews, clear disabled state feedback
- **Delightful**: animated step 6 completion, item name in header from step 2 onwards
- **Complete loop**: "Sell another item" keeps high-volume sellers in the flow
- **Consistent**: Dashboard "Add Item" always goes to the wizard
