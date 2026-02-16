

# Vintifi Rebuild: Strip to Core, Make It World-Class

## Vision
Four pillars, one cohesive flow. Every screen exists to move an item from "I have this thing" to "Here's your Vinted-ready listing pack." Nothing else.

## The Four Pillars

```text
+──────────+      +──────────+      +──────────+      +──────────+
|  1. ADD   | ---> | 2. PRICE | ---> |3. OPTIMISE| ---> |4. EXPORT |
|  ITEM     |      |  CHECK   |      |  LISTING  |      | PACK     |
+──────────+      +──────────+      +──────────+      +──────────+
                                          |
                                    +──────────+
                                    | PHOTO    |
                                    | STUDIO   |
                                    +──────────+
                                  (standalone or
                                   part of flow)
```

## What Gets Removed

These pages/routes will be deleted entirely:

- /trends (TrendRadar)
- /arbitrage (ArbitrageScanner)
- /competitors (CompetitorTracker)
- /dead-stock (DeadStock)
- /analytics (Analytics)
- /charity-briefing (CharityBriefing)
- /bulk-optimize (BulkOptimize)
- /clearance-radar (ClearanceRadar)
- /platforms (PlatformConnections)
- /seasonal, /niche-finder, /portfolio, /relist, /cross-listings (redirects)

Associated components removed: NextActionsInbox, PipelineSnapshot, EbayStatusCard, EbayPublishDialog, JourneyBanner, GuidedTour, SellSmartProgress, FeatureUnlocks milestone system, UseCaseSpotlight, sidebar badges system.

Associated edge functions removed: arbitrage-scan, charity-briefing, clearance-radar, competitor-scan, dead-stock-analyze, fetch-trends, niche-finder, portfolio-optimizer, relist-scheduler, weekly-digest, publish-to-platform, connect-ebay, ebay-preview.

**What stays:**
- Auth, Onboarding, Landing/Marketing pages
- Dashboard (simplified)
- Listings (Items inventory)
- Item Detail
- Price Check
- Optimise Listing
- Vintography (Photo Studio)
- Settings

## Pillar 1: Add Item

**Existing:** NewItemWizard + ImportWardrobeModal -- these work reasonably well.

**Changes:**
- Keep URL import, photo upload, and manual entry methods
- Ensure photo import from Vinted URLs works reliably (already functional)
- After saving, navigate directly to the Item Detail page with a prompt to run the next step (Price Check or Optimise)

## Pillar 2: Price Check

**Existing:** PriceCheck page + price-check edge function -- functional with Apify/Firecrawl.

**Changes:**
- Keep as-is, it's one of the more solid features
- Ensure the item-linking flow works (itemId param) so results save back to the listing
- Clean up UI: remove the "Use Case Spotlight" accordion, remove the "Journey Banner"
- Results should show a clear CTA: "Next: Optimise This Listing"

## Pillar 3: Optimise Listing (World-Class Overhaul)

**Existing:** OptimizeListing page + optimize-listing edge function.

**What "world-class" means here -- the AI prompt needs serious research-backed tuning:**

- **Title formula:** Vinted's search algorithm weights the first 5 words heavily. Optimal format based on top-selling listings: `[Brand] [Item Type] [Key Detail] [Size] [Condition Keyword]`. The AI must follow this.
- **Description structure:** Research from top Vinted sellers shows a winning pattern:
  1. Opening hook (1 line -- what makes this item special)
  2. Key details (brand, size, fit guidance, measurements placeholder)
  3. Condition notes (honest, builds trust)
  4. Shipping/packaging note
  5. Hashtag block (Vinted uses hashtags in descriptions for discoverability)
- **Hashtag strategy:** The AI must generate 8-15 relevant hashtags mixing brand tags, category tags, style tags, and trending terms
- **The prompt** will be overhauled in the optimize-listing edge function with this structure baked in, not left to chance

**New: "Vinted-Ready Pack" (Pillar 4 -- built into Optimise results)**

After optimisation completes, the results page becomes the **Export Pack**:
- Optimised title with one-tap copy
- Optimised description with one-tap copy
- Hashtag block with one-tap copy
- Photo gallery (original + any Vintography edits) with "Download All" button
- Suggested price (from last price check, if available)
- A "Copy All to Clipboard" master button that copies title + description + hashtags as formatted text ready to paste into Vinted

This replaces the need for a separate "export" page -- the optimisation result IS the export pack.

## Pillar 3b: Photo Studio (Vintography -- Standalone Overhaul)

**Existing:** Vintography page + vintography edge function (342 lines of prompt engineering).

**Problems to fix:**
- 2xx error bug (fixed already)
- Too many operations shown at once -- overwhelming
- Batch processing is clunky
- No clear "done" state

**Redesign:**
- **Simplified operation list:** Reduce to 4 core operations visible by default:
  1. Clean Background (white/solid -- the most-used operation)
  2. Lifestyle Background (scene placement)
  3. Virtual Model (garment on model)
  4. Enhance (lighting/clarity fix)
- Advanced operations (ghost mannequin, flat-lay, mannequin) hidden behind "More options"
- **Better processing state:** Show a shimmer/skeleton of the expected result while processing, not just a spinner
- **Clear "Save to Item" flow:** When accessed from an item, show a sticky footer: "Save to [Item Name] and go back"
- **Standalone mode:** When accessed directly (no itemId), show a simple upload-and-process flow with download button. No item linking needed.
- **Gallery:** Keep the "Previous Edits" gallery but make it cleaner -- just thumbnails in a grid

## Simplified Dashboard

The Dashboard becomes a simple command centre with just:
- Welcome message
- Quick Price Check input bar (keep this -- it's the hook)
- 2 metric cards: Active Items count, Items needing attention (no optimisation/no photos)
- Recent items list (last 5 items added/edited) with quick links to their detail pages
- No pipeline, no eBay card, no trends, no next actions inbox

## Simplified Navigation

Desktop sidebar becomes:
- Dashboard (home)
- Items (inventory)
- Price Check
- Optimise
- Photo Studio
- Settings

Mobile bottom nav: Dashboard, Items, Photo Studio, Settings (4 tabs max)

## Technical Plan (Implementation Order)

### Step 1: Remove dead pages and routes
Delete ~15 page files, their edge functions, remove routes from App.tsx, clean up navigation in AppShellV2.

### Step 2: Simplify Dashboard
Strip Dashboard.tsx to: welcome, price check bar, 2 metrics, recent items.

### Step 3: Overhaul Optimise Listing
- Rewrite the AI prompt in optimize-listing edge function with the researched Vinted-selling formula
- Redesign the results UI as the "Vinted-Ready Pack" with copy-all and download-all
- Add hashtag generation to the AI output schema

### Step 4: Overhaul Photo Studio
- Simplify the operations UI
- Improve processing states
- Clean up standalone vs item-linked modes
- Fix any remaining edge function issues

### Step 5: Clean up Item Detail
- Remove eBay integration UI
- Simplify to: Overview, Price, Listing, Photos tabs
- Ensure the flow between Price Check, Optimise, and Photos is smooth with clear CTAs

### Step 6: Polish navigation and mobile UX
- Update AppShellV2 with the simplified nav
- Update MobileBottomNav
- Ensure all remaining pages are polished and cohesive

This is a significant amount of work but the result will be a focused, cohesive product that does 4 things brilliantly instead of 15 things poorly.

