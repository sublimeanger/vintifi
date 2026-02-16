# Vintifi Platform Audit — Comprehensive Documentation

**Version:** 1.0 · **Date:** 16 February 2026 · **Classification:** For Consultant Review

---

## 1. Executive Summary

**Vintifi** (formerly VintEdge) is an AI-powered intelligence platform for Vinted sellers. It provides real-time market data, AI-generated optimised listings, predictive trend intelligence, professional photo editing, and automated workflow management.

**Current State:** The platform is functionally complete with 17+ features, full Stripe billing, Supabase auth/database, and real AI integrations (Gemini, Firecrawl, Apify). However, user flows are fragmented, the dashboard duplicates sidebar navigation, and a misleading progress bar creates confusion.

**Core Problem for Consultants:** The platform has excellent individual features but lacks cohesive workflows. Users can easily discover and use individual tools but have no clear lifecycle path for items (source → price → list → optimise photos → manage → sell). The dashboard serves as a feature directory rather than an actionable command centre.

---

## 2. Brand & Design System

| Element | Value |
|---|---|
| **Product Name** | Vintifi |
| **Body Font** | System sans-serif (Tailwind default) |
| **Heading Font** | `font-display` (Plus Jakarta Sans via Tailwind config) |
| **Primary Colour** | `hsl(350, 75%, 55%)` — Coral Red |
| **Secondary Colour** | `hsl(233, 47%, 10%)` — Deep Navy |
| **Success Colour** | `hsl(152, 69%, 41%)` — Green |
| **Accent/Warning** | `hsl(37, 91%, 55%)` — Amber/Gold |
| **Destructive** | `hsl(0, 84%, 60%)` — Red |
| **Background** | `hsl(220, 20%, 97%)` — Near White |
| **Card Style** | White, subtle border, `0.75rem` radius |
| **Icon Library** | Lucide React |
| **Chart Library** | Recharts |
| **Animation** | Framer Motion |
| **Spacing System** | Tailwind 4px base (1, 2, 3, 4, 5, 6, 8...) |
| **Border Radius** | `--radius: 0.75rem` (12px) |

### CSS Custom Properties

The design system uses HSL-based CSS custom properties in `src/index.css` with full light/dark mode support. All component styling references semantic tokens (`bg-primary`, `text-muted-foreground`, etc.) rather than raw colour values.

Sidebar uses its own colour namespace: `--sidebar-background`, `--sidebar-foreground`, `--sidebar-accent`, etc.

### Utility Classes

- `.text-gradient` — gradient text from primary to accent
- `.glass` — frosted glass effect (`backdrop-blur-xl`)
- `.gradient-border` — animated gradient border (primary → accent → success)
- `.float-animation` — subtle floating animation for decorative elements
- `.scrollbar-hide` — hides scrollbar while maintaining scroll

---

## 3. Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | React 18 + TypeScript | Built with Lovable, Vite bundler |
| **Styling** | Tailwind CSS + shadcn/ui | Custom design tokens, 50+ UI components |
| **State** | React Context + TanStack Query | Auth context, per-component state |
| **Routing** | React Router v6 | ~20 routes, protected + onboarding guards |
| **Backend** | Supabase (PostgreSQL) | Lovable Cloud hosted, 16 tables |
| **Auth** | Supabase Auth | Magic link + Google OAuth |
| **Edge Functions** | 24 Supabase Edge Functions | Deno runtime, deployed automatically |
| **AI Engine** | Gemini (via Lovable AI Gateway) | Gemini Flash (text) + Gemini Pro (vision) |
| **Web Scraping** | Firecrawl API | Real-time Vinted listing scraping |
| **Market Data** | Apify | Scheduled bulk data collection (trends) |
| **Payments** | Stripe | 4 subscription tiers + credit packs |
| **Animation** | Framer Motion | Page transitions, micro-interactions |
| **Charts** | Recharts | P&L analytics, price distributions |

---

## 4. Complete Feature Inventory

### 4.1 Core Features

| Feature | Route | Description | Min Tier | Credits | File (lines) |
|---|---|---|---|---|---|
| **Price Intelligence** | `/price-check` | Paste Vinted URL or enter item details → AI pricing report with comparable items, confidence score, reseller guide, demand level, sell speed | Free | 1 per check | `PriceCheck.tsx` (617) |
| **AI Listing Optimiser** | `/optimize` | Upload photos or import from Vinted URL → AI generates optimised title, description, tags, health score. Includes multi-language translation (FR, DE, NL, ES) | Pro | 1 per optimisation | `OptimizeListing.tsx` (649) |
| **My Listings** | `/listings` | Full inventory management: add/edit/delete listings, inline editing, bulk delete, CSV import, health score badges, status filters, P&L summary, publish to platforms | Free | — | `Listings.tsx` (1069) |
| **Dashboard** | `/dashboard` | Metric cards, price check CTA, attention cards, trending strip, personalised suggestions, recent checks, 12 quick-action cards | Free | — | `Dashboard.tsx` (546) |

### 4.2 Intelligence Features

