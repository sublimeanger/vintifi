

# Use Case Spotlight Component

## Overview
Add a reusable "Use Case Spotlight" component that appears as a collapsible callout at the top of each feature page. It paints a relatable real-world scenario showing exactly when and why this feature is valuable. Users can dismiss it permanently (stored in localStorage).

## New File

### `src/components/UseCaseSpotlight.tsx`
A reusable component that accepts:
- `featureKey: string` -- unique key for localStorage dismissal tracking (e.g., "price-check", "arbitrage")
- `icon: LucideIcon` -- feature-relevant icon
- `scenario: string` -- the relatable scenario title (e.g., "You just found a vintage Burberry trench at a charity shop...")
- `description: string` -- 2-3 sentence story explaining the problem
- `outcome: string` -- how this feature solves it with a concrete result
- `tip?: string` -- optional pro tip

Renders as:
- A collapsible Card with a lightbulb icon and "When to use this" header
- Collapsed by default after first visit, expanded on first visit
- Subtle gradient border (primary/5) to stand out without being loud
- "Got it, don't show again" dismiss button that sets `localStorage.setItem(\`spotlight_dismissed_\${featureKey}\`, "true")`
- Uses Collapsible from Radix (already installed) with smooth Framer Motion animation
- Compact on mobile, slightly wider on desktop

## Modified Files -- Add Spotlight to Each Feature Page

Each page gets a `<UseCaseSpotlight>` placed just below the page header, with tailored scenario content:

### `src/pages/PriceCheck.tsx`
- Scenario: "You found a pair of Dr. Martens 1460s at a car boot sale for GBP8..."
- Outcome: "Price Check reveals they sell for GBP45-55 on Vinted. You list at GBP49 and sell within 3 days."

### `src/pages/OptimizeListing.tsx`
- Scenario: "Your listing has been up for 2 weeks with zero interest..."
- Outcome: "The AI rewrites your title with high-traffic keywords and your views jump 4x overnight."

### `src/pages/BulkOptimize.tsx`
- Scenario: "You just sourced 30 items from a clearance sale and need to list them all tonight..."
- Outcome: "Upload a CSV and get 30 AI-optimised listings in under a minute. Copy-paste straight to Vinted."

### `src/pages/TrendRadar.tsx`
- Scenario: "You keep seeing Carhartt WIP jackets selling fast but you're not sure if the trend has peaked..."
- Outcome: "Trend Radar shows demand is up 280% and hasn't peaked yet. You source 5 jackets and sell them all within a week."

### `src/pages/ArbitrageScanner.tsx`
- Scenario: "You wonder if the North Face puffer on eBay for GBP25 is worth flipping..."
- Outcome: "Arbitrage Scanner shows the same jacket sells for GBP55-65 on Vinted. That's a GBP30+ profit per flip."

### `src/pages/CompetitorTracker.tsx`
- Scenario: "A rival seller keeps undercutting your Nike listings and you don't know their strategy..."
- Outcome: "Competitor Tracker reveals they drop prices every Friday. You adjust your timing and win more sales."

### `src/pages/ClearanceRadar.tsx`
- Scenario: "ASOS Outlet has a flash sale but you don't know which items actually resell well on Vinted..."
- Outcome: "Clearance Radar cross-references sale prices vs Vinted resale and highlights 8 items with 50%+ margins."

### `src/pages/NicheFinder.tsx`
- Scenario: "You want to expand beyond trainers but have no idea which category has the least competition..."
- Outcome: "Niche Finder reveals vintage homewares have 3x more demand than supply. You pivot and double your margins."

### `src/pages/CharityBriefing.tsx`
- Scenario: "You're heading to the charity shop on Saturday but always end up buying random stuff that doesn't sell..."
- Outcome: "Open your Charity Briefing on your phone: a curated list of exactly what's trending, what to pay, and what you'll sell it for."

### `src/pages/SeasonalCalendar.tsx`
- Scenario: "It's September and your summer dresses aren't shifting. You're stuck with dead stock..."
- Outcome: "The Seasonal Calendar would have told you to discount summer stock in August and start listing coats in September."

### `src/pages/DeadStock.tsx`
- Scenario: "You have 40 items that haven't sold in over a month, tying up GBP600 in capital..."
- Outcome: "Dead Stock Engine suggests a price reduction schedule, 5 bundle pairings, and 3 items to crosslist to Depop."

### `src/pages/RelistScheduler.tsx`
- Scenario: "You know relisting boosts visibility but you always forget, and when you do it's at the wrong time..."
- Outcome: "Relist Scheduler queues your stale items for optimal times: womenswear on Sunday evening, menswear on Tuesday morning."

### `src/pages/PortfolioOptimizer.tsx`
- Scenario: "You have 200 active listings and suspect many are mispriced, but checking each one takes hours..."
- Outcome: "Portfolio Optimiser scans everything in one click: 12 items overpriced, 3 underpriced, 8 need relisting. One-tap fixes."

### `src/pages/Analytics.tsx`
- Scenario: "You feel busy but aren't sure if you're actually making money after costs..."
- Outcome: "P&L Analytics shows your true margin is 34%, trainers are your best category, and vintage dresses have negative ROI."

### `src/pages/Listings.tsx`
- Scenario: "You have items scattered everywhere and can't remember what you paid for half of them..."
- Outcome: "My Listings gives you a single view of everything: purchase price, current price, days listed, and health score at a glance."

## Technical Details

### Component structure
```text
+--------------------------------------------------+
| [Lightbulb icon] When to use this    [Chevron v]  |
+--------------------------------------------------+
| [Expanded content when open]                      |
|                                                   |
| "You found a pair of Dr. Martens 1460s at a       |
|  car boot sale for GBP8..."                       |
|                                                   |
| Price Check reveals they sell for GBP45-55 on     |
| Vinted. You list at GBP49 and sell in 3 days.     |
|                                                   |
| Pro tip: Check sold items, not just active ones.  |
|                                                   |
|              [Got it, don't show again]           |
+--------------------------------------------------+
```

### State management
- First visit to any feature page: spotlight is expanded (open)
- Subsequent visits: spotlight is collapsed but still visible
- After "Got it, don't show again": spotlight is hidden entirely
- All state tracked via localStorage with keys like `spotlight_seen_price-check` and `spotlight_dismissed_price-check`

### Styling
- Light gradient background: `bg-gradient-to-r from-primary/5 to-transparent`
- Subtle left border accent: `border-l-2 border-primary/30`
- Scenario title in semibold, description in normal weight, outcome in success green
- Responsive: full width on mobile, max-w-2xl on desktop
- Uses existing Collapsible component from Radix

### No backend or database changes required
Everything is client-side with localStorage persistence.

