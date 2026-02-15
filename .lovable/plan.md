
# Retail Clearance Radar

## Overview
A new feature page that monitors major UK retail clearance/sale pages (ASOS Outlet, End Clothing, TK Maxx online, etc.) and cross-references sale prices against Vinted resale values. When a clearance item has strong Vinted demand and a margin above the user's configured threshold (default: 40%), it surfaces as a sourcing alert.

## How It Works
The user selects one or more retail sources and optionally filters by brand/category. The backend edge function uses Firecrawl to scrape clearance pages, then searches Vinted for comparable items, and finally passes both datasets to AI to identify profitable flip opportunities with margin calculations.

## New Files

### 1. Edge function: `supabase/functions/clearance-radar/index.ts`
- Accepts `{ retailers: string[], brand?: string, category?: string, min_margin?: number }`
- Auth-protected (validates user token)
- For each selected retailer, uses Firecrawl search to find clearance items (e.g., `site:asos.com/outlet {brand} {category}`)
- Searches Vinted via Firecrawl for comparable items to establish resale baseline
- Sends combined data to AI (Lovable gateway, gemini-2.5-flash) with a structured prompt
- AI returns JSON array of opportunities: retail source, item title, sale price, estimated Vinted resale price, profit, margin, buy URL, reasoning
- Returns results to frontend

### 2. Frontend page: `src/pages/ClearanceRadar.tsx`
- Header with back button and page title ("Retail Clearance Radar")
- Retailer selector: checkboxes for ASOS Outlet, End Clothing, TK Maxx, Nike Clearance, Adidas Outlet, ZARA Sale (multi-select)
- Optional brand and category text inputs
- Minimum margin slider (10%--80%, default 40%)
- "Scan Clearance" button triggers the edge function
- Results display: summary stats (opportunities found, total potential profit, avg margin) plus card list
- Each card shows: item title, retailer badge, sale price vs Vinted resale price comparison, profit badge, AI reasoning, and "Buy Now" external link
- Empty state and loading skeleton following existing patterns (similar to ArbitrageScanner)

## Modified Files

### 3. `src/App.tsx`
- Import `ClearanceRadar` page
- Add route: `/clearance-radar`

### 4. `src/pages/Dashboard.tsx`
- Add "Clearance Radar" nav item to the sidebar under the Tools or Sourcing section (alongside Arbitrage Scanner and Charity Briefing)

### 5. `supabase/config.toml`
- Add `[functions.clearance-radar]` with `verify_jwt = false`

## No Database Changes Required
Results are returned directly to the frontend (same pattern as Arbitrage Scanner). No new tables needed -- if desired later, opportunities can be stored in the existing `arbitrage_opportunities` table with a `source_platform` value like "ASOS Outlet".

## Supported Retailers
| Retailer | Firecrawl Search Target |
|----------|------------------------|
| ASOS Outlet | `site:asos.com sale OR outlet` |
| End Clothing | `site:endclothing.com sale` |
| TK Maxx | `site:tkmaxx.com` |
| Nike Clearance | `site:nike.com sale` |
| Adidas Outlet | `site:adidas.co.uk outlet OR sale` |
| ZARA Sale | `site:zara.com sale` |

## Technical Details

### Edge function structure
Follows the exact same pattern as `arbitrage-scan/index.ts`:
- CORS headers
- Auth verification via Supabase anon key + user client
- Firecrawl search calls (parallel per retailer + Vinted baseline)
- AI prompt requesting structured JSON output
- JSON parsing with fallback error handling
- Returns `{ opportunities, retailers_searched, total_found }`

### AI prompt design
The prompt instructs the AI to:
- Compare clearance prices against Vinted resale estimates
- Only return items above the minimum margin threshold
- Include buy URLs from search results
- Return max 10 opportunities ranked by margin
- Output fields: `retailer, item_title, item_url, sale_price, vinted_resale_price, estimated_profit, profit_margin, brand, category, ai_notes`

### UI patterns
- Reuses existing design language: `Card`, `Badge`, `Button`, `Slider`, `Input` from shadcn
- Framer Motion animations matching ArbitrageScanner
- Retailer badges with colour coding (similar to platform badges in Arbitrage)
- Mobile-responsive with bottom nav padding
