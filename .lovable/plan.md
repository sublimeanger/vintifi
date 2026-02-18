
# Standalone "Sell" Wizard — Nav-Level Entry Point + Price Override

## The Vision

Right now the Listing Wizard is a side-panel on the Item Detail page. This is backwards — it assumes the user already has an item and knows where to find the wizard. The world-class pattern (Depop, Vinted's own listing flow, Airbnb's "List your home") puts the primary creation flow **directly in the navigation** as its own dedicated page. One button. One clear path. No hunting around.

The wizard should be a route: `/sell` — accessible from the sidebar and mobile bottom nav as a primary action. It becomes a full-page, multi-step experience (not a side sheet) that starts from scratch: Add Item → Details → Price → Optimise → Photos → Pack. The existing sheet wizard on ItemDetail stays as a "resume" shortcut for items already created.

---

## Change 1 — New `/sell` Route: Full-Page Standalone Wizard

### Route
`/sell` — a new page that renders `<SellWizard />` (full-page, not a sheet).

This page is a **7-step** flow that includes item creation at the top:

```
① Add Item   ② Details   ③ Price   ④ Optimise   ⑤ Photos   ⑥ Pack ✓
```

Step 0/1 is the "Add Item" step — this is the entry from `NewItemWizard` logic, already built. We reuse the same photo upload + URL import + manual entry options that exist in `NewItemWizard.tsx`, but render them inside the full-page sell wizard instead of a dialog.

When step 1 (Add Item) completes and a listing is created in the DB, the wizard picks up the new item ID and continues through the remaining 5 steps (which are identical to the existing `ListingWizard` steps 1–5).

### Visual Layout (Desktop)

```
┌──────────────────────────────────────────────────────────┐
│  ← Back to Items    🚀 Sell Wizard     Step 2 of 6       │
├──────────────────────────────────────────────────────────┤
│  ① ──── ② ──── ③ ──── ④ ──── ⑤ ──── ⑥                 │
│  Add  Details  Price  Optimise Photos  Pack              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│              [Step content — max-w-lg centered]          │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  [← Back]                         [Continue →]          │
└──────────────────────────────────────────────────────────┘
```

On **mobile**: full-screen with the progress strip pinned to top, content scrollable, footer CTA sticky at bottom — same pattern as Depop's listing flow.

### Navigation Entry Points

**Desktop sidebar** — a new nav item added between "Items" and "Price Check":
```
Dashboard
Items
→ 🚀 Sell (new, highlighted with primary colour accent)
Price Check
Optimise
Trends
Photo Studio
```

**Mobile bottom nav** — replace one of the 5 tabs with "Sell". The bottom tabs become:
```
Home | Items | 🚀 Sell | Trends | Optimise
```
The "Sell" tab is styled differently (primary background pill, always highlighted) so it reads as a CTA, not just a navigation item — same as Instagram's "+" tab or TikTok's centre record button.

**Items list page** — the existing "+ New Item" button navigates to `/sell` instead of opening the `NewItemWizard` dialog.

**Dashboard** — the "Add your first item" empty state and "Quick Actions" card link to `/sell`.

---

## Change 2 — Price Override in Step 3 (Price Check)

### Current Behaviour
After the AI runs the price check, the only action is "Use £X as my listing price" — you must accept the AI recommendation. There is no way to type your own price.

### New Behaviour
After the price check result loads, show **two options** side by side:

**Option A — Accept AI price (primary CTA, unchanged):**
```
[ ✓ Use £14.00 — AI recommended ]
```

**Option B — Set my own price (secondary, text input):**
A small `"Or set your own price:"` section below with a `£` prefixed input field and a "Use this price" button. The user types any number, hits confirm, and that price gets saved to the DB — same `acceptPrice` function, just with the custom value instead of `priceResult.recommended_price`.

The UX pattern:
```
┌─────────────────────────────────┐
│  Recommended Price              │
│  £14.00   88% confidence        │
│  Market: £8 ──●─── £22         │
│  [AI insight text...]           │
│                                 │
│  [✓ Use £14.00 — AI suggested] │
│                                 │
│  ─── or set your own price ─── │
│  £ [12.00          ] [Use this] │
└─────────────────────────────────┘
```

Once either price is accepted (AI or custom), the accepted price and "Price locked" confirmation state show as before. The `canAdvance()` check for step 3 remains: `priceAccepted === true`.

