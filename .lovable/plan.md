

# eBay Integration: Current State and Next Steps

## What's Already Built

- **All 4 eBay secrets** are configured (Client ID, Client Secret, RuName/Redirect URI, Verification Token)
- **eBay verification endpoint** handles GET challenge and POST deletion notifications
- **Connect eBay page** (`/platforms`) with connect/disconnect buttons
- **Publish to eBay** edge function with full inventory/offer/publish flow
- **"List on eBay" buttons** on both the Listings page and Item Detail page
- **Cross-listings tracking** in the database (status, platform URL, sync log)

## What's Missing: The OAuth Callback

There is one **critical gap**: when eBay redirects the user back to `https://vintifi.com/platforms?code=XXXXX` after they authorise, **nothing catches that `code` parameter**. The `PlatformConnections` page doesn't read the URL, so the token exchange never happens and the connection never saves.

## The Fix

### 1. Add OAuth callback handling to `/platforms`

When the PlatformConnections page loads, check for a `code` query parameter. If present:
- Call the `connect-ebay` edge function with `{ action: "exchange_code", code: "..." }`
- On success, show a toast ("eBay connected!") and refresh the connection status
- Clear the `code` from the URL so it doesn't re-trigger on refresh

### 2. Fix the eBay auth URL redirect

The `connect-ebay` edge function currently builds the OAuth URL but the eBay Developer Portal "Accept URL" is set to `https://vintifi.com/platforms`. This is correct -- eBay will redirect back to that URL with `?code=xxx` appended. No change needed on the backend.

## How to Test (End-to-End Flow)

1. Go to `/platforms` (Settings -> eBay Connection)
2. Click **"Connect eBay"** -- this opens eBay's auth page in a new tab
3. Sign in to eBay and authorise the app
4. eBay redirects back to `https://vintifi.com/platforms?code=xxx`
5. The page automatically exchanges the code for tokens and shows "Connected"
6. Go to any listing and click **"List on eBay"** from the dropdown menu
7. The item gets created as an eBay inventory item, an offer is made, and it's published

## Technical Details

**File changes:**
- `src/pages/PlatformConnections.tsx` -- Add a `useEffect` that reads `window.location.search` for `code`, calls `connect-ebay` with `exchange_code`, updates state, and cleans the URL with `window.history.replaceState`

**No backend changes needed** -- the `exchange_code` action already exists in the edge function and works correctly.

**Note on tier gating:** The eBay connection currently requires Business tier (`tierLevel >= 2`). During testing, make sure your account is set to Business or higher, or temporarily lower the gate.

