

# Full-Scale Implementation: Hybrid Scraping + CSV Import

## Summary

This plan covers three major changes:

1. **Remove the broken Vinted URL import** and replace it with a **CSV/manual import** system
2. **Upgrade Price Check and Trends** to use the Apify `kazkn/vinted-smart-scraper` actor for structured Vinted data
3. **Keep Firecrawl for Arbitrage Scanner** (cross-platform searches) while adding Apify for the Vinted pricing baseline -- creating a **hybrid model**

---

## Part 1: Replace Vinted Import with CSV Import

The Apify `pintostudio/vinted-seller-products` actor is broken and unmaintained. Instead of trying to fix automated wardrobe scraping, we replace it with a reliable CSV import.

### Files to Change

| File | Action |
|------|--------|
| `supabase/functions/import-wardrobe/index.ts` | **Rewrite** -- accept CSV data (JSON array) instead of Apify scraping |
| `src/components/ImportWardrobeModal.tsx` | **Rewrite** -- CSV file upload with drag-and-drop, column mapping preview, and template download |
| `src/pages/Listings.tsx` | Minor update -- change button label from "Import from Vinted" to "Import" |

### How CSV Import Works

1. User downloads a CSV template (Title, Brand, Category, Size, Condition, Price, Purchase Price, Vinted URL)
2. User fills it in (or exports from a spreadsheet they already maintain)
3. User uploads the CSV file in the modal
4. Frontend parses the CSV, shows a preview table of the first 5 rows
5. Frontend sends the parsed rows to the `import-wardrobe` edge function as a JSON array
6. Edge function validates, deduplicates by `vinted_url`, and batch-inserts into `listings`
7. Same tier-based limits apply (Pro: 200, Business: 1000, Scale: unlimited)

### Template CSV Format

```text
Title,Brand,Category,Size,Condition,Price,Purchase Price,Vinted URL
"Nike Air Force 1","Nike","Trainers","UK 9","Good","25.00","12.00","https://www.vinted.co.uk/items/123456"
```

---

## Part 2: Upgrade Price Check with Apify (Hybrid)

Currently `price-check` uses Firecrawl `/v1/search` with `site:vinted.co.uk` queries, which returns web snippets that the AI must interpret. This works but produces estimated data.

### New Flow

1. User submits brand/category/condition (or a Vinted URL)
2. Edge function calls Apify `kazkn/vinted-smart-scraper` with mode `SEARCH` to get **structured** Vinted listing data (exact prices, conditions, view counts)
3. Structured results are passed to the AI for analysis (much better input = much better output)
4. Falls back to Firecrawl search if Apify fails or times out

### Files to Change

| File | Action |
|------|--------|
| `supabase/functions/price-check/index.ts` | **Rewrite data-fetching layer** -- primary: Apify search, fallback: Firecrawl |

### Apify Actor Details

- **Actor**: `kazkn/vinted-smart-scraper`
- **Mode**: `SEARCH`
- **Input**: `{ mode: "SEARCH", searchQuery: "Nike Air Force 1", country: "uk", maxItems: 20 }`
- **Output**: Structured array with `title`, `price`, `brand_title`, `size_title`, `status`, `url`, `photo.url`, `view_count`, `favourite_count`
- **Cost**: ~$0.01 per 1,000 results

### Key Change in AI Prompt

Instead of feeding the AI vague markdown snippets, we feed it structured data:

```text
Comparable items (structured data from Vinted):
1. Nike Air Force 1 White | Price: £28.00 | Condition: Good | Views: 142 | Favourites: 8 | Status: Active
2. Nike AF1 Triple White | Price: £35.00 | Condition: New with tags | Views: 89 | Favourites: 12 | Status: Sold
...
```

This gives the AI real prices and real engagement metrics to work with, dramatically improving accuracy.

---

## Part 3: Hybrid Arbitrage Scanner

The Arbitrage Scanner already uses Firecrawl to search eBay, Depop, Facebook Marketplace, and Gumtree. This is the right tool for cross-platform searching. The upgrade adds Apify for the **Vinted baseline pricing** so the AI has real Vinted prices to compare against (instead of guessing).

### New Flow

1. User enters brand/category
2. **Firecrawl** searches eBay, Depop, Facebook Marketplace, Gumtree (unchanged -- this works well)
3. **Apify** searches Vinted for the same item to get real sell prices (new)
4. Both datasets are passed to the AI, which now has **actual source prices AND actual Vinted prices** to calculate real arbitrage margins
5. Falls back to Firecrawl-only Vinted search if Apify fails

### Files to Change

| File | Action |
|------|--------|
| `supabase/functions/arbitrage-scan/index.ts` | **Update** -- replace `searchVinted()` Firecrawl function with Apify `kazkn/vinted-smart-scraper` SEARCH mode, keep Firecrawl fallback |

### What Changes in the Prompt

The Vinted reference section changes from vague snippets to structured data:

```text
## Vinted Reference Prices (Real Data)
1. Nike Air Force 1 | £28.00 | Good | 142 views | Active
2. Nike AF1 White | £35.00 | New with tags | 89 views | Sold in 3 days
```

---

## Part 4: Trends -- No Change Needed

The `fetch-trends` edge function already reads from the `trends` table (populated by `lobstr-sync`). The Lobstr.io integration for trend data collection is separate from the Apify actor and works independently. No changes needed here.

---

## Implementation Sequence

1. **CSV Import** (Part 1) -- rewrite `import-wardrobe` edge function and modal
2. **Price Check upgrade** (Part 2) -- add Apify primary + Firecrawl fallback
3. **Arbitrage hybrid** (Part 3) -- add Apify for Vinted baseline in arbitrage scanner
4. **Deploy and test** all three edge functions
5. **Delete** the `APIFY_API_TOKEN` secret reference to `pintostudio` actor (we reuse the same token for `kazkn/vinted-smart-scraper`)

---

## Secrets Required

- `APIFY_API_TOKEN` -- already configured, reused for the new actor
- `FIRECRAWL_API_KEY` -- already configured, kept for cross-platform arbitrage + fallback
- No new secrets needed

---

## Technical Notes

- The `kazkn/vinted-smart-scraper` actor supports `.co.uk` natively (no URL hacking needed)
- Apify calls use `run-sync-get-dataset-items` endpoint with 120s timeout for search mode (much faster than seller scraping)
- CSV parsing happens client-side using a lightweight parser (no new dependency -- we use the native `FileReader` API + simple comma splitting)
- All existing UI components, types, and database schema remain unchanged
- The `import-wardrobe` edge function entry in `supabase/config.toml` stays as-is

