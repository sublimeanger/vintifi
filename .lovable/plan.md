

# Phase D: Photo Studio — World-Class Upgrade

## Overview

Transform the Photo Studio from a functional tool into a best-in-class photo editing experience with shimmer skeletons, operation previews, improved batch UX, and hyper-optimised AI prompts.

---

## 1. Shimmer Skeleton During Processing (ComparisonView.tsx)

Replace the current spinner overlay (lines 385-391) with a rich shimmer skeleton that previews the shape of the result:

- Show a pulsing image silhouette with a gradient sweep animation (like Instagram loading)
- Display a multi-step progress indicator: "Uploading..." -> "AI analysing garment..." -> "Generating result..." -> "Finalising..."
- Add a subtle progress bar with estimated time remaining
- Keep the original image visible but dimmed underneath the skeleton overlay so users maintain context

**Technical**: Add a `processingStep` state to `Vintography.tsx` that tracks stages (`uploading | analysing | generating | finalising`). Pass this to `ComparisonView` which renders the appropriate skeleton state. Use `framer-motion` for smooth transitions between steps.

---

## 2. Operation Preview Cards with Before/After Examples (Vintography.tsx)

Upgrade the 4 operation cards from plain text descriptions to visual previews:

- Each card gets a tiny before/after thumbnail strip (2 small images side by side)
- Use static placeholder images stored as inline SVG gradients/patterns (no external assets needed) that visually represent what each operation does:
  - **Clean Background**: messy BG -> pure white
  - **Lifestyle**: white BG -> styled scene
  - **Virtual Model**: flat-lay -> on model
  - **Enhance**: dull/dark -> bright/sharp
- Add a subtle "1 credit" indicator on each card
- On selection, the card expands slightly to show a one-line "what this does" explainer

**Technical**: Update the `OPERATIONS` array to include `preview` data. Each card uses a small `div` with gradient backgrounds to simulate before/after without loading real images.

---

## 3. Batch Upload UX Fix (Vintography.tsx)

Current issue: only the first photo auto-uploads; rest stay local until "Process All."

**Fix**:
- On multi-file selection, immediately upload ALL files in parallel (not just the first)
- Show upload progress per-thumbnail in the BatchStrip (progress ring around each thumb)
- Add a prominent "Process All" floating bar when batch has 2+ items with count + selected operation
- After batch completion, show a summary card: "4/5 photos processed successfully" with download-all
- Fix `handleDownloadAll` to show a toast with progress: "Downloading 1 of 5..."

**Technical**: Refactor `handleFileSelect` to upload all files concurrently using `Promise.allSettled`. Update `BatchItem.status` to include `"uploaded"` state. Add progress feedback to `handleDownloadAll`.

---

## 4. Hyper-Optimised AI Prompts (vintography/index.ts)

Rewrite every prompt for maximum quality output:

### remove_bg (Clean Background)
- Add explicit instructions for handling transparent/semi-transparent fabrics, fur edges, and intricate details like lace
- Specify anti-aliasing on edges to prevent jagged cutouts
- Add instruction to preserve natural fabric shadows on the white background

### smart_bg (Lifestyle)
- Add depth-of-field instructions: garment sharp, background with natural bokeh
- Add shadow casting: "cast a realistic soft shadow consistent with the scene's lighting direction"
- Add colour temperature matching: "adjust garment white balance to match the scene's ambient light"
- Expand scene descriptions with much more photographic detail (aperture feel, light quality, atmosphere)

### model_shot (Virtual Model)
- Add skin detail: "photo-realistic skin with natural pores, no plastic/AI look"
- Add fabric physics: "show realistic gravity, drape, tension points, and fabric weight"
- Add hand/finger instruction: "hands must have exactly 5 fingers, natural proportions"
- Add face instruction: "natural expression, no uncanny valley, eyes looking at camera or naturally away"
- Specify resolution feel: "equivalent to a 50mm f/1.8 lens at 6ft distance"
- Use `google/gemini-3-pro-image-preview` for maximum quality

### enhance
- Add specific instructions for white balance correction
- Add detail recovery for shadows and highlights
- Add noise reduction with detail preservation
- Add micro-contrast enhancement for fabric texture pop
- Add instruction for consistent colour temperature

### All prompts
- Strengthen the "no text" instruction with: "ABSOLUTELY ZERO text, watermarks, labels, captions, annotations, logos, or any form of written content anywhere in the image"
- Add output quality instruction: "Output at the highest possible resolution and quality. The result must look indistinguishable from a professional photographer's work"

---

## 5. Processing State Enhancement (Vintography.tsx + ComparisonView.tsx)

Add a rich processing experience:

- **Animated tips**: During processing, cycle through helpful tips every 3 seconds:
  - "Tip: Clean Background works best with high-contrast photos"
  - "Tip: Virtual Model preserves all garment details like logos and prints"
  - "Tip: Try Lifestyle mode for social media posts"
- **Sound feedback** (optional): Subtle chime on completion
- **Auto-scroll**: When processing completes, smooth-scroll the result into view

**Technical**: Add a `TIPS` array per operation. Use `useEffect` with `setInterval` to cycle tips during `processing === true`. Clear on completion.

---

## 6. Gallery Improvements (GalleryCard.tsx)

- Add a "Use as input" action to gallery cards so users can chain operations (e.g., Clean BG -> then Lifestyle)
- Add operation icon badge overlay on gallery thumbnails
- Improve the before/after hover to work on mobile (tap to toggle instead of hover)

---

## Files Modified

| File | Changes |
|------|---------|
| `supabase/functions/vintography/index.ts` | Hyper-optimised prompts for all operations |
| `src/pages/Vintography.tsx` | Batch upload fix, processing steps state, operation preview cards, auto-scroll, tips |
| `src/components/vintography/ComparisonView.tsx` | Shimmer skeleton with multi-step progress, tips carousel |
| `src/components/vintography/BatchStrip.tsx` | Upload progress rings, "uploaded" status |
| `src/components/vintography/GalleryCard.tsx` | "Use as input" action, mobile tap toggle, operation icon badge |

## Technical Details

- No database changes needed
- Edge function redeployment required for prompt updates
- All UI changes use existing dependencies (framer-motion, lucide-react, Tailwind)
- Processing step tracking uses a simple string state passed as props
- Before/after previews on operation cards use CSS gradients (zero external assets)

