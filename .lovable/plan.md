
# Sell Wizard: Comprehensive UX & Polish Pass

## Issues Found During End-to-End Testing

After a thorough audit of all 5 steps on both desktop (1440px) and mobile (390px), the following bugs and polish gaps were identified:

---

### Bug 1 — Step 1 header stays "Choose how to add the item…" inside sub-flows
When a user selects "Manual Entry" (or URL/Photo), the top step heading still reads "Add your item / Choose how to add the item — we'll guide you through the rest." This is confusing — you're now on a form, not a method chooser. The heading should update to "Item details / Fill in the information below." once inside a method sub-flow.

**Fix:** Add a conditional `stepMeta` override when `entryMethod` is set in Step 1. When `currentStep === 1 && entryMethod`, show a different title/subtitle.

---

### Bug 2 — Tiny "Back" link inside sub-flows (Desktop)
The `< Back` text link inside Manual/Photo/URL entry sub-flows is `text-xs` and easy to miss on desktop, especially since the form extends below it. On mobile it's fine; on desktop it should be more prominent.

**Fix:** Upgrade the in-form Back link from a bare text button to a proper `Button variant="ghost"` with icon, matching the footer Back button style.

---

### Bug 3 — No entry method breadcrumb / context indicator
Once inside "Manual Entry" or "Upload Photos", there's no indicator of which path was chosen. Users who accidentally click the wrong method have no easy visual confirmation of their current context.

**Fix:** Add a small pill/badge below the Back button showing the selected method (e.g. `✏️ Manual Entry` or `📷 Upload Photos`), so users know where they are.

---

### Bug 4 — "Create Item & Set Price" button not sticky on mobile
The CTA button in the details form is inside the scrollable content. On a phone with a long colour chip list, the user has to scroll to find the button. On mobile this is a critical UX failure — the primary action should always be visible.

**Fix:** Make the form's CTA sticky at the bottom of the viewport when `entryMethod` is set, using a `fixed bottom-0` container on mobile only (not on desktop where the content fits on screen). Apply `pb-20` to the form content to prevent overlap.

---

### Bug 5 — Step 2 & 3 loading states have no skeleton placeholder
When the price check or optimiser fires (auto-triggered on step entry), the step header shows "Price it right / AI analyses live market data" but the content area just shows a spinner. The shift from empty → results is jarring. There's no skeleton to manage user expectations.

**Fix:** Replace the bare `py-12 lg:py-20` spinner containers with a proper skeleton card showing the shape of the results (recommended price card shape, market range bar shape, AI insights card shape) while loading.

---

### Bug 6 — Step 2 "Re-run" and Step 3 "Re-generate" buttons are too small on desktop
These are `text-[10px] text-primary hover:underline` inline text links — barely tappable and visually weak on desktop where there's space for a real button.

**Fix:** Change to `Button variant="ghost" size="sm"` with a `RotateCcw` icon, right-aligned. Same visual weight as the header actions on other pages.

---

### Bug 7 — Large `pb-32 lg:pb-36` bottom padding causes excessive empty space on desktop
The main scroll container has `pb-32 lg:pb-36` (128px and 144px respectively). On steps 1 and 5 where there's no sticky footer nav, this creates a large blank area below the content.

**Fix:** Only apply the large bottom padding when `showFooterNav` is true (steps 2/3/4). On steps 1 and 5, use `pb-8 lg:pb-16` instead.

---

### Bug 8 — Step 5 "warning" banner appears immediately below the celebration header
When health score < 60 (common after quick manual entry without Photo Studio), the fallback immediately shows a warning banner (`Listing score below 60`) directly after "🎉 You're ready to list!" — extremely jarring. The celebration just happened; hitting the user with an orange warning kills the energy.

**Fix:** Change the warning banner to a softer "tip" tone: replace the `AlertCircle` + warning colour with a neutral info style (`Sparkles` icon + `bg-muted/50 border-border`), and soften the copy to: "Tip: Re-run the Optimiser or add enhanced photos to boost your listing score before going live."

---

### Bug 9 — No Profit Calculator on Step 5 (Pack)
After spending 2+ minutes going through the wizard, sellers reach Step 5 with no visibility into their potential profit. The `purchase_price` was captured in Step 1 and `current_price` is set in Step 2, but no profit calculation is shown.

**Fix:** Add a compact "Profit Estimate" card on Step 5, below the celebration header and above the VintedReadyPack. Show: Cost £X, Sell Price £Y, Vinted fee ~5% → **Est. profit £Z**. Only show when both `purchase_price` and `current_price` are set on `createdItem`.

---

