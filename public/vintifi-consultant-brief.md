# Vintifi — Complete System Brief for Consultant Review

**Version:** 2.0 · **Date:** 18 February 2026 · **Prepared for:** External Consultant  
**Classification:** Confidential

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Brand & Design System](#2-brand--design-system)
3. [Technology Stack](#3-technology-stack)
4. [Routing & Navigation Architecture](#4-routing--navigation-architecture)
5. [Authentication & Onboarding Flow](#5-authentication--onboarding-flow)
6. [The Sell Wizard — Primary User Flow](#6-the-sell-wizard--primary-user-flow)
7. [Dashboard](#7-dashboard)
8. [Feature Pages — Full Specification](#8-feature-pages--full-specification)
9. [Billing, Credits & Tier Gating](#9-billing-credits--tier-gating)
10. [Database Schema](#10-database-schema)
11. [Edge Functions — Backend Logic](#11-edge-functions--backend-logic)
12. [AI Integrations](#12-ai-integrations)
13. [Engagement & Gamification](#13-engagement--gamification)
14. [Component Architecture](#14-component-architecture)
15. [Known Issues & Technical Debt](#15-known-issues--technical-debt)
16. [Areas for Consultant Review](#16-areas-for-consultant-review)

---

## 1. Executive Summary

**Vintifi** is an AI-powered SaaS platform for Vinted sellers. It turns casual sellers into data-driven resellers by providing:

- **Real-time price intelligence** — scrape-and-analyse comparable Vinted listings
- **AI listing optimisation** — generate SEO-ready titles and descriptions
- **Professional photo studio** — AI background removal, model shots, flat-lay
- **Trend intelligence** — rising brands and seasonal demand signals
- **Inventory management** — item lifecycle tracking, P&L, health scores

**Current state:** The platform is functionally complete with a full Stripe billing stack, Supabase auth/database, and live AI integrations (Gemini, Firecrawl, Apify). The primary user flow (the Sell Wizard) is polished and cohesive. Standalone feature pages exist for power users.

**Core product philosophy:** Item-centric. All AI tools (Price Check, Listing Optimiser, Photo Studio) are tied to an inventory record. The one exception is standalone Price Check, which acts as a discovery entry point.

---

## 2. Brand & Design System

| Element | Value |
|---|---|
| **Product Name** | Vintifi |
| **Body Font** | System sans-serif (Tailwind default) |
| **Heading Font** | Plus Jakarta Sans (`font-display`) |
| **Primary** | `hsl(350, 75%, 55%)` — Coral Red |
| **Secondary** | `hsl(233, 47%, 10%)` — Deep Navy |
| **Success** | `hsl(152, 69%, 41%)` — Green |
| **Warning** | `hsl(37, 91%, 55%)` — Amber |
| **Destructive** | `hsl(0, 84%, 60%)` — Red |
| **Background** | `hsl(220, 20%, 97%)` — Near White |
| **Card Style** | White, `0.75rem` radius, subtle border/shadow |
| **Icons** | Lucide React |
| **Charts** | Recharts |
| **Animation** | Framer Motion (spring physics, `layoutId` for nav pill) |

### Design Tokens

All colours live in `src/index.css` as HSL CSS custom properties. Components use semantic tokens (`bg-primary`, `text-muted-foreground`) — never raw colour values. Sidebar has its own colour namespace (`--sidebar-background`, `--sidebar-accent`, etc.). Full dark mode CSS variables are defined but there is no user-facing toggle.

### Utility Classes

| Class | Effect |
|---|---|
| `.text-gradient` | Primary → Accent gradient text |
| `.glass` | Frosted glass (backdrop-blur-xl) |
| `.gradient-border` | Animated gradient border |
| `.float-animation` | Subtle floating loop |
| `.scrollbar-hide` | Hide scrollbar, maintain scroll |

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | React 18 + TypeScript | SPA, component tree |
| **Bundler** | Vite | Dev server + production build |
| **Styling** | Tailwind CSS + shadcn/ui | Design system, 50+ pre-built components |
| **State** | React Context + TanStack Query | Auth/credits global state; server state caching |
| **Routing** | React Router v6 | ~20 routes with protected + onboarding guards |
| **Backend/DB** | Supabase (PostgreSQL) | Lovable Cloud hosted, 16 tables, RLS policies |
| **Auth** | Supabase Auth | Magic link + Google OAuth |
| **Edge Functions** | Supabase Edge Functions (Deno) | 24 serverless functions for AI calls, Stripe, scraping |
| **AI — Text** | Google Gemini Flash (via Lovable AI Gateway) | Listing optimisation, price analysis, trend AI |
| **AI — Vision** | Google Gemini Pro (via Lovable AI Gateway) | Photo analysis, item identification |
| **Web Scraping** | Firecrawl API | Real-time Vinted listing scraping (single items) |
| **Market Data** | Apify | Bulk trend data collection |
| **Payments** | Stripe | Subscription billing + credit packs, webhook-driven |
| **Animation** | Framer Motion | Page transitions, micro-interactions |
| **Charts** | Recharts | Price distribution charts |
| **Email** | Resend | Transactional emails |
| **Real-time** | Supabase Realtime (Postgres changes) | Live credit counter sync across the app |

---

## 4. Routing & Navigation Architecture

### 4.1 Route Map

```
PUBLIC (no auth required)
/                   Landing page
/auth               Sign up / Sign in
/features           Feature showcase
/pricing            Pricing tiers + comparison table
/how-it-works       Step-by-step explainer
/about              About page
/privacy            Privacy policy

PROTECTED (requires auth + completed onboarding)
/dashboard          Command centre
/sell               Sell Wizard (primary flow) ⭐
/listings           Inventory management
/items/:id          Item detail (4-tab hub)
/price-check        Standalone price intelligence
/optimize           Standalone listing optimiser
/vintography        Photo Studio (AI photo editing)
/trends             Trend Radar (3 tabs: Trending, Seasonal, Niches)
/settings           Account, subscription, referral

PROTECTED (onboarding only)
/onboarding         4-step wizard (first-time users only)
/welcome            First-value screen (post-onboarding)

REDIRECTED → /dashboard
/arbitrage, /competitors, /dead-stock, /analytics, /charity-briefing,
/bulk-optimize, /clearance-radar, /platforms, /relist, /cross-listings,
/portfolio, /seasonal, /niche-finder
```

**Note:** Multiple advanced feature routes were decommissioned and redirect to `/dashboard`. The underlying data tables still exist and data is preserved, but the UI pages are not currently accessible.

### 4.2 Route Guards

**`ProtectedRoute`** — checks `user` from AuthContext. Redirects to `/auth` if not signed in.  
**`OnboardingGuard`** — checks `profile.onboarding_completed`. Redirects to `/onboarding` if false.

### 4.3 Desktop Sidebar Navigation

Rendered by `AppShellV2`. Always visible on `lg:` screens.

```
Dashboard          /dashboard
Items              /listings
Sell               /sell          ← primary CTA
Price Check        /price-check
Optimise           /optimize
Trends             /trends
Photo Studio       /vintography
Settings           /settings (footer)
```

**Sidebar footer:** Credits counter (amber warning ≤2 remaining), user avatar, plan name, Settings + Sign Out buttons.

### 4.4 Mobile Navigation

**Mobile header (fixed top):** Vintifi logo, credits pill (taps → settings), hamburger menu  
**Mobile hamburger (left sheet):** Full nav with all items  
**Mobile bottom nav (fixed bottom, 5 tabs):** Home · Items · [Sell FAB] · Trends · Optimise

The centre tab is a floating action button styled differently to emphasise the Sell action.

---

## 5. Authentication & Onboarding Flow

### 5.1 Auth (`/auth`)

- **Magic link** (email OTP — no password) or **Google OAuth**
- Sign up and sign in on the same page with a toggle
- On new user creation, a Supabase database trigger (`handle_new_user`) automatically:
  - Creates a `profiles` row with default values
  - Creates a `usage_credits` row with `credits_limit: 5`
  - Generates an 8-character unique referral code

### 5.2 Onboarding (`/onboarding`)

4-step wizard collecting:
1. **Selling categories** (multi-select: Womenswear, Menswear, Vintage, Streetwear, Designer, Kids, Shoes, Accessories)
2. **Active listing count** (slider: 1-10, 10-50, 50-200, 200+)
3. **Primary goal** (Sell faster / Better prices / Find stock / Save time)
4. **Timezone** (12 EU options)

On completion, `profiles.onboarding_completed` is set to `true`. Referral code (from URL param stored in localStorage) is applied if present.

### 5.3 Welcome (`/welcome`)

First-value screen shown immediately post-onboarding:
- "Paste a Vinted URL to see what it's worth" (first price check hook)
- Alternative CTAs: View trends, Go to dashboard
- After completing the first price check from here, user is guided to the dashboard

### 5.4 Global Auth State (`AuthContext`)

`AuthContext` provides throughout the entire app:
- `user` — Supabase Auth user object
- `session` — current session
- `profile` — profiles table row (subscription tier, display name, categories, etc.)
- `credits` — usage_credits row (used counts + limit)
- `loading` — initial auth loading state

**Critical:** `credits` is kept live via a **Supabase Realtime subscription** (`postgres_changes` on `usage_credits` table filtered by `user_id`). This means the credit counter in the sidebar updates instantly without any polling when the server decrements credits.

---

## 6. The Sell Wizard — Primary User Flow

**Route:** `/sell`  
**File:** `src/pages/SellWizard.tsx` (1,737 lines)  
**Purpose:** The core guided flow that takes a user from zero to a fully optimised, listing-ready item in under 2 minutes.

### 6.1 The 5 Steps

```
[1] Add Item → [2] Price → [3] Optimise → [4] Photos → [5] Pack ✓
```

### 6.2 Step 1 — Add Item

Three entry methods:

| Method | Description | Flow |
|---|---|---|
| **URL Import** | Paste a Vinted listing URL | Firecrawl scrapes the page → Gemini extracts structured data (title, brand, category, size, condition, price, description, images) → pre-fills the form |
| **Photo Upload** | Upload 1-5 photos of the item | Gemini Vision analyses photos → AI identifies item, detects colour automatically → pre-fills title, brand, category, colour |
| **Manual** | Type in all details | Standard form fields |

**Form fields:** Title (required), Brand, Category, Size, Condition (required), Colour (auto-detected), Material, Description, Current Price, Purchase Price, Seller Notes (for defect disclosures — these are passed to the AI optimiser)

**On "Create Item":**
- Photos are uploaded to Supabase Storage (`listing-photos` bucket)
- A new `listings` row is created in the database
- `createdItem` state is set — every subsequent step works on this item ID
- User automatically advances to Step 2

**Listing limit enforcement:** A Postgres `BEFORE INSERT` trigger (`enforce_listing_limit`) checks the user's subscription tier and current active/reserved listing count before allowing the insert.

### 6.3 Step 2 — Price

**Auto-fires** when entering the step (no button press needed).

**Flow:**
1. Calls `price-check` Edge Function with item title, brand, category, condition
2. Edge Function calls Firecrawl to scrape Vinted search results for comparable items
3. Gemini analyses the scraped data and returns:
   - `recommended_price` (the AI's optimal price)
   - `price_range_low` / `price_range_high` (market range)
   - `confidence_score` (0-100)
   - `ai_insights` (plain English explanation)
4. Result is stored in `price_reports` table and written back to `listings.recommended_price`

**User actions:**
- **Accept AI price** → stores price, marks step done, enables Next
- **Enter custom price** → overrides AI recommendation, updates `listings.current_price`
- **Skip** → proceeds without price acceptance (step marked "skipped")

**Credits:** 1 credit consumed per check (increments `price_checks_used` via `increment_usage_credit` RPC function — atomic, race-condition safe).

### 6.4 Step 3 — Optimise

**Auto-fires** when entering the step.

**Flow:**
1. Calls `optimize-listing` Edge Function with all item data (title, brand, category, size, condition, description, seller_notes, photo count, recommended price)
2. Gemini generates:
   - `optimised_title` (≤80 chars, keyword-rich, includes gender signal + condition keyword e.g. "BNWT", "Excellent Condition")
   - `optimised_description` (honest, casual tone, no AI clichés, defects woven in from seller_notes)
   - `health_score` (0-100 composite score)
   - Sub-scores: title_score, description_score, photo_score, completeness_score
   - `seller_notes_disclosed` flag (confirms defects were addressed)
3. Results written to `listings.optimised_title`, `listings.optimised_description`, `listings.health_score`, `listings.last_optimised_at`

**User actions:**
- View optimised title + description with copy buttons
- Expand/collapse description (truncated by default)
- "Save to listing" → marks step done, enables Next
- See health score gauge (colour coded: Green ≥80, Amber 60-79, Red <60)

**Credits:** 1 credit consumed per optimisation (increments `optimizations_used`).

### 6.5 Step 4 — Photos

The Photos step bridges the Sell Wizard and the Photo Studio.

**Flow:**
1. User arrives at step 4. Sees their item photos with a "Open Photo Studio" button
2. Clicking it: saves `sell_wizard_item_id` and `sell_wizard_step=4` to `sessionStorage`, then navigates to `/vintography?itemId=<id>&returnToWizard=1`
3. User edits photos in Photo Studio (AI background removal, model shots, etc.)
4. On returning to `/sell`, a `sessionStorage` restore detects the saved state and resumes from step 4
5. A **polling mechanism** (every 3s) checks `listings.last_photo_edit_at` against the value stored before navigation. When it changes (Photo Studio updated the listing), the step auto-completes and advances to step 5

**Alternative:** "Skip — I'll do this later" marks the step as "skipped" and advances.

### 6.6 Step 5 — Pack ✓

The completion step — assembles everything for publishing on Vinted.

**Displays:**
- Optimised title (with Copy button)
- Optimised description (with Copy button)
- Condition Transparency Block (normalised condition badge + plain-English notes)
- Suggested hashtags (generated by `generate-hashtags` Edge Function)
- Primary item photo (download button)
- **Profit Calculator** — sale price minus purchase price, colour-coded margin %
- **WhatsApp Share** button (pre-fills a shareable message)
- "Mark as listed on Vinted" — user can paste their live Vinted URL, which is stored in `listings.vinted_url`. This is the only trigger that marks the listing as truly "complete" in the workflow completion logic.
- **Sell another item** → resets all wizard state back to step 1

**Milestone flags:** When step 5 is reached, localStorage flags are set (`vintifi_first_listing_complete`, `vintifi_five_listings_complete`) which trigger celebratory banners on the next Dashboard visit.

### 6.7 Progress Bar

The wizard has its own 5-step progress bar (separate from the old broken `SellSmartProgress` component). Progress is driven by actual step status state (`stepStatus` Record), not positional assumptions. Steps turn green when `status === "done"` or when auto-advancing past them.

### 6.8 Session Recovery

If the user navigates away mid-wizard (e.g., to Photo Studio), `sessionStorage` preserves the item ID and current step number. On returning to `/sell`, the wizard reads these, re-fetches the listing from the database, restores all state, and resumes from where they left off with a "Welcome back!" toast.

---

## 7. Dashboard

**Route:** `/dashboard`  
**File:** `src/pages/Dashboard.tsx`  
**Layout:** Uses `AppShellV2` (sidebar + mobile nav)

### 7.1 Content Sections (top to bottom)

1. **Welcome greeting** — personalised by first name from profile
2. **Milestone banners** — celebratory animated cards triggered by localStorage flags from the Sell Wizard (first listing, 5 listings, first price check, first optimisation). Dismissed individually. Auto-cleared from localStorage on display.
3. **Quick Price Check card** — prominent URL input + Analyse button. Navigates to `/price-check?url=...`
4. **Quick Actions / First-listing nudge** — if user has 0 active items: large animated "List your first item" CTA pointing to `/sell`. If they have items: two buttons (Add Item → `/sell`, Optimise → `/optimize`)
5. **Metric cards (2-up grid):**
   - Active items count (links to `/listings?status=active`)
   - Needs Attention count (items missing description, health score, or image — links to `/listings?filter=needs_attention`)
6. **Recent Items** — last 5 listings (by `updated_at`), each clickable to `/items/:id`. Empty state shows another "List your first item" CTA.

### 7.2 Design Decisions

The Dashboard is deliberately minimal — it is a command centre, not a feature directory. There are no 12-card navigation grids or duplicated sidebar links. The focus is: price check something, or go to your items.

---

## 8. Feature Pages — Full Specification

### 8.1 Item Detail (`/items/:id`)

The central hub for a single inventory item. 4 tabs:

**Tab 1: Overview**
- Item image + title + brand + condition badge
- "Trending Now" badge (if the item's brand appears in current trending data)
- P&L summary (purchase price, current price, profit, margin)
- Workflow completion status (4 pillars: Add ✓ / Price / Optimise / Photo)
- "Vinted-Ready Pack" (when health score ≥60) — shows the complete ready-to-list package
- "Get ready to list" trigger card (when incomplete — opens Listing Wizard sheet)

**Tab 2: Price**
- Last price check result (recommended price, range, confidence, comparables)
- "Run New Price Check" button (1 credit)
- Price history if multiple checks exist

**Tab 3: Listing**
- Original title + description
- Optimised title + description (side by side when available)
- Health score gauge
- Hashtags generator (Quick Hashtags — 1 credit, `generate-hashtags` Edge Function)
- "Optimise Listing" button (links to `/optimize?itemId=...`)
- Multi-language translation trigger

**Tab 4: Photos**
- Photo filmstrip with real-time count badge
- Primary photo marker
- Drag-to-reorder
- Individual photo deletion
- "Open in Photo Studio" deep-link per photo (navigates to `/vintography?imageUrl=...&itemId=...`)
- Download all photos (DOM-attachment pattern with timed delays to bypass browser blocks)

**Vinted-Ready Pack component:**
- Condition Transparency Block (normalised condition badge + plain-English notes)
- Master action bar: Copy All + Download All
- Health score gate: Green (≥80) / Amber (60-79) — below 60 shows improvement prompts

### 8.2 Price Check (`/price-check`)

**Entry modes:**
- **URL mode** — paste a Vinted listing URL (Firecrawl scrapes it)
- **Manual mode** — brand + category + condition inputs

**Output:**
- Hero price card (recommended price, market range, net profit estimate)
- Reseller Guide (Good Buy / Max Buy / Resale price)
- Stats row (Confidence %, Comparables found, Demand level, Sell Speed estimate)
- Condition Price Breakdown table (shows prices for each condition grade)
- Profit Calculator (enter your cost → shows profit at recommended price)
- Price Distribution bar chart (Recharts)
- Comparable Items table (title, price, active/sold, days listed, condition, link)
- AI Insights card (plain English from Gemini)

**Data persistence:** Results saved to `price_reports` table. Also updates `listings.recommended_price` and `listings.last_price_check_at` if an `itemId` param is present.

### 8.3 Listing Optimiser (`/optimize`)

**Standalone tool** (also triggered from within the Sell Wizard and Item Detail).

**Input:**
- Vinted URL import (Firecrawl extraction)
- Photo upload (up to 4)
- Manual form (title, description, brand, category, size, condition, seller_notes)

**Output:**
- Split-screen: original left, optimised right
- Optimised title (≤80 chars, SEO keywords) with copy button
- Optimised description (honest, casual, defects disclosed) with copy button
- Suggested tags
- Health Score gauge (0-100) with improvement checklist
- Style notes from AI

**Multi-language Translation:**
- Tabs: FR / DE / NL / ES
- Each triggered individually via `translate-listing` Edge Function
- Copy button per language

**Save action:** "Save as Listing" creates a new listing record. If `itemId` param is present, it updates the existing listing instead.

### 8.4 Photo Studio / Vintography (`/vintography`)

**Operations available:**

| Operation | Credits | Description |
|---|---|---|
| Remove Background | 1 | Clean transparent/white background |
| Smart Background | 1 | Replace with lifestyle scene (12 options) |
| Virtual Model | 4 | AI model wearing the garment (6 looks × 6 poses) |
| Mannequin | 1 | Display on ghost mannequin |
| Ghost Mannequin | 1 | Hollow mannequin effect |
| Flat-Lay Pro | 1 | Overhead flat-lay styling |
| Enhance & Steam | 1 | Brightness/clarity enhancement |

**Key features:**
- **Batch processing** — process up to 10 photos in a queue
- **Quick Presets** — one-click operation chains (e.g., "Marketplace Ready" = Remove BG + Enhance)
- **Sequential chaining** — run multiple operations on same photo; UI shows combined credit cost
- **Comparison view** — before/after slider
- **Previous edits gallery** — history of processed photos
- **Sub-pickers:** ModelPicker (6 looks × 6 poses), BackgroundPicker (12 scenes), FlatLayPicker
- **Replace Original** — save processed image back to the listing's photo array
- **Deep-link from Item Detail** — specific photo pre-loaded from `/items/:id` Photos tab

**Credit weighting:**
- Standard ops: 1 credit each
- AI Model: 4 credits (premium, positioned for high-ticket items)

**Photo Storage:** All photos (original + processed) stored in Supabase Storage `listing-photos` and `vintography` buckets.

### 8.5 Trend Radar (`/trends`)

3 tabs:

**Trending Tab:**
- Data source: Apify (scheduled bulk scrapes → `trends` table)
- Category filter chips (All, Womenswear, Menswear, Shoes, etc.)
- Trend direction filter (Rising / Peaking / Declining)
- Trend cards showing: brand/item, category, direction arrow, 7d + 30d volume change %, opportunity score (0-100), avg price, AI summary
- Free tier: top 5 trends only + upgrade banner
- Click trend → navigates to Price Check with brand/category pre-filled

**Seasonal Tab:**
- Month navigator (prev/next)
- Demand heatmap grid (8 categories × current month)
- Peak/low indicators + category-specific tips for the selected month

**Niches Tab:**
- Category multi-select input
- "Scan for Niches" → calls AI to identify underserved niches
- Niche cards: niche name, demand bar, supply bar, opportunity score, avg price, monthly sales estimate, competition count, sourcing tips, AI reasoning

### 8.6 Settings (`/settings`)

6 sections:

1. **Profile** — display name, selling categories, primary goal, active listing count
2. **Subscription** — current plan, credits used/remaining, upgrade CTA, "Manage Subscription" → Stripe Customer Portal
3. **Credit Packs** — buy additional credits (3 packs: 10/£2.99, 25/£5.99, 50/£9.99)
4. **Referrals** — unique referral code, share link, credits earned. Both referrer and referee get 5 credits.
5. **Notifications** — weekly digest toggle (stored in `profiles.weekly_digest_enabled`)
6. **Timezone** — 12 EU timezone options (affects relist scheduling)

---

## 9. Billing, Credits & Tier Gating

### 9.1 Subscription Tiers

| Tier | Monthly | Annual | Credits/mo | Listing Limit |
|---|---|---|---|---|
| **Free** | £0 | — | 5 | 20 items |
| **Pro** | £9.99 | £95.88/yr | 50 | 200 items |
| **Business** | £24.99 | £239.88/yr | 200 | 1,000 items |
| **Scale** | £49.99 | £479.88/yr | 600 | 5,000 items |
| **Enterprise** | £99.99 | £959.88/yr | 1,500 | Unlimited (999,999) |

All paid tiers: 7-day free trial.

### 9.2 How Credits Work

- One unified credit pool per user (`usage_credits` table)
- Three usage counters: `price_checks_used`, `optimizations_used`, `vintography_used`
- **Total credits used** = sum of all three counters
- **Credits remaining** = `credits_limit - (price_checks_used + optimizations_used + vintography_used)`
- Monthly reset via Postgres `reset_monthly_usage_credits()` function (pg_cron scheduled)
- **Increment** via `increment_usage_credit(user_id, column, amount)` RPC — atomic, race-condition safe
- **Unlimited bypass:** Only accounts with `credits_limit >= 999999` are treated as unlimited (manually gifted accounts only — no purchasable tier has this)
- **Real-time sync:** Changes to `usage_credits` are pushed to the frontend via Supabase Realtime

### 9.3 Credit Costs

| Action | Credits |
|---|---|
| Price Check | 1 |
| Listing Optimise | 1 |
| AI Translation (per language) | 1 |
| Quick Hashtags | 1 |
| Vintography Flash ops | 1 |
| Vintography AI Model shot | 4 |

### 9.4 Credit Packs (One-time Purchase)

| Pack | Price | Stripe Price ID |
|---|---|---|
| 10 Credits | £2.99 | `price_1T0t9m4qASjubvn3EZeqG8Sh` |
| 25 Credits (Popular) | £5.99 | `price_1T0t9n4qASjubvn3Akt5hBIZ` |
| 50 Credits | £9.99 | `price_1T0t9o4qASjubvn3Betm5xoU` |

Credit packs stack on top of the monthly limit (not replacement). Processed via `buy-credits` Edge Function → Stripe one-time payment.

### 9.5 Feature Gating

| Feature | Free | Pro | Business | Scale | Enterprise |
|---|---|---|---|---|---|
| Price Check | ✓ (5 cr) | ✓ (50 cr) | ✓ (200 cr) | ✓ (600 cr) | ✓ (1,500 cr) |
| Listing Optimiser | — | ✓ | ✓ | ✓ | ✓ |
| Vintography | ✓ | ✓ | ✓ | ✓ | ✓ |
| Trend Radar (full) | Top 5 | ✓ | ✓ | ✓ | ✓ |
| Niche Finder | — | ✓ | ✓ | ✓ | ✓ |
| Competitor Tracker | — | ✓ | ✓ | ✓ | ✓ |
| Arbitrage Scanner | — | — | ✓ | ✓ | ✓ |
| Bulk Optimiser | — | — | ✓ | ✓ | ✓ |
| Clearance Radar | — | — | ✓ | ✓ | ✓ |
| Cross-Listings | — | — | ✓ | ✓ | ✓ |
| Seasonal Calendar | — | ✓ | ✓ | ✓ | ✓ |
| Relist Scheduler | — | ✓ | ✓ | ✓ | ✓ |
| Charity Briefing | — | ✓ | ✓ | ✓ | ✓ |
| Portfolio Optimiser | — | ✓ | ✓ | ✓ | ✓ |

### 9.6 Tier Enforcement — Technical Implementation

**Frontend (`useFeatureGate` hook):**
- Reads `profile.subscription_tier` and `credits` from AuthContext
- `TIER_ORDER` map: free=0, pro=1, business=2, scale=3, enterprise=4
- Returns `allowed` (boolean), `reason` (string), `creditsRemaining`, `showUpgrade()` callback
- Used by `FeatureGate` component to render blurred content + "Upgrade to Unlock" overlay
- Used by `UpgradeModal` triggered on blocked action attempt

**Backend — Listing Limit (Postgres trigger):**
```sql
enforce_listing_limit() TRIGGER — BEFORE INSERT on listings
  free: 20 items
  pro: 200 items
  business: 1,000 items
  scale: 5,000 items
  enterprise: 999,999 items
  default: 20 items
```

**Backend — CSV Import Limit (Edge Function):**
`import-wardrobe` Edge Function enforces per-tier import limits:
- Free: blocked (requires Pro+)
- Pro: 200 items per import
- Business: 1,000 items per import
- Scale: 5,000 items per import
- Enterprise: 999,999 items per import

### 9.7 Stripe Integration

**Subscription flow:**
1. User clicks "Upgrade" → `create-checkout` Edge Function creates Stripe Checkout Session
2. User completes payment on Stripe-hosted page
3. Stripe fires `checkout.session.completed` webhook → `stripe-webhook` Edge Function
4. Webhook maps `product_id` → tier + credits via `TIER_MAP`
5. Updates `profiles.subscription_tier` and `usage_credits.credits_limit`

**Stripe events handled:**
- `checkout.session.completed` — subscription upgrade + credit pack purchase
- `customer.subscription.updated` — plan change
- `customer.subscription.deleted` — cancellation → downgrade to free (5 credits)
- `invoice.payment_failed` — logged (no auto-downgrade, grace period implied)

**Subscription management:** Users access the Stripe Customer Portal via `customer-portal` Edge Function for cancellation, payment method changes, plan upgrades/downgrades.

**Webhook security:** All events validated via Stripe webhook signature verification (`STRIPE_WEBHOOK_SECRET`).

**Product ID Map (current):**

| Product | Tier | Credits |
|---|---|---|
| `prod_TzRG6VOJz5FeDO` | pro | 50 |
| `prod_TzRGZwyHsR06JS` | business | 200 |
| `prod_TzRGaCd7E9PYRx` | scale | 600 |
| `prod_U0Jyt2cFDq4aiE` | enterprise | 1,500 |
| `prod_U0Jy1HSNYeUgay` | enterprise | 1,500 |
| (+ annual variants and legacy products) | | |

### 9.8 Referral System

- Every user gets a unique 8-char code on signup (stored in `profiles.referral_code`)
- Referral codes can be shared via URL (`/auth?ref=CODE`)
- Code stored in `localStorage` → applied after referred user completes onboarding
- `redeem-referral` Edge Function: validates code, awards 5 credits to both parties, records in `referrals` table
- Users can see their referrals + credits earned in Settings

---

## 10. Database Schema

### 10.1 Core Tables

**`profiles`** — User preferences and subscription  
Key columns: `user_id`, `display_name`, `selling_categories[]`, `experience_level`, `active_listing_count`, `primary_goal`, `subscription_tier`, `onboarding_completed`, `timezone`, `tour_completed`, `milestones_shown[]`, `referral_code`, `weekly_digest_enabled`

**`listings`** — Inventory items  
Key columns: `user_id`, `title`, `optimised_title`, `description`, `optimised_description`, `brand`, `category`, `size`, `condition`, `colour`, `material`, `status` (active/sold/archived/watchlist/reserved), `current_price`, `recommended_price`, `purchase_price`, `sale_price`, `health_score`, `views_count`, `favourites_count`, `image_url`, `images` (JSONB array), `vinted_url`, `last_price_check_at`, `last_optimised_at`, `last_photo_edit_at`, `days_listed`, `source_type` (manual/url/photo), `source_meta` (JSONB)

**`price_reports`** — Price intelligence results  
Key columns: `user_id`, `listing_id` (nullable FK), `item_title`, `item_brand`, `item_category`, `item_condition`, `recommended_price`, `confidence_score`, `price_range_low/high`, `comparable_items` (JSONB), `ai_insights`, `price_distribution` (JSONB), `vinted_url`

**`usage_credits`** — Credit tracking  
Key columns: `user_id`, `price_checks_used`, `optimizations_used`, `vintography_used`, `credits_limit`, `period_start`, `period_end`

**`trends`** — Market trend data  
Key columns: `brand_or_item`, `category`, `trend_direction` (rising/peaking/declining/stable), `search_volume_change_7d`, `search_volume_change_30d`, `avg_price`, `price_change_30d`, `supply_demand_ratio`, `opportunity_score`, `ai_summary`, `estimated_peak_date`, `data_source`

### 10.2 Feature Tables

| Table | Purpose |
|---|---|
| `arbitrage_opportunities` | Cross-platform deal detection results |
| `competitor_profiles` | Tracked competitor sellers |
| `competitor_alerts` | Price change alerts for tracked competitors |
| `competitor_scans` | Historical scan data per competitor |
| `relist_schedules` | Scheduled relist jobs with strategy/price adjustment |
| `cross_listings` | Multi-platform publish status per listing |
| `platform_connections` | Connected external platform accounts |
| `platform_sync_log` | Cross-listing sync history |
| `saved_searches` | Saved arbitrage search configurations |
| `scrape_jobs` | Background Apify job tracking |
| `referrals` | Referral relationships and credit awards |
| `vintography_jobs` | Photo processing job status |
| `item_activity` | Event log per listing (price changes, optimisations, etc.) |
| `clearance_opportunities` | Retail clearance → resale deals |

### 10.3 Database Functions

| Function | Type | Purpose |
|---|---|---|
| `handle_new_user()` | Trigger | Creates profile + usage_credits on auth signup |
| `enforce_listing_limit()` | Trigger | Blocks INSERT if tier listing limit reached |
| `increment_usage_credit()` | RPC | Atomically increments a credit counter |
| `reset_monthly_usage_credits()` | Scheduled | Resets all usage counters monthly |
| `update_updated_at_column()` | Trigger | Auto-updates `updated_at` timestamps |

### 10.4 Row-Level Security

Every table has RLS enabled. Standard pattern:
- Users can SELECT/INSERT/UPDATE/DELETE their own rows (`auth.uid() = user_id`)
- Service role bypasses RLS (for Edge Functions using `SUPABASE_SERVICE_ROLE_KEY`)
- `trends` and `scrape_jobs` tables are readable by any authenticated user (shared data)

---

## 11. Edge Functions — Backend Logic

All 24 functions are Deno-runtime serverless functions deployed on Supabase.

| Function | Trigger | Purpose |
|---|---|---|
| `price-check` | User action | Firecrawl scrape → Gemini price analysis → store in price_reports |
| `optimize-listing` | User action | Gemini generates optimised title, description, health score |
| `translate-listing` | User action | Gemini translates optimised content to target language |
| `generate-hashtags` | User action | Gemini generates Vinted-optimised hashtags for an item |
| `vintography` | User action | AI photo processing (background removal, model shots, etc.) |
| `scrape-vinted-url` | User action | Firecrawl extracts structured data from a Vinted listing URL |
| `price-check` | User action | Full price intelligence report |
| `import-wardrobe` | User action | CSV bulk import → validates, deduplicates, batch inserts |
| `create-checkout` | User action | Creates Stripe Checkout Session for subscription |
| `customer-portal` | User action | Creates Stripe Customer Portal session |
| `buy-credits` | User action | Creates Stripe one-time payment for credit pack |
| `stripe-webhook` | Stripe event | Processes subscription lifecycle events, updates DB |
| `redeem-referral` | User action | Validates referral code, awards credits to both parties |

---

## 12. AI Integrations

### 12.1 Google Gemini (via Lovable AI Gateway)

No API key required — routed through Lovable's managed gateway.

| Model | Used for |
|---|---|
| `google/gemini-2.5-flash` | Price analysis, listing optimisation, translation, hashtags, trends |
| `google/gemini-2.5-pro` | Photo analysis (vision), item identification from images |

**Listing Optimiser system prompt key rules:**
- Title ≤80 characters, includes gender signal (Mens/Womens) + condition keyword (BNWT, Excellent Condition, etc.)
- Tone: honest + casual, no AI clichés ("Elevate your wardrobe", "Perfect for any occasion" etc. are forbidden)
- Seller notes (defects) MUST be woven into description — never omitted
- AI NEVER invents attributes it cannot confirm (colour, material) — only uses provided data or photo evidence
- Descriptions formatted for Vinted's character limit

### 12.2 Firecrawl

Used for two purposes:
1. **Vinted URL extraction** — scrapes a specific listing URL to extract structured item data (title, description, brand, price, condition, images)
2. **Comparable listing search** — scrapes Vinted search results for comparable items to feed the price analysis

API key stored as Supabase secret (`FIRECRAWL_API_KEY`).

### 12.3 Apify

Used for bulk, scheduled trend data collection:
- Scrapes Vinted search results across multiple categories
- Data lands in `trends` table via the `scrape_jobs` pipeline
- Processed by Gemini for trend direction + opportunity scoring

API key stored as Supabase secret (`APIFY_API_TOKEN`).

---

## 13. Engagement & Gamification

### 13.1 Milestone Banners

Four milestones tracked via `localStorage` flags, displayed as animated banners on next Dashboard visit:

| Key | Trigger | Message |
|---|---|---|
| `vintifi_first_listing_complete` | Sell Wizard step 5 reached | "🎉 First listing complete!" |
| `vintifi_five_listings_complete` | 5 active listings exist | "🔥 5 listings — you're on a roll!" |
| `vintifi_first_price_check` | First price check completed | "📊 First price check done!" |
| `vintifi_first_optimisation` | First optimisation completed | "✨ First AI optimisation complete!" |

Banners are individually dismissible and cleared from localStorage after display.

### 13.2 Dashboard "Needs Attention" Counter

The Needs Attention metric card counts active listings where ANY of: `description IS NULL`, `health_score IS NULL`, or `image_url IS NULL`. These are items that haven't been fully completed. Links to `/listings?filter=needs_attention`.

### 13.3 Onboarding Tour (Desktop Only)

4-step guided tour on first Dashboard visit (desktop only):
1. Quick Price Check input
2. Recent Items / listing CTA
3. Trends nav link
4. Optimise nav link

Persisted in `profiles.tour_completed` + `localStorage`. Dismissed with "Got it" or by completing all steps.

---

## 14. Component Architecture

### 14.1 Layout Components

| Component | File | Purpose |
|---|---|---|
| `AppShellV2` | `AppShellV2.tsx` | Master layout: desktop sidebar + mobile header + mobile bottom nav. Used by all authenticated pages |
| `MarketingLayout` | `MarketingLayout.tsx` | Public pages wrapper: header nav + footer |
| `ScrollToTop` | `ScrollToTop.tsx` | Scrolls to top on every route change |

### 14.2 Gating & Monetisation

| Component | Purpose |
|---|---|
| `FeatureGate` | Wraps content with blur + "Upgrade to Unlock" overlay when tier is insufficient |
| `UpgradeModal` | Modal with tier comparison + upgrade CTAs (shown when credits exhausted or tier blocked) |
| `useFeatureGate` | Hook: returns `allowed`, `reason`, `creditsRemaining`, `showUpgrade()` |

### 14.3 Item-Level Components

| Component | Purpose |
|---|---|
| `HealthScoreGauge` | Circular gauge showing 0-100 health score, colour-coded |
| `VintedReadyPack` | Final pack assembly: title + description + condition block + copy/download buttons |
| `ListingWizard` | In-page sheet version of the optimisation flow (used from Item Detail) |
| `MarkAsSoldSheet` | Bottom sheet to record sale price, date, shipping cost |
| `PhotosTab` | Photos management tab in Item Detail |

### 14.4 Vintography Sub-Components

| Component | Purpose |
|---|---|
| `ComparisonView` | Before/after image slider |
| `GalleryCard` | Previous edit history card |
| `QuickPresets` | Preset operation chains |
| `BatchStrip` | Multi-photo processing queue |
| `ModelPicker` | 6 looks × 6 poses selector |
| `BackgroundPicker` | 12 background scene selector |
| `FlatLayPicker` | Flat-lay style options |
| `CreditBar` | Progress bar showing credits used/limit |
| `PhotoFilmstrip` | Horizontal scrollable photo strip |

### 14.5 Loading States

`LoadingSkeletons.tsx` provides shimmer skeleton components for all major data-loading states: listing cards, price reports, trend cards, KPIs, charts.

---

## 15. Known Issues & Technical Debt

### 15.1 Active Issues

| # | Issue | Severity | Detail |
|---|---|---|---|
| 1 | **AppShellV2 still shows "Unlimited" for Scale** | 🟠 High | `AppShellV2.tsx` line 56 has old logic: `const isUnlimited = tier === "scale" \|\| credits_limit >= 999` — this makes the sidebar display "Unlimited" for Scale users instead of "600 credits". The actual credit enforcement via `useFeatureGate` is correct (uses 999999 sentinel), but the sidebar display is wrong |
| 2 | **No dark mode toggle** | 🟢 Low | Dark mode CSS variables are fully defined in `index.css`, `next-themes` is installed, but there's no user-facing toggle |
| 3 | **Decommissioned routes redirect silently** | 🟡 Medium | ~12 routes redirect to `/dashboard` with no explanation to users who may have bookmarked them |
| 4 | **`price_reports` table has no UPDATE RLS policy** | 🟢 Low | Users can SELECT, INSERT, DELETE their own price reports but cannot UPDATE them (by RLS design — reports are immutable) |

### 15.2 Technical Debt

| # | Debt | Detail |
|---|---|---|
| 1 | **`SellWizard.tsx` is 1,737 lines** | The entire wizard is one file. Should be decomposed into step sub-components |
| 2 | **Listings page (`Listings.tsx`) is large** | Handles CRUD, inline editing, bulk ops, filtering, CSV import, P&L — should be split |
| 3 | **`item_activity` table unused** | The table exists and has correct RLS but no Edge Function writes to it |

---

## 16. Areas for Consultant Review

The following areas are flagged as highest-priority opportunities for improvement:

### 16.1 AppShellV2 Credits Display Bug

**File:** `src/components/AppShellV2.tsx` line 56  
**Current:** `const isUnlimited = tier === "scale" || (credits?.credits_limit ?? 0) >= 999;`  
**Issue:** This makes the sidebar show "Unlimited" for all Scale users instead of their 600-credit balance  
**Fix needed:** Change to `(credits?.credits_limit ?? 0) >= 999999` to match `useFeatureGate` logic

### 16.2 Sell Wizard Entry Points

The Sell Wizard at `/sell` is the primary flow but it's only prominently surfaced:
- As "Sell" in the sidebar (desktop) and the centre FAB (mobile bottom nav)
- As "List your first item" on the Dashboard (new users only)
- As "Add Item" button on the Dashboard (returning users)

**Question for consultant:** Is the Sell Wizard discoverable enough? Should it be the default landing page for authenticated users rather than the Dashboard?

### 16.3 Standalone vs. Wizard Flow Duplication

Two parallel paths exist for listing creation:
1. **Sell Wizard (`/sell`)** — guided 5-step flow, item-centric, auto-fires AI
2. **Standalone tools** — `/price-check`, `/optimize`, `/vintography` accessed independently

The standalone tools are useful for power users who want to quickly check a price without committing to a new item. However, they can create confusion about which path to use.

**Question for consultant:** Should standalone tools be deprecated for new items and only accessible from within an existing item context (`/items/:id`)? Or is the standalone discovery use case valuable enough to keep both?

### 16.4 Photo Studio Return-to-Wizard Complexity

The session storage + polling mechanism for detecting Photo Studio completion and returning to the Sell Wizard (Step 4) is technically sound but fragile. Edge cases include: browser tab closed during Photo Studio, app crashed, session expired.

**Question for consultant:** Is it worth adding a manual "I've finished editing photos — continue" button on step 4 as a fallback, in addition to the auto-detection?

### 16.5 Decommissioned Features

~12 routes (Arbitrage Scanner, Competitor Tracker, Charity Briefing, etc.) redirect to `/dashboard`. These features have:
- Complete database tables with RLS policies
- Existing data (some users have data in these tables)
- No UI currently accessible

**Question for consultant:** Which of these features are highest priority to re-enable? What is the right order to re-surface them as the product matures?

### 16.6 Mobile Feature Discovery Gap

With the hamburger menu as the primary mobile discovery surface, users may never encounter Trends, Photo Studio, or the Optimise tool unless they actively explore. The bottom nav only shows: Home, Items, Sell, Trends, Optimise.

**Question for consultant:** Should the Dashboard's "Quick Actions" section be re-introduced on mobile as a scrollable horizontal strip of feature shortcuts? Or is a clean "Your Items" feed more appropriate for the Dashboard on mobile?

---

*End of Vintifi System Brief — Version 2.0 · February 2026*
