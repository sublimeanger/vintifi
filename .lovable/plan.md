

# Arbitrage Scanner -- Major Upgrade

## Overview
Transform the Arbitrage Scanner from a basic search tool into a comprehensive deal-finding command centre with saved searches, historical tracking, platform selection, deal quality scoring, and a far richer results experience.

---

## 1. Backend Upgrades (Edge Function)

### 1.1 Expand Source Platforms
Add Facebook Marketplace and Gumtree alongside eBay and Depop. Let users choose which platforms to scan.

```text
Platforms:
  eBay UK      (site:ebay.co.uk)              -- existing
  Depop        (site:depop.com)               -- existing
  FB Marketplace (site:facebook.com/marketplace) -- new
  Gumtree      (site:gumtree.com)             -- new
```

### 1.2 Smarter AI Prompt
Upgrade the AI analysis to return richer data per opportunity:
- **deal_score** (1--100): AI-rated quality factoring demand, brand heat, condition, margin
- **risk_level** ("low" / "medium" / "high"): Risk of the item not selling on Vinted
- **estimated_days_to_sell**: How quickly this would likely sell
- **demand_indicator** ("hot" / "warm" / "cold"): Current demand level
- **suggested_listing_title**: A pre-optimised Vinted listing title ready to copy
- **shipping_estimate**: Estimated shipping cost factored into real profit

### 1.3 Accept Platform Selection from Frontend
The edge function accepts a `platforms` array so users choose which sources to scan. Defaults to all 4.

### 1.4 Net Profit Calculation
Factor in estimated shipping and Vinted buyer protection fees to show true net profit rather than raw margin.

---

## 2. Frontend Upgrades (ArbitrageScanner.tsx)

### 2.1 Platform Selection Chips
Toggleable platform chips above the search form to enable/disable each source. Each chip shows a platform colour indicator.

### 2.2 Advanced Filters Panel
Collapsible "Advanced Filters" section:
- Condition filter: New, Like New, Good, Any
- Max buy price cap (e.g. "Nothing over GBP50")
- Sort by: Profit margin, Absolute profit, Deal score, Sell speed

### 2.3 Deal Score Badge
Each opportunity card gets a prominent Deal Score (1--100) badge with colour coding:
- 80--100: Green "Hot Deal"
- 60--79: Orange "Good Deal"
- 40--59: Yellow "Fair Deal"

### 2.4 Richer Opportunity Cards
Each card upgraded to show:
- Deal score badge (top-right corner)
- Demand indicator tag ("Hot" / "Warm" / "Cold")
- Risk level indicator
- Estimated days to sell
- Net profit (after shipping) alongside gross profit
- "Copy Listing Title" button for the AI-suggested Vinted title
- "Create Listing" button linking to the listing optimiser pre-filled
- Expandable "AI Analysis" section with detailed notes

### 2.5 Results Sorting and Filtering
After results load, add sort dropdown and quick filter tabs:
- Sort: Best deals, Highest profit, Fastest sell, Lowest risk
- Filter tabs: All, Hot Deals Only, per-platform filters

### 2.6 Saved Searches
"Save This Search" button stores the brand/category/margin/platform combination. "Recent Searches" row of chips above the form for one-tap re-runs.

### 2.7 History Tab
Tab toggle at the top: "New Scan" | "Past Finds". Past Finds queries existing `arbitrage_opportunities` data grouped by scan date.

### 2.8 Quick Stats Enhancement
Upgrade from 3 to 4 summary stat cards:
- Opportunities found
- Total potential profit
- Average margin
- Best deal score (new)

### 2.9 Visual Polish
- Animated scanning progress with platform-by-platform status messages
- Platform colour-coded left border on each opportunity card
- Profit comparison bar (buy price vs sell price as horizontal stacked bar)
- Celebration animation when a 90+ deal score is found

---

## 3. Database Changes

### 3.1 Update `arbitrage_opportunities` table
Add new columns for enriched data:
- `deal_score` (INTEGER) -- 1 to 100
- `risk_level` (TEXT) -- low/medium/high
- `estimated_days_to_sell` (INTEGER)
- `demand_indicator` (TEXT) -- hot/warm/cold
- `suggested_listing_title` (TEXT)
- `shipping_estimate` (DECIMAL)
- `net_profit` (DECIMAL) -- profit after shipping

### 3.2 New `saved_searches` table
- `id` (UUID PK)
- `user_id` (UUID)
- `brand` (TEXT)
- `category` (TEXT)
- `min_margin` (INTEGER)
- `platforms` (TEXT[])
- `label` (TEXT) -- auto-generated friendly name
- `last_run_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)

RLS: Users can only access their own saved searches (SELECT, INSERT, UPDATE, DELETE).

---

## 4. Files Modified

| File | Changes |
|------|---------|
| `supabase/functions/arbitrage-scan/index.ts` | Add FB Marketplace + Gumtree, platform selection param, enriched AI prompt, net profit calc |
| `src/pages/ArbitrageScanner.tsx` | Platform chips, advanced filters, deal score, richer cards, saved searches, history tab, sorting, visual upgrades |
| New SQL migration | Add columns to `arbitrage_opportunities`, create `saved_searches` table with RLS |

## 5. Technical Notes
- All new platforms use the same Firecrawl search pattern -- no new API integrations needed
- Enriched AI prompt adds more structured fields but uses the same model
- Saved searches are lightweight DB rows with no API cost until re-run
- History tab reuses existing `arbitrage_opportunities` data already being stored
- No new dependencies required

