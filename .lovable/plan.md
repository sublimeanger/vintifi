

# World-Class Photo Guidance: End-to-End Workflow Revamp

## What This Solves

Right now, the Add Item wizard allows photo uploads with zero guidance -- users upload folded-up photos, angled shots, partial views, and label close-ups. When Photo Studio tries to put these on a model or remove backgrounds, the AI gets confused because it can't see the full garment. The entire pipeline needs to educate and hand-hold users from the very first photo they upload, so every downstream tool (Price Check, Listing Optimiser, Photo Studio) has the best possible input to work with.

## The Revamp: 5 Key Changes

### 1. Guided Photo Upload in the New Item Wizard

Replace the current "tap to upload" with a structured, guided photo upload section that appears in the **Details step** (for all entry methods -- URL, Photo, Manual).

**Primary Photo (Required)**
- A large upload area labelled **"Main Photo"** with guidance text: *"Full front view of the garment, laid flat or on a hanger. Show the entire item from neckline to hem."*
- A small inline tip with an icon: *"This photo is used by Photo Studio for model shots and background removal. A clear, full-front view gives the best results."*
- Validation: at least 1 photo is required before saving (enforce on the Save button alongside title/condition/price).

**Additional Photos (Optional)**
- Below the primary photo, a smaller row of up to 4 additional photo slots with the label: *"Extra angles (optional)"*
- Guidance: *"Back view, label/tag, detail close-ups, or any flaws. These help buyers but aren't used for AI editing."*

The first photo uploaded becomes `image_url` (the cover / primary photo used by Photo Studio). Additional photos go into `images[]`.

For **Vinted URL** imports: scraped photos auto-fill these slots. The first scraped photo is treated as the primary. Users can reorder by tapping to swap.

### 2. Photo Quality Guidance in Photo Studio

When Photo Studio loads an image (from an item or uploaded directly), add a small dismissible guidance banner at the top of the editor:

*"Best results with a full, flat-lay or hanger shot showing the entire garment. Close-ups, folded shots, or partial views may produce unexpected results."*

This appears once per session and can be dismissed. It sets expectations before the user spends a credit.

### 3. Photo Studio Operation-Specific Warnings

Before processing, if the selected operation is **AI Model Concept** or **Lifestyle**, show a brief inline check:

*"Make sure your photo shows the full garment (front view, neckline to hem). Folded or cropped photos won't work well for this operation."*

This appears below the operation cards when those operations are selected (alongside the existing garment description input).

### 4. Primary Photo Indicator in Photos Tab (Item Detail)

The Photos tab already has a "Cover" badge on the first photo. Enhance this with a small tooltip/note:

*"The cover photo is used by Photo Studio for AI editing. For best results, make sure it's a clear, full-front view."*

This reinforces the guidance at the point where users manage their photo order.

### 5. Make Photo Upload Mandatory in the Wizard

Currently, the wizard enforces title, condition, and purchase price. Add a **soft requirement** for at least 1 photo:

- If no photos are attached when the user taps "Add Item", show a confirmation dialog: *"No photos added. Photos are needed for Photo Studio and help your listing sell faster. Continue without photos?"*
- Two buttons: "Add Photos" (primary) and "Skip for now" (ghost).
- This doesn't block the flow but creates a strong nudge.

## Technical Changes

### `src/components/NewItemWizard.tsx`

**Details step changes:**
- Add a "Main Photo" upload section at the top of the details form (before Title field) with guidance text and upload area
- Show the first photo larger with a "Main Photo" label
- Show additional photos in a smaller strip below
- Add a confirmation dialog state (`showPhotoNudge`) triggered when saving with no photos
- For URL imports: auto-populate the primary photo from scraped data with a visual indicator

**New sub-component or inline section:**
- `PhotoGuidance` -- a small card with an icon and guidance text about what makes a good primary photo

### `src/pages/Vintography.tsx`

- Add a dismissible `photoGuidanceDismissed` state (persisted to sessionStorage)
- Show a guidance banner between the CreditBar and the upload/editor zone
- Add operation-specific guidance text below the operation cards for `virtual_model` and `lifestyle_bg`

### `src/components/PhotosTab.tsx`

- Add a small info note below the "Drag thumbnails to reorder" text: *"The cover photo is used by Photo Studio for AI editing. A full front view gives the best results."*

### `src/components/NewItemWizard.tsx` (Confirmation Dialog)

- Add an AlertDialog that triggers when saving with 0 photos
- Two options: "Add Photos" (dismisses dialog, scrolls to photo upload) and "Skip for now" (proceeds with save)

## Summary of Files Changed

| File | Change |
|------|--------|
| `src/components/NewItemWizard.tsx` | Restructure photo upload with primary/additional guidance, add photo nudge dialog, move photos to top of details step |
| `src/pages/Vintography.tsx` | Add dismissible guidance banner, add operation-specific quality warnings |
| `src/components/PhotosTab.tsx` | Add cover photo guidance note |

## What This Does NOT Change

- No database schema changes needed
- No edge function changes needed (garment context injection from last revamp handles the AI side)
- No changes to Price Check or Listing Optimiser flows
- The workflow order remains: Add Item (with guided photos) > Price Check > Optimise > Photo Studio

