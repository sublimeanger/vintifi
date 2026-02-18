
# AI Description Upgrades: Defect Disclosures + Hyper-Optimised Copy

## The Core Problem: What's Missing Today

The AI currently generates descriptions with zero knowledge of item-specific defects, flaws, or special notes the seller wants to disclose. This creates two compounding failures:

**Problem 1: Trust gap with buyers**
Vinted has a strict buyer protection policy. If a garment arrives with a hole, a stain, or a pulled thread that wasn't mentioned, the buyer can claim a refund. Sellers who don't disclose defects create disputes and get bad reviews. The AI currently writes: "In very good condition — worn a handful of times and well looked after. No marks, no bobbling." If the item actually has a small stain on the sleeve, this description is actively harmful.

**Problem 2: Condition-description mismatch**
The condition selector (new/very good/good/satisfactory) is a categorical grade. But the *description* says things like "No marks, no bobbling" regardless of what condition was selected. A seller might choose "Good" because there's a small bobble on the back, but the AI writes a description that implies perfect condition.

**Problem 3: Incomplete data passed to the AI**
The `runOptimise` call in SellWizard only passes: `currentTitle`, `currentDescription`, `brand`, `category`, `size`, `condition`, `colour`, `material`. It does NOT pass any seller notes, defects, photos from the listing (just metadata), or any of the seller's free-text description where they may have mentioned flaws.

**Problem 4: The prompt's condition section is generic**
The current condition section of the prompt says:
> "Condition (1-2 sentences): Be honest and specific. Example: 'In very good condition — worn a handful of times and well looked after. No marks, no bobbling, just a solid everyday piece.'"

The example is always clean. There's no branching: if condition is "satisfactory" or the seller notes there are defects, the example has no guidance for that. The AI defaults to positive language regardless.

---

## The Complete Solution

Four interlocking changes across four areas:

1. **New `seller_notes` field** — a free-text "anything the buyer should know" box added to the wizard flow at the point of AI generation
2. **Condition-aware prompt sections** — the AI prompt branches based on condition grade, with specific defect disclosure language for "Good" and "Satisfactory" conditions
3. **Defect injection into the prompt** — seller notes are passed directly into the AI with hard constraints: if notes mention defects, they MUST appear in the description
4. **Title optimisation refinements** — currently the title formula is underexploiting category-specific search patterns on Vinted, and the description structure needs better paragraph logic

---

## What Changes and Where

### Change 1: Add `seller_notes` field to the SellWizard (Step 1 details form)

**File: `src/pages/SellWizard.tsx`**

Add `seller_notes: ""` to the `form` state object.

In `renderDetailsForm()`, add a new textarea field below the Colour section, above the price fields. Position matters: it comes after the factual attributes and before the financial data. Label: **"Anything the buyer should know?"** — this is deliberately casual and open-ended, not "Defects" (which sounds alarming and discourages honest disclosure).

The placeholder copy:
> "e.g. Small bobble on the back, faded slightly on the left shoulder, tiny mark on the inside collar — these things happen with worn items. Leave blank if none."

Below the textarea, a micro-tip in muted text:
> "Honest disclosures build trust with buyers and protect you from disputes. The AI will weave these naturally into the description."

This field saves into a new `source_meta` JSON key on the listing (`source_meta.seller_notes`) — no schema change needed since `source_meta` is already `JSONB` on the `listings` table.

Update `createItem` / `executeSave` to include `source_meta: { seller_notes: form.seller_notes }` when saving.

Update `runOptimise` to pass `seller_notes: form.seller_notes || createdItem?.source_meta?.seller_notes` to the edge function.

**File: `src/components/NewItemWizard.tsx`**

Add the same `seller_notes` field to the `WizardData` type and the details step. Same placement, same copy.

### Change 2: Add `seller_notes` field to `ListingWizard.tsx`

**File: `src/components/ListingWizard.tsx`**

The ListingWizard is the on-page sheet for existing items. Its Step 1 ("Details") needs the same disclosure field. Read existing `source_meta.seller_notes` from the listing on load. Include in the optimise call.

### Change 3: Rewire the edge function — `optimize-listing/index.ts`

**File: `supabase/functions/optimize-listing/index.ts`**

**A. Destructure `seller_notes` from body:**
```typescript
const { photoUrls, brand, category, size, condition, colour, material, currentTitle, currentDescription, vintedUrl, fetchOnly, detectColourOnly, seller_notes } = body;
```

**B. Build a `DEFECT_SECTION` string:**
```typescript
const hasDefects = seller_notes && seller_notes.trim().length > 0;
const DEFECT_SECTION = hasDefects
  ? `
SELLER DISCLOSURE (MANDATORY — MUST APPEAR IN DESCRIPTION):
The seller has reported the following about this item:
"${seller_notes.trim()}"

