

# Level Up Vintography: World-Class Enhancements

Here's what would take Vintography from "useful tool" to "feature sellers can't live without":

---

## 1. Side-by-Side Comparison Toggle

Currently the before/after slider works well, but world-class photo editors also offer a **side-by-side** mode. Add a toggle between "Overlay Slider" and "Side-by-Side" views so users can compare both images at full size without the clip-path overlap.

**What changes:** Add a view mode toggle above the comparison card. In side-by-side mode, show original and processed images next to each other (stacked on mobile).

---

## 2. Multi-Photo Batch Queue

Right now users process one photo at a time. Add the ability to **upload multiple images** and queue them for the same operation. Show a thumbnail strip at the top with processing status indicators per image. This is especially valuable for sellers listing items with 5+ photos.

**What changes:** 
- Accept multiple files in the upload input
- Show a horizontal scrollable thumbnail strip
- Process images sequentially, updating status per thumbnail
- "Download All" button for the batch

---

## 3. Undo / Re-generate with Variation

After processing, add a **"Try Again"** button that re-runs the same operation with slightly different results (AI models produce variation naturally). This gives users choice without re-uploading. Also add an undo stack so they can flip between the last 3 results.

**What changes:** Track up to 3 processed URLs in state. Add "Try Again" and left/right arrow buttons to browse variations.

---

## 4. Zoom & Pan on Preview

For detailed inspection (checking edge quality on background removal), add **pinch-to-zoom and drag-to-pan** on the comparison preview. Essential for mobile users examining fine details like hair, lace, or frayed edges.

**What changes:** Wrap the comparison area in a transform container with touch gesture handlers. Add a zoom slider or +/- buttons for desktop.

---

## 5. Quick Presets Bar

Instead of just 4 operations, show **quick preset combinations** like:
- "Marketplace Ready" = Remove BG + Enhance in one click
- "Lifestyle Shot" = Smart BG (wooden floor) + Enhance
- "Premium Listing" = Model Shot + Enhance

These chain two operations automatically, saving users a step and showing the premium value.

**What changes:** Add a "Quick Presets" section above the operation cards. Each preset calls the edge function twice in sequence.

---

## 6. Before/After Animation Preview

Add a small **auto-playing fade toggle** animation on gallery thumbnails (like a GIF effect that flips between original and processed). This makes the gallery visually striking and instantly shows the transformation value.

**What changes:** On gallery card hover (desktop) or on a timer (mobile), crossfade between `original_url` and `processed_url` using CSS transitions.

---

## 7. Credit Usage Bar

Show a clear **visual progress bar** of Vintography credits used this month (e.g., "3/15 edits used") directly on the page, not just in toast messages. This creates urgency for free users and clarity for paid users.

**What changes:** Add a small progress bar component below the page subtitle showing `vintography_used / limit`.

---

## Implementation Priority

| Enhancement | Impact | Effort | Priority |
|-------------|--------|--------|----------|
| Credit Usage Bar | Medium | Low | Do first |
| Before/After Animation on Gallery | High | Low | Do first |
| Side-by-Side Toggle | Medium | Low | Do second |
| Undo / Try Again | High | Medium | Do second |
| Quick Presets | High | Medium | Do third |
| Multi-Photo Batch | Very High | High | Do third |
| Zoom & Pan | Medium | High | Do later |

---

## Technical Details

### Files to modify:
- **`src/pages/Vintography.tsx`** — All UI enhancements (credit bar, gallery animation, side-by-side toggle, try again, presets)
- **`supabase/functions/vintography/index.ts`** — No changes needed for most enhancements; batch processing would need a new endpoint or loop logic
- **`src/contexts/AuthContext.tsx`** — Already exposes `credits`; may need to add `vintography_used` to the `UsageCredits` type if not present

### No new dependencies needed
All enhancements use existing Framer Motion, Radix UI, and Tailwind utilities already in the project.

### No database changes needed
The existing `vintography_jobs` table and `usage_credits.vintography_used` column support all these features.

