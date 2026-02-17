

# Fix the Core Flow: Required Fields + Condition-Aware Pricing

## What's Broken

1. **Condition mismatch**: Wizard saves "Very Good" (Title Case), but Price Check dropdown expects "very_good" (snake_case). When you navigate from an item to price check, condition is blank.
2. **Price check ignores condition**: The Perplexity search doesn't distinguish NEW vs USED items. A "Very Good" (used) item gets priced against new listings, giving inflated guidance.
3. **No required fields enforced**: Users can skip condition and purchase price in the wizard, breaking downstream flows.

## Changes

### 1. NewItemWizard — Enforce Required Fields

**File:** `src/components/NewItemWizard.tsx`

- Make **condition** and **purchase price** mandatory in the `handleSave` function (show toast if missing)
- Add visual required indicator (*) to those labels
- Purchase price allows £0 but the field must be touched (empty string = not set, "0" = valid)

### 2. Normalise Condition Values

**File:** `src/components/NewItemWizard.tsx`

- Change the conditions array to use snake_case values with Title Case labels, matching the Price Check format:
  ```
  { value: "new_with_tags", label: "New with tags" }
  { value: "new_without_tags", label: "New without tags" }
  { value: "very_good", label: "Very good" }
  { value: "good", label: "Good" }
  { value: "satisfactory", label: "Satisfactory" }
  ```
- The `<select>` saves the snake_case value to the database
- This aligns with PriceCheck's `CONDITION_OPTIONS` which already uses snake_case

### 3. Condition-Aware Perplexity Search

**File:** `supabase/functions/price-check/index.ts`

Update the Perplexity prompt to explicitly search for NEW or USED items based on condition:

- If condition is `new_with_tags` or `new_without_tags` -> search for "new" items
- If condition is `very_good`, `good`, or `satisfactory` -> search for "used" / "pre-owned" items
- Modify the search query: `Find current prices for USED "${itemDesc}" on UK resale platforms` or `Find current prices for NEW "${itemDesc}"...`
- Add instruction: "Focus ONLY on listings matching this condition. Do NOT mix new and used prices."

### 4. Condition-Aware Gemini Analysis

**File:** `supabase/functions/price-check/index.ts`

Update the Gemini prompt to weight the analysis toward the correct condition bracket:

- Add explicit instruction: "This item is USED (condition: Very Good). Your recommended_price MUST reflect used market prices, not new retail or new-with-tags resale."
- The `condition_price_breakdown` should highlight the relevant condition row

## Technical Detail

All changes are in two files:
- `src/components/NewItemWizard.tsx` — required field validation + snake_case condition values
- `supabase/functions/price-check/index.ts` — condition-aware search prompt + analysis prompt

No database migration needed. Existing items with Title Case conditions will still work in the price check because the edge function normalises the condition string.