DEFECT RULES:
- Every item mentioned in the seller disclosure MUST appear in the description
- Do NOT soften, hide, omit, or euphemise any disclosed defect
- Write disclosures honestly and casually — like a genuine seller would
- Disclosures go in the Condition paragraph — naturally integrated, not as a list
- Example: "There's a small bobble on the back and the collar's faded slightly on one side — nothing you'd notice when wearing it, but want to be upfront."
- NEVER write "No marks" or "No flaws" or "Pristine" when defects have been disclosed
`
  : `No defects reported by seller. Write the condition section positively but honestly.`;
```

**C. Restructure the condition guidance in the prompt to branch per grade:**

Replace the current generic condition section with:

```typescript
const conditionGuidance = (() => {
  const c = (condition || "").toLowerCase().replace(/[\s-]/g, "_");
  if (c === "new_with_tags") return `CONDITION GRADE: New with tags
Write: "Brand new, never worn, tags still attached." One sentence. No elaboration needed.
${hasDefects ? "IMPORTANT: Seller has noted defects — mention these even for new items (manufacturing flaw, return item, etc.)" : ""}`;
  if (c === "new_without_tags") return `CONDITION GRADE: New without tags
Write: "Brand new condition, never worn — just doesn't have the tags."
${hasDefects ? "IMPORTANT: Seller has noted defects — include them honestly." : ""}`;
  if (c === "very_good") return `CONDITION GRADE: Very Good
Write: Worn a small number of times (think: 1-5 wears). No notable flaws. Fabric in excellent shape.
Typical language: "Really good condition — only worn a few times and always washed carefully."
${hasDefects ? "IMPORTANT: Seller has noted defects below — these MUST be disclosed honestly. Do not contradict them by writing 'no flaws'." : "Do NOT say 'no marks, no bobbling' as a generic filler — only say this if it's genuinely applicable."}`;
  if (c === "good") return `CONDITION GRADE: Good
Write: Clearly used but well looked after. May have minor signs of wear — slight fading, light pilling, small marks — but nothing structural.
Typical language: "Good condition — definitely been worn but looks after itself well. [specific minor issue if noted]"
${hasDefects ? "IMPORTANT: Defects MUST be disclosed. This is a 'Good' item — buyers expect minor issues and will appreciate honesty." : "If no specific defects noted, say something like 'shows gentle signs of wear consistent with age.'"}`;
  if (c === "satisfactory") return `CONDITION GRADE: Satisfactory
IMPORTANT: This is the lowest Vinted condition grade. Buyers choosing this grade KNOW the item has visible wear.
Write condition with full transparency. The description must be upfront — this protects the seller.
Typical language: "Satisfactory condition — shows clear signs of use. [specific issues]. Still has plenty of life in it, priced accordingly."
${hasDefects ? "CRITICAL: All disclosed defects MUST appear explicitly. Do NOT try to minimise or soften them." : "Even without specific defects noted, acknowledge the item shows wear commensurate with its condition grade."}`;
  return `CONDITION GRADE: ${condition || "Not specified"}
Be honest about condition. If defects are noted below, include them.`;
})();
```

**D. Inject into the main prompt — restructure condition section:**

Replace the current generic condition paragraph in the description instructions with:

```
${conditionGuidance}

${DEFECT_SECTION}

Condition paragraph writing rules:
- Write 2-3 sentences for the condition section
- If seller_notes are provided, integrate them naturally (not as a list)
- NEVER write "No marks, no flaws, pristine" when condition is Good or Satisfactory
- If condition is New (either type), the condition sentence can be very short
- If condition is Satisfactory, the description MUST acknowledge visible wear — this is legally and commercially the right thing to do
```

**E. Title formula improvements — what's currently underoptimised:**

The current formula: `[Brand] [Item Type] [Colour] [Size] [Condition Word]`

This is good but misses some important Vinted-specific patterns. Improvements:

1. **Gender signal in title** — Vinted buyers often search "mens Nike hoodie" not "Nike hoodie mens". The AI should add M/W/Men's/Women's after the brand when category implies gender.
2. **Condition word mapping** — the current prompt just says "end with a condition keyword" — no mapping. Add explicit mapping:
   - new_with_tags → "New Tags"
   - new_without_tags → "Brand New" 
   - very_good → "Excellent Condition" (not "Very Good" — "Excellent" converts better on search)
   - good → "Good Condition"
   - satisfactory → "Good Used" (softer framing for search but honest in description)
3. **Character budget awareness** — Vinted title limit is 80 chars (not 100 as currently stated). Update the formula.
4. **No filler words** — ban: "stunning", "perfect", "beautiful" from titles

