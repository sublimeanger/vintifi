
# End-to-End Wizard Audit — Bugs, Gaps & World-Class Fixes

## What Was Tested (Mental Walkthrough of Every Step)

Full flow traced: Dashboard → /sell → Step 1 (Add) → Step 2 (Price) → Step 3 (Optimise) → Step 4 (Photos) → /vintography → Back to /sell → Step 5 (Pack) → /items/:id

Every file read: `SellWizard.tsx` (1302 lines), `Dashboard.tsx`, `AppShellV2.tsx`, `Vintography.tsx`, `OptimizeListing.tsx`, `PriceCheck.tsx`, `ItemDetail.tsx`, `VintedReadyPack.tsx`, `PageShell.tsx`, `MobileBottomNav.tsx`, `App.tsx`.

---

## Bugs Found

### Bug 1 — Critical: `MobileBottomNav` double-renders on `/sell` (orphaned component)
`src/components/MobileBottomNav.tsx` exists as a standalone component (a legacy nav with 5 tabs: Home, Items, Price, Optimise, Photos). The new `AppShellV2` has its own bottom nav built in. `MobileBottomNav` is NOT used in `SellWizard` (which is a bare `div.min-h-screen`), so this file appears orphaned. However it IS still imported somewhere and, if it were accidentally rendered, would collide with `AppShellV2`'s nav. Confirm it is not rendered anywhere — then delete it to prevent future confusion.

### Bug 2 — Critical: `goNext` closure stale dependency
`canAdvance` is a regular function (not wrapped in `useCallback`), so the `goNext` `useCallback` that calls `canAdvance()` captures a stale version from the render it was created in. `goNext` has `[currentStep, canAdvance]` in its dependency array but `canAdvance` is a new function reference every render. This causes double-renders but more critically: the `startPhotoPolling` callback also has `[createdItem, goNext]` in its dep array, which means every time `goNext` re-creates, the interval gets reset. Fix: wrap `canAdvance` in `useCallback` with its real dependencies (`[currentStep, priceAccepted, optimiseSaved, photoDone, stepStatus, entryMethod]`).

### Bug 3 — Critical: Photo polling `goNext` closure captures wrong step
Inside `startPhotoPolling`, the success path calls `setTimeout(() => goNext(), 800)`. But `goNext` is captured at the time the interval was started. If the user navigates to `/vintography` via `navigate(...)`, polling continues (the interval is still running after navigation). When the user returns to `/sell` at step 4, the re-entry `useEffect` starts a fresh check and restarts polling — but the OLD interval (started before navigation) may still be running and its `goNext` closure has the step from before navigation. This could double-advance or call `goNext` on the wrong step. Fix: always `clearInterval` before `startPhotoPolling` starts a new one.

### Bug 4 — High: Step 4 "Open Photo Studio" fires `startPhotoPolling` AND then immediately navigates away — but polling intervals don't survive navigation
When the user clicks "Open Photo Studio", the code calls `navigate(...)` AND `startPhotoPolling()`. But navigating away unmounts `SellWizard`, which triggers the cleanup `useEffect` (line 310-314) that calls `clearInterval(photoIntervalRef.current)`. So by the time the user is in Vintography, the poll is dead. The re-entry `useEffect` on mount back at step 4 correctly handles this — BUT the order matters: `startPhotoPolling` is called, then `navigate` is called, then on unmount the interval is killed. The re-entry detect on return works correctly, so this is only an issue if someone fast-taps and returns before the first interval fires. However, the fix is simple: call `navigate` first, don't call `startPhotoPolling` at all on departure — let the re-entry detect handle everything.

### Bug 5 — High: `VintedReadyPack` returns `null` silently when `!item.last_optimised_at`
In `VintedReadyPack.tsx` line 105-106: `if (!isReady) return null; if (score != null && score < 60) return null;`. The `showFallback` check in `SellWizard` step 5 checks `!createdItem?.last_optimised_at || (healthScore != null && healthScore < 60)`. But `createdItem.last_optimised_at` is only set after `saveOptimised()` is called — which requires the user to click "Save optimised listing". If the user somehow skips step 3 (impossible via normal flow but possible via URL or reset) or if `optimiseSaved` state was set but `last_optimised_at` wasn't written to `createdItem` state correctly, they land on step 5 with a 🎉 header and blank content. The `saveOptimised` function does update `createdItem` state correctly, so this should be fine for the happy path — but the health score from the DB is an integer while the wizard stores it from `optimiseResult.health_score` which goes through a normalisation: `typeof data?.health_score === "object" ? (data.health_score?.overall ?? 0) : (data?.health_score ?? 0)`. This normalisation is correct. No immediate bug but fragile.

