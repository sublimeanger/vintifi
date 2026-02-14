

# Raqkt (VintEdge) -- Progress Review and Next Steps

## What's Been Built (Spec Coverage)

| Spec Feature | Status |
|---|---|
| Landing page with hero, features, pricing | Done |
| Auth (email signup/login) | Done |
| Onboarding wizard (3-step) | Done |
| Dashboard with metrics, URL input, quick actions | Done |
| Price Intelligence Engine (Firecrawl + AI) | Done |
| Price report with comparables, confidence, insights | Done |
| Stripe billing (4 tiers, checkout, webhooks, portal) | Done |
| My Listings page (basic CRUD) | Done |
| Recent price check history on dashboard | Done |
| Settings page with profile and billing | Done |

## What's Not Built Yet

Ordered by the spec's recommended prompt sequence and business impact:

### Priority 1 -- AI Listing Optimiser (Spec Section 4.2, Prompt 5)
The spec's next development prompt. This is the second highest-value feature after Price Check.

- **Photo upload** to file storage
- **AI vision analysis** -- send photos to AI to identify item, brand, condition
- **Optimised listing generation** -- AI-generated title, description, tags
- **Split-screen UI** -- original on left, optimised on right, colour-coded diffs
- **Listing Health Score** -- 0-100 gauge rating title keywords, description quality, photo count, price competitiveness
- **One-click copy** to clipboard for pasting into Vinted

### Priority 2 -- Google OAuth (Spec Section 5.1)
The spec calls for "magic link email or Google OAuth" for reduced signup friction. Currently only email/password is implemented.

### Priority 3 -- Enhanced Inventory Manager (Spec Section 4.5)
The My Listings page exists but is basic. The spec calls for:
- **Traffic light health system** (green/amber/red)
- **P&L Tracker** -- cost-of-goods input, actual sale prices, net profit per item
- **Dead Stock alerts** -- items listed 30+ days flagged with liquidation suggestions
- **Sortable/filterable** by category, brand, price range, health score

### Priority 4 -- Trend Radar (Spec Section 4.3)
Requires the `trends` database table and scheduled data collection:
- Rising trends dashboard with trend cards
- Seasonal demand calendar
- Niche opportunity finder
- Currently marked "Coming Soon" in the UI

### Priority 5 -- Arbitrage Scanner (Spec Section 4.4)
Cross-platform price gap detection. Most complex feature, depends on multi-platform scraping infrastructure.

---

## Recommended Next Step: AI Listing Optimiser

This follows the spec's prompt sequence (Prompt 5) and is the second core revenue feature. Here's the implementation plan:

### Database Changes
- Add `description` column to `listings` table (spec calls for it, currently missing)
- Add `purchase_price`, `sale_price`, `sold_at`, `days_listed` columns to `listings` (needed for P&L later)
- Create file storage bucket for listing photos

### New Edge Function: `optimize-listing`
- Accepts photo URLs and/or item details
- Sends images to Gemini vision model (via Lovable AI Gateway -- no API key needed)
- Returns structured JSON: optimised title, description, tags, health score breakdown
- Decrements `optimizations_used` in `usage_credits`

### New Page: `/optimize` (Listing Optimiser)
- Photo upload area (drag-and-drop or file picker)
- Optional manual input fields (brand, category, size, condition)
- Split-screen results: original vs optimised with colour-coded improvements
- Health Score gauge component (0-100)
- Copy-to-clipboard buttons for title and description
- "Save as Listing" button to add directly to inventory

### Dashboard Integration
- Add "Optimise Listing" quick action card (replace the disabled Trends card or add alongside)
- Show optimisations remaining in the credits display

### Technical Details
- Use Lovable Cloud file storage for photo uploads
- Use `google/gemini-2.5-flash` for vision analysis (fast, cost-effective, supports images)
- Health score algorithm: title keywords (25%), description completeness (25%), photo quality/count (25%), price competitiveness (25%)
- Gate by subscription tier using `optimizations_used` from `usage_credits`

