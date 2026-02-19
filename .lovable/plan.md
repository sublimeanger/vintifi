

# Add HEIC Image Upload Support

## Problem
HEIC is the default photo format on iPhones. While `accept="image/*"` lets users select HEIC files, browsers cannot display them natively, so they'll fail to preview or render as broken images.

## Solution
Convert HEIC files to JPEG on the client side before uploading or previewing, using the `heic2any` library. This is transparent to the user -- they just pick their photos as normal.

### Changes

**1. Install `heic2any` package**
- A lightweight client-side library that converts HEIC/HEIF blobs to JPEG/PNG

**2. Create `src/lib/convertHeic.ts` -- shared utility**
- Export an `ensureDisplayableImage(file: File): Promise<File>` function
- If the file is HEIC/HEIF (check by MIME type `image/heic`, `image/heif`, or `.heic`/`.heif` extension), convert to JPEG using `heic2any`
- If it's already a supported format, return it unchanged
- This keeps the conversion logic in one place for all upload points

**3. Update all upload handlers to run files through the converter**

Apply `ensureDisplayableImage` before uploading in these files:
- `src/pages/Vintography.tsx` -- `handleAddPhoto` and the EmptyState file handler
- `src/components/PhotosTab.tsx` -- `handleUploadPhotos`
- `src/components/NewItemWizard.tsx` -- photo upload handler
- `src/pages/SellWizard.tsx` -- `handlePhotoSelect`
- `src/pages/Welcome.tsx` -- `handleFileSelect`

Each handler will map files through `ensureDisplayableImage` before creating object URLs or uploading to storage.

**4. Update `accept` attributes**

Add explicit HEIC MIME types to ensure file pickers show HEIC files on all platforms:
```
accept="image/*,.heic,.heif"
```

### Technical Details

- `heic2any` runs entirely client-side (no server dependency)
- Conversion produces a JPEG blob with 0.9 quality (good balance of size and quality)
- The converted file keeps a `.jpg` extension for storage compatibility
- A loading state or brief toast ("Converting photo...") can be shown during conversion since HEIC decoding takes 1-2 seconds per image
- Files are processed in parallel using `Promise.all` for multi-file uploads