### Bug 6 — High: Step 5 "List on Vinted" button opens `vinted.co.uk` in a new tab via `window.open`
Line 1167: `window.open("https://www.vinted.co.uk/items/new", "_blank")`. On iOS Safari, `window.open` in a click handler is blocked by popup blockers unless it happens synchronously. Since this is in a Button's `onClick` (synchronous), it should be fine — but is inconsistent with the goal of keeping users in-app. This is acceptable behaviour (Vinted's listing form IS external), but the button label "List on Vinted" with an external link icon is clear enough.

### Bug 7 — Medium: "Edit item details" opens in new tab, killing wizard state
Line 925: `window.open(\`/items/${createdItem.id}\`, "_blank")`. This is the intentional escape hatch. However, the comment says "so the user can fix a typo without losing wizard context" — but on mobile Safari, new tabs often lose the original tab's React state when memory is reclaimed. The user may return to find the wizard reset. A better approach: navigate in-app with a `returnTo=/sell` param on the Item Detail page, and detect the return. For now the UX note says "new tab" in the code comment, which is accurate but still fragile on mobile. This should become an in-app navigation.

### Bug 8 — Medium: Milestone flag `vintifi_first_listing_complete` set every time step 5 is reached, not just the first time
Line 293: `localStorage.setItem("vintifi_first_listing_complete", "1")` runs every time `currentStep === 5` — including when the user hits "Start a new listing" and completes a 2nd or 3rd item. The Dashboard de-dupes via `localStorage.removeItem` on first read, so subsequent completions won't re-show the banner (because the flag was already removed after the first time). But for the 5-listings milestone (line 297-306), it checks `count === 5` exactly — this is fine. The first listing flag however fires on every completion, which means if the user does listing #1 and the Dashboard hasn't been visited yet, then does listing #2, both `vintifi_first_listing_complete` flags pile up but only one is stored (localStorage overwrites). On Dashboard visit only one banner shows. This is acceptable behaviour but could be cleaner by checking: `if (!localStorage.getItem("vintifi_first_listing_seen")) { localStorage.setItem("vintifi_first_listing_complete", "1"); localStorage.setItem("vintifi_first_listing_seen", "1"); }`.

### Bug 9 — Medium: Photo Studio "Back to Sell Wizard" navigates to `/sell` but wizard state is lost if the user refreshed or the page was evicted
When navigating from step 4 to `/vintography?itemId=...&returnTo=/sell` and then pressing "Back to Sell Wizard", the user returns to `/sell` — but `SellWizard` is a fully uncontrolled component with no URL-based state persistence. If the page was refreshed in Vintography (or memory was cleared on mobile), returning to `/sell` starts the wizard from scratch at step 1. The user sees the "Add your item" screen with no trace of their item. The re-entry detection `useEffect` only fires when `currentStep === 4 && createdItem` — but `createdItem` is null after a fresh mount. Fix: persist `createdItem.id` to `sessionStorage` when the user navigates to Photo Studio. On mount, if `sessionStorage` has a `sell_wizard_item_id`, re-fetch the item and restore state to step 4.

### Bug 10 — Low: `canAdvance` for step 1 returns `!!entryMethod` 
This is "allowed" because the footer nav is hidden on step 1, but the `advanceBlockedReason` for step 1 says "Choose how to add your item" — which would show if someone somehow saw the footer. No real bug since footer is hidden, but `canAdvance` returning `true` after just picking "Manual" entry (before filling anything in) is semantically wrong. Clean up by returning `false` for step 1 always, since step 1 manages its own "Create Item" button.

### Bug 11 — Low: `direction` state set to `-1` in `resetWizard` instead of `1`
Line 218: `setDirection(-1)`. After reset, the wizard should animate forward (direction = 1) since we're going back to step 1 from step 5. The slide-in transition will animate from the wrong direction. Fix: `setDirection(1)`.

---

## UX Gaps Found