| Feature | Route | Description | Min Tier | File (lines) |
|---|---|---|---|---|
| **Trend Radar** | `/trends` | 3 tabs: Trending (real Apify data, category filters, rising/peaking/declining), Seasonal Calendar (demand heatmap by month × category), Niche Finder (AI-powered niche opportunity scanner) | Free (5 trends) / Pro (full) | `TrendRadar.tsx` (399) |
| **Arbitrage Scanner** | `/arbitrage` | Cross-platform price gap detection (eBay, Depop, Facebook). Saved searches, deal scores, risk levels. Expandable cards with AI notes | Business | `ArbitrageScanner.tsx` (801) |
| **Competitor Tracker** | `/competitors` | Monitor rival sellers: add by username/search query, scan pricing, track alerts. Tier limits: 3/15/50 | Pro | `CompetitorTracker.tsx` (477) |
| **Charity Briefing** | `/charity-briefing` | AI-generated sourcing list: what brands/items to look for at charity shops, with buy/sell prices and demand signals | Pro | `CharityBriefing.tsx` (282) |
| **Clearance Radar** | `/clearance-radar` | Monitor retail clearance pages for profitable resale opportunities | Business | `ClearanceRadar.tsx` |

### 4.3 Inventory Management Features

| Feature | Route | Description | Min Tier | File (lines) |
|---|---|---|---|---|
| **Inventory Health** | `/dead-stock` | AI analyses stale listings (30+ days) and recommends: price reduction, bundle, crosslist, relist, or dispose. Batch "Apply All" for price corrections | Pro | `DeadStock.tsx` (416) |
| **Relist Scheduler** | `/relist` | Queue and schedule relists with price adjustments. "Auto-Relist All Stale" button for 30+ day items | Pro | `RelistScheduler.tsx` |
| **P&L Analytics** | `/analytics` | Revenue trends (area chart), category margins (pie chart), inventory velocity, ROI. Time period filters | Free | `Analytics.tsx` (440) |

### 4.4 Studio

| Feature | Route | Description | Min Tier | File (lines) |
|---|---|---|---|---|
| **Vintography** | `/vintography` | AI photo studio: 7 operations (Remove BG, Smart BG, Virtual Model, Mannequin, Ghost Mannequin, Flat-Lay, Enhance). Batch processing (up to 10), Quick Presets, comparison view, previous edits gallery. Model picker (6 looks, 6 poses), background picker (12 scenes), flat-lay picker | Free | `Vintography.tsx` (507) |

### 4.5 Cross-Platform

| Feature | Route | Description | Min Tier | File (lines) |
|---|---|---|---|---|
| **Cross-Listings** | `/cross-listings` | Publish listings to eBay, Depop, Facebook Marketplace. Status tracking, sync logs | Business | `CrossListings.tsx` |
| **Platform Connections** | `/platforms` | Connect external platform accounts (eBay, Vinted Pro) | Business | `PlatformConnections.tsx` |

### 4.6 Batch Operations

| Feature | Route | Description | Min Tier | File (lines) |
|---|---|---|---|---|
| **Bulk Optimise** | `/bulk-optimize` | Optimise multiple listings at once via CSV or selection | Business | `BulkOptimize.tsx` |

### 4.7 Marketing / Public Site

| Feature | Route | Description |
|---|---|---|
| **Landing Page** | `/` | Hero, features grid, pricing table, CTA |
| **Features Page** | `/features` | Detailed feature showcase |
| **Pricing Page** | `/pricing` | Full comparison table, FAQs, annual toggle |
| **How It Works** | `/how-it-works` | Step-by-step explainer |
| **About** | `/about` | Company/product info |

### 4.8 Auth & Onboarding

| Feature | Route | Description |
|---|---|---|
| **Auth** | `/auth` | Magic link + Google OAuth. Signup/login toggle |
| **Onboarding** | `/onboarding` | 4-step wizard: selling categories → listing count → primary goal → timezone |
| **Welcome** | `/welcome` | First-value screen: price check a Vinted URL or existing item. Links to trends + dashboard |

---

## 5. Navigation Architecture

### 5.1 Desktop Sidebar (6 sections, 17 items)

```
Core
  ├── Dashboard          /dashboard
  ├── Price Check        /price-check
  ├── Optimise           /optimize
  └── My Listings        /listings

Studio
  └── Vintography        /vintography

Intelligence
  ├── Trends             /trends
  ├── Arbitrage          /arbitrage
  ├── Competitors        /competitors
  ├── Charity Briefing   /charity-briefing
  └── Clearance Radar    /clearance-radar

Inventory
  ├── Inventory Health   /dead-stock
  ├── Relist Scheduler   /relist
  └── P&L Analytics      /analytics

Cross-Platform
  ├── Cross-Listings     /cross-listings
  └── Connections        /platforms

Account
  └── Settings           /settings
```

The sidebar also shows:
- **Credits counter** at top (amber warning when ≤2 remaining)
- **User avatar + plan name** at bottom
- **Sign out** button at bottom

### 5.2 Mobile Bottom Nav (5 items)

```
Home (/dashboard) | Price (/price-check) | Listings (/listings) | Trends (/trends) | Settings (/settings)
```

Uses `framer-motion` `layoutId` for animated active pill.

### 5.3 Mobile Hamburger Menu

Left-side sheet that mirrors the full desktop sidebar with all 6 sections and 17 items.

### 5.4 Dashboard Quick-Action Cards (12 cards, 3 rows)

**Intelligence Tools (4 cards):**
Price Check, Optimise Listing, Vintography, Trend Radar

**Market Analysis (4 cards):**
Arbitrage Scanner, Competitor Tracker, Charity Briefing, Clearance Radar

**Inventory Management (4 cards):**
My Listings, Inventory Health, Relist Scheduler, P&L Analytics

**⚠️ ISSUE: These 12 cards duplicate the sidebar navigation exactly.** The dashboard effectively becomes a feature directory page rather than an actionable command centre.

