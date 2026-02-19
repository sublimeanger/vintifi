
# Fix: Horizontal Scroll + Pipeline UX

Three separate bugs to fix across three files.

---

## Bug 1 — Horizontal scroll is still broken

**Root cause:** `OperationBar` and `QuickPresets` live inside a `<div className="space-y-4">` in the left panel on desktop. The `space-y-*` utility on a block div does not affect `overflow-x`, but the parent `<main>` in `AppShellV2` has `container mx-auto px-3 sm:px-4` — and the inner divs that hold the operation bar have no explicit width constraint letting flex children overflow. The bigger problem is that the `overflow-x-auto` scroll container itself has no explicit width set — it just matches its parent — but because its *parent* (`space-y-4` div, which is a grid cell in the `lg:grid-cols-[420px_1fr]`) doesn't have `overflow: hidden` or `min-width: 0`, the flex children can just push the grid cell wider rather than scrolling.

**Fix:** Add `min-w-0` to the left panel div and `w-full` to the scroll containers in both `OperationBar.tsx` and `QuickPresets.tsx`. This forces the scroll container to respect the grid cell width and actually scroll rather than overflow the layout.

---

## Bug 2 — "Add Effect" appears to do nothing

**Root cause:** The pipeline logic has a conceptual gap that makes the whole "chaining" system invisible and confusing:

1. `handleOpSelect` (called when tapping the `OperationBar`) calls `REPLACE_PIPELINE` — it always resets to a single-step pipeline. So after you pick any effect, you're back to 1 step.
2. `PipelineStrip` hides itself when `pipeline.length <= 1 && available.length === 0`. With 1 step, it shows — but this is buried inside the `ConfigContainer` (the bottom drawer). On desktop it appears under the config options but the user has no idea the "Add Effect" button is there.
3. `getAvailableOpsToAdd` filtering works correctly but if you picked e.g. `ai_model`, the rules say: *"if ai_model is first, only enhance/decrease can follow"* — so only 2 ops appear in the add menu, which may not be obvious.
4. The **PipelineStrip dropdown** renders inside an `overflow-x-auto` scroll container — meaning the dropdown gets **clipped** by the scroll area and may not be visible at all on some viewports.

**Fix:**
- Move `PipelineStrip` **outside** the `ConfigContainer`/drawer — render it directly in the main page layout, always visible below the OperationBar, so users can see the chain at a glance.
- The `PipelineStrip` dropdown (`z-50`) needs `position: fixed` coordinates instead of `position: absolute` so it escapes the scroll clip. We can do this by flipping the dropdown to open **upward** (`bottom-full` instead of `top-full`) and wrapping its parent in `overflow-visible`.
- On the left panel desktop, wrap the scroll containers in a `overflow-x-clip` div while letting the dropdown area be `overflow-visible`.

---

## Bug 3 — UX of the pipeline is not explained

**What's confusing:** There's no label or affordance that tells users "pick an effect above, then add more steps here". The pipeline strip appears below config options with no context.

**Fix:** Move `PipelineStrip` to directly below the `OperationBar` label (between "Choose Effect" and the config), always visible. Add a small helper line: *"Tap an effect to configure it. Chain up to 4 effects."*

---

## Files to change

| File | What changes |
|---|---|
| `src/pages/Vintography.tsx` | Move `PipelineStrip` out of `configContent` and render it between OperationBar and ConfigContainer in both mobile and desktop layouts. Add `min-w-0` to left panel div. |
| `src/components/vintography/OperationBar.tsx` | Add `w-full` to the scroll container div. |
| `src/components/vintography/QuickPresets.tsx` | Add `w-full` to the scroll container div. |
| `src/components/vintography/PipelineStrip.tsx` | Fix dropdown clipping: change scroll container from `overflow-x-auto` to `overflow-visible` (the pipeline pills themselves don't need to scroll — they wrap). Change dropdown from `top-full` to `bottom-full mb-1.5` so it opens upward and never gets clipped. Remove the `overflow-x-auto` on the pill container (pills can wrap or we give them enough space). |

---

## Technical detail on the pipeline UX flow after fix

The intended flow becomes:

```text
[Choose Effect bar — 7 pill buttons]
   ↕ tap any pill = sets pipeline to [that op], opens config

[Effect Pipeline — always visible]
   [#1 Clean BG ×]  →  [#2 Enhance ×]  →  [+ Add Effect ▾]
                                              ↕ dropdown opens upward

[Config section — shows settings for the active step]
   e.g. "Clean Background — no options needed"
   e.g. "Lifestyle Scene — pick a background"

[Generate button — always at bottom]
```

This way the user can see at a glance:
- What they've selected (pipeline strip, always visible)
- What options exist for the selected step (config below)
- How to add more steps (the + button in the strip)
- How much it will cost (Generate button shows total credits)
