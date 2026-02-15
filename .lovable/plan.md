

# Fix Vinted Wardrobe Import: Reliable URL-Only Strategy

## Problem

The current hybrid approach has three compounding failures:
- Firecrawl only captures ~20 items from a 185-item wardrobe (no infinite scroll)
- Recommendation/similar item URLs pollute results
- AI extraction returns 0 usable items, forcing unreliable URL-slug fallback

## Proposed Solution: Scroll + Strict URL Filtering (No AI Extraction)

Eliminate the AI extraction phase entirely. Instead, use a deterministic approach:

1. **Phase 1 - Discover URLs with scrolling**: Use Firecrawl `/scrape` with `formats: ["links"]` AND `actions` (scroll down repeatedly) to load more items via infinite scroll
2. **Phase 2 - Strict URL filtering**: Only keep URLs matching the exact pattern `/{domain}/items/{id}-{slug}` that appear in the page's main content area. Discard any URL that also appears in recommendation sections
3. **Phase 3 - Deep scrape each item individually**: For each validated URL, scrape the individual listing page to get accurate title, price, brand, image, and description. No AI guessing from slugs
4. **Remove AI extraction phase entirely**: The AI-based bulk extraction from markdown is the source of unreliability. Delete it

## Key Changes

### Edge Function (`supabase/functions/import-vinted-wardrobe/index.ts`)

**Phase 1 - Scrolling link discovery:**
- Add Firecrawl `actions` parameter with scroll-down actions (up to 10 scrolls with 1000ms waits)
- Use `formats: ["links"]` to get all URLs after full page render
- Filter for `/items/` pattern on the same domain only

**Phase 2 - Remove AI extraction entirely:**
- Delete the Lovable AI gateway call for bulk extraction
- Instead, create basic items directly from URL slugs as placeholder data

**Phase 3 - Deep scrape all items (not just some):**
- Scrape each individual listing page via Firecrawl for accurate data
- Process in parallel batches of 5
- Extract title, price, brand, image from the individual page markdown using a lightweight AI call
- This is the only AI call, and it operates on a single known-good page

**Phase 4 - Upsert (unchanged)**

### Welcome Page (`src/pages/Welcome.tsx`)
- No changes needed -- it already handles the import response correctly

## Technical Details

- Scroll actions: 10 scrolls x `{ type: "scroll", direction: "down", amount: 2000 }` with 1000ms waits = ~15s render time
- Timeout: 45000ms for Phase 1 scrape
- Deep scrape batch: 5 concurrent, with 30s timeout each
- Total Firecrawl credits per import: ~1 (scroll scrape) + N (deep scrapes) where N = number of items found
- For 185 items on Scale tier: ~186 Firecrawl credits per full import
- For Free tier (20 item cap): ~21 credits

## Why This Works

- **No recommendation noise**: Individual item pages only contain that item's data
- **No AI hallucination**: No bulk extraction from messy markdown
- **Accurate data**: Title, price, brand come directly from each listing page
- **Scrolling captures all items**: Up to ~200 items loaded via infinite scroll

## Risk

- Higher Firecrawl credit usage (1 credit per item instead of 1-2 total)
- Longer import time for large wardrobes (~3-5 minutes for 185 items)
- Edge function timeout could be an issue for very large wardrobes (may need to cap deep scrape to first 50 items, with remaining items getting slug-based titles)