### 5.5 Sidebar Badges (Real-time counts)

Badges appear next to sidebar items when action is needed:

| Badge | Route | Logic |
|---|---|---|
| Stale listings count | `/dead-stock` | Active listings created 30+ days ago |
| Needs attention count | `/listings` | Watchlist items + items missing description AND health score |
| Pending relists | `/relist` | Relist schedules with status = "pending" |

These same badge counts also appear on Dashboard quick-action cards (amber number badges).

---

## 6. User Flow Maps

### Flow 1: New User Signup → First Value

```
Landing (/) → Auth (/auth) → Onboarding (4 steps) → Welcome (/welcome) → Price Check (/price-check)
                                                         ↓ or
                                                     Dashboard (/dashboard)
```

**Issues:**
- Welcome page is a good "first value" hook but has no clear path AFTER the first price check
- After a price check, user lands on the results page with no clear "what's next"
- No prompt to add the checked item to their inventory

### Flow 2: "Sell Smart" Lifecycle (BROKEN)

The `SellSmartProgress` component appears on 4 pages: Price Check, Optimise, Vintography, and Listings.

```
Price → Optimise → Photos → Inventory
  ✓       ✓         ✓        (current)
```

**⚠️ CRITICAL BUG:** The progress uses **positional logic**, not completion data. If you navigate directly to `/listings`, steps 1-3 (Price, Optimise, Photos) all show green ticks — implying you completed them when you haven't. The `currentIndex` is based on which page you're on, and all steps with index < currentIndex get ticks.

**Code:** `SellSmartProgress.tsx` line 32: `const isCompleted = i < currentIndex;`

### Flow 3: Price Check → Action

```
Dashboard URL input → Price Check page → AI analysis → Results displayed
                                                           ↓
                                              JourneyBanner suggests:
                                              "Optimise this listing" → /optimize
                                              "Add to inventory" → /listings
```

**Issues:**
- Price check results don't auto-save to the listings table (they save to price_reports but not listings)
- The "Add to inventory" CTA creates a new listing rather than linking to an existing one
- No clear way to re-check a price for an item already in inventory from the results page

### Flow 4: Listing Optimiser → Action

```
Manual input or Vinted URL → AI optimisation → Split-screen results
                                                    ↓
                                           "Save as Listing" → Creates NEW listing
                                           "Translate" → Multi-language versions
```

**Issues:**
- "Save as Listing" always creates a NEW listing — it doesn't update an existing one
- If user came from an existing listing, they now have a duplicate
- No way to "apply optimisation" to an existing listing in-place

### Flow 5: Inventory Health → Relist

```
/dead-stock → AI analyses stale items → Recommends actions per item
                                            ↓
                                    "Relist" button → Creates entry in relist_schedules table
                                    "Bundle" → Suggestion only (no automation)
                                    "Reduce Price" → Shows schedule (no auto-apply)
```

**Notes:** The "Apply All" button batch-updates prices in the listings table. "Relist" creates a pending relist schedule. The connection between Inventory Health and Relist Scheduler is functional.

### Flow 6: Trend → Sourcing

```
/trends → View rising brands → Click trend card → Navigates to Price Check with brand/category pre-filled
```

**Notes:** This flow works well. Trend cards navigate to price check with query params. The Charity Briefing offers a parallel sourcing flow.

### Flow 7: Charity Briefing → Sourcing

```
/charity-briefing → Generate AI briefing → List of items to look for
                                              ↓
                                     "Price Check" button → /price-check with brand pre-filled
                                     "Save to Watchlist" → Adds to listings with status=watchlist
```

**Notes:** This flow is well-designed for mobile use (quick reference while browsing shops).

---

## 7. Page-by-Page Specification

### Dashboard (`/dashboard`) — 546 lines

**Layout:** Full-width with sidebar (desktop) or bottom nav (mobile). No PageShell wrapper — the Dashboard manages its own layout including the sidebar.

**Content (top to bottom):**
1. Welcome greeting + subtitle
2. Metric cards row (4 cards): Active Listings, Portfolio Value, Sold This Week, Monthly Profit
3. Price Check CTA bar (gradient border, prominent input + Analyse button)
4. `DashboardIntelligence` component: Attention Needed cards (stale, pending relists, sourcing list, inventory health) + Trending Now horizontal scroll strip
5. `DashboardForYou` component: Personalised suggestions based on profile (goal, categories, usage)
6. Recent Price Checks list (last 5, clickable to re-run)
7. Quick Actions: 3 sections × 4 cards = 12 feature cards (see Navigation section)

**Components used:** Card, Badge, Button, Input, Sheet, MobileBottomNav, GuidedTour, DashboardIntelligence, DashboardForYou, useSidebarBadges, useFeatureUnlocks

### Price Check (`/price-check`) — 617 lines

**Layout:** PageShell wrapper with back button to `/dashboard`.

**Content (top to bottom):**
1. `SellSmartProgress` (step: "price-check") — **MISLEADING**
2. `UseCaseSpotlight` (collapsible scenario)
3. Input card: URL mode (paste Vinted URL) or Manual mode (brand + category + condition)
4. Loading state: `PriceReportSkeleton`
5. Results (when available):
   - Hero price card (recommended price, market range, net profit estimate)
   - Reseller Guide (Good Buy / Max Buy / Resale prices)
   - Stats row (Confidence, Comparables, Demand, Sell Speed)
   - Condition Price Breakdown table
   - Profit Calculator (enter your cost → shows profit)
   - Price Distribution bar chart (Recharts)
   - Comparable Items table (title, price, sold/active, days listed, condition)
   - AI Insights card
   - `JourneyBanner` (next steps: Optimise → Vintography → Inventory)