### Gap 1 — No "item already created" guard on step 1 "Create Item" button
If `createdItem` is already set (e.g., user pressed Back from step 2), and they re-click "Create Item" without changing anything, `createItem()` runs again and creates a duplicate item. There's no `if (createdItem) return;` guard. The button in `renderDetailsForm` is only disabled during `creating || uploading` — not when an item already exists. Fix: add `disabled={!!createdItem || !form.title || !form.condition || creating || uploading}` and change the button label when `createdItem` exists to "Continue to Price →" which calls `goNext()` or `setCurrentStep(2)`.

### Gap 2 — Step 3 "Re-generate" button resets `optimiseSaved` but the footer "Continue" is already enabled from the previous save
If the user saves the optimised listing (clicking "Save optimised listing"), then regenerates (clicking "Re-generate"), `setOptimiseResult(null)` and `runOptimise()` are called — but `optimiseSaved` stays `true`. The footer Continue button remains enabled even though a new (unsaved) optimisation is loading. The fix: add `setOptimiseSaved(false)` in the Re-generate handler.

### Gap 3 — Step 2 price range bar divides by zero when `low === high`
Lines 836-851: `const pct = ((rec - low) / (high - low)) * 100`. If `low === high` (e.g., only one comparable found), this is `0/0 = NaN`. The `Math.max(5, Math.min(95, pct))` call then produces `NaN`, and the `style={{ left: "calc(NaN% - 5px)" }}` renders the dot offscreen. Guard: `const pct = high === low ? 50 : ((rec - low) / (high - low)) * 100`.

### Gap 4 — No loading state between `navigate("/sell")` and the first step render (from Dashboard)
Clicking "List your first item" on Dashboard immediately navigates to `/sell`. The wizard has no `useEffect` that fires a loading overlay — it just renders step 1 instantly. This is actually fine (step 1 is static content). No fix needed.

### Gap 5 — Photo Studio "Best results" guidance banner uses `sessionStorage` — dismissed state lost on app restart
Line 449: `if (!sessionStorage.getItem("vintography_guidance_dismissed"))`. Session storage is cleared when the browser tab is closed, so this banner re-appears on every session. For a world-class experience, use `localStorage` so the dismiss is persistent.

### Gap 6 — No "Sell Wizard" entry in mobile hamburger sheet nav
`AppShellV2`'s `NAV_ITEMS` (line 26-34) includes "Sell" as a route — so it IS in the sheet. This is correct. ✅

### Gap 7 — Step 5 has TWO "View Item" paths that may conflict
Step 5 has a "View Item" button (line 1154-1163) that navigates to `/items/:id`. It also has a "Mark Listed" flow (line 1133-1151) that, after a 1-second timeout, also navigates to `/items/:id`. If the user clicks "Mark Listed" and then quickly clicks "View Item", both navigations fire, causing two navigations. Fix: disable both buttons during `markingListed`.

### Gap 8 — Listing health score in `VintedReadyPack` vs in `SellWizard` are from different data sources
`createdItem.health_score` in the wizard is updated via `setCreatedItem` from `saveOptimised()`. `VintedReadyPack` receives `item={createdItem as any}`. This is correct. ✅

### Gap 9 — No scrolling to top between steps on mobile
When the user advances from step 1 (which can be long on mobile — URL form + details form = lots of content) to step 2, the scroll position stays at the bottom. The content transitions with `AnimatePresence` but the container `div.flex-1.overflow-y-auto` doesn't scroll to top. This means the user may land on step 2 with the loading spinner off-screen. Fix: add `window.scrollTo(0, 0)` or target the scroll container's `.scrollTop = 0` inside `goNext` and `setCurrentStep` calls.

### Gap 10 — "Start a new listing" resets but doesn't clear `sessionStorage`
The proposed Bug 9 fix (storing `sell_wizard_item_id` in `sessionStorage`) would need to be cleared in `resetWizard`. This is a forward-compatibility note, not a current bug.

---

## The Fix Plan

### Files to Change

| File | Changes |
|------|---------|
| `src/pages/SellWizard.tsx` | 10 targeted fixes (see below) |
| `src/pages/Vintography.tsx` | 1 fix: sessionStorage → localStorage for guidance banner |
| `src/pages/OptimizeListing.tsx` | 1 fix: add `setOptimiseSaved(false)` guard (N/A — this is in SellWizard step 3) |

No new files. No database changes. No edge function changes.

---

### Changes to `src/pages/SellWizard.tsx` (10 changes)

