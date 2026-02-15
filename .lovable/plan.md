

# Account Upgrade + Sitewide Plan Enforcement

## Part 1: Upgrade jamiemckaye@gmail.com

Direct database update to set your account (user_id: `88bd3c36-b270-4512-9748-2e07cdd2512d`) to:
- `profiles.subscription_tier` = `"scale"`
- `usage_credits.credits_limit` = `999999`

This matches how the admin account (laurentwilleypiano@gmail.com) is configured.

---

## Part 2: Sitewide Enforcement Audit

### Current State -- What IS enforced

| Location | Enforcement | Details |
|----------|------------|---------|
| `price-check` edge function | Server-side credit check | Blocks if `price_checks_used >= credits_limit` |
| `optimize-listing` edge function | Server-side credit check | Blocks if `optimizations_used >= 60% of credits_limit` |
| `import-vinted-wardrobe` edge function | Tier-based limits | Import limit, max pages, deep scrape limit all gated by tier |
| `PriceCheck.tsx` | Client-side credit check | Toast error if credits exhausted |
| `Dashboard.tsx` | Credit display | Shows remaining checks, low-credit warning |
| `SettingsPage.tsx` | Credit display | Shows usage bar |

### Gaps Found -- What is NOT enforced

| Feature Page | Problem |
|-------------|---------|
| **ArbitrageScanner.tsx** | No tier gate. Free users can use it freely. Spec says Business+ only. No credit check. |
| **OptimizeListing.tsx** | No client-side credit check before calling the edge function. User sees a generic error. |
| **BulkOptimize.tsx** | No tier gate. Should be Business+ per spec. No per-item credit deduction. |
| **NicheFinder.tsx** | No tier gate or credit check. |
| **CompetitorTracker.tsx** | No tier gate. Spec says Pro+ with limits (3/15/50 competitors by tier). |
| **TrendRadar.tsx** | No tier gate. Free users should see top 5 only per spec. |
| **DeadStock.tsx** | No tier gate. |
| **ClearanceRadar.tsx** | No tier gate. Should be Business+ per spec. |
| **SeasonalCalendar.tsx** | No tier gate. |
| **RelistScheduler.tsx** | No tier gate. |
| **CrossListings.tsx** | No tier gate. |
| **PortfolioOptimizer.tsx** | No tier gate. |
| **CharityBriefing.tsx** | No tier gate. |

### No Upgrade Modal Exists

There is currently **no reusable upgrade modal component** anywhere in the codebase. When users hit limits, they get a toast error with text like "Upgrade your plan for more" but no actionable path to actually upgrade. Users would need to manually navigate to Settings to find pricing.

---

## Part 3: Implementation Plan

### Step 1: Upgrade your account
Run SQL to update `profiles` and `usage_credits` for your user.

### Step 2: Create `UpgradeModal` component
A reusable modal component (`src/components/UpgradeModal.tsx`) that:
- Accepts a `feature` prop describing what triggered it (e.g., "Arbitrage Scanner requires a Business plan")
- Shows the user's current tier vs. required tier
- Displays the relevant plan cards with pricing
- Has "Upgrade Now" button that calls `create-checkout` edge function
- Has "Buy Credits" option for credit-based limits
- Closes gracefully if dismissed
- Adapts for mobile (sheet/drawer style)

### Step 3: Create `useFeatureGate` hook
A reusable hook (`src/hooks/useFeatureGate.ts`) that centralises all tier/credit checks:

```text
useFeatureGate(feature: string) => {
  allowed: boolean,
  reason: string | null,
  showUpgrade: () => void,   // opens the UpgradeModal
  creditsRemaining: number,
  tierRequired: string
}
```

Feature gate configuration:

| Feature | Min Tier | Uses Credits | Credit Type |
|---------|----------|-------------|-------------|
| price_check | free | Yes | price_checks |
| optimize_listing | pro | Yes | optimizations |
| bulk_optimize | business | Yes | optimizations |
| arbitrage_scanner | business | No | -- |
| niche_finder | pro | No | -- |
| competitor_tracker | pro | No | -- |
| trend_radar_full | pro | No | -- |
| dead_stock | pro | No | -- |
| clearance_radar | business | No | -- |
| seasonal_calendar | pro | No | -- |
| relist_scheduler | pro | No | -- |
| cross_listings | business | No | -- |
| portfolio_optimizer | pro | No | -- |
| charity_briefing | pro | No | -- |

### Step 4: Add gate checks to every feature page

Each gated page gets a simple check at the top of its main action handler. If `allowed` is false, `showUpgrade()` is called instead of proceeding. Pages also show a banner at the top for tier-locked features:

```text
"This feature requires a Pro plan. You're on Free."
[Upgrade Now] [Buy Credits]
```

Pages affected (13 pages total):
- ArbitrageScanner.tsx
- OptimizeListing.tsx
- BulkOptimize.tsx
- NicheFinder.tsx
- CompetitorTracker.tsx
- TrendRadar.tsx (limit free users to top 5 trends)
- DeadStock.tsx
- ClearanceRadar.tsx
- SeasonalCalendar.tsx
- RelistScheduler.tsx
- CrossListings.tsx
- PortfolioOptimizer.tsx
- CharityBriefing.tsx

### Step 5: Improve credit exhaustion UX

Update `PriceCheck.tsx` and `OptimizeListing.tsx` to show the UpgradeModal (not just a toast) when credits are exhausted. The modal provides a direct path to upgrade or buy credit packs.

---

## Files Created/Modified

| File | Action |
|------|--------|
| `src/components/UpgradeModal.tsx` | **New** -- Reusable upgrade/buy credits modal |
| `src/hooks/useFeatureGate.ts` | **New** -- Centralized feature gating hook |
| `src/pages/ArbitrageScanner.tsx` | Add gate check |
| `src/pages/OptimizeListing.tsx` | Add gate check + upgrade modal on credit exhaustion |
| `src/pages/BulkOptimize.tsx` | Add gate check |
| `src/pages/NicheFinder.tsx` | Add gate check |
| `src/pages/CompetitorTracker.tsx` | Add gate check |
| `src/pages/TrendRadar.tsx` | Add gate check (free = top 5 only) |
| `src/pages/DeadStock.tsx` | Add gate check |
| `src/pages/ClearanceRadar.tsx` | Add gate check |
| `src/pages/SeasonalCalendar.tsx` | Add gate check |
| `src/pages/RelistScheduler.tsx` | Add gate check |
| `src/pages/CrossListings.tsx` | Add gate check |
| `src/pages/PortfolioOptimizer.tsx` | Add gate check |
| `src/pages/CharityBriefing.tsx` | Add gate check |
| `src/pages/PriceCheck.tsx` | Replace toast with upgrade modal |
| Database migration | Upgrade jamiemckaye account |