6. `UpgradeModal` (triggered when credits exhausted)

### Listing Optimiser (`/optimize`) — 649 lines

**Layout:** PageShell wrapper. Split-screen when results are present.

**Content (top to bottom):**
1. `FeatureGate` wrapper (requires Pro tier)
2. `SellSmartProgress` (step: "optimise") — **MISLEADING**
3. `UseCaseSpotlight`
4. Left panel: Vinted URL import, photo upload (4 max), item details form (title, description, brand, category, size, condition)
5. Right panel (when results available): Optimised title + description (with copy buttons), suggested tags, health score gauge, improvement list, style notes
6. Translation section: Tabs for FR/DE/NL/ES with copy buttons
7. Action buttons: "Save as Listing" (creates NEW), "Translate" (triggers AI translation)
8. `JourneyBanner` (next steps: Vintography → Inventory)

### Listings / My Listings (`/listings`) — 1069 lines

**Layout:** PageShell wrapper with header actions (Import, Bulk, Add).

**Content (top to bottom):**
1. `SellSmartProgress` (step: "inventory") — **MISLEADING** (shows all previous steps as "complete")
2. `UseCaseSpotlight`
3. Stats bar: Total items, Active, Total Value, Avg Health, Sold, Dead Stock
4. Listing limit indicator (progress bar showing X/Y used, tier-based limits)
5. Search + filter bar: text search, status filter dropdown, "Select All" checkbox
6. Bulk actions bar (when items selected): Delete selected
7. Listing cards: Each card shows image, title, brand, price, health score mini-gauge, status badge, days listed, views, favourites, profit indicator. Expandable to show full details with inline editing (purchase price, sale price, status). Action menu: Price Check, Optimise, Vintography, Relist, Publish, Delete
8. "Needs Optimising" filter chip and badge (items with no description AND no health score)
9. Dead stock alert card (items listed 30+ days)
10. P&L summary row (Total Purchase Cost, Total Revenue, Total Profit)
11. Empty state with CTA to add first listing

**Components used:** PageShell, MobileBottomNav, SellSmartProgress, UseCaseSpotlight, ImportWardrobeModal, UpgradeModal, PublishModal, HealthScoreMini, DropdownMenu, Dialog

### Trend Radar (`/trends`) — 399 lines

**Layout:** PageShell wrapper.

**Content:** 3 tabs:
1. **Trending tab:** Stats bar (rising/peaking/declining counts, avg opportunity score), category filter chips, trend card grid. Free tier sees 5 trends max + upgrade banner. Trend cards show: brand/item, category, direction, 7d/30d volume change, opportunity score, avg price, AI summary
2. **Seasonal tab:** Month navigator (prev/next), demand heatmap grid (8 categories × current month), peak/low indicators, category-specific tips
3. **Niches tab:** Category multi-select, "Scan for Niches" button, niche cards showing: niche name, demand/supply bars, opportunity score, avg price, monthly sales estimate, competition count, sourcing tips, AI reasoning

### Vintography (`/vintography`) — 507 lines

**Layout:** PageShell wrapper.

**Content (top to bottom):**
1. `SellSmartProgress` (step: "photos") — **MISLEADING**
2. Credit bar (used/limit with colour coding)
3. Quick Presets strip (e.g., "Marketplace Ready" chains multiple operations)
4. Photo upload area (drag & drop or click)
5. Operation selector (7 operations with tier labels)
6. Sub-pickers based on operation: ModelPicker, BackgroundPicker, FlatLayPicker
7. Batch strip (multi-photo processing queue)
8. Comparison view (before/after slider)
9. Previous edits gallery

### Arbitrage Scanner (`/arbitrage`) — 801 lines

**Layout:** PageShell wrapper.

**Content:** Input form (brand, category, platform, min margin slider), saved searches, scan results as expandable cards (source price, Vinted estimate, profit, deal score, risk level, AI notes, suggested listing title), history tab.

### Other Feature Pages

All remaining feature pages follow the same pattern:
- `PageShell` wrapper (header with back button, title, subtitle)
- `FeatureGate` wrapper for tier-gated features
- `UseCaseSpotlight` for educational onboarding
- `MobileBottomNav` for mobile
- Feature-specific content

---

## 8. Component Architecture

### Layout Components

| Component | File | Purpose |
|---|---|---|
| `PageShell` | `PageShell.tsx` (58 lines) | Standard page wrapper: sticky header with back button, title, subtitle, actions slot, max-width container. Used by ALL feature pages except Dashboard |
| `MobileBottomNav` | `MobileBottomNav.tsx` (54 lines) | Fixed bottom nav for mobile: 5 tabs (Home, Price, Listings, Trends, Settings). Animated active pill |
| `MarketingLayout` | `MarketingLayout.tsx` | Wrapper for public/marketing pages: header nav, footer. Not used for authenticated pages |
| `ScrollToTop` | `ScrollToTop.tsx` | Scrolls to top on route change |

### Flow & Engagement Components

