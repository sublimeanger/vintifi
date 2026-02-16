

# Item Detail Page Cleanup

## What Changes

### 1. Remove all eBay integration code
- Delete the `EbayStatus` type (lines 99-103)
- Remove `ebay`, `ebayPublishing`, `ebayDialogOpen` state variables
- Remove the two eBay-related queries from `fetchItem` (`platform_connections` and `cross_listings`)
- Remove the eBay status determination logic (lines 244-256)
- Remove the `handlePublishToEbay` function (lines 261-285)
- Delete the entire eBay Status card in the Overview tab (lines 578-634)

### 2. Simplify tabs to 4: Overview, Price, Listing, Photos
- Remove the "Activity" tab trigger and content entirely (lines 435, 818-835)
- The Activity tab adds complexity without core value -- activity history is a "nice to have" that clutters the focused flow

### 3. Add clear CTAs connecting the pillars
- **Overview tab**: After the Workflow Progress card, add a "Quick Actions" section with 3 prominent CTA buttons:
  - "Run Price Check" (primary if no price check done yet)
  - "Improve Listing" (primary if no optimisation done yet)
  - "Photo Studio" (primary if no photos edited yet)
- **Price tab**: After price results, add a CTA: "Next: Improve Your Listing" linking to the optimiser
- **Listing tab**: After listing copy, add a CTA: "Next: Enhance Your Photos" linking to Photo Studio
- **Photos tab**: After the photo grid, add a CTA: "Next: Get Your Vinted-Ready Pack" linking to the optimiser (if not yet optimised) or showing a success state

### 4. Minor cleanup
- Remove unused imports (`ExternalLink` if only used for eBay)
- Remove the `/platforms` navigation reference in the eBay card

## Technical Details

**File modified:** `src/pages/ItemDetail.tsx`

The file goes from ~840 lines to approximately ~650 lines after removing eBay code, Activity tab, and dead state. The new CTA cards add ~40 lines, netting around ~690 lines total.

**No database or edge function changes needed** -- this is purely a frontend cleanup.

