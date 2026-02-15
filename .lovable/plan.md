

# Vinted Wardrobe Import Feature

## Overview

Add the ability for users to import their entire Vinted wardrobe by pasting their seller profile URL. Uses the Apify `pintostudio/vinted-seller-products` actor to scrape all items and insert them into the listings table.

## Step 1: Store the Apify API Token

I'll securely store your Apify API token as a backend secret called `APIFY_API_TOKEN`. You'll be prompted to paste it in.

## Step 2: New Edge Function -- `import-wardrobe`

Creates `supabase/functions/import-wardrobe/index.ts` that:

- Accepts a Vinted profile URL (e.g. `https://www.vinted.co.uk/member/12345`)
- Validates the URL format and extracts the country domain
- Checks the user's tier to enforce item limits (Pro: 200, Business: 1000, Scale: unlimited)
- Calls the Apify REST API to run the `pintostudio/vinted-seller-products` actor synchronously
- Paginates through all results
- Maps Apify fields to the `listings` table schema (title, brand, price, size, condition, description, image, URL, views, favourites, sold status)
- Skips duplicates by matching on `vinted_url`
- Returns a summary: items imported, skipped, and any errors

## Step 3: Import Wardrobe Modal

Creates `src/components/ImportWardrobeModal.tsx`:

- Clean modal with a URL input field and helper text
- Validates Vinted profile URL format before submitting
- Shows a progress state with animated spinner during import (can take 30-120 seconds)
- Displays results summary on completion: "Imported 47 items, 3 already existed"
- Error handling with clear user messaging

## Step 4: Update Listings Page

Adds an "Import from Vinted" button in the header actions bar of `src/pages/Listings.tsx`:

- Download icon button that opens the Import Wardrobe Modal
- Tier-gated: only available for Pro tier and above (free users see an upgrade prompt)
- After successful import, refreshes the listings list automatically

## Step 5: Update Edge Function Config

Adds the new function to `supabase/config.toml` with `verify_jwt = false` (auth validated in code).

## Tier-Based Limits

| Tier | Max Items per Import | Availability |
|------|---------------------|--------------|
| Free | Not available | Upgrade prompt |
| Pro | 200 items | Available |
| Business | 1,000 items | Available |
| Scale | Unlimited | Available |

## Data Mapping

| Apify Field | Listings Column |
|-------------|----------------|
| `title` | `title` |
| `brand_title` | `brand` |
| `price` / `total_item_price` | `current_price` |
| `size_title` | `size` |
| `status` | `condition` |
| `description` | `description` |
| `photos[0].url` | `image_url` |
| `url` | `vinted_url` |
| `view_count` | `views_count` |
| `favourite_count` | `favourites_count` |
| `catalog_id` mapped | `category` |
| `is_closed` / `is_reserved` | `status` |

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/import-wardrobe/index.ts` | New edge function |
| `src/components/ImportWardrobeModal.tsx` | New modal component |
| `src/pages/Listings.tsx` | Add import button + modal integration |

## Technical Notes

- The Apify actor runs synchronously via `run-sync-get-dataset-items` endpoint (timeout up to 300s)
- Duplicates are detected by checking existing `vinted_url` values before insert
- The edge function uses the service role client to insert listings on behalf of the user
- No database schema changes required -- uses the existing `listings` table as-is

