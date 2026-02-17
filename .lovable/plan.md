

# Fix Everything: 15 Cohesiveness Fixes

## Overview
This plan addresses all 15 bugs and UX flaws identified in the end-to-end audit, organized by priority.

---

## Fix 1: Price Check uses item TITLE, not just brand + category
**File:** `supabase/functions/price-check/index.ts`

Currently the Perplexity search builds its query from `brand` + `category` (e.g. "Nike Jumpers"). This is too generic.

- Change `fetchViaPerplexity` to accept a `title` parameter
- When navigating from an item, pass the full title (e.g. "Nike Crewneck Sweatshirt M") to Perplexity as the primary search term
- Update the search description logic on line 189: prefer `itemTitle` over `brand + category`
- Pass `itemTitle` into `fetchViaPerplexity` so the search is specific

Also update the frontend (`PriceCheck.tsx`) to pass the item title to the edge function when in manual mode or when navigating from an item.

---

## Fix 2: Add SIZE field to Price Check manual form
**File:** `src/pages/PriceCheck.tsx`

The manual entry form has Brand, Category, Condition but no Size field. Size is critical for accurate pricing.

- Add a `size` state variable
- Add a Size input field in the manual entry grid
- Pass `size` in the `supabase.functions.invoke("price-check", { body: { ... size } })` call
- Pre-populate size from search params when navigating from an item (`searchParams.get("size")`)

Also update `ItemDetail.tsx` `handlePriceCheck` to pass `size` in the URL params.

---

## Fix 3: Add "Sweatshirts" to category dropdown
**File:** `src/components/NewItemWizard.tsx`

The categories array is missing "Sweatshirts". Add it after "Hoodies" in the list.

---

## Fix 4: Stop Optimiser from overwriting original title
**File:** `src/pages/OptimizeListing.tsx`

Lines 224-228: the save-to-DB logic currently sets `title: data.optimised_title` and `description: data.optimised_description`, overwriting the user's original title.

- Save the optimised title/description to NEW fields: `optimised_title` and `optimised_description` (these will need a migration)
- Keep the original `title` and `description` untouched
- The Vinted-Ready Pack and Listing tab should display the optimised versions when available, falling back to originals

This requires a small database migration to add `optimised_title` and `optimised_description` columns to the listings table.

---

## Fix 5: Display condition as human-readable in Optimiser
**File:** `src/pages/OptimizeListing.tsx`

Line 116: when loading condition from DB, it converts snake_case to Title Case for display. But then this Title Case value gets sent to the AI. The condition should stay as snake_case internally and only be displayed as human-readable in the UI.

- Keep condition state as snake_case
- Display it with `.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())` only in the UI label, not in the state

---

## Fix 6: Pre-fill Profit Calculator with purchase_price
**File:** `src/pages/PriceCheck.tsx`

When navigating from an item that has a `purchase_price`, the "Your Cost" field in the Profit Calculator should be pre-filled.

- Accept `purchasePrice` from search params
- Pre-populate `yourCost` state when available
- Update `ItemDetail.tsx` `handlePriceCheck` to pass `purchase_price` in the URL params

---

## Fix 7: Auto-populate current_price after price check
**File:** `src/pages/PriceCheck.tsx`

After a successful price check linked to an item, update the item's `current_price` to the `recommended_price` if `current_price` is currently null.

- In the `if (itemId && user)` block (line 176), add a conditional update: `current_price: data.recommended_price` only when the existing `current_price` is null

---

## Fix 8: Portfolio value uses recommended_price fallback
**File:** `src/pages/Listings.tsx`

The portfolio total currently only sums `current_price`. When `current_price` is null but `recommended_price` exists, it should use that as fallback.

- Find the portfolio value calculation and update: `item.current_price ?? item.recommended_price ?? 0`

---

## Fix 9: Pass item title to Price Check from ItemDetail
**File:** `src/pages/ItemDetail.tsx`

The `handlePriceCheck` function (line 134) passes brand, category, condition but NOT the item title or size.

- Add `params.set("title", item.title)` 
- Add `params.set("size", item.size)` when available
- Add `params.set("purchasePrice", item.purchase_price)` when available

---

## Fix 10: Price Check accepts and uses title param
**File:** `src/pages/PriceCheck.tsx`

- Add `paramTitle` from search params
- Add a `title` state variable
- Pass `title` in the edge function call body
- Display the title in the manual form (optional, could be auto-derived)

---

## Fix 11: Price Check edge function uses title for search
**File:** `supabase/functions/price-check/index.ts`

- Accept `title` in the request body
- Set `itemTitle = title || ""` at the top alongside other params
- The existing line 189 `const searchDesc = itemTitle || [itemBrand, itemCategory].filter(Boolean).join(" ")` already prefers `itemTitle` -- just ensure it gets populated from the request body, not only from Firecrawl

---

## Fix 12: Condition display in ItemDetail Listing tab
**File:** `src/pages/ItemDetail.tsx`

Line 651: condition displays raw snake_case. Already handled on line 252 in the badge row, but the Listing tab grid (line 655) shows raw value.

- Apply the same `.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())` transform to the condition field in the Listing tab

---

## Fix 13: Optimiser condition state fix
**File:** `src/pages/OptimizeListing.tsx`

Line 116: converts condition from DB to Title Case. This breaks the AI prompt which expects snake_case.

- Remove the Title Case conversion on line 116
- Keep raw snake_case value in state
- Only format for display in the UI

---

## Fix 14: DB Migration for optimised_title/description
New columns on the `listings` table:
- `optimised_title TEXT`
- `optimised_description TEXT`

This keeps original user data intact while storing AI-generated versions separately.

---

## Fix 15: Update VintedReadyPack and Listing tab to use optimised fields
**Files:** `src/components/VintedReadyPack.tsx`, `src/pages/ItemDetail.tsx`

- When displaying listing copy, prefer `optimised_title` over `title` and `optimised_description` over `description`
- The copy-to-clipboard action should copy the optimised version
- Both fields fall back to originals when optimised versions don't exist

---

## Summary of files changed

| File | Changes |
|------|---------|
| `supabase/functions/price-check/index.ts` | Accept `title` param, use it as primary search term |
| `src/pages/PriceCheck.tsx` | Add size + title fields, pre-fill purchase price, pass title to edge function |
| `src/pages/OptimizeListing.tsx` | Save to `optimised_title`/`optimised_description`, fix condition state |
| `src/pages/ItemDetail.tsx` | Pass title/size/purchasePrice to price check, format condition, use optimised fields |
| `src/pages/Listings.tsx` | Portfolio fallback to recommended_price |
| `src/components/NewItemWizard.tsx` | Add "Sweatshirts" category |
| `src/components/VintedReadyPack.tsx` | Use optimised_title/description fields |
| DB Migration | Add `optimised_title`, `optimised_description` columns |