### Bug 10 — Sell Wizard desktop header loses the sidebar nav context
The wizard is a full-page takeover that replaces the app shell (no sidebar). The only exit is "← Items" in the header. On desktop, users accustomed to the sidebar feel disoriented — they can't quickly jump to Trends, Dashboard, or Price Check while mid-wizard.

**Fix:** No sidebar (correct — wizard should be focused), but: change "← Items" to a `Home` icon link to dashboard, AND add a keyboard shortcut hint `[Esc to exit]` tooltip on the back button on desktop. This gives a clear escape route without cluttering the UI.

---

### Polish 1 — Progress bar connector lines don't fill with colour as steps complete
The connector lines (`flex-1 h-px`) only turn `bg-success/60` when a step is `isDone` (before current). But the lines between steps look thin and hard to see against the background. On desktop with larger circles, the lines look even more disconnected.

**Fix:** Increase line height from `h-px` to `h-0.5` on desktop (`lg:h-0.5`). Also ensure the active step's left connector is coloured success, not just past-step connectors.

---

### Polish 2 — Desktop form inputs lack `lg:h-12` for Select fields (Condition/Category)
Looking at the current code: `SelectTrigger` has `h-10 lg:h-12` — this is already applied. However the brand/size inputs (`Input`) are missing the `lg:h-12` class, creating a height mismatch between Select dropdowns and text inputs in the same grid row.

**Fix:** Add `className="h-10 lg:h-12"` to Brand and Size Input elements to match the Select height.

---

### Polish 3 — VintedReadyPack description has no "Read more" toggle
The description in the Pack card uses `max-h-48 overflow-y-auto scrollbar-hide` — the scrollbar is hidden, so users don't know they can scroll. On desktop there's space for a proper expand toggle.

**Fix:** Add a `descExpanded` state to the VintedReadyPack component. Show `line-clamp-5` by default with a "Read more" button if description is > 300 characters.

---

### Polish 4 — Step 1 "How would you like to add your item?" question is redundant on desktop
The text "How would you like to add your item?" repeats the step heading intent on a large screen where both are visible simultaneously.

**Fix:** Remove this redundant question text from the method picker section; the cards are self-explanatory and the heading "Add your item" already sets context.

---

## Files to Change

| File | Changes |
|------|---------|
| `src/pages/SellWizard.tsx` | Bugs 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 + Polish 1, 2, 4 |
| `src/components/VintedReadyPack.tsx` | Polish 3 (Read more toggle for description) |

---

## Implementation Detail

### Bug 1 — Conditional step meta
```tsx
// In the stepMeta definition or the render:
const step1Title = entryMethod
  ? "Item details"
  : "Add your item";
const step1Sub = entryMethod
  ? "Fill in the fields below — the AI uses these to price and optimise your listing."
  : "Choose how to add the item — we'll guide you through the rest.";
```

### Bug 4 — Mobile sticky CTA
The `createdItem` check already controls "Continue vs Create" button. Add a wrapper:
```tsx
<div className={entryMethod && !createdItem ? "sm:relative fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm px-4 pb-[env(safe-area-inset-bottom)] pt-3 border-t border-border sm:border-0 sm:bg-transparent sm:backdrop-blur-0 sm:p-0" : ""}>
  <Button ...>Create Item & Set Price</Button>
</div>
```

### Bug 5 — Loading skeleton
Replace spinner containers in Steps 2 and 3 with skeleton cards that mirror the shape of results:
```tsx
// Step 2 loading skeleton
<div className="space-y-3 animate-pulse">
  <div className="rounded-xl border bg-muted/40 h-32 lg:h-44" /> {/* Price hero */}
  <div className="rounded-lg border bg-muted/30 h-20 lg:h-24" /> {/* Range bar */}
  <div className="rounded-lg border bg-muted/20 h-16 lg:h-20" /> {/* AI insights */}
</div>
```

### Bug 9 — Profit Calculator
```tsx
{createdItem?.purchase_price && createdItem?.current_price && (
  <div className="rounded-xl border border-border bg-muted/30 p-4 lg:p-6">
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Profit Estimate</p>
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">Cost Price</span>
      <span>£{createdItem.purchase_price.toFixed(2)}</span>
    </div>
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">Sell Price</span>
      <span>£{createdItem.current_price.toFixed(2)}</span>
    </div>
    <div className="flex justify-between items-center text-sm text-muted-foreground">
      <span>Vinted fee (~5%)</span>
      <span>-£{(createdItem.current_price * 0.05).toFixed(2)}</span>
    </div>
    <div className="border-t border-border mt-2 pt-2 flex justify-between items-center font-bold text-success">
      <span>Est. Net Profit</span>
      <span>£{(createdItem.current_price * 0.95 - createdItem.purchase_price).toFixed(2)}</span>
    </div>
  </div>
)}
```
