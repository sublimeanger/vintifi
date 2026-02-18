
# Seller Feedback Audit — What We Have vs. What We Need

## The 5 Pieces of Feedback, Mapped

Here is an honest assessment of each point from the seller, rated against the current platform:

---

### 1. "Show the true condition of the product — backgrounds look good, just need to make sure it shows a true likeness"

**What we already do:**
- Vintography (Photo Studio) supports "Clean Background," "Lifestyle," "AI Model Concept," and "Enhance" operations
- The AI optimiser includes condition detection and writes honest, specific condition notes in descriptions (the prompt explicitly says "Be honest and specific. Buyers trust honesty")
- The listing description formula includes a dedicated "Condition" paragraph

**The gap:**
- Vintography's AI Model Concept and Lifestyle modes *could* distort garment details (the system already warns users about this)
- There is no explicit "condition callout" in the Vinted-Ready Pack — the condition is buried inside the description, not surfaced as a standalone visual element that buyers immediately see
- The health score doesn't specifically penalise vague condition statements

**Upgrade opportunity:**
- Add a **Condition Transparency Badge** to the Vinted-Ready Pack — a prominent, standalone block showing the detected condition with a plain-English explanation (e.g. "Very Good — worn a few times, no visible flaws") that can be copied separately
- Reinforce this in the listing optimiser prompt to always lead with a clear, honest, first-sentence condition statement

---

### 2. "Pricing function — put in purchase price and % uplift they want, work out the price"

**What we already do:**
- The Profit Calculator exists on the Price Check page — user enters "Your Cost" and it shows net profit after fees and shipping based on the AI-recommended price
- The Price Check already returns `buy_price_good`, `buy_price_max`, and `net_profit_estimate`
- `purchase_price` is stored per listing and pre-fills the calculator

**The gap:**
- The current calculator is *passive* — it takes a price we've already told them and shows profit
- The seller wants the *inverse*: "I paid £X, I want 40% profit — what should I charge?"
- There is no % margin / target uplift input mode anywhere in the app

**Upgrade opportunity — Priority 1 (quick win):**
Add a **Target Margin Calculator** mode to the existing Profit Calculator card. Toggle between two modes:
- **Mode A (current):** "What's my profit at recommended price?" → enters cost, shows profit
- **Mode B (new):** "What price do I need for my target margin?" → enters cost + target % uplift → calculates: `sell price = cost / (1 - target_margin%) + estimated fees + shipping`

This is a pure frontend change — no backend needed. Lives directly on the Price Check page and also on the Item Detail page's pricing tab.

---

### 3. "Trending products — Y2K and vintage are popular"

**What we already do:**
- The `trends` table is live with real data across 8 categories, with opportunity scores, 7/30-day search volume changes, supply/demand ratios, AI summaries
- The Trend Radar page was already planned for a full rebuild (discussed in the previous conversation)

**The gap:**
- The Trend Radar page currently redirects to Dashboard — it doesn't exist
- There is no connection between "what's trending" and a seller's existing inventory (e.g. "You have 3 Nike items — Nike is trending right now")
- No personalised "Your items + current trends" crossover alert

**Upgrade opportunity:**
- Build the Trend Radar page as planned (this was already approved in prior conversation)
- Add a "Trending Match" indicator on the Item Detail page — if a listing's brand/category matches an active trend with opportunity score 70+, show a small trending badge
- On the Dashboard, add a "Trending in your wardrobe" widget showing which of the user's items match current trends

---

### 4. "Market saturation — North Face is popular but there's so many, you need rarer/unique products"

**What we already do:**
- The Price Check returns `demand_level` (high/medium/low) and an AI insights paragraph
- The `trends` table has `supply_demand_ratio` which is exactly this concept — low ratio means low supply vs demand (good), high ratio means oversaturated

**The gap:**
- The supply/demand ratio exists in the `trends` table but is never surfaced to users in a meaningful way
- The Price Check's `comparable_items` count (active competitors) exists but isn't framed as a saturation warning
- There's no "Saturation Score" or "Scarcity Score" shown to users
- The Trend Radar (when built) should prominently surface this — "High Demand / Low Supply = Opportunity"

**Upgrade opportunity:**
- On the Price Check results, add a **Market Saturation indicator** — uses the `active_competitors` count to rate the market as Saturated / Competitive / Uncrowded with plain-English guidance ("428 similar listings — price competitively or differentiate with better photos/description")
- On the Trend Radar, prominently label trends with low supply_demand_ratio as "Scarce" or "Opportunity" vs high ratio as "Crowded"

