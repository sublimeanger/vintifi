

# eBay Item Specifics, Category Preview, and Inline Editing

## Overview

Three enhancements to the eBay publish flow: (1) send item specifics (size, colour, material) to eBay via the `aspects` field, (2) show the detected category name in the readiness dialog, and (3) let users edit fields inline from the dialog without navigating away.

---

## 1. Database: Add `colour` and `material` columns

The `listings` table currently has no `colour` or `material` columns. These are needed both for eBay item specifics and as generally useful listing metadata.

**Migration:**
```sql
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS colour text,
  ADD COLUMN IF NOT EXISTS material text;
```

---

## 2. Backend: Send `aspects` to eBay Inventory API

**File:** `supabase/functions/publish-to-platform/index.ts`

In the `publishToEbay` function, add an `aspects` object to the inventory item creation payload. The eBay format is:

```json
"aspects": {
  "Brand": ["Nike"],
  "Size": ["M"],
  "Colour": ["Blue"],
  "Material": ["Cotton"]
}
```

Build this dynamically from listing fields -- only include aspects that have values. Also update the AI category detection to return both the category ID and a human-readable name.

**Changes:**
- Build `aspects` object from `listing.brand`, `listing.size`, `listing.colour`, `listing.material`, and `listing.condition`
- Add `aspects` to the `product` object in the inventory item PUT request
- Update `detectEbayCategory` to return `{ id: string, name: string }` instead of just a string
- Add a reverse lookup map (`EBAY_CATEGORY_NAMES`) so the category name can be returned to the frontend
- Return `categoryName` in the publish response so the frontend can display it

---

## 3. Frontend: Enhanced EbayPublishDialog with inline editing and category preview

**File:** `src/components/EbayPublishDialog.tsx`

Major upgrade to the dialog:

- **Category preview**: Before publishing, call a new lightweight edge function (or add a `/preview` mode to the existing one) that returns the detected category name. Display it at the top of the dialog as a badge (e.g., "Category: Women's Dresses").
- **Inline editing**: Each check row that fails or warns gets an inline edit affordance. Clicking the row expands a small input field where the user can fix the value directly. Editable fields: title, description, price, condition, brand, size, colour, material.
- **New fields**: Add colour and material as new check items in `runChecks`. They warn if missing (since eBay item specifics improve search ranking).
- **Save changes**: An `onSave` callback persists the edited fields to the database before publishing, so the user's fixes are saved even if they don't publish immediately.

**New Listing type fields:**
```typescript
type Listing = {
  // ...existing fields...
  colour: string | null;
  material: string | null;
};
```

**New props:**
```typescript
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: Listing;
  publishing: boolean;
  onPublish: (editedListing: Listing) => void;  // pass edited data
  onOptimise: () => void;
  onSave: (updates: Partial<Listing>) => Promise<void>;  // persist edits
}
```

**Inline edit UX:**
- Each check row shows a small pencil icon on hover
- Clicking it reveals an input (text field for title/description/brand, number for price, select for condition/size)
- A "Save Changes" button appears at the bottom when edits are pending
- Saving updates the listing in the database and re-runs the checks

---

## 4. New Edge Function: `ebay-preview`

**File:** `supabase/functions/ebay-preview/index.ts`

A lightweight function that takes a `listing_id` and returns:
- The AI-detected eBay category ID and name
- The aspects that would be sent
- Any validation warnings

This is called when the dialog opens, so the user sees the category and item specifics preview before committing to publish. It reuses the same `detectEbayCategory` logic but doesn't touch the eBay API.

---

## 5. Frontend: ItemDetail.tsx updates

**File:** `src/pages/ItemDetail.tsx`

- Update the `Listing` type to include `colour` and `material`
- Add `onSave` handler that updates the listing in the database
- Pass the new props to `EbayPublishDialog`
- When the dialog opens, call `ebay-preview` to fetch category info
- Pass the edited listing data through to the publish handler

---

## Technical Details

### eBay Aspects format (in inventory item PUT body)
```json
{
  "availability": { "shipToLocationAvailability": { "quantity": 1 } },
  "condition": "USED_GOOD",
  "product": {
    "title": "Nike Air Max 90 Trainers",
    "description": "...",
    "brand": "Nike",
    "imageUrls": ["..."],
    "aspects": {
      "Brand": ["Nike"],
      "Size": ["UK 10"],
      "Colour": ["White"],
      "Material": ["Leather"],
      "Style": ["Trainers"]
    }
  }
}
```

### Category name reverse lookup
The `EBAY_CATEGORY_FALLBACKS` map already has names as keys. Invert it for display:
```typescript
const EBAY_CATEGORY_NAMES: Record<string, string> = {
  "15724": "Women's Clothing",
  "1059": "Men's Clothing",
  "63861": "Dresses",
  // ...etc
};
```

When the AI returns a category ID, look it up in this map. If not found, return the generic "Clothing, Shoes and Accessories".

### Files changed summary

| File | Change |
|------|--------|
| Database migration | Add `colour` and `material` columns |
| `supabase/functions/publish-to-platform/index.ts` | Add `aspects` to inventory payload, update category detection to return name |
| `supabase/functions/ebay-preview/index.ts` | New lightweight preview function |
| `src/components/EbayPublishDialog.tsx` | Full rewrite: inline editing, category preview, colour/material checks |
| `src/pages/ItemDetail.tsx` | Updated types, new `onSave` handler, preview call on dialog open |

