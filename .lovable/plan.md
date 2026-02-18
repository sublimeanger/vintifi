
# Pricing Restructure: Remove Unlimited, Add Enterprise Tier

## The Problem

The current **Scale** tier (£49.99/month) gives users truly **unlimited credits** — the `useFeatureGate` hook treats any user with `subscription_tier === "scale"` OR `credits_limit >= 999` as unlimited, bypassing all credit checks entirely. This means a Scale subscriber can run thousands of AI operations a month that cost you real money in OpenAI/Firecrawl/Apify fees, for just £49.99. This is commercially unviable.

## The Fix: 5-Tier Model With Hard Credit Caps

Replace the current 4-tier model with a commercially sound 5-tier model. No tier will ever have truly unlimited credits — instead, each has a generous but metered cap.

```text
Free      →  5 credits/mo    — £0
Pro       →  50 credits/mo   — £9.99/mo
Business  →  200 credits/mo  — £24.99/mo
Scale     →  600 credits/mo  — £49.99/mo   (was "unlimited")
Enterprise→  1,500 credits/mo — £99.99/mo  (NEW tier)
```

At ~£0.02/credit variable cost, 1,500 credits = ~£30 in API costs vs £99.99 revenue = healthy margin. Scale at 600 = ~£12 in costs vs £49.99 = still strong.

## Files That Will Change

### 1. `src/lib/constants.ts`
- Rename current `scale` tier credits from `-1` → `600`
- Add a new `enterprise` tier object with: price £99.99, 1,500 credits, annual pricing, Stripe price_id (new product to create in Stripe), and feature list
- Update annual prices accordingly

### 2. `src/hooks/useFeatureGate.ts`
- **Critical fix:** Remove the special `isUnlimited` bypass that checks `userTier === "scale"` or `credits_limit >= 999`
- Add `enterprise` to the `TierLevel` type and `TIER_ORDER`
- All tiers (including Scale and Enterprise) go through the normal credit check — `isUnlimited` should only be true if `credits_limit` is set to a special sentinel like `999999` (used only for manually-gifted accounts like Mel's)
- Update any feature `minTier` assignments if Enterprise-only features exist

### 3. `src/components/UpgradeModal.tsx`
- Add `enterprise` to the `UPGRADE_TIERS` array so it appears in the upgrade modal
- Add an icon for the Enterprise tier

### 4. `src/pages/marketing/Pricing.tsx`
- Update the `personas` section to include Enterprise persona (e.g. "Vinted Pro Businesses")
- Update `comparisonFeatures` table — replace "Unlimited" in the Scale column with "600" and add Enterprise column with "1,500"
- Update the `Scale` persona description to reflect 600 credits, not unlimited
- Add Enterprise to the persona grid

### 5. `supabase/functions/stripe-webhook/index.ts`
- Add new Enterprise product IDs to `TIER_MAP` once the Stripe products are created
- Map Enterprise products → `{ tier: "enterprise", credits: 1500 }`

## Stripe Products to Create

Two new Stripe products are needed:
- **Enterprise Monthly**: £99.99/mo, 1,500 credits
- **Enterprise Annual**: ~£959.88/yr (~£79.99/mo, ~20% saving)

These will be created via the Stripe MCP tools and their price IDs dropped into `constants.ts`.

## Database Impact

Current Scale users have `credits_limit = 999` or `999999`. The webhook will set Enterprise users to `1500`. Mel's account (manually set to 999999) will remain unaffected as her `credits_limit` value is used as the "gifted unlimited" sentinel.

The `isUnlimited` logic will be updated to: `credits_limit >= 999999` — only true for manually-gifted accounts, not purchasable tiers.

## What "Unlimited" Becomes

The word "Unlimited" disappears from all paid tier marketing copy. It is replaced with:
- Scale: "600 credits/month — enough for 600 price checks or photo edits"
- Enterprise: "1,500 credits/month — for high-volume Vinted Pro businesses"
- Credit top-up packs remain available at all tiers for bursting beyond the monthly cap

## Summary of All Touch Points

| File | Change |
|---|---|
| `src/lib/constants.ts` | Fix Scale credits (-1→600), add Enterprise tier |
| `src/hooks/useFeatureGate.ts` | Remove tier-based unlimited bypass, add enterprise to TIER_ORDER |
| `src/components/UpgradeModal.tsx` | Add enterprise to upgrade modal |
| `src/pages/marketing/Pricing.tsx` | Add Enterprise card, fix comparison table |
| `supabase/functions/stripe-webhook/index.ts` | Add Enterprise product IDs |
| Stripe (via MCP) | Create 2 new products: Enterprise monthly + annual |
