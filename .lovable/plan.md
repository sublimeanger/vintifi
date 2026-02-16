

# Add Colour and Material to AI Optimiser, Item Detail, and New Item Wizard

## Overview

Three changes: (1) the AI listing optimiser returns `detected_colour` and `detected_material` and saves them to the database, (2) the Item Detail Overview tab displays colour and material alongside existing fields, and (3) the New Item Wizard includes colour and material inputs.

---

## 1. AI Listing Optimiser: Detect colour and material

### Edge Function (`supabase/functions/optimize-listing/index.ts`)

Update the AI prompt to include `detected_colour` and `detected_material` in the JSON output schema. Add these two fields to the expected response structure:

```json
{
  "detected_colour": "<detected primary colour>",
  "detected_material": "<detected primary material>"
}
```

No model or logic changes needed -- just add the two fields to the prompt's JSON schema instruction.

### Frontend (`src/pages/OptimizeListing.tsx`)

**Update `OptimiseResult` type** (line 37) to add:
- `detected_colour: string`
- `detected_material: string`

**Update the save-to-listing block** (lines 184-209): when saving optimisation results to the listings table, include `colour` and `material` from the AI response:

```typescript
if (data.detected_colour) updatePayload.colour = data.detected_colour;
if (data.detected_material) updatePayload.material = data.detected_material;
```

**Update `handleSaveAsListing`** (line 230): include colour and material when creating a new listing from optimisation results.

**Display in results panel**: Show detected colour and material in the results card alongside brand, category, and condition (the existing metadata display section).

---

## 2. Item Detail: Show colour and material in Overview tab

### File: `src/pages/ItemDetail.tsx`

**Listing tab metadata grid** (lines 571-583): Add `Colour` and `Material` to the existing grid that shows Brand, Category, Size, Condition. Change from `grid-cols-2 sm:grid-cols-4` to `grid-cols-3 sm:grid-cols-6` or keep 4 columns and add a second row. The simplest approach: expand the array to include the two new fields:

```typescript
{ label: "Colour", value: item.colour },
{ label: "Material", value: item.material },
```

Also add colour/material badges to the status bar (line 296-299 area) if present, matching the existing brand/size/condition badges.

---

## 3. New Item Wizard: Add colour and material inputs

### File: `src/components/NewItemWizard.tsx`

**Update `WizardData` type** (line 26): Add `colour: string` and `material: string` fields.

**Update `initialData`** (line 41): Add `colour: ""` and `material: ""`.

**Update the details step UI** (around line 438): Add a new row with Colour and Material inputs in a 2-column grid, placed between the Category/Condition row and the Description field:

```tsx
<div className="grid grid-cols-2 gap-3">
  <div className="space-y-1.5">
    <Label>Colour</Label>
    <Input value={data.colour} onChange={...} placeholder="e.g. Black" />
  </div>
  <div className="space-y-1.5">
    <Label>Material</Label>
    <Input value={data.material} onChange={...} placeholder="e.g. Cotton" />
  </div>
</div>
```

**Update `handleSave`** (line 203): Include `colour` and `material` in the insert payload:

```typescript
colour: data.colour.trim() || null,
material: data.material.trim() || null,
```

**Update `scrapeVintedUrl`** (line 141): If the scrape response includes colour/material, prefill those fields too.

---

## Files changed summary

| File | Change |
|------|--------|
| `supabase/functions/optimize-listing/index.ts` | Add `detected_colour` and `detected_material` to AI prompt JSON schema |
| `src/pages/OptimizeListing.tsx` | Update type, save colour/material to DB, display in results |
| `src/pages/ItemDetail.tsx` | Show colour and material in Listing tab metadata grid |
| `src/components/NewItemWizard.tsx` | Add colour/material to WizardData, form inputs, and save payload |

No database migration needed -- the `colour` and `material` columns already exist on the `listings` table.

