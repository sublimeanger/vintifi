

## Fix: eBay "Location information not found" Error

### Root Cause

The `publish-to-platform` edge function creates an offer with `merchantLocationKey: "default"` (line 170), but never creates that merchant location in the eBay Inventory API first. eBay requires at least one merchant location to exist before offers can reference it.

### The Fix

**File: `supabase/functions/publish-to-platform/index.ts`**

Add a step **before** the offer creation (Step 2) that ensures the merchant location exists. This uses eBay's `createInventoryLocation` endpoint:

1. **Add a new `ensureMerchantLocation` function** that:
   - Calls `GET /sell/inventory/v1/location/default` to check if "default" already exists
   - If it returns 404, calls `PUT /sell/inventory/v1/location/default` to create it with:
     - `location.country: "GB"`
     - `location.postalCode` from the seller's profile (fallback to a generic UK value like "SW1A 1AA")
     - `name: "Default Location"`
     - `merchantLocationStatus: "ENABLED"`
     - `locationTypes: ["WAREHOUSE"]`
   - If it already exists (200/204), does nothing

2. **Call `ensureMerchantLocation`** in `publishToEbay` right before Step 2 (offer creation), passing the access token

3. **Optional profile enhancement**: Store the seller's postcode in the `platform_connections.auth_data` JSONB during eBay OAuth, so the location uses their real postcode. For now, use a sensible UK default.

### Code Shape

```typescript
async function ensureMerchantLocation(accessToken: string) {
  const checkRes = await fetch(
    "https://api.ebay.com/sell/inventory/v1/location/default",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (checkRes.ok) return; // already exists

  const createRes = await fetch(
    "https://api.ebay.com/sell/inventory/v1/location/default",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        location: {
          address: {
            postalCode: "SW1A 1AA",
            country: "GB",
          },
        },
        name: "Default Location",
        merchantLocationStatus: "ENABLED",
        locationTypes: ["WAREHOUSE"],
      }),
    }
  );
  if (!createRes.ok && createRes.status !== 409) {
    throw new Error(
      `eBay location setup failed [${createRes.status}]: ${await createRes.text()}`
    );
  }
}
```

Then in `publishToEbay`, between Step 1 and Step 2:
```typescript
// Step 1.5: Ensure merchant location exists
await ensureMerchantLocation(accessToken);
```

### Why This Works
- eBay's Inventory API requires a location before offers can be created
- The location only needs to be created once per seller account — subsequent publishes will see it already exists and skip
- Using `"default"` as the key matches the `merchantLocationKey` already referenced in the offer payload
- 409 (Conflict) is handled gracefully in case of race conditions

### Files Changed
| File | Change |
|------|--------|
| `supabase/functions/publish-to-platform/index.ts` | Add `ensureMerchantLocation` function, call it before offer creation |