| Component | File | Purpose |
|---|---|---|
| `SellSmartProgress` | `SellSmartProgress.tsx` (69 lines) | **⚠️ BROKEN** 4-step progress bar (Price → Optimise → Photos → Inventory). Uses positional logic, not real completion data. Shows misleading ticks |
| `JourneyBanner` | `JourneyBanner.tsx` (67 lines) | Post-action CTA card with step dots showing current position in a workflow. Links to next logical action. Used at bottom of Price Check and Optimiser results |
| `GuidedTour` | `GuidedTour.tsx` (185 lines) | Desktop-only 4-step onboarding tour targeting DOM elements by ID. Highlights: Price Check CTA, Listings, Trends, Arbitrage. Persisted in DB + localStorage |
| `DashboardIntelligence` | `DashboardIntelligence.tsx` (246 lines) | Two sections: "Attention Needed" cards (stale listings, pending relists, sourcing list, inventory health) + "Trending Now" horizontal scroll strip |
| `DashboardForYou` | `DashboardForYou.tsx` (159 lines) | Personalised suggestions based on user profile (goal, categories, usage). Up to 3 cards linking to relevant features |
| `UseCaseSpotlight` | `UseCaseSpotlight.tsx` | Collapsible "Problem → Solution" education card. 15+ feature pages have unique scenarios. Dismissed via "Got it" (persisted in localStorage) |

### Gating & Monetisation Components

| Component | File | Purpose |
|---|---|---|
| `FeatureGate` | `FeatureGate.tsx` | Wraps feature content. If user's tier is below minimum, shows blurred content with "Upgrade to Unlock" overlay |
| `UpgradeModal` | `UpgradeModal.tsx` | Modal triggered when feature/credits are blocked. Shows tier comparison and upgrade CTAs |
| `useFeatureGate` | `useFeatureGate.ts` (102 lines) | Hook: checks subscription tier + credit usage, returns `allowed`, `reason`, `creditsRemaining`, `showUpgrade()` |
| `useFeatureUnlocks` | `useFeatureUnlocks.ts` (60 lines) | Progressive unlock system: toast notifications when milestones are reached (5 price checks → unlock Arbitrage, etc.) |

### Data Display Components

| Component | File | Purpose |
|---|---|---|
| `HealthScoreGauge` | `HealthScoreGauge.tsx` | Circular/ring gauge showing 0-100 health score with colour coding |
| `TrendCard` | `trends/TrendCard.tsx` | Individual trend card: brand, category, direction arrow, volume change, opportunity score |
| `TrendStats` | `trends/TrendStats.tsx` | Summary stats bar: rising/peaking/declining counts |
| `CreditBar` | `vintography/CreditBar.tsx` (26 lines) | Progress bar showing credits used/limit with colour warnings |
| `LoadingSkeletons` | `LoadingSkeletons.tsx` | Shimmer loading states for: listing cards, price reports, trend cards, arbitrage cards, competitor cards, KPIs, charts |

### Vintography Sub-Components

| Component | Purpose |
|---|---|
| `ComparisonView` | Before/after image slider |
| `GalleryCard` | Previous edit history card |
| `QuickPresets` | Preset operation chains (e.g., "Marketplace Ready") |
| `BatchStrip` | Multi-photo processing queue |
| `ModelPicker` | 6 model looks × 6 poses selector |
| `BackgroundPicker` | 12 background scene selector |
| `FlatLayPicker` | Flat-lay style selector |

---

## 9. Engagement & Gamification Systems

### 9.1 Feature Unlock Milestones

| Milestone Key | Trigger | Threshold | Message |
|---|---|---|---|
| `unlock_arbitrage` | Price checks count | 5 | "🎉 You've unlocked the Arbitrage Scanner!" |
| `unlock_deadstock` | Listings count | 10 | "📦 Dead Stock Liquidation unlocked!" |
| `unlock_portfolio` | Listings count | 15 | "📊 Inventory Health unlocked!" |
| `unlock_competitor` | Price checks count | 10 | "🔍 Competitor Tracker unlocked!" |

Stored in `profiles.milestones_shown` (string array). Only one unlock shown per session.

### 9.2 Sidebar Badges

Real-time counts fetched on mount via `useSidebarBadges` hook:
- `/dead-stock`: Active listings created 30+ days ago
- `/listings`: Watchlist items + items needing optimisation (no description AND no health score)
- `/relist`: Pending relist schedules

### 9.3 Dashboard Attention Cards

`DashboardIntelligence` shows up to 4 attention cards:
- Stale Listings (red) — links to `/dead-stock`
- Pending Relists (amber) — links to `/relist`
- Sourcing List (primary) — links to `/listings?status=watchlist`
- Inventory Health (green) — always shown, links to `/dead-stock`

### 9.4 Guided Tour

4-step desktop-only tour targeting DOM elements:
1. Price Check CTA (`#tour-price-check`)
2. My Listings (`#tour-listings`)
3. Trend Radar (`#tour-trends`)
4. Arbitrage Scanner (`#tour-arbitrage`)

Persisted in `profiles.tour_completed` + localStorage.

### 9.5 UseCaseSpotlight

Collapsible education cards on 15+ feature pages. Each has unique:
- `featureKey` (localStorage persistence)
- `scenario` (relatable problem)
- `description` (pain point)
- `outcome` (result of using the feature)
- `tip` (actionable advice)

---

## 10. Monetisation & Tier Gating

### 10.1 Subscription Tiers

| Tier | Monthly Price | Annual Price | Credits/month |
|---|---|---|---|
| **Free** | £0 | — | 5 |
| **Pro** | £14.99 | £11.99/mo (£143.88/yr) | 25 |
| **Business** | £34.99 | £27.99/mo (£335.88/yr) | 100 |
| **Scale** | £74.99 | £59.99/mo (£719.88/yr) | 999 (Unlimited) |

