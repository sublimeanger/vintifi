

# Fix Price Check -> Inventory Flow: Use User's Input, Not AI's

## The Problem

When you type "jaeger mens blazer" and hit Save to Inventory, the system currently saves the **AI-generated item title** from comparable listings (e.g., "Jaeger Double-Breasted Wool Blazer Navy Size 42R") instead of your actual search term. This breaks the workflow because:

1. You're doing research, not listing a specific item yet
2. The AI title comes from *other people's listings*, not your item
3. You want to add YOUR description to inventory, then use the AI Optimiser later to build out the full listing

## The Fix

### 1. Save to Inventory uses YOUR input, not the AI's

Change the "Save to Inventory" button (line 536-546 in `PriceCheck.tsx`) so it:
- Uses the **user's typed search query** (`brand`, `category`, raw text) as the listing title
- Stores the AI `recommended_price` as the guideline sale price
- Stores `buy_price_good` and `buy_price_max` as reference data
- Does NOT overwrite with `report.item_title` or `report.item_brand`

**Before:**
```
title: report.item_title || `${report.item_brand || brand} ${category}`.trim()
brand: report.item_brand || brand
```

**After:**
```
title: `${brand} ${category}`.trim() || "Untitled"
brand: brand || null
```

The user's raw input is the source of truth. The AI analysis is intelligence, not identity.

### 2. Show what will be saved (confirmation clarity)

Add a small preview line above the Save button showing exactly what will be added:
> Adding to inventory: **"jaeger mens blazer"** at guideline price **£45**

This removes ambiguity so the user knows their input is preserved.

### 3. Store buy price data alongside the listing

When saving to inventory, also store the `buy_price_max` as `purchase_price` (if the user hasn't set one) so they have a reference for what they paid or should pay. The `recommended_price` stays as the guideline sell price.

### 4. Pass user's input (not AI's) to the Optimise flow

The "Optimise This Listing" button and Journey Banner currently pass `report.item_title` to the optimiser. Change these to pass the user's original search terms instead, so the optimiser starts from the user's description and builds it out.

## Technical Changes

### File: `src/pages/PriceCheck.tsx`

1. **Line 536-546** -- Change the insert to use user input:
   - `title`: `\`${brand} ${category}\`.trim() || url || "Untitled"`
   - `brand`: `brand || null` (user's input only)
   - `purchase_price`: `report.buy_price_max || null` (sourcing reference)
   - `recommended_price`: `report.recommended_price`
   - `condition`: `condition || null`

2. **Line 533-555** -- Add a preview line above the Save button showing what will be saved

3. **Lines 557, 587, 592** -- Update the Optimise navigation and Journey Banner to pass user's `brand`/`category` instead of `report.item_title`/`report.item_brand`

### No other files need changing

The listings table already has `purchase_price`, `recommended_price`, `title`, `brand` columns. No database changes needed.

## Result

The flow becomes:
1. Type "jaeger mens blazer" into Price Check
2. Get full market intelligence (prices, demand, comparables)
3. Click "Save to Inventory" -- saves as "jaeger mens blazer" with guideline price £45
4. Later, open from Listings and click "Optimise" -- AI builds out a proper title and description from your rough input
5. The listing evolves from rough note to polished, SEO-optimised content through the natural workflow
