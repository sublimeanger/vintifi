

# Import Vinted Wardrobe — Auto-populate My Listings

## What This Does
Users paste their Vinted profile URL (e.g. `vinted.co.uk/member/12345678-username`) and Vintifi scrapes their public wardrobe to import all active listings automatically. No manual data entry needed — brand, title, price, condition, category, and image URL all get pulled in.

## How It Works

```text
User pastes profile URL
        |
        v
Edge Function receives URL
        |
        v
Firecrawl scrapes wardrobe page(s)
        |
        v
AI extracts structured listing data (title, brand, price, condition, category, image, item URL)
        |
        v
Upsert into listings table (matched by vinted_url to avoid duplicates)
        |
        v
Frontend refreshes listing grid
```

## User Experience
1. On the **My Listings** page, a new **"Import from Vinted"** button appears next to "Add" and "Bulk"
2. Clicking it opens a modal asking for their Vinted profile URL
3. A progress indicator shows the import running (typically 5-15 seconds depending on wardrobe size)
4. On completion, a toast shows "Imported 47 listings from Vinted" and the grid refreshes
5. Duplicate detection: if a listing URL already exists in their inventory, it updates the price/views rather than creating a duplicate

## Technical Details

### 1. New Edge Function: `import-vinted-wardrobe/index.ts`
- Accepts `{ profile_url: string }` from authenticated user
- Constructs the wardrobe URL (e.g. `https://www.vinted.co.uk/member/12345678-username/items`)
- Uses **Firecrawl scrape** with `formats: ['markdown']` to extract the wardrobe page content
- If the wardrobe has multiple pages, scrapes up to 5 pages (configurable) to capture larger inventories
- Sends the scraped markdown to AI (Gemini Flash via Lovable gateway) with a prompt to extract structured listing data as JSON
- Upserts each listing into the `listings` table, matching on `vinted_url` to prevent duplicates
- Returns `{ success: true, imported: 47, updated: 3, skipped: 0 }`

### 2. AI Extraction Prompt
The AI receives the scraped wardrobe markdown and extracts for each item:
- `title` — the listing title
- `brand` — brand name
- `current_price` — listed price in GBP
- `category` — inferred category (e.g. Trainers, Jacket, Dress)
- `condition` — condition if visible (e.g. Good, Very Good)
- `size` — size if visible
- `image_url` — first image URL
- `vinted_url` — direct link to the listing

### 3. Frontend Changes (Listings.tsx)
- Add an **"Import from Vinted"** button (with a Download icon) in the header actions bar
- New modal component with a single URL input field and "Import" button
- Loading state with progress messaging
- Success/error toast feedback
- Auto-refresh listings after import

### 4. Subscription Gating
- **Free tier**: Import up to 20 listings per import
- **Pro tier**: Up to 200 listings
- **Business/Scale**: Unlimited
- This aligns with the existing tier limits for the Inventory Dashboard

### 5. Config
Add function entry to `supabase/config.toml`:
```toml
[functions.import-vinted-wardrobe]
verify_jwt = false
```

### 6. Files Changed
| File | Change |
|------|--------|
| `supabase/functions/import-vinted-wardrobe/index.ts` | New edge function — scrape, extract, upsert |
| `src/pages/Listings.tsx` | Add "Import from Vinted" button and modal |
| `supabase/config.toml` | Auto-updated with new function |

### 7. Edge Cases Handled
- **Private profiles**: If Firecrawl returns no listings, show a helpful message: "Your wardrobe might be set to private. Make sure your Vinted profile is public."
- **Large wardrobes**: Paginate scraping up to 5 pages (roughly 100-250 items depending on Vinted's layout)
- **Re-imports**: Running import again updates prices and stats on existing listings without creating duplicates (matched by `vinted_url`)
- **Rate limiting**: Respects user's subscription credit limits

