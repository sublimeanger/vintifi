

## Fix: Save Scraped Photos When Adding Item via Vinted URL

### Problem

When adding an item via Vinted URL, the `scrape-vinted-url` edge function successfully extracts photo URLs (the `photos` array in the response), but the New Item Wizard completely ignores them. The scraped photos are never stored in state, never displayed in the wizard, and never saved to the database.

### Root Cause

In `scrapeVintedUrl()` (line 145-172 of `NewItemWizard.tsx`), the prefill logic maps title, brand, category, size, condition, etc., but has no handling for `result.photos`. The wizard's `photoUrls` state stays empty, and on save, the `image_url` and `images` columns get null/empty values.

### Solution

Two changes in `src/components/NewItemWizard.tsx`:

1. **Capture scraped photo URLs in state**: In `scrapeVintedUrl()`, when `result.photos` is a non-empty array, set `data.photoUrls` to those URLs. These are already full HTTPS URLs hosted on Vinted's CDN, so they can be used directly without uploading.

2. **Save scraped photo URLs to the database on item creation**: In `handleSave()`, after uploading any local `data.photos` files, also include any scraped `photoUrls` that aren't from local files. Set `image_url` to the first available photo and `images` to the full array.

### Technical Detail

```
scrapeVintedUrl():
  - Add: if (result.photos?.length > 0) prefill.photoUrls = result.photos

handleSave():
  - After uploading local photos, merge with existing photoUrls from scraping
  - Final image list = uploaded local URLs + scraped URLs (deduplicated)
  - Set image_url = first image, images = full array
```

This means scraped Vinted photos will display in the details step (they're already rendered from `data.photoUrls`) and persist to the database when the item is saved.

