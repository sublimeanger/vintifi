
# Two Bug Fixes: Photo Score & Duplicate Hashtags

## Bug 1: Photo Score Showing Wrong Number

### Root Cause
The health score's `photo_score` (0–25) is generated entirely by the AI inside the `optimize-listing` edge function. The AI scores this based on the photos it actually *sees* during the optimisation call. 

The problem: the AI doesn't know how many photos you have on the listing — it can only see the photos that were passed to it at optimisation time. More importantly, the prompt doesn't tell the AI how many photos the seller currently has. So the AI is forced to **guess** the photo situation from limited context, leading to wildly wrong scores like "12 photos" when you have zero, or vice versa.

### Fix: Pass photo count explicitly to the AI

In `supabase/functions/optimize-listing/index.ts`, the prompt text (line 237) builds the item details string. We need to add one line:

```
- Number of photos: ${finalPhotoUrls.length}
```

And update the photo scoring instructions in the prompt to say:

```
photo_score: Score 0–25 based ONLY on the actual number of photos provided above (not your visual assessment):
- 0 photos: score 0 (feedback: "No photos added yet — listings with photos sell 3x faster")  
- 1 photo: score 10 (feedback: "Add 2–3 more photos showing different angles for best results")
- 2 photos: score 18 (feedback: "Good start — consider adding care label and detail shots")
- 3–4 photos: score 25 (feedback: "Great photo coverage!")
```

This makes the photo score deterministic and accurate based on what the seller actually has, not an AI hallucination.

### Also fix: The photo_score cap
The `photo_score` in the JSON schema says `<0-25>` but the AI was scoring it 0–25 scale. The `health_score.overall` shown in the UI then shows scores like `photo_score: 12` displayed as "12" which reads as "12 photos." This is actually the **score** (out of 25), not a photo count — but visually it's confusing. The fix in the prompt description removes this ambiguity.

---

## Bug 2: Duplicate Hashtags

### Root Cause
Hashtags appear in **two completely separate places** in `ItemDetail.tsx`:

1. **The Vinted-Ready Pack** (`VintedReadyPack.tsx`) — shows hashtags from the AI optimisation result, embedded within the `optimised_description` text (the AI puts hashtags at the end of the description as part of the optimised copy).

2. **"Quick Hashtags" card** (lines 688–755 in `ItemDetail.tsx`) — a separate widget that calls `generate-hashtags` edge function independently to produce 5 standalone hashtags.

These are two different systems doing the same thing. The "Quick Hashtags" widget was designed as a lightweight tool for items that haven't been fully optimised yet — but once a listing IS optimised, the hashtags are already embedded in the description, making the Quick Hashtag generator feel redundant and confusing.

### Fix: Smart conditional rendering of the Quick Hashtags card

The Quick Hashtags card should only show when the item has **not** been optimised yet (`!item.last_optimised_at`). Once optimised, hashtags are already in the description, so the widget is redundant and should hide.

In `ItemDetail.tsx`, wrap the Quick Hashtags card (lines 688–755) in a conditional:

```tsx
{/* Quick Hashtags — only shown when listing hasn't been optimised yet */}
{!item.last_optimised_at && (
  <Card className="p-2.5 sm:p-4">
    ...Quick Hashtags widget...
  </Card>
)}
```

Additionally, rename the section header from "Quick Hashtags" to something clearer when it IS shown: **"Generate Hashtags"** with a subtitle: *"Get 5 instant hashtags — or run a full optimisation for title, description & more."*

This makes the purpose crystal clear: it's a lightweight starter tool, not a replacement for the full optimisation.

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/optimize-listing/index.ts` | Add explicit photo count to AI prompt; make photo_score deterministic based on count, not AI guess |
| `src/pages/ItemDetail.tsx` | Conditionally hide Quick Hashtags card when item has already been optimised (hashtags already in description) |

No schema changes. No new edge functions. Two targeted fixes.

---

## What the Experience Looks Like After

**Photo score:** AI sees "Number of photos: 1" in the prompt and deterministically scores it 10/25 with feedback "Add more angles." No more hallucinated numbers.

**Hashtags:** 
- Not yet optimised → Quick Hashtag card visible, clearly labelled as a starter tool
- Already optimised → Quick Hashtag card hidden, hashtags are already inside the optimised description in the Listing tab and Vinted-Ready Pack. No duplication, no confusion.