The `acceptPrice` function needs to accept an optional `customPrice` parameter:
```ts
const acceptPrice = async (customPrice?: number) => {
  const price = customPrice ?? priceResult?.recommended_price;
  if (!price) return;
  // same DB write as before
};
```

---

## Files to Change

| File | Action | What changes |
|------|--------|-------------|
| `src/pages/SellWizard.tsx` | **New file** | Full-page standalone wizard — 6 steps including item creation. Reuses all edge function calls and DB logic from `ListingWizard.tsx`. |
| `src/App.tsx` | **Edit** | Add `/sell` route pointing to `SellWizard`. |
| `src/components/AppShellV2.tsx` | **Edit** | Add "Sell" to desktop sidebar nav items + replace a mobile bottom tab with "Sell" styled as primary CTA. |
| `src/components/ListingWizard.tsx` | **Edit** | Add price override input to Step 2, modify `acceptPrice` to accept `customPrice` param, add `customPriceInput` state. |
| `src/pages/Listings.tsx` | **Edit** | Wire "+ New Item" button to `navigate('/sell')` instead of opening `NewItemWizard` dialog. |

---

## Technical Detail: SellWizard.tsx Architecture

The key difference from `ListingWizard.tsx` is that `SellWizard` is a **page** (not a sheet), starts with item creation, and owns the item state from scratch:

```tsx
// SellWizard.tsx — simplified structure
export default function SellWizard() {
  const [step, setStep] = useState<1|2|3|4|5|6>(1);
  const [createdItem, setCreatedItem] = useState<Listing | null>(null);
  const navigate = useNavigate();

  // Step 1: Item creation — inline (reuses NewItemWizard logic)
  // Steps 2–6: Same as ListingWizard steps 1–5, but rendered full-page
  // On step 6 complete: navigate to /items/:id with success toast
}
```

Steps 2–6 in `SellWizard` are the same logic as `ListingWizard` steps 1–5. To avoid full code duplication, we extract the step content components (Step1Details, Step2Price, etc.) from `ListingWizard.tsx` into named exports that both `ListingWizard` and `SellWizard` import. This keeps the price override fix in one place and both wizards benefit.

Actually — to keep it simple and ship fast, `SellWizard.tsx` is self-contained (~500 lines) with the same logic inline. Both files share the same patterns. The item creation step (step 1 of SellWizard) is a simplified version of `NewItemWizard` — just the Manual entry path (title, brand, category, condition, price, photos) presented cleanly, since URL import and photo-first modes are secondary entry paths that can be added later.

### Step 1 of SellWizard — "Add Your Item"
Three entry method cards:
- **Upload a photo** — drag and drop / camera roll, AI identifies the item
- **Enter manually** — type title, brand, category, condition, price
- **Import from URL** — paste a Vinted listing URL (scrape-vinted-url edge function)

The user picks one, fills it in, hits "Create Item" — the item is inserted into `listings` table with `status: 'draft'`, the returned ID is stored in `createdItem`, and the wizard advances to step 2.

### Progress Bar Difference
`SellWizard` progress bar shows 6 steps (Add, Details, Price, Optimise, Photos, Pack). `ListingWizard` (sheet on ItemDetail) keeps 5 steps as today (skips the Add step since item already exists).

### Mobile Bottom Nav Styling
The "Sell" tab in the bottom nav uses a `+` icon in a filled primary-coloured pill — visually distinct from the other ghost-style tabs:

```tsx
// Sell tab — styled as primary CTA
<button className="relative flex flex-col items-center justify-center flex-1 h-full">
  <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-md active:scale-90 transition-transform">
    <Plus className="w-5 h-5 text-primary-foreground" />
  </div>
  <span className="text-[9px] font-bold text-primary mt-0.5">Sell</span>
</button>
```

This is exactly the pattern Depop, Instagram, TikTok, and Vinted itself use for the primary create action in mobile bottom navigation.

---

## Scope Summary

| What | Detail |
|------|--------|
| New files | `src/pages/SellWizard.tsx` |
| Edited files | `App.tsx`, `AppShellV2.tsx`, `ListingWizard.tsx`, `Listings.tsx` |
| Database changes | None |
| New edge functions | None — reuses `price-check`, `optimize-listing`, `scrape-vinted-url` |
| New dependencies | None |
| Result | A seller can click "Sell" in the nav and be guided from zero to a completed Vinted-Ready Pack in under 5 minutes, on any device, with full price control at the pricing step |