Updated title section:
```
TITLE FORMULA (max 80 chars — Vinted's actual limit):
Pattern: [Brand] [Gender if applicable] [Item Type] [Descriptor] [Colour if provided] [Size] [Condition Signal]

CONDITION SIGNAL mapping (use these exact terms — they perform well in search):
- new_with_tags → "BNWT" (Brand New With Tags — widely searched on Vinted)
- new_without_tags → "Brand New"
- very_good → "Excellent Condition" 
- good → "Good Condition"
- satisfactory → "Good Used"

GENDER SIGNAL: Add "Mens" or "Womens" (no apostrophe — cleaner in titles) when:
- Category is clearly gendered (e.g. Womenswear, Menswear, Men's shoes)
- Brand is gender-neutral (Nike, Adidas, Carhartt, Stone Island) — always add gender
- Skip for obviously gendered brands (ASOS Women's, Zara Women) to avoid redundancy
```

**F. Description structure improvements — two specific upgrades:**

Currently the description always uses the same 5-part structure regardless of item type. Two upgrades:

1. **Measurements prompt** — for items where size matters (jeans, shoes, coats), add a placeholder instruction: "If you know measurements, include them — pit-to-pit for tops, waist/inseam for jeans, UK size for shoes." Currently this is mentioned but the AI often skips it. Add a MUST: "If the category is Jeans, Trousers, or Shoes and a size is provided, always include the size in the description naturally."

2. **Bundle nudge** — the current closing sentence sometimes says "Happy to answer any questions or bundle." This is good but generic. Improve: "If the item's price is £15 or under, add: 'Great for bundling — message me and I'll sort you a deal.' If over £15, skip the bundle nudge."

**G. Output JSON schema — add `seller_notes_disclosed` field:**

Add to the output:
```json
"seller_notes_disclosed": true/false  // confirms whether seller notes were woven in
"condition_disclosure_added": "<what was written about condition in the description>"
```

This allows the frontend to verify the AI actually included the disclosures.

---

### Change 4: Frontend display of disclosures in SellWizard Step 3

**File: `src/pages/SellWizard.tsx`**

After `optimiseResult` loads (in `renderStep3`), if `seller_notes` was provided, add a small "Disclosure check" indicator below the description preview:

```
✓ Your item notes were included in the description
```

This reassures the seller that their disclosed flaws made it into the copy — they don't have to manually read the whole description hunting for the mention.

If `seller_notes` was provided but the AI somehow failed to include the disclosure (detectable by `seller_notes_disclosed: false` in the response), show a warning:

```
⚠ We couldn't confirm your notes were included — please review the description before saving.
```

---

## Data Flow: End-to-End

```text
SellWizard Step 1
└── seller_notes field added to form
└── saved to listings.source_meta.seller_notes on createItem()

SellWizard Step 3 (Optimise)
└── runOptimise() passes seller_notes to edge function
└── Edge function builds condition-aware prompt + DEFECT_SECTION
└── AI returns description WITH disclosures integrated
└── Frontend shows disclosure confirmation badge

VintedReadyPack (Step 5)
└── Description with disclosures already embedded — seller copies as-is
```

---

## Changes Needed in `NewItemWizard.tsx` and `ListingWizard.tsx`

Both need the same `seller_notes` field. The placement in all three flows:
- After colour/material fields
- Before the price fields
- Clearly optional, with encouraging copy ("helps AI be accurate")

For `ListingWizard.tsx`: on mount, read `source_meta?.seller_notes` from the existing item and pre-fill the field. Pass it through to `runOptimise`.

---

## Files Changed Summary

| File | Change |
|---|---|
| `src/pages/SellWizard.tsx` | Add `seller_notes` to form state; add field to `renderDetailsForm()`; pass to `runOptimise()`; show disclosure badge in Step 3 |
| `src/components/NewItemWizard.tsx` | Add `seller_notes` to `WizardData`; add field to details step |
| `src/components/ListingWizard.tsx` | Add `seller_notes` to state; read from `source_meta` on mount; add field in details step; pass to optimise call |
| `supabase/functions/optimize-listing/index.ts` | Destructure `seller_notes`; build condition-aware `conditionGuidance`; build `DEFECT_SECTION`; update title formula (80 chars, condition signal map, gender signal); description structure improvements; add `seller_notes_disclosed` to output |

No database schema changes needed — `source_meta` JSONB column already exists on `listings`.

---

## Why This Matters for Listing Quality

The current AI can generate a description saying "Great condition — no marks, no bobbling" for an item the seller told us is "Good" condition because it has a small tear on the pocket. That's a problem on two levels:

1. It could lead to a Vinted dispute and a refund — costing the seller money and trust
2. Buyers who receive undisclosed flaws leave bad reviews — damaging the seller's profile

The new system makes it structurally impossible for the AI to write "no flaws" when defects have been disclosed. The seller notes become a hard constraint, not optional context. This makes descriptions both more accurate AND more trustworthy to buyers — which actually converts better. Buyers respond well to honest descriptions because they eliminate uncertainty. "There's a tiny mark on the inside collar — you'd never see it when wearing it" is a better description than "Pristine condition" because it answers the buyer's question before they ask it.

The title optimisations (80-char limit, condition signal mapping, gender signal) are straightforward fixes that will meaningfully improve search ranking within Vinted's algorithm, which weights recent and well-structured titles.
