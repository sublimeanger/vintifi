

# Fix eBay Integration: Bugs and Cohesion

## Problems Found

### Bug 1: Publish payload mismatch (ItemDetail page)
The `handlePublishToEbay` function in `ItemDetail.tsx` (line 164) sends:
```json
{ "listing_id": "...", "platform": "ebay" }
```
But the edge function expects:
```json
{ "listing_id": "...", "platforms": [{ "platform": "ebay" }] }
```
This means clicking "List on eBay" from the item detail page **always fails**. The Listings page version (line 313) sends the correct format.

### Bug 2: Response handling mismatch (ItemDetail page)
After the publish call, `handlePublishToEbay` in ItemDetail reads `data.platform_url` and `data.cross_listing_id`, but the edge function returns `{ results: { ebay: { success, platform_url } } }`. So even if the payload was fixed, the success/error handling would still break.

### Bug 3: eBay connection shows "Ready" when not connected
On the `/platforms` page, if there's no connection, the badge says "Ready" with a green colour -- this is misleading. It should say "Not Connected" with a neutral colour.

### Bug 4: OAuth opens in new tab, user must manually refresh
The connect flow opens eBay auth in `_blank` (new tab). After authorising, eBay redirects back to `/platforms` in that new tab. The original tab is left stale. This is confusing -- the user doesn't know which tab to use.

### UX Issues: "Alienated" feeling
- The eBay section on the Item Detail page is buried at the bottom of the Overview tab
- No eBay indicator on listing cards in the Listings page (can't tell what's already listed)
- The `/platforms` page feels disconnected -- it's a standalone page with no context about what you can do once connected

## The Fix

### 1. Fix the publish payload in ItemDetail.tsx
Change `handlePublishToEbay` to send the correct `platforms` array format and read the response correctly from `data.results.ebay`.

### 2. Fix the badge on PlatformConnections.tsx
Change "Ready" to "Not Connected" and use a neutral/muted colour instead of green when there's no connection.

### 3. Fix the OAuth flow
Change `window.open(url, "_blank")` to `window.location.href = url` so the user stays in the same tab. When eBay redirects back, the existing callback handler picks up the code seamlessly. No need for "refresh this page" toast.

### 4. Add eBay badge to listing cards
On the Listings page, query `cross_listings` for the user's eBay-listed items and show a small "eBay" badge on cards that are already published.

### 5. Move eBay higher on ItemDetail
Move the eBay status card from below the workflow card to directly after the metrics cards (above the workflow), making it more prominent.

## Technical Details

**Files to modify:**

1. **`src/pages/ItemDetail.tsx`** (lines 159-178)
   - Fix `handlePublishToEbay`: change `platform: "ebay"` to `platforms: [{ platform: "ebay", price_override: item.current_price }]`
   - Fix response reading: use `data.results?.ebay` instead of `data` directly
   - Move the eBay card up in the JSX (from after workflow to before workflow)

2. **`src/pages/PlatformConnections.tsx`** (lines 144-156)
   - Change the "Ready" badge to "Not Connected" with neutral styling
   - Change `window.open(data.url, "_blank")` to `window.location.href = data.url`
   - Remove the "Complete the authorisation in the new tab" toast

3. **`src/pages/Listings.tsx`** (lines 700-730 area)
   - Fetch eBay cross-listing IDs on page load
   - Show a small eBay badge on cards where the listing is already published
   - The "List on eBay" dropdown item should show "View on eBay" if already listed

**No backend changes needed.** The edge functions are working correctly -- the bugs are all on the frontend side.
