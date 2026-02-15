

# Competitor Limits, Trend Limits & Server-Side Tier Checks

## 1. Competitor Count Limits per Tier

The Competitor Tracker page currently allows unlimited competitor tracking for all users. This adds tier-based limits.

**Limits:**
- Free: 0 (entire page is gated by FeatureGate as Pro+)
- Pro: 3 competitors
- Business: 15 competitors
- Scale: 50 competitors

**Implementation:**
- In `CompetitorTracker.tsx`, read the user's tier from `useAuth()` and compute the max allowed count
- When the user clicks "Add", check `competitors.length >= maxAllowed` and show the UpgradeModal instead of the add form
- Show a usage indicator: "Tracking 2 of 3 competitors" near the header
- The "Add" button becomes disabled with tooltip text when at limit

**Server-side:** The `competitor-scan` edge function already requires auth. Add a tier check there too -- look up the user's `subscription_tier` from profiles and reject if they exceed their limit.

## 2. Free Users See Only 5 Trends

Currently, TrendRadar wraps everything in `FeatureGate feature="trend_radar_full"` which completely blocks free users behind a blur. The spec says free users should see the **top 5 trends** as a teaser.

**Implementation:**
- Remove the `FeatureGate` wrapper from TrendRadar entirely
- Instead, after filtering trends, if the user is on the free tier, slice to only the first 5 (sorted by opportunity_score descending)
- Show an inline upgrade banner after the 5th trend card: "See all X trends with a Pro plan"
- Stats bar still shows full data so free users can see there's more value behind the upgrade
- The `fetch-trends` edge function returns all trends regardless -- the limiting happens client-side for simplicity and to keep the teaser stats accurate

## 3. Server-Side Tier Checks on All Edge Functions

Currently only `price-check` and `optimize-listing` have server-side credit/tier checks. The remaining edge functions have auth (user must be logged in) but no tier validation. A technically savvy user could call these APIs directly and bypass the client-side FeatureGate.

**Approach:** Create a shared helper pattern (repeated in each function since edge functions can't share imports) that:
1. Looks up the user's `subscription_tier` from the `profiles` table
2. Compares against the required tier for that function
3. Returns a 403 with a clear error message if insufficient

**Edge functions to update (8 total):**

| Edge Function | Required Tier |
|---|---|
| `arbitrage-scan` | business |
| `niche-finder` | pro |
| `competitor-scan` | pro |
| `dead-stock-analyze` | pro |
| `clearance-radar` | business |
| `charity-briefing` | pro |
| `relist-scheduler` | pro |
| `portfolio-optimizer` | pro |

**The tier check block added to each function** (after the existing auth check):

```text
1. Fetch profile: SELECT subscription_tier FROM profiles WHERE user_id = <userId>
2. Define tier order: free=0, pro=1, business=2, scale=3
3. If user's tier level < required tier level:
   Return 403 { error: "This feature requires a <Required> plan. Upgrade to continue." }
```

Functions that already use the service role client (`arbitrage-scan`, `competitor-scan`, `clearance-radar`, `niche-finder`) will use it for the profile lookup. Functions that use raw REST calls (`dead-stock-analyze`, `relist-scheduler`, `portfolio-optimizer`) will use the same REST pattern. `charity-briefing` already has a service client.

## Technical Details

### Files Modified

| File | Change |
|---|---|
| `src/pages/CompetitorTracker.tsx` | Add tier-based competitor limit, usage counter, UpgradeModal trigger at limit |
| `src/pages/TrendRadar.tsx` | Remove FeatureGate wrapper, add client-side 5-trend limit for free users with upgrade banner |
| `supabase/functions/arbitrage-scan/index.ts` | Add tier check (business+) after auth |
| `supabase/functions/niche-finder/index.ts` | Add tier check (pro+) after auth |
| `supabase/functions/competitor-scan/index.ts` | Add tier check (pro+) + competitor count limit after auth |
| `supabase/functions/dead-stock-analyze/index.ts` | Add tier check (pro+) after auth |
| `supabase/functions/clearance-radar/index.ts` | Add tier check (business+) after auth |
| `supabase/functions/charity-briefing/index.ts` | Add tier check (pro+) after auth |
| `supabase/functions/relist-scheduler/index.ts` | Add tier check (pro+) after auth |
| `supabase/functions/portfolio-optimizer/index.ts` | Add tier check (pro+) after auth |

### Competitor Limit UX

```text
+------------------------------------------+
| Tracked Competitors (2 of 3)   [+ Add]   |
+------------------------------------------+

When at limit (3 of 3):
+------------------------------------------+
| Tracked Competitors (3 of 3)  [+ Add]    |
+------------------------------------------+
Clicking Add opens UpgradeModal:
"You've reached your competitor tracking limit (3).
 Upgrade to Business for 15 or Scale for 50."
```

### Trend Radar Free User UX

```text
[Stats bar - shows full counts]
[Category chips]

[Trend Card 1]
[Trend Card 2]
[Trend Card 3]
[Trend Card 4]
[Trend Card 5]

+------------------------------------------+
| See all 80 trends with a Pro plan        |
| [Upgrade Now]                             |
+------------------------------------------+
```

