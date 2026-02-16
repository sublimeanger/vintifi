

# Fix eBay Publishing: Missing `Accept-Language` Header

## The Problem

The eBay Inventory API requires an `Accept-Language` header on all requests. The current code only sends `Content-Language: en-GB` but omits `Accept-Language`, causing a 400 error on every publish attempt.

This same issue affects all three API calls in the publish flow (inventory creation, offer creation, and offer publishing).

## The Fix

Update `supabase/functions/publish-to-platform/index.ts` to add `Accept-Language: en-GB` to the headers of all three eBay API calls:

### Step 1: Inventory item creation (line 128)
Add `"Accept-Language": "en-GB"` to the headers object.

### Step 2: Offer creation (line 148)
Add `"Accept-Language": "en-GB"` to the headers object.

### Step 3: Offer publishing (line 162)
Add `"Accept-Language": "en-GB"` to the headers object (this call is also missing `Content-Language`).

## Technical Details

**File:** `supabase/functions/publish-to-platform/index.ts`

Three header objects need updating:

```text
Line 128 (inventory):
  BEFORE: { Authorization: ..., "Content-Type": "application/json", "Content-Language": "en-GB" }
  AFTER:  { Authorization: ..., "Content-Type": "application/json", "Content-Language": "en-GB", "Accept-Language": "en-GB" }

Line 148 (offer):
  BEFORE: { Authorization: ..., "Content-Type": "application/json", "Content-Language": "en-GB" }
  AFTER:  { Authorization: ..., "Content-Type": "application/json", "Content-Language": "en-GB", "Accept-Language": "en-GB" }

Line 162 (publish):
  BEFORE: { Authorization: ..., "Content-Type": "application/json" }
  AFTER:  { Authorization: ..., "Content-Type": "application/json", "Content-Language": "en-GB", "Accept-Language": "en-GB" }
```

One file changed, three lines updated. The edge function will be redeployed automatically after the edit.