All paid plans include a 7-day free trial.

### 10.2 Credit Packs (One-time Purchase)

| Pack | Price | Price ID |
|---|---|---|
| 10 Credits | £2.99 | `price_1T0t9m...` |
| 25 Credits (Popular) | £5.99 | `price_1T0t9n...` |
| 50 Credits | £9.99 | `price_1T0t9o...` |

### 10.3 Feature Gating Rules

| Feature | Free | Pro | Business | Scale |
|---|---|---|---|---|
| Price Check | ✓ (5/mo) | ✓ (25/mo) | ✓ (100/mo) | ✓ (Unlimited) |
| Listing Optimiser | — | ✓ | ✓ | ✓ |
| Bulk Optimiser | — | — | ✓ | ✓ |
| Vintography | ✓ | ✓ | ✓ | ✓ |
| Trend Radar | Top 5 only | Full | Full + Personalised | Full + API |
| Arbitrage Scanner | — | — | ✓ | ✓ |
| Niche Finder | — | ✓ | ✓ | ✓ |
| Competitor Tracker | — | ✓ (3 max) | ✓ (15 max) | ✓ (50 max) |
| Inventory Health | — | ✓ | ✓ | ✓ |
| Clearance Radar | — | — | ✓ | ✓ |
| Seasonal Calendar | — | ✓ | ✓ | ✓ |
| Relist Scheduler | — | ✓ | ✓ | ✓ |
| Cross-Listings | — | — | ✓ | ✓ |
| Portfolio Optimiser | — | ✓ | ✓ | ✓ |
| Charity Briefing | — | ✓ | ✓ | ✓ |
| Listings Tracked | 20 | 200 | 1,000 | Unlimited |

### 10.4 Referral System

- Each user gets a unique 8-character referral code
- Both referrer and referee receive 5 bonus credits
- Redeemed automatically after referred user completes onboarding
- Referral code stored in localStorage from URL param

### 10.5 Pricing Page Discrepancies

**⚠️ ISSUE:** The marketing `/pricing` page shows different limits than `constants.ts`:
- Pricing page says Free tier has "1 active listing tracked" but `LISTING_LIMITS` in code says `free: 20`
- Pricing page says Pro has "50 active listings tracked" but code says `pro: 200`
- These need to be reconciled

---

## 11. Known Issues & Pain Points

### Critical UX Issues

| # | Issue | Severity | Detail |
|---|---|---|---|
| 1 | **SellSmartProgress uses positional logic** | 🔴 Critical | Steps before the current page show green ticks regardless of whether user actually completed them. A user navigating directly to `/listings` sees Price, Optimise, and Photos all "completed" |
| 2 | **Dashboard is a feature menu, not a command centre** | 🔴 Critical | The 12 quick-action cards at bottom are an exact duplicate of the sidebar navigation. The dashboard doesn't answer "what should I do now?" — it answers "what features exist?" |
| 3 | **No clear item lifecycle workflow** | 🔴 Critical | There is no single flow that guides: Source item → Price check → Optimise listing → Take/edit photos → Add to inventory → Monitor → Sell. Features exist independently but aren't connected in a lifecycle |
| 4 | **Optimiser creates new listings, not updates** | 🟠 High | "Save as Listing" in the Optimiser always creates a NEW listing. If the user came from an existing listing, they now have a duplicate. There's no "Apply to Existing Listing" option |
| 5 | **Price Check results don't auto-save to listings** | 🟠 High | Results save to `price_reports` table but don't link to or create a listing entry. User must manually add the item to their inventory |

### Navigation & Flow Issues

| # | Issue | Severity | Detail |
|---|---|---|---|
| 6 | **Mobile feature discovery gap** | 🟠 High | 12 features are only accessible via the hamburger menu. Bottom nav shows 5 items. New users may never discover Arbitrage, Competitors, Charity Briefing, etc. |
| 7 | **Duplicated navigation surfaces** | 🟡 Medium | Users can reach any feature from: sidebar (desktop), hamburger (mobile), bottom nav (5 features), dashboard cards (12 features), attention cards, trending strip, for-you cards. This creates cognitive overload rather than clear paths |
| 8 | **No "return to where I was" context** | 🟡 Medium | After completing a price check from a listing, the back button goes to `/dashboard` (PageShell default), not back to the listing they came from |
| 9 | **Welcome page is a dead end** | 🟡 Medium | After the first price check from `/welcome`, user sees results but has no context about what to do next. The `JourneyBanner` helps but `/welcome` itself is only visited once |

### Technical Debt

| # | Issue | Severity | Detail |
|---|---|---|---|
| 10 | **Listings page is 1069 lines** | 🟡 Medium | This monolithic file handles: listing CRUD, inline editing, bulk operations, filtering, import modal, publish modal, P&L summary, stats, dead stock alerts. Should be decomposed into sub-components |
| 11 | **Dashboard manages its own sidebar** | 🟡 Medium | Unlike all other pages (which use PageShell), the Dashboard (546 lines) renders its own sidebar, mobile header, and hamburger menu. This means sidebar changes must be made in two places |
| 12 | **Arbitrage Scanner is 801 lines** | 🟡 Medium | Complex page with saved searches, scan results, history tab, and multiple card types. Could be split into sub-components |
| 13 | **SellSmartProgress appears on Vintography** | 🟡 Medium | The progress bar also appears on `Vintography.tsx` (line 27 import, used in render) which is confusing since Vintography isn't always part of a listing lifecycle |

