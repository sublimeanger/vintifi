

# Phase E: Stunning Vinted-Ready Pack

## Current State

The Vinted-Ready Pack exists only inside the Photos tab (lines 692-795 of `ItemDetail.tsx`). It's a simple Card with plain text sections and basic copy buttons. Problems:

1. **Hidden location**: Only visible if you navigate to the Photos tab AND the item has been optimised. Most users won't find it.
2. **No visual impact**: Standard Card with success border tint -- looks the same as every other card on the page.
3. **No hashtag separation**: Hashtags embedded in the description, no separate copy action.
4. **No celebration moment**: After completing the entire 4-step workflow, there's zero fanfare.
5. **Photo grid is tiny**: 4 thumbnails crammed into a row with no interaction.
6. **Not on Overview tab**: The Overview tab (the first thing users see) has no pack visibility at all.

---

## The Redesign

### 1. Extract into a dedicated `VintedReadyPack` component

Create `src/components/VintedReadyPack.tsx` as a standalone, reusable component that receives the item data and renders the premium pack. This keeps `ItemDetail.tsx` clean and allows the pack to be shown in multiple locations.

### 2. Show the Pack prominently on the Overview tab

When all 3 workflow steps are complete (priced + optimised + photos/image exists), show the full VintedReadyPack at the TOP of the Overview tab, above the metrics cards. This is the payoff moment -- it should be the first thing the user sees.

Also keep the existing pack in the Photos tab for users who navigate there directly.

### 3. Stunning Visual Design

The pack card gets a premium treatment:

- **Animated gradient border**: Use the existing `gradient-border` utility class (already defined in `index.css`) for an animated rainbow border that shifts colours -- this signals "something special"
- **Celebration header**: A large "Ready to Post" header with a subtle confetti-style particle animation on first render (using framer-motion)
- **Section cards**: Each section (Title, Description, Hashtags, Photos) gets its own mini-card inside the pack with distinct visual treatment
- **Copy feedback**: When copying, the button transitions to a green checkmark with a satisfying animation
- **Health score badge**: Prominent circular health score in the header area

### 4. Hashtag Extraction

Parse the description to extract hashtags (lines starting with # or words prefixed with #). Display them as a separate visual row of badges/pills with their own "Copy Hashtags" button. This is critical because Vinted sellers need to paste hashtags separately.

### 5. Premium Photo Strip

Instead of a cramped 4-col grid:
- Horizontal scrollable strip with larger thumbnails (aspect-square, ~80px)
- Each thumbnail has a subtle shadow and rounded corners
- "Download All" button with a download count badge
- Individual photo download on tap (mobile) or hover icon (desktop)

### 6. Master Actions Bar

At the bottom, a sticky-feeling action bar with:
- **"Copy Full Listing"** primary button (copies title + description + hashtags as formatted text)
- **"Open on Vinted"** secondary button (if vinted_url exists)
- **"Download Photos"** tertiary button
- All three actions the user needs, in one glanceable row

### 7. Animated Entrance

Use `framer-motion` to animate the pack in with:
- Staggered children: header slides in, then title card, then description, then hashtags, then photos, then action bar
- Each with a subtle `y: 10, opacity: 0` to `y: 0, opacity: 1` transition
- Total animation duration ~600ms so it feels snappy but polished

---

## Technical Details

### Files

| File | Action |
|------|--------|
| `src/components/VintedReadyPack.tsx` | **NEW** -- standalone pack component |
| `src/pages/ItemDetail.tsx` | Import and render `VintedReadyPack` on Overview tab (top) and Photos tab (replacing existing inline pack). Remove the inline pack code (lines 692-795). |

### Component Props

```typescript
interface VintedReadyPackProps {
  item: Listing;
  onOptimise: () => void;
  onPhotoStudio: () => void;
}
```

### Hashtag Extraction Logic

```typescript
function extractHashtags(description: string): { cleanDescription: string; hashtags: string[] } {
  const hashtagRegex = /#[\w]+/g;
  const hashtags = description.match(hashtagRegex) || [];
  // Remove the hashtag line(s) from description for clean display
  const cleanDescription = description
    .split('\n')
    .filter(line => !line.trim().match(/^#[\w]+(\\s+#[\w]+)*$/))
    .join('\n')
    .trim();
  return { cleanDescription, hashtags: [...new Set(hashtags)] };
}
```

### Pack Visibility Logic

The pack shows when:
- `item.last_optimised_at` is set (listing has been AI-improved)
- AND (`item.image_url` exists OR `item.images` array has entries)

If only optimised but no photos: show pack but with a "Add photos to complete your pack" CTA in the photos section.
If only photos but not optimised: don't show the pack (show the existing "Next: Improve Listing" CTA instead).

### Copy Full Listing Format

```
[Title]

[Description without hashtag lines]

[Hashtags as space-separated string]
```

This matches the exact format Vinted sellers paste into the app.

### No database changes needed

All data already exists in the `listings` table. The component purely reads and formats existing data.

