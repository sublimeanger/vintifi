

## Redesign: Post-Optimisation Flow

### The Problem

After clicking "Optimise Listing", the results page dumps everything into a long vertical scroll. The "Enhance Photos" next step is buried at the very bottom, past 6+ cards of content. On mobile this is even worse — users have to scroll through health score, title, description, tags, metadata, improvements, translations, and action buttons before seeing what to do next.

Additionally, the Journey Banner doesn't pass the `itemId` to Vintography or Price Check, which breaks the item-centric model and means photo edits won't be saved back to the listing.

### The Fix

Restructure the results panel into three clear zones with the next-step CTA moved to the **top**, not the bottom.

**Zone 1 — Success Header + Next Steps (top of results)**
- Compact success banner with the health score shown inline (not a full card)
- Immediately below: the "What's Next?" action row — prominent buttons for "Enhance Photos" and "Back to Item" (or "Price Check" if no itemId)
- This ensures the user always sees their next action without scrolling

**Zone 2 — Optimised Content (middle, collapsible)**
- Title card with copy button
- Description card with copy button
- Tags as inline badges
- These are the cards users actually interact with (copy-paste to Vinted)

**Zone 3 — Details (bottom, collapsed by default)**
- Detected metadata, improvements made, style notes
- Multi-language translation section
- These are secondary and don't need to be seen immediately

### Technical Changes

**File: `src/pages/OptimizeListing.tsx`**

1. Move the JourneyBanner from line ~742 to immediately after the Health Score card (line ~502), and pass `itemId` in the Vintography and Price Check paths
2. Merge the Health Score card with a success header — make it a compact horizontal layout (score gauge on left, "Listing optimised!" text + next-step buttons on right) instead of a full-width centered card
3. Move the "Back to Item" / "Save to Listings" action buttons from line ~714 up into the success header zone
4. Wrap the Improvements, Detected Metadata, and Translation cards in a collapsible section (using the existing Collapsible component) labeled "More Details" — collapsed by default
5. Auto-scroll to the results panel after optimisation completes

**Specific path fixes for the JourneyBanner:**
- Vintography link: `/vintography?itemId=${itemId}` (currently just `/vintography`)
- Price Check link: `/price-check?itemId=${itemId}&brand=...&category=...` (currently missing itemId)

### Result

```text
BEFORE (scroll order):
  Health Score (full card)
  Title (card)
  Description (card)
  Tags (card)
  Detected Metadata (card)
  Improvements (card)
  Translation (card)
  Action Buttons
  Journey Banner  <-- "Enhance Photos" buried here

AFTER (scroll order):
  Success Header (compact: score + "Back to Item" + "Enhance Photos")
  Title (card with copy)
  Description (card with copy)
  Tags (inline)
  "More Details" (collapsed: metadata, improvements, style, translations)
```

### What This Fixes
- Next steps are visible immediately after optimisation, no scrolling needed
- "Enhance Photos" links correctly to Vintography with the itemId preserved
- The flow feels guided: Optimise --> see score + next step --> copy content --> done
- Secondary information doesn't clutter the primary workflow
- Mobile experience is dramatically improved — key actions are above the fold