### Inconsistencies

| # | Issue | Severity | Detail |
|---|---|---|---|
| 14 | **Dead Stock vs Inventory Health naming** | 🟡 Medium | Route is `/dead-stock`, sidebar label is "Inventory Health", component is `DeadStock.tsx`, feature unlock message says "Dead Stock Liquidation". The page title in PageShell should be checked for consistency |
| 15 | **Free tier limits mismatch** | 🟡 Medium | `constants.ts` says Free tier has 5 credits and tracks 20 listings. Marketing pricing page says "1 active listing tracked". The comparison table on `/pricing` says Free = "1" for listings tracked |
| 16 | **Badge logic uses "needs optimising" dual condition** | 🟢 Low | Items are flagged as "needs optimising" only when BOTH description is null AND health_score is null. An item with a description but no health score wouldn't be flagged, which may be unintuitive |
| 17 | **Credit types are confusingly shared** | 🟢 Low | `useFeatureGate.ts` maps `vintography` to `creditType: "price_checks"`. This means Vintography and Price Check share the same credit pool, which may surprise users |
| 18 | **Inconsistent use of PageShell vs custom layout** | 🟢 Low | Dashboard and some pages (Listings partially) manage their own layouts. Others use PageShell consistently. This creates subtle UX differences (different back button behaviour, different headers) |
| 19 | **Listings page has `SellSmartProgress` but also `UseCaseSpotlight`** | 🟢 Low | Two educational/engagement components stacked at the top of the page before the actual content |
| 20 | **No dark mode toggle in UI** | 🟢 Low | Dark mode CSS variables are defined in `index.css` but there's no visible toggle for users. The `next-themes` package is installed but doesn't appear to be actively used |

---

## 12. Data Model Summary

### 12.1 Core Tables

| Table | Key Columns | Purpose |
|---|---|---|
| `profiles` | user_id, display_name, selling_categories[], experience_level, active_listing_count, primary_goal, subscription_tier, onboarding_completed, timezone, tour_completed, milestones_shown[], referral_code, weekly_digest_enabled | User profile + preferences |
| `listings` | user_id, title, description, brand, category, size, condition, status, current_price, recommended_price, purchase_price, sale_price, health_score, views_count, favourites_count, image_url, vinted_url, days_listed | Inventory items |
| `price_reports` | user_id, listing_id (nullable FK), item_title, item_brand, item_category, item_condition, recommended_price, confidence_score, price_range_low/high, comparable_items (JSONB), ai_insights, price_distribution (JSONB), vinted_url | AI pricing reports |
| `trends` | brand_or_item, category, trend_direction, search_volume_change_7d/30d, avg_price, price_change_30d, supply_demand_ratio, opportunity_score, ai_summary, estimated_peak_date, data_source | Market trends |
| `usage_credits` | user_id, price_checks_used, optimizations_used, vintography_used, credits_limit, period_start, period_end | Credit tracking |

### 12.2 Feature Tables

| Table | Key Columns | Purpose |
|---|---|---|
| `arbitrage_opportunities` | user_id, source_platform, source_price, vinted_estimated_price, estimated_profit, profit_margin, deal_score, risk_level, demand_indicator, status | Cross-platform deals |
| `competitor_profiles` | user_id, competitor_name, vinted_username, search_query, avg_price, listing_count, price_trend | Tracked competitors |
| `competitor_alerts` | user_id, competitor_id (FK), alert_type, title, description, old/new_value | Competitor change alerts |
| `relist_schedules` | user_id, listing_id (FK), scheduled_at, status, strategy, new_price, price_adjustment_percent, ai_reason | Scheduled relists |
| `cross_listings` | user_id, listing_id (FK), platform, status, platform_url, platform_price, sync_error | Multi-platform listings |
| `platform_connections` | user_id, platform, status, auth_data (JSONB), platform_username | Connected platform accounts |
| `platform_sync_log` | user_id, cross_listing_id (FK), action, status, details (JSONB) | Sync history |
| `saved_searches` | user_id, brand, category, platforms[], min_margin | Saved arbitrage searches |
| `scrape_jobs` | job_type, status, lobstr_squid_id, raw_results (JSONB), processed | Background scraping jobs |
| `referrals` | referrer_id, referee_id, referral_code, credits_awarded | Referral tracking |
| `vintography_jobs` | user_id, operation, original_url, processed_url, parameters (JSONB), status | Photo processing jobs |

---

## 13. Mobile Experience

### Breakpoints
- Mobile: `< 640px` (default Tailwind `sm:`)
- Tablet: `640px – 1023px`
- Desktop: `≥ 1024px` (`lg:`)

### Mobile-Specific Features
- Fixed bottom nav (5 items) with safe-area-inset-bottom padding
- Hamburger menu (left-side sheet) mirroring full sidebar
- Touch-optimised: `active:scale-95` on buttons, larger tap targets (`h-11` minimum)
- Horizontal scroll for dashboard cards and trend strips
- Vintography: pinch-to-zoom, double-tap gestures on image viewer
- Charity Briefing: designed as a quick-reference list for in-store use

### Mobile Pain Points
1. **Feature discovery:** 12 features hidden behind hamburger menu
2. **Dashboard scroll depth:** Must scroll past 6+ sections to reach quick-action cards
3. **SellSmartProgress pills:** Very small on mobile (`text-[10px]`, `px-2 py-1.5`)
4. **No swipe gestures** for navigation between related pages
5. **Bottom nav doesn't highlight** when user is on a sub-page (e.g., `/dead-stock` shows no active tab)