---

### 5. "Suggest hashtags to put in the listing"

**What we already do:**
- The AI Listing Optimiser already generates 3–5 compound hashtags (e.g. `#nikecrew #menssweatshirt`) as part of every optimised listing
- Hashtags are displayed as individual clickable badges in the results — each one copies to clipboard on tap
- The Vinted-Ready Pack displays hashtags with a "Copy All" button
- The AI prompt explicitly instructs 3–5 compound hashtags that "mirror how real buyers search on Vinted"

**The gap:**
- This is already fully built — but the seller may not know it exists or may not have used the optimiser yet
- Hashtags are only generated as part of a full listing optimisation — there's no standalone "Generate Hashtags" quick action
- On the item detail page, if an item has been optimised, hashtags are shown in the Vinted-Ready Pack — but if it hasn't been optimised, there's no hashtag suggestion at all

**Upgrade opportunity:**
- Add a **"Quick Hashtags"** button on the Item Detail page that generates just hashtags for the item (brand + category + key terms) without a full optimisation — uses a lightweight AI call
- Make hashtags more discoverable — on the Listings page, add a small "# Hashtags ready" badge to items that have been optimised

---

## Implementation Priority Order

Based on effort vs. impact:

| # | Feature | Effort | Impact | Type |
|---|---------|--------|--------|------|
| 1 | Target Margin Calculator (% uplift mode) | Low | Very High | Frontend only |
| 2 | Market Saturation indicator on Price Check | Low | High | Frontend only |
| 3 | Condition Transparency Badge in Vinted-Ready Pack | Low | High | Frontend only |
| 4 | Trend Radar full rebuild | Medium | Very High | Frontend + existing DB |
| 5 | Trending Match badge on Item Detail | Low | Medium | Frontend + DB query |
| 6 | Quick Hashtags button on Item Detail | Medium | Medium | Frontend + Edge Function |

---

## Proposed Build Plan

### Phase A — Quick Wins (3 frontend files, no backend)

**1. Target Margin Calculator** (`src/pages/PriceCheck.tsx`)

Add a toggle on the existing Profit Calculator card. When in "Target Margin" mode:
- Input 1: "Your cost (£)" — pre-filled from `purchase_price` if available
- Input 2: "Target margin (%)" — slider from 10% to 100%, default 30%
- Output: Calculated sell price = `cost ÷ (1 - margin%) + est. fees + est. shipping`
- Show resulting profit in £ alongside the sell price

**2. Market Saturation Card** (`src/pages/PriceCheck.tsx`)

Below the Confidence/Demand/Days row, add a new card that reads the `comparable_items` count and frames it as:
- 0–10 listings: "Uncrowded Market" (green) — "Low competition. Price with confidence."
- 11–50 listings: "Competitive" (amber) — "Moderate competition. Good photos matter."
- 51+ listings: "Saturated" (red) — "High competition. Differentiate or price aggressively."

**3. Condition Transparency Block** (`src/components/VintedReadyPack.tsx`)

Add a dedicated condition section to the Vinted-Ready Pack, between the title and description sections:
- Shows the condition label (e.g. "Very Good") with a colour-coded badge
- Shows a one-line plain-English condition note extracted from the optimised description
- "Copy Condition" button for standalone copying

### Phase B — Trend Radar Rebuild

Build `src/pages/TrendRadar.tsx` as previously planned, but now enhanced with the seller's saturation insight:
- Prominently label each trend card with its **Supply/Demand ratio** framed as "Crowded," "Competitive," or "Scarce Opportunity"
- Free tier sees top 5 trends; Pro+ sees all
- "I have this" CTA links to price check pre-filled

Update `src/App.tsx` and `src/components/AppShellV2.tsx` to add Trends to navigation.

---

## Files to Change

| File | Change |
|------|--------|
| `src/pages/PriceCheck.tsx` | Add Target Margin Calculator toggle + Market Saturation card |
| `src/components/VintedReadyPack.tsx` | Add Condition Transparency Block |
| `src/pages/TrendRadar.tsx` | Create new (Trend Radar rebuild) |
| `src/App.tsx` | Add `/trends` route |
| `src/components/AppShellV2.tsx` | Add Trends to navigation |

No database migrations or new edge functions needed for Phase A. Phase B uses the existing `trends` table.
