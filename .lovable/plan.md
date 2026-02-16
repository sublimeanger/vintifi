

## Sitewide Audit: Credit-Consuming Actions — Storage and Reuse

### Current State

There are three credit-consuming features: **Price Check**, **AI Listing Optimiser**, and **Vintography**. Here's what each stores (or doesn't):

| Feature | Results Saved to DB? | Linked to Item? | Can User View Past Results? | Re-run Wastes Credit? |
|---------|---------------------|-----------------|---------------------------|----------------------|
| Price Check | Yes (`price_reports` table) | No (`listing_id` is always null in the edge function) | Only on Dashboard (last 5, summary only) | Yes -- navigating with `?url=` auto-runs a new check |
| AI Optimiser | No (only updates listing fields like `health_score`, `title`, `description`) | Partially (updates listing if `itemId` present) | No -- results are in-memory only, lost on navigation | Yes -- every optimisation is a fresh run |
| Vintography | Yes (`vintography_jobs` table) | Yes (updates listing images if `itemId` present) | Yes -- gallery of past edits shown on Vintography page | No -- gallery shows past results |

### Problems to Fix

**1. Price Check: Auto-runs on page load, wasting credits**
When you navigate to `/price-check?url=...` (e.g., from an item detail page), the `useEffect` on line 89 immediately calls `handleAnalyze()`, burning a credit. If you accidentally refresh the page, another credit gone. There's no check for an existing recent report for the same URL.

**Fix:** Before auto-running, check `price_reports` for a recent report (last 24 hours) matching the same `vinted_url` or `search_query`. If found, display that cached report instead. Show a "Re-run Analysis" button so the user can choose to spend a credit for fresh data.

**2. Price Check: Reports never linked to items**
The edge function saves reports to `price_reports` but never sets `listing_id`. The frontend sets `listing_id` nowhere either. This means the Item Detail page's query (`price_reports.eq("listing_id", id)`) always returns empty — users never see past price checks for their items.

**Fix:** Pass `itemId` to the edge function and save it as `listing_id` in the `price_reports` insert. This way past reports show up on the Item Detail page.

**3. AI Optimiser: Results not persisted, can't be reviewed**
The optimiser result (optimised title, description, health score breakdown, improvements list, style notes) exists only in component state. Navigate away and it's gone. The listing gets updated with the final title/description, but the detailed breakdown (individual scores, feedback, suggested tags) is lost.

**Fix:** Create a lightweight storage approach — save the full optimisation result as a JSON column in `item_activity` payload (which already logs `type: "optimised"`). Then on the Item Detail page, the activity feed can show a "View Report" expansion for optimisation entries, displaying the cached health score breakdown and improvements without re-running.

### Implementation Plan

**File: `supabase/functions/price-check/index.ts`**
- Accept `itemId` from the request body
- Include `listing_id: itemId || null` in the `price_reports` insert

**File: `src/pages/PriceCheck.tsx`**
- Remove the auto-run `useEffect` that immediately calls `handleAnalyze`
- Add a new `useEffect` that checks for a cached report: query `price_reports` where `vinted_url` matches and `created_at` is within the last 24 hours
- If a cached report exists, display it with a banner: "Showing your last report from [time]. Re-run to get fresh data?" with a "Re-run" button
- If no cached report, show the input form as normal (user manually clicks Analyse)
- Pass `itemId` in the edge function call body so reports get linked

**File: `src/pages/OptimizeListing.tsx`**
- When saving the optimisation result to `item_activity`, include the full result object in the payload (health score breakdown, improvements, suggested tags, style notes) instead of just `{ health_score, improvements_count }`
- This is already happening via `item_activity.insert` -- just expand the payload

**File: `src/pages/ItemDetail.tsx`**
- In the activity feed, for entries with `type: "optimised"`, add an expandable section that shows the cached health score breakdown and improvement suggestions from the payload
- Price reports will now appear automatically since `listing_id` will be set correctly

### What's Already Working Well
- **Vintography**: Properly stores all jobs in `vintography_jobs` with a browsable gallery. Users can see past edits without re-running. This is the gold standard.
- **Dashboard recent price checks**: Shows last 5 reports (but only as a summary list, not full reports)
- **Item activity logging**: All three features log activity, providing an audit trail

### Summary of Changes
1. **Price Check edge function**: Add `listing_id` to saved reports
2. **Price Check page**: Check for cached reports before auto-running; show cached results with re-run option
3. **Optimiser page**: Expand activity payload to include full result data
4. **Item Detail page**: Show past price reports (now linked) and expandable optimisation details from activity

