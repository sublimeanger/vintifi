
# Nav Rename, Competitor Check, and Clearance Radar Upgrade

## 1. Rename "In-Store List" to "Charity Shop Briefing"

**File:** `src/components/AppShellV2.tsx` (line 49)

Change the label from `"In-Store List"` to `"Charity Shop Briefing"`. One-line change.

---

## 2. Competitor Tracker Status

The Competitor Tracker is fully functional. It has:
- Database tables (`competitor_profiles`, `competitor_alerts`) with data
- A working edge function (`competitor-scan`) that uses Apify for Vinted data and AI for analysis
- Full frontend UI with add, delete, scan, and alert management
- Tier gating (Pro+ required)

If scans are returning unhelpful results, the improvement would be to refine the Apify search query construction and AI prompt — but the infrastructure works. No changes needed unless you're seeing a specific error.

---

## 3. Clearance Radar — Major Upgrade

### Current Problems
- Firecrawl `site:` searches return generic page snippets, not structured product data with prices
- The AI is guessing clearance prices from vague search descriptions — very unreliable
- No persistent results (everything disappears on page refresh)
- Only 6 retailers, all hardcoded
- No product images, no direct buy links with confidence
- No saved opportunities or alert system

### Upgrade Plan

#### A. Better Retailer Coverage (12+ retailers)

Expand from 6 to 12+ UK retailers with proper clearance/sale page URLs that Firecrawl can actually scrape:

```text
ASOS Outlet       -> asos.com/women/sale/ + /men/sale/
End Clothing      -> endclothing.com/gb/sale
TK Maxx           -> tkmaxx.com (search API)
Nike Clearance    -> nike.com/gb/w/sale
Adidas Outlet     -> adidas.co.uk/outlet
ZARA Sale         -> zara.com/uk/en/sale
NEW: H&M Sale     -> hm.com/en_gb/sale
NEW: Uniqlo Sale  -> uniqlo.com/uk/en/spl/sale
NEW: COS Sale     -> cos.com/en_gbp/sale
NEW: Depop        -> depop.com (cross-platform)
NEW: Vinted itself -> vinted.co.uk (buy low, relist optimised)
NEW: Ralph Lauren -> ralphlauren.co.uk/sale
```

#### B. Structured Scraping with Firecrawl Extract Mode

Instead of generic `search` calls, use Firecrawl's `/v1/scrape` endpoint targeting actual sale/clearance pages with structured extraction. This returns real product titles, prices, and URLs rather than vague search snippets.

The edge function will:
1. Scrape each retailer's sale page URL directly (not search)
2. Use Firecrawl's `extract` format with a schema to pull structured product data (title, price, brand, URL, image)
3. Run a parallel Apify scrape for Vinted baseline prices
4. Send both datasets to AI for cross-referencing and margin calculation

#### C. Save Opportunities to Database

Create an `clearance_opportunities` table to persist results:

```sql
CREATE TABLE public.clearance_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  retailer TEXT NOT NULL,
  item_title TEXT NOT NULL,
  item_url TEXT,
  image_url TEXT,
  sale_price DECIMAL,
  vinted_resale_price DECIMAL,
  estimated_profit DECIMAL,
  profit_margin DECIMAL,
  brand TEXT,
  category TEXT,
  ai_notes TEXT,
  status TEXT DEFAULT 'new',  -- new / saved / purchased / listed / expired
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: users see only their own
ALTER TABLE public.clearance_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own clearance opportunities"
  ON public.clearance_opportunities FOR ALL USING (auth.uid() = user_id);
```

#### D. Upgraded Frontend

The ClearanceRadar page gets these improvements:

1. **Saved opportunities tab**: Toggle between "New Scan" and "Saved" views. Saved opportunities persist and can be marked as purchased/listed/expired.
2. **Better result cards**: Show retailer logo/colour, estimated profit prominently, direct "Buy Now" link, "Save" button to persist, "Create Listing" shortcut.
3. **Summary stats**: Total potential profit, average margin, best retailer, and scan timestamp.
4. **Scan history**: Show when the last scan was run and how many opportunities were found.
5. **Status tracking**: Mark opportunities as "Purchased" or "Listed" to track your flip pipeline.

#### E. Upgraded Edge Function

**File:** `supabase/functions/clearance-radar/index.ts`

Major rewrite:
- Use Firecrawl `/v1/scrape` with `extract` schema instead of `/v1/search`
- Target actual retailer sale page URLs
- Extract structured product data (title, price, brand, image URL, product URL)
- Cross-reference with Apify Vinted data for resale baselines
- AI analyses structured data instead of guessing from snippets
- Optionally save results to `clearance_opportunities` table
- Return image URLs for display in the frontend

---

## Files Changed Summary

| File | Change |
|------|--------|
| `src/components/AppShellV2.tsx` | Rename "In-Store List" to "Charity Shop Briefing" |
| Database migration | Create `clearance_opportunities` table with RLS |
| `supabase/functions/clearance-radar/index.ts` | Major rewrite: structured scraping, better retailers, persistent results |
| `src/pages/ClearanceRadar.tsx` | Add saved opportunities, better cards, status tracking, scan history |

No changes to the Competitor Tracker — it's functional as-is.
