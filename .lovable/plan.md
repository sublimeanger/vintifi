

# Photo Studio — Complete Flow Redesign

## The Core Problem

The current Photo Studio was designed around a single-photo workflow and then "batch" was bolted on. The result is incoherent for anyone with multiple listing photos. Let me map every flaw precisely:

**Flaw 1: Wrong mental model for linked items**
When arriving from an item (`/vintography?itemId=xxx`), the code fetches ALL the item's photos and dumps them into the `BatchStrip`. The only available action then becomes "Process All X Photos" — forcing the same operation on every photo. A seller who has 4 photos — front, back, label, detail — might only want to:
- Steam & Press the front (it's creased)
- Clean background on the back (it's cluttered)
- Leave the label photo untouched
- Enhance the detail shot

None of this is possible today.

**Flaw 2: Batch Processing = wrong framing**
The `BatchStrip` at the top of the left panel is designed for uploaded files queued for mass processing. It reads "Batch Queue — 0/3 done." This language and pattern implies all photos will get the same treatment. That is the wrong mental model for a seller managing their listing photos.

**Flaw 3: Save to Item adds instead of replaces**
When you enhance a photo and click "Save to Item", the code does:
```typescript
const updatedImages = [...existingImages, newProcessedUrl];
```
It **appends** the processed photo. So now the listing has the original creased front AND the steamed front. The seller has to go back to the Photos tab and manually delete the old one. This is terrible UX.

**Flaw 4: No per-photo edit state**
There's one `originalUrl` and one `processedUrl`. If you process photo 1, then click photo 2 in the batch strip to process it, you lose the result for photo 1 (unless it's been saved). There's no persistent per-photo edit state.

**Flaw 5: The wand icon (deep-link to studio from PhotosTab) ignores multi-photo context**
When a user taps the wand on a specific thumbnail in the Photos tab, it navigates to `/vintography?itemId=xxx&image_url=yyy`. The `image_url` param loads just that one photo — but then the `itemId` effect ALSO runs and loads ALL photos into the batch strip. There's a race condition between these two `useEffect` hooks.

**Flaw 6: After processing, "the operation applies to whatever is currently in originalUrl"**
The batch strip "selecting" a photo just sets `originalUrl` without clearing context. The Generate button applies to whichever photo was most recently selected in the strip — not necessarily the one the user is looking at in the preview.

---

## The Right Mental Model

The new model is an **image-by-image editing workspace** that's aware of the full listing photo set. The user sees their photos as a filmstrip, picks which one they want to work on, chooses an operation, processes it, then decides what to do with the result (replace the original, add as extra, download).

This means:
- Photos are shown as an **editable filmstrip**, not a batch queue
- Each photo can have its own edit state (original / edited / untouched)
- Selecting a photo loads it into the editing workspace
- Processing produces a result for THAT specific photo
- "Save to Item" replaces that specific photo (with an option to keep original)
- Some photos can stay untouched; others can have multiple edits tried

---

## Redesigned Components

### 1. New `PhotoFilmstrip` component (replaces `BatchStrip`)

Location: `src/components/vintography/PhotoFilmstrip.tsx`

This component replaces the `BatchStrip` entirely and has a completely different mental model:

```
[ Photo 1 ]  [ Photo 2 ]  [ Photo 3 ]  [ Photo 4 ]  [ + Add ]
  Primary      ✓ Edited      Active →    Untouched
```

Each thumbnail shows:
- The current best version of that photo (processed if done, original if not)
- A status indicator: `✓ Edited` (green dot), `Active` (primary ring + subtle pulse), `Untouched` (default)
- A "Primary" badge on photo index 0
- Photo index number in the corner

Key differences from `BatchStrip`:
- No "Batch Queue" language anywhere
- No "0/3 done" counter — this is not a queue, it's a photo gallery
- Clicking a photo selects it for editing (makes it Active)
- An `onAddPhoto` callback allows adding more photos to the listing directly from the strip (triggers file picker, uploads to listing)
- When viewing from an item, shows an edit history pill below each photo: "2 edits" or "Steam + BG" as tiny badges

### 2. Per-photo edit state tracking

A `photoEditState` map in `Vintography.tsx` that tracks per-URL state:
```typescript
type PhotoState = {
  editedUrl: string | null;     // most recent processed result for this photo
  savedToItem: boolean;          // whether it's been saved back
  operationApplied: string | null; // which operation was last applied
};

const [photoEditStates, setPhotoEditStates] = useState<Record<string, PhotoState>>({});
```

When `processImage` returns a result for the active photo, store it in `photoEditStates[activePhotoUrl]`. This means switching between photos doesn't lose your work — the edited version stays associated with its original.

### 3. Smart "Save to Item" — Replace vs. Add

Currently saves always append. The new behaviour:

When the user clicks "Save to Item", show a brief confirmation with two clear choices:
- **Replace original** — swaps `image_url` (if primary) or replaces the specific URL in the `images` array with the edited version. The old creased/original photo is removed.
- **Add alongside** — keeps original AND adds edited version (current behaviour, useful if they want both)

Implementation: `updateLinkedItem` gets a `mode: "replace" | "add"` parameter. In `replace` mode, it finds the original URL in the listings table and substitutes it with the processed URL, rather than appending.

The default should be **Replace** — that's what 95% of sellers want. They don't want the creased version AND the pressed version. They want the pressed version instead.

### 4. Filmstrip appears at the top of the RIGHT panel (above preview), not the left panel

The current batch strip is in the LEFT panel (config side). This is wrong placement — the strip is about WHICH PHOTO you're working on, not WHAT OPERATION you're applying. Moving it to the top of the RIGHT panel (preview side) makes the mental model clear:
- Left panel = "what do you want to do?" (operation + params)
- Right panel = "which photo? here's the before/after"

On mobile, the filmstrip is horizontal-scrollable above the ComparisonView card.

### 5. Active photo shows both original and edited state at a glance

In the filmstrip, the active photo thumbnail shows a split diagonal preview (original on top-left triangle, edited on bottom-right triangle) if an edited version exists — exactly like the ComparisonView slider but as a tiny thumbnail signal.

### 6. Upload Zone improvements when coming from an item

Currently: if arriving with `itemId`, the upload zone is completely hidden (replaced by the editor with the batch strip). But what if the item has no photos yet? The user sees a confused state.

New behaviour:
- If `itemId` present AND item has photos → show filmstrip + editor (no upload zone)
- If `itemId` present AND item has NO photos → show the upload zone with a note: "No photos yet — upload your first photo for [Item Title]"
- The upload zone is also accessible FROM the filmstrip via the `+` button

---

## Data Flow Changes

### New `useEffect` for item photos (fixes the race condition)

The existing code has two competing `useEffect` hooks:
1. One watches `searchParams` for `image_url` param
2. One watches `itemId` to load all photos

They both call `setOriginalUrl()` and can race each other. Fix: combine into a single effect that checks `image_url` param first (deep link to specific photo wins), then falls back to loading the full item photo set.

```typescript
useEffect(() => {
  const imageUrl = searchParams.get("image_url");
  const itemId = searchParams.get("itemId");
  
  if (!user) return;
  
  if (imageUrl) {
    // Deep-linked to specific photo — load just this one
    // But still fetch item's other photos for the filmstrip
    setActivePhotoUrl(imageUrl);
    if (itemId) fetchItemPhotos(itemId, imageUrl); // loads filmstrip but keeps imageUrl as active
  } else if (itemId) {
    // Load item photos, set first as active
    fetchItemPhotos(itemId, null);
  }
}, [searchParams, user]);
```

### `handleProcess` changes

Instead of calling `processImage(originalUrl, ...)`, it now calls `processImage(activePhotoUrl, ...)` and on result:

```typescript
const result = await processImage(activePhotoUrl, getOperation(), getParams());
if (result) {
  // Store in per-photo state
  setPhotoEditStates(prev => ({
    ...prev,
    [activePhotoUrl]: {
      editedUrl: result,
      savedToItem: false,
      operationApplied: selectedOp,
    }
  }));
  setProcessedUrl(result); // Still drives the ComparisonView
}
```

### `handleSaveToItem` — replace mode

```typescript
const handleSaveToItem = async (mode: "replace" | "add") => {
  if (!processedUrl || !itemId || !activePhotoUrl) return;
  
  if (mode === "replace") {
    // Find and replace the specific URL in the listing record
    await replaceListingPhoto(itemId, activePhotoUrl, processedUrl);
    // Update the filmstrip — show the edited version in the thumbnail
    setItemPhotos(prev => prev.map(u => u === activePhotoUrl ? processedUrl : u));
    setActivePhotoUrl(processedUrl); // Now working on the edited version
  } else {
    await updateLinkedItem(processedUrl); // existing append behaviour
  }
  
  setPhotoEditStates(prev => ({
    ...prev,
    [activePhotoUrl]: { ...prev[activePhotoUrl], savedToItem: true }
  }));
};
```

`replaceListingPhoto` function:
```typescript
const replaceListingPhoto = async (itemId: string, oldUrl: string, newUrl: string) => {
  const { data } = await supabase.from("listings")
    .select("image_url, images").eq("id", itemId).eq("user_id", user.id).maybeSingle();
  
  const isImageUrl = data?.image_url === oldUrl;
  const rawImages = Array.isArray(data?.images) ? data.images as string[] : [];
  const newImages = rawImages.map(u => u === oldUrl ? newUrl : u);
  
  await supabase.from("listings").update({
    image_url: isImageUrl ? newUrl : data?.image_url,
    images: newImages,
    last_photo_edit_at: new Date().toISOString(),
  }).eq("id", itemId).eq("user_id", user.id);
};
```

---

## UI Layout Summary

### Desktop (lg:grid-cols-[440px_1fr])

**LEFT PANEL** (unchanged purpose — configuration):
- Operation cards (2x2 grid + Steam & Press full-width)
- Operation-specific params (background picker, mannequin options, etc.)
- Generate button (pinned at bottom)

**RIGHT PANEL** (preview + photo management):
- **[NEW] PhotoFilmstrip** — horizontal scroll, all listing photos, active indicator, edit status badges, `+` button to add photos
- **ComparisonView** — before/after of the active photo
- **Action row** — Replace Original (primary, green), Add Alongside (secondary outline), Download, Try Again
- **Next Steps card** (existing — unchanged)

### Mobile

- PhotoFilmstrip — horizontal scroll, full width
- ComparisonView — full width
- Operation cards (scrollable left panel collapses under a drawer or accordion on mobile)
- Action buttons below preview

---

## Files Changed

| File | Change |
|---|---|
| `src/pages/Vintography.tsx` | Major refactor: unified effect, `photoEditStates` map, `activePhotoUrl` as primary state, `handleSaveToItem` with mode param, filmstrip placement in right panel, `replaceListingPhoto` function |
| `src/components/vintography/PhotoFilmstrip.tsx` | **New file** — replaces `BatchStrip` with per-photo awareness, edit status badges, `+` add button, Primary label, active ring |
| `src/components/vintography/BatchStrip.tsx` | Removed (or kept only for non-item batch upload scenarios as a fallback) |
| `src/components/vintography/ComparisonView.tsx` | Minor: remove hardcoded "Enhanced" badge label — should reflect the actual operation name (e.g., "Steamed", "Background Removed") |

---

## What The New Flow Looks Like Step By Step

**Scenario: Seller has 4 photos on a Nike jumper listing and wants to:**
1. Steam & Press the front photo
2. Clean background on the back photo
3. Leave label and detail shots as-is

**Old flow:**
→ Goes to Photo Studio from item
→ Sees batch strip with 4 photos, "Process All 4 Photos" button
→ Has to use the same operation for all
→ Can't selectively process
→ Processed photos get appended, not replaced

**New flow:**
→ Goes to Photo Studio from item (or from wand icon on specific photo)
→ Filmstrip shows all 4 photos at top of preview panel. Photo 1 is highlighted (Active).
→ Selects "Steam & Press" operation, hits Generate
→ ComparisonView shows before/after for photo 1
→ Clicks "Replace Original" — photo 1 in the filmstrip updates to show the steamed version
→ Clicks photo 2 in the filmstrip — it becomes Active in the ComparisonView
→ Selects "Clean Background" operation, hits Generate
→ Clicks "Replace Original" — photo 2 updates
→ Photos 3 and 4 remain untouched (no action needed)
→ "Next Steps" card shows "Your item has 4 photos — 2 enhanced" with "View Item" button

Total time to selectively process 2 of 4 photos: under 2 minutes. Previously: impossible without multiple trips back and forth.

---

## Edge Cases

- **Standalone upload (no itemId)**: PhotoFilmstrip is hidden. Only ComparisonView + single photo workflow. No change from today.
- **Single photo on item**: Filmstrip shows 1 photo + the `+` add button. Still useful as a clear "you're editing THIS photo" indicator.
- **Photo uploaded fresh from Studio (not from item)**: Goes into the existing standalone flow. The `+` button in filmstrip only appears when `itemId` is present.
- **Saving with "Replace" when photo has been chained** (e.g., background removed, then steamed): the `activePhotoUrl` tracks the URL being worked on. If the seller saves the background-removed version first, `activePhotoUrl` becomes the new URL. Applying Steam & Press then works on the clean-background version, and Replace updates the listing correctly.

