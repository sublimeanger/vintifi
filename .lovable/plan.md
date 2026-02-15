

# Niche Opportunity Finder

## What It Does
Identifies Vinted categories and niches where **buyer demand (search volume/interest) significantly outstrips seller supply (active listings)**, representing high-margin opportunities where sellers can command premium prices. Results are ranked by estimated profit potential and accessibility.

## How It Works
1. User selects categories to analyse (or "All") and optionally filters by price range
2. Backend edge function uses **Firecrawl** to search Vinted for listing counts and demand signals across categories/niches
3. **Gemini AI** analyses the scraped data to identify supply/demand gaps, scoring each niche by opportunity strength
4. Results display as ranked niche cards with actionable sourcing advice

## New Files

### 1. Edge Function: `supabase/functions/niche-finder/index.ts`
- Accepts `{ categories: string[], price_range?: string, limit?: number }`
- Auth-protected (same pattern as clearance-radar)
- Searches Vinted via Firecrawl for each selected category -- queries both "active listings" and "sold items" to gauge supply vs demand
- Sends combined data to Gemini AI with a structured prompt asking it to identify underserved niches
- AI returns JSON array of niche opportunities with fields: `niche_name`, `category`, `demand_level` (high/medium/low), `supply_level` (high/medium/low), `opportunity_score` (0--100), `avg_price`, `estimated_monthly_sales`, `competition_count`, `sourcing_tips`, `ai_reasoning`
- Returns max 12 niches ranked by opportunity score

### 2. Frontend Page: `src/pages/NicheFinder.tsx`
- PageShell header with Target icon and title "Niche Opportunity Finder"
- Category multi-select: Womenswear, Menswear, Streetwear, Vintage, Designer, Shoes, Accessories, Kids, Home (checkboxes, same pattern as Clearance Radar retailers)
- Optional price range selector (Under 10, 10--25, 25--50, 50--100, 100+)
- "Find Niches" scan button
- Results: summary stats row (niches found, top opportunity score, avg demand gap) plus niche cards
- Each niche card shows:
  - Niche name and category badge
  - Supply vs Demand visual bar comparison (red for undersupplied, green for demand)
  - Opportunity score gauge/badge (colour-coded like TrendCard)
  - Avg price, estimated monthly sales, competition count
  - AI sourcing tips in plain English
- Empty state and loading skeletons (reuse ArbitrageCardSkeleton)
- Mobile-responsive with bottom nav padding

## Modified Files

### 3. `src/App.tsx`
- Import NicheFinder page
- Add route: `/niche-finder` (protected + onboarding guard)

### 4. `src/pages/Dashboard.tsx`
- Add "Niche Finder" nav item under the "Intelligence" section with a Target icon, after Clearance Radar

### 5. `supabase/config.toml`
- Add `[functions.niche-finder]` with `verify_jwt = false`

## No Database Changes
Results are returned directly to the frontend (same ephemeral pattern as Arbitrage Scanner and Clearance Radar).

## Technical Details

### Edge function structure
Identical pattern to `clearance-radar/index.ts`:
- CORS headers, auth verification, Firecrawl search, AI analysis, JSON parsing with fallback
- Two parallel Firecrawl search batches per category: one for active listings (`site:vinted.co.uk {category}`), one for sold/popular items (`site:vinted.co.uk {category} popular OR sold`)
- AI prompt instructs Gemini to cross-reference supply counts against demand signals and identify gaps

### AI prompt design
The prompt instructs the AI to:
- Analyse listing volume vs engagement signals (favourites, sold velocity) per niche
- Score each niche 0--100 based on demand-supply gap magnitude
- Only return niches with opportunity score >= 50
- Include practical sourcing tips (where to find stock, what to pay)
- Output structured JSON array

### UI patterns
- Reuses PageShell, Card, Badge, Button, Checkbox, Slider from shadcn
- Framer Motion staggered card animations (same as ClearanceRadar)
- Opportunity score colour coding: 80+ green, 60--79 amber, 50--59 orange
- Supply/demand comparison shown as a simple two-bar mini chart inside each card
- Mobile-first responsive layout

