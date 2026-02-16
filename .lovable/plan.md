

## Fix: Images Lost When Optimising From Item Detail

### Root Cause

When you click "Improve Listing" on an item's detail page, the `handleOptimise` function passes text fields (title, brand, category, etc.) as URL query params but **completely ignores the item's photos** (`image_url` and `images` columns). The Optimiser page starts with an empty photo array and never loads the item's existing images from the database.

The AI then runs without any photos, scores them 0/25, and tells you to upload them -- even though they're already stored on the listing.

### Fix

**File: `src/pages/OptimizeListing.tsx`**

Add a `useEffect` that runs when an `itemId` is present in query params. It will:
1. Query the `listings` table for the item's `image_url` and `images` columns
2. Build a combined photo URL array (same logic used in `PhotosTab.tsx`)
3. Set `remotePhotoUrls` with the existing images so they appear in the "Imported Photos" section and get sent to the AI

This is a ~15-line addition. No edge function changes needed -- the edge function already handles `photoUrls` correctly when they're provided.

**File: `src/pages/ItemDetail.tsx`**

No changes needed. The `itemId` query param is already passed, which is all the Optimiser needs to look up the images.

### Technical Detail

```text
Current flow:
  ItemDetail --[title, brand, size...]--> OptimizeListing --[empty photoUrls]--> Edge Function --> AI (no photos)

Fixed flow:
  ItemDetail --[itemId]--> OptimizeListing --[fetches images from DB]--> Edge Function --> AI (with photos)
```

### What This Fixes
- Photos imported via Vinted URL will be visible and sent to the AI during optimisation
- Photos uploaded via the Photos tab will also be included
- The AI will produce accurate photo scores instead of always saying "upload photos"
- No extra credits consumed -- same single optimisation call, just with images included