**Fix 1 — Wrap `canAdvance` in `useCallback`**
Convert `canAdvance` from a plain function to `useCallback` with deps `[currentStep, priceAccepted, optimiseSaved, photoDone, stepStatus, entryMethod]`. This eliminates the stale closure problem in `goNext` and `startPhotoPolling`.

**Fix 2 — Duplicate item guard on "Create Item" button**
In `renderDetailsForm`, add `createdItem` to the disabled check: `disabled={!!createdItem || !form.title || !form.condition || creating || uploading}`. When `createdItem` is set, change button text to "Continue to Price →" and call `setCurrentStep(2)` instead of `createItem`.

**Fix 3 — Re-generate button resets `optimiseSaved`**
In the Re-generate handler (line 942): add `setOptimiseSaved(false)` before calling `runOptimise()` so the footer Continue button correctly disables while the new result loads.

**Fix 4 — Price range bar divide-by-zero guard**
Line 839: change to `const pct = high === low ? 50 : ((rec - low) / (high - low)) * 100;` to prevent NaN positioning when only one comparable exists.

**Fix 5 — Clear interval before starting polling (double-poll guard)**
In `startPhotoPolling`, add `if (photoIntervalRef.current) clearInterval(photoIntervalRef.current);` as the first line before creating the new interval.

**Fix 6 — Don't call `startPhotoPolling` on Photo Studio departure**
In the "Open Photo Studio" click handler (line 1019-1026), remove the `startPhotoPolling()` call entirely. The re-entry `useEffect` handles detection on return. The poll being killed on navigate was the bug — so don't start it at that moment.

**Fix 7 — Persist wizard state to `sessionStorage` before navigating to Photo Studio**
When navigating to `/vintography` from step 4, write `sessionStorage.setItem("sell_wizard_item_id", createdItem.id)` and `sessionStorage.setItem("sell_wizard_step", "4")`. On `SellWizard` mount, check for these keys — if found, re-fetch the item from Supabase and restore to step 4 with `createdItem` set. In `resetWizard`, clear both keys.

**Fix 8 — Scroll to top on step advance**
In `goNext` callback, after `setCurrentStep(s => ...)`, add: `setTimeout(() => { const el = document.getElementById("sell-wizard-scroll"); if (el) el.scrollTop = 0; }, 50)`. Add `id="sell-wizard-scroll"` to the `div.flex-1.overflow-y-auto` container (line 1248).

**Fix 9 — Disable both CTA buttons during `markingListed`**
Line 1154: add `disabled={markingListed}` to the "View Item" button to prevent conflicting double navigation.

**Fix 10 — Fix `resetWizard` direction**
Line 218: change `setDirection(-1)` to `setDirection(1)` so the wizard animates correctly forward from the start after reset.

---

### Changes to `src/pages/Vintography.tsx` (1 change)

**Fix 11 — Persist guidance banner dismissal across sessions**
Line 449 and 462: replace `sessionStorage` with `localStorage` for the `vintography_guidance_dismissed` key, so users who dismiss the tip don't see it again on every new browser session.

---

### Changes to `src/pages/OptimizeListing.tsx` (none — this file's analogous "re-generate" pattern is in SellWizard's step 3)

---

## Priority Order

1. Bug 9 (sessionStorage restore) — most impactful on mobile where page eviction is common
2. Gap 1 (duplicate item creation guard) — prevents data pollution
3. Bug 3 / Fix 5 (poll double-start, interval cleanup) — prevents ghost polls and stale closures
4. Bug 2 / Fix 1 (canAdvance useCallback) — prevents double renders and stale `goNext`
5. Fix 3 (Re-generate resets optimiseSaved) — UX correctness
6. Fix 4 (divide-by-zero on price bar) — visual bug in single-comparable edge case
7. Fix 8 (scroll to top) — mobile experience polish
8. Fix 9 (disable View Item during markingListed) — prevents double navigation
9. Fix 10 (resetWizard direction) — cosmetic
10. Fix 11 (localStorage for guidance banner) — polish

## Expected Outcome

After these fixes:
- **Zero data corruption**: no duplicate items created from Back navigation
- **Bulletproof polling**: single interval, no ghost polls, no stale closures
- **State survives navigation**: returning from Photo Studio always restores the correct step
- **Mathematically safe**: no NaN in price bar, no divide-by-zero
- **Mobile-first scroll**: step transitions always start at the top
- **Correct animations**: reset wizard animates forward not backward
- **Persistent UX preferences**: Photo Studio guidance banner dismisses forever, not per-session
