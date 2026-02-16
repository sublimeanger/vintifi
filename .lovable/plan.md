

## Fix: Send ALL Listing Images to eBay

### Problem Found

The `publish-to-platform` edge function currently only sends **1 image** to eBay, even when the listing has multiple photos stored in the `images` JSONB column.

**Current code (line 154):**
```
imageUrls: listing.image_url ? [listing.image_url] : []
```

Your M&S Turquoise blouse has **5 photos** in the database, but only the first one would be sent to eBay. eBay supports up to 12 images per listing, and more photos significantly increase sell-through rates.

### What the Data Looks Like

| Column | Content |
|--------|---------|
| `image_url` | Single URL (the primary/hero image) |
| `images` | JSONB array of ALL image URLs (including edited/optimised photos from Vintography) |

### The Fix

**File: `supabase/functions/publish-to-platform/index.ts`**

Replace the single-image line with logic that:

1. Reads the `images` JSONB array first (this contains all photos, including any Vintography-edited versions)
2. Falls back to `image_url` if `images` is empty
3. Caps at 12 images (eBay's maximum)
4. Deduplicates URLs in case `image_url` overlaps with `images`

**Before:**
```typescript
imageUrls: listing.image_url ? [listing.image_url] : [],
```

**After:**
```typescript
imageUrls: buildImageUrls(listing),
```

**New helper function:**
```typescript
function buildImageUrls(listing: any): string[] {
  const urls: string[] = [];

  // Prefer the images array (includes Vintography edits)
  if (Array.isArray(listing.images)) {
    for (const u of listing.images) {
      if (typeof u === "string" && u.startsWith("http")) urls.push(u);
    }
  }

  // Fallback to image_url if images array was empty
  if (urls.length === 0 && listing.image_url) {
    urls.push(listing.image_url);
  }

  // Deduplicate and cap at 12 (eBay max)
  return [...new Set(urls)].slice(0, 12);
}
```

### Image Priority Logic

The `images` array is the source of truth because:
- When importing from Vinted, all scraped photos go into `images`
- When using Vintography (Photo Studio), edited photos are appended to `images`
- `image_url` is just the hero/thumbnail and is always also in `images`

This means if a user has enhanced their photos through Vintography, the **optimised versions** will automatically be sent to eBay.

### Also Updating: ebay-preview Validation

**File: `supabase/functions/ebay-preview/index.ts`**

Add an image count warning to the preview so users see photo status before publishing:
- 0 photos: warning "No photos — eBay listings without photos rarely sell"
- 1-2 photos: warning "Only X photos — eBay recommends 3+ for best results"

### Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/publish-to-platform/index.ts` | Add `buildImageUrls` helper, use it in inventory item payload to send all images (up to 12) |
| `supabase/functions/ebay-preview/index.ts` | Add image count to preview warnings |
