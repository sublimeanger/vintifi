
# Annual/Monthly Billing Toggle & Free Trial Implementation

## Overview
Add annual billing with 20% discount across all paid tiers, and enable a 7-day free trial on Pro/Business/Scale plans (no credit card required for the free tier, but trial on paid plans uses Stripe's built-in trial functionality).

---

## 1. Create Annual Stripe Prices

Create 3 new annual prices in Stripe (20% discount, billed yearly):

| Tier | Monthly | Annual (per month) | Annual total | Savings |
|------|---------|-------------------|-------------|---------|
| Pro | £14.99/mo | £11.99/mo | £143.88/yr | £36 |
| Business | £34.99/mo | £27.99/mo | £335.88/yr | £84 |
| Scale | £74.99/mo | £59.99/mo | £719.88/yr | £180 |

These will be created as `recurring: { interval: "year" }` prices on the existing products.

## 2. Free Trial Setup

Stripe supports `trial_period_days` on checkout sessions. When creating a checkout session, pass `subscription_data: { trial_period_days: 7 }` so users get 7 days free before being charged. No credit card is still required at checkout (Stripe requires it for trials), but the trial means they won't be charged for the first 7 days.

The approach:
- Add `trial_period_days: 7` to the `create-checkout` edge function
- Only apply trial for first-time subscribers (check if customer has had previous subscriptions)
- Update webhook to handle `customer.subscription.trial_will_end` event

## 3. Update Constants

**`src/lib/constants.ts`** -- Add annual price IDs to each tier:

```typescript
pro: {
  ...existing,
  annual_price_id: "price_XXXXX",  // created by Stripe tool
  annual_price: 143.88,            // yearly total
},
```

## 4. Update Edge Function

**`supabase/functions/create-checkout/index.ts`**:
- Accept `billing_interval` param ("monthly" | "annual")
- Select the correct `price_id` based on interval
- Add `subscription_data: { trial_period_days: 7 }` for first-time subscribers
- Check if customer already had a subscription to avoid repeat trials

## 5. Update Frontend Pages

### Landing Page (`src/pages/Landing.tsx`)
- Add monthly/annual toggle to the pricing section (same pattern as Pricing.tsx already has)
- Show discounted annual prices when toggled
- Update CTA text to mention "7-day free trial"

### Pricing Page (`src/pages/marketing/Pricing.tsx`)
- Already has the toggle and visual discount -- just needs to pass the correct annual `price_id` when users click upgrade
- Update button text: "Start 7-Day Free Trial"

### Settings Page (`src/pages/SettingsPage.tsx`)
- Add monthly/annual toggle to the subscription cards
- Pass correct price_id (monthly or annual) to `create-checkout`
- Show "7-day free trial" badge on plans if user hasn't trialled before

### Auth Context (`src/contexts/AuthContext.tsx`)
- No changes needed -- webhook already handles tier assignment

### Webhook (`supabase/functions/stripe-webhook/index.ts`)
- Already handles subscription creation/updates correctly via product_id mapping
- Annual subscriptions use the same products, just different prices, so tier detection works unchanged

## 6. Files Modified

| File | Changes |
|------|---------|
| `src/lib/constants.ts` | Add `annual_price_id` and `annual_price` to each paid tier |
| `supabase/functions/create-checkout/index.ts` | Accept `billing_interval`, select correct price, add trial days |
| `src/pages/Landing.tsx` | Add monthly/annual toggle to pricing section, trial CTA text |
| `src/pages/marketing/Pricing.tsx` | Wire toggle to pass annual price_id, update button text |
| `src/pages/SettingsPage.tsx` | Add billing toggle, pass correct price_id |

## 7. Technical Notes
- Annual prices are separate Stripe Price objects on the same Product, so the webhook `TIER_MAP` (keyed by product_id) works without changes
- Stripe handles trial expiry automatically -- charges the card after 7 days
- The 20% discount is baked into the annual price itself, not a coupon
- No database changes needed -- subscription tier detection is product-based