---

## 14. Complete File Map

### Page Files (with line counts)

| File | Lines | Route |
|---|---|---|
| `Dashboard.tsx` | 546 | `/dashboard` |
| `PriceCheck.tsx` | 617 | `/price-check` |
| `OptimizeListing.tsx` | 649 | `/optimize` |
| `Listings.tsx` | 1069 | `/listings` |
| `TrendRadar.tsx` | 399 | `/trends` |
| `ArbitrageScanner.tsx` | 801 | `/arbitrage` |
| `Vintography.tsx` | 507 | `/vintography` |
| `CompetitorTracker.tsx` | 477 | `/competitors` |
| `DeadStock.tsx` | 416 | `/dead-stock` |
| `Analytics.tsx` | 440 | `/analytics` |
| `CharityBriefing.tsx` | 282 | `/charity-briefing` |
| `RelistScheduler.tsx` | — | `/relist` |
| `ClearanceRadar.tsx` | — | `/clearance-radar` |
| `CrossListings.tsx` | — | `/cross-listings` |
| `PlatformConnections.tsx` | — | `/platforms` |
| `BulkOptimize.tsx` | — | `/bulk-optimize` |
| `SettingsPage.tsx` | — | `/settings` |
| `Onboarding.tsx` | 231 | `/onboarding` |
| `Welcome.tsx` | 179 | `/welcome` |
| `Auth.tsx` | — | `/auth` |
| `Landing.tsx` | 252 | `/` |
| `marketing/Pricing.tsx` | 284 | `/pricing` |
| `marketing/Features.tsx` | — | `/features` |
| `marketing/HowItWorks.tsx` | — | `/how-it-works` |
| `marketing/About.tsx` | — | `/about` |
| `NotFound.tsx` | — | `*` |

### Edge Functions (24 total)

| Function | Purpose |
|---|---|
| `price-check` | AI pricing analysis via Firecrawl + Gemini |
| `optimize-listing` | AI listing optimisation with vision |
| `translate-listing` | Multi-language listing translation |
| `fetch-trends` | Retrieve and return trends from DB |
| `lobstr-sync` | Apify scheduled data collection |
| `arbitrage-scan` | Cross-platform price gap detection |
| `competitor-scan` | Competitor pricing analysis |
| `dead-stock-analyze` | AI dead stock recommendations |
| `relist-scheduler` | Process scheduled relists |
| `portfolio-optimizer` | Portfolio-wide pricing analysis |
| `charity-briefing` | AI sourcing briefing generation |
| `clearance-radar` | Retail clearance scanning |
| `niche-finder` | AI niche opportunity detection |
| `vintography` | AI photo processing pipeline |
| `create-checkout` | Stripe checkout session creation |
| `customer-portal` | Stripe billing portal |
| `stripe-webhook` | Stripe webhook handler |
| `buy-credits` | Credit pack purchase |
| `weekly-digest` | Scheduled email digest |
| `redeem-referral` | Referral code redemption |
| `import-wardrobe` | CSV/bulk listing import |
| `publish-to-platform` | Cross-platform listing publication |
| `connect-ebay` | eBay OAuth connection |
| `connect-vinted-pro` | Vinted Pro API connection |
| `sync-platform-status` | Cross-platform status sync |

---

## 15. Key Questions for Consultants

1. **Dashboard Purpose:** Should the dashboard be a "command centre" (showing the #1 priority action and live metrics) or a "home base" (providing navigation to all features)? Currently it tries to do both and excels at neither.

2. **Item Lifecycle:** Should there be an explicit, trackable lifecycle for each item (Source → Price → List → Optimise → Photograph → Monitor → Sell/Archive)? If so, should it be per-item progress tracking stored in the database, or a suggestive flow via UI guidance?

3. **Feature Grouping:** The current 17 features are grouped into 6 sidebar sections. Is this the optimal grouping? Should some features be merged (e.g., Inventory Health + Relist Scheduler into a single "Inventory Manager")? Should the Seasonal Calendar and Niche Finder remain as tabs within Trend Radar or be their own pages?

4. **Mobile Navigation:** With 5 bottom nav items and 12+ features behind a hamburger menu, how should mobile users discover and access non-core features? Should the bottom nav be contextual (changing based on what the user is doing)?

5. **Progress Tracking:** Should the platform track real completion data per item (has a price check been run? has the listing been optimised? have photos been enhanced?) and display per-item progress, or should it use flow-level guidance (contextual CTAs suggesting the next action)?

6. **Naming Consistency:** "Dead Stock" vs "Inventory Health" vs "Portfolio Optimiser" — what should the unified terminology be? How should features be labelled to be immediately understandable to non-technical Vinted sellers?

7. **Free Tier Value Demonstration:** The current free tier gives 5 price checks and 20 tracked listings. Is this enough to demonstrate value and drive conversion? Should any additional features be available in a limited form on the free tier?

8. **Dashboard Metrics:** The current 4 metrics (Active Listings, Portfolio Value, Sold This Week, Monthly Profit) are all backward-looking. Should the dashboard include forward-looking metrics (e.g., "Items needing attention", "Estimated revenue potential", "Trend opportunities matched to your inventory")?

---

*Document generated 16 February 2026. This audit reflects the live codebase as of this date.*
*Download from: https://vintifi.lovable.app/vintifi-platform-audit.md*
