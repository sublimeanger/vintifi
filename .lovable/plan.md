

# Price Intelligence Engine Upgrade

## What Changes

### 1. Condition-Aware Pricing (New vs Used Differentiation)

The current system treats condition as a free-text field with no real impact on the analysis. The upgrade adds:

- **Structured condition selector** replacing the free-text input: dropdown with Vinted's actual condition grades (New with tags, New without tags, Very good, Good, Satisfactory)
- **Condition-segmented results** from the AI: the report will show separate pricing for "New" vs "Used" conditions so sellers can see the price gap
- The AI prompt will be updated to explicitly separate new/used comparables and flag condition-based price differences in insights

### 2. Reseller Price Guide (Buy At / Sell At)

Add a new **"Reseller Guide"** card to the report with three key data points:

- **Good Buy Price** -- the price at which this is a great deal to source (below market, high margin)
- **Max Buy Price** -- the absolute most you should pay and still make profit after Vinted fees + shipping
- **Estimated Resale Value** -- what you can realistically sell it for on Vinted

The AI will calculate these factoring in:
- ~5% Vinted buyer protection fee
- Estimated shipping cost (based on category/weight)
- A target minimum margin (default 40%)

### 3. Richer Data in the Report

Add these new sections to the report UI:

- **Sell Speed Indicator** -- "Estimated days to sell" at the recommended price, based on comparable sell-through data
- **Demand Signal** -- High/Medium/Low demand indicator based on search volume vs supply ratio
- **Condition Price Breakdown** -- a mini table showing avg price by condition grade
- **Fee Calculator** -- shows the net profit after Vinted fees and estimated shipping

### 4. Enhanced Comparable Items

Each comparable item in the list will now show:
- **Condition** badge (New/Used)
- **Platform** source if available
- Better visual distinction between sold items (confirmed prices) and active listings (asking prices)

---

## Technical Changes

### Edge Function (`supabase/functions/price-check/index.ts`)

Update the AI prompt to request the expanded JSON schema:

```
{
  "recommended_price": number,
  "confidence_score": 0-100,
  "price_range_low": number,
  "price_range_high": number,
  "item_title": "string",
  "item_brand": "string",
  "condition_detected": "new_with_tags | new_without_tags | very_good | good | satisfactory",
  "buy_price_good": number,       // NEW: great sourcing price
  "buy_price_max": number,        // NEW: max you should pay
  "estimated_resale": number,     // NEW: realistic sell price
  "estimated_days_to_sell": number, // NEW
  "demand_level": "high | medium | low", // NEW
  "condition_price_breakdown": [   // NEW
    {"condition": "New with tags", "avg_price": number, "count": number},
    {"condition": "Very good", "avg_price": number, "count": number},
    ...
  ],
  "estimated_fees": number,       // NEW: Vinted fees
  "estimated_shipping": number,   // NEW
  "net_profit_estimate": number,  // NEW: resale - fees - shipping
  "comparable_items": [
    {"title": "...", "price": number, "sold": boolean, "days_listed": number, "condition": "string"}
  ],
  "ai_insights": "string",
  "price_distribution": [...]
}
```

The AI prompt will instruct the model to:
- Separate new vs used comparables in its analysis
- Calculate buy prices assuming 40% target margin and ~5% Vinted fee + ~3-5 GBP shipping
- Estimate demand level from the ratio of sold items to active listings
- Provide condition-specific pricing breakdown

### Frontend (`src/pages/PriceCheck.tsx`)

1. **Input section**: Replace free-text condition input with a `Select` dropdown using Vinted's condition grades
2. **Hero price card**: Add "Sell At" label and show the net profit estimate below
3. **New "Reseller Guide" card**: Three-column layout showing Good Buy / Max Buy / Resale Value with color coding (green/amber/red)
4. **New "Sell Speed & Demand" card**: Days to sell estimate + demand level badge
5. **New "Condition Breakdown" card**: Mini table showing average prices per condition grade
6. **New "Profit Calculator" card**: Shows resale price - fees - shipping = net profit, with an editable "Your cost" input so sellers can plug in what they'd pay
7. **Updated comparable items**: Add condition badge per item, visual split between sold (confirmed) and active (asking) prices

### Type Updates

Update the `PriceReport` type in `PriceCheck.tsx` to include all new fields.

### No Database Changes Needed

The `price_reports` table already stores `comparable_items` and `price_distribution` as JSONB. The new fields from the AI response will be stored in these existing columns or simply displayed from the edge function response without needing new columns.

---

## Implementation Order

1. Update the edge function AI prompt with the expanded schema
2. Update the `PriceReport` TypeScript type
3. Replace condition text input with Select dropdown
4. Add the Reseller Guide card
5. Add Sell Speed, Demand, Condition Breakdown, and Profit Calculator cards
6. Update comparable items display with condition badges
7. Deploy and test end-to-end
