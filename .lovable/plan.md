

# World-Class My Listings + Import Upgrade

## Problems Identified

1. **Listings aren't clickable** -- each listing card is flat with no expand/detail view. Users can't tap a listing to see its full details.
2. **Optimize Listing shows blank** -- when clicking "Optimise Listing" from the dropdown, only title/brand/category/condition are passed as URL params. The `description` field is missing from both the `Listing` type and the data passed to the Optimize page.
3. **Scraper doesn't capture descriptions** -- the import edge function only extracts title, brand, price, category, condition, size, image, and URL. It doesn't scrape individual listing pages to get full descriptions.
4. **No description in Listing type** -- the frontend `Listing` type doesn't include `description`, even though the database column exists.

## What Changes

### 1. Upgrade the Scraper to Capture Descriptions

The `import-vinted-wardrobe` edge function currently scrapes wardrobe overview pages which only show titles, prices, and thumbnails. To get descriptions, we have two options:

**Chosen approach: Scrape individual listing pages for top items**

After extracting the initial listing data (with `vinted_url` for each item), the function will make a second pass -- scraping each individual listing page via Firecrawl to extract the full description. This is gated by tier:

- **Free**: Descriptions for first 5 items
- **Pro**: First 50 items  
- **Business/Scale**: All items

The AI prompt for individual page extraction will pull: full description text, views count, favourites count, and any additional details (measurements, materials, etc.).

This is a credit-intensive operation, so it runs as an optional "deep import" mode.

### 2. Add Expandable Listing Detail View

Each listing card becomes clickable. Tapping it expands an inline detail panel (accordion-style) showing:

- Full description (or "No description -- tap Optimise to generate one")
- Larger image preview
- All metadata: size, condition, brand, category
- Quick action buttons: Price Check, Optimise, View on Vinted
- Purchase price, sale price, profit margin
- Health score gauge (if available)

This uses a `selectedListingId` state -- tapping a card toggles its expanded view with a smooth animation.

### 3. Fix Optimize Listing Data Flow

- Add `description` to the frontend `Listing` type
- Update `handleOptimiseListing` to pass `description` and `size` as URL params
- Update `OptimizeListing.tsx` to read `description` and `size` from search params and pre-populate the form fields
- When navigating from a listing, the Optimize page now shows the existing title, description, brand, category, size, and condition -- no more blank screen

### 4. Add `description` to Listing Fetching

The `listings` table already has a `description` column. The frontend `select("*")` query already returns it, but the `Listing` type silently drops it. Adding `description: string | null` to the type makes it available throughout the UI.

## Technical Details

### Files Changed

| File | Change |
|------|--------|
| `src/pages/Listings.tsx` | Add `description` to Listing type, add expandable detail view with click-to-expand, pass description/size to Optimize, improve card interaction |
| `src/pages/OptimizeListing.tsx` | Read `description` and `size` from URL search params, pre-populate form fields |
| `supabase/functions/import-vinted-wardrobe/index.ts` | Add optional deep scrape pass to fetch descriptions from individual listing pages |

### Listing Card Interaction Model

```text
COLLAPSED (default):
+------------------------------------------+
| [img] Title                    [...menu] |
|       Brand · Category · Status          |
|       GBP12.00  Cost: --  Sale: --  85%  |
+------------------------------------------+

EXPANDED (tap to toggle):
+------------------------------------------+
| [img]  Title                   [...menu] |
|        Brand · Category · Status         |
|        GBP12.00  Cost: --  Sale: --      |
|------------------------------------------|
| [larger image]                           |
|                                          |
| DESCRIPTION                              |
| "Lovely pair of Nike Air Max 90s in..."  |
|                                          |
| Size: UK 9  |  Condition: Very Good      |
| Brand: Nike  |  Category: Trainers       |
|                                          |
| Health Score: [====== 78% ======]        |
|                                          |
| [Price Check] [Optimise] [View on Vinted]|
+------------------------------------------+
```

### Deep Import Flow

The scraper upgrade adds a second phase after the initial wardrobe scrape:

1. Initial scrape extracts basic data (as today) including `vinted_url` for each item
2. For items within the tier limit, Firecrawl scrapes each individual listing page
3. AI extracts full description, views, favourites from each page
4. Data is merged and upserted into the listings table

To keep initial imports fast, the deep scrape is opt-in via a "Import with descriptions" checkbox in the import modal. The standard import remains quick (wardrobe overview only).

### Edge Cases

- Listings without descriptions show a helpful CTA: "No description yet -- tap Optimise to generate one with AI"
- Clicking anywhere on the card (except the menu button and inline edit fields) toggles expand
- On mobile, the expanded view is optimised for single-column viewing
- The deep scrape respects Firecrawl rate limits with a small delay between individual page scrapes

