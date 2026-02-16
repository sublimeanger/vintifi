# Pricing, Marketing & Feature Cohesion Overhaul  
  


## Part 1: Unit Economics Deep Dive

### Your Fixed Monthly Costs


| Service                              | Monthly Cost       | What You Get                                    |
| ------------------------------------ | ------------------ | ----------------------------------------------- |
| Firecrawl                            | ~£73               | 100,000 searches/scrapes, 50 concurrent         |
| Apify (Vinted Smart Scraper)         | ~£49 (Starter)     | ~30K results/month                              |
| Lovable AI (Gemini/GPT via platform) | Included           | Edge function AI calls — no separate key needed |
| Lovable Platform                     | ~£20-50            | Hosting, Cloud, Edge Functions                  |
| Stripe                               | 2.9% + 20p per txn | Deducted from revenue                           |
| **Total fixed overhead**             | **~£150/month**    | &nbsp;                                          |


### Per-Operation API Cost Breakdown


| Operation               | APIs Used                               | Estimated Cost Per Call |
| ----------------------- | --------------------------------------- | ----------------------- |
| **Price Check**         | 1 Apify run (~20 items) + 1 AI call     | ~£0.025                 |
| **Listing Optimise**    | 1 Firecrawl scrape (if URL) + 1 AI call | ~£0.015                 |
| **Arbitrage Scan**      | 4 Firecrawl searches + 1 Apify + 1 AI   | ~£0.06                  |
| **Competitor Scan**     | 1 Apify run + 1 AI call                 | ~£0.03                  |
| **Clearance Radar**     | 5-10 Firecrawl searches + 1 AI          | ~£0.08                  |
| **Trend Radar**         | DB read only (pre-populated)            | ~£0                     |
| **Vintography**         | 1 AI image gen call                     | ~£0.04                  |
| **Translation**         | 1 AI call per language                  | ~£0.01                  |
| **Relist Scheduler**    | AI analysis only                        | ~£0.01                  |
| **Portfolio Optimizer** | AI analysis only                        | ~£0.01                  |


### Current Pricing vs Proposed "Super Affordable" Pricing

The current pricing (£14.99 / £34.99 / £74.99) is already reasonable, but the spec mentions "super super affordable" while maintaining margin. Given the low per-operation costs, there's room to be aggressive.

**Current (from `constants.ts`):**


| Tier     | Price  | Credits         |
| -------- | ------ | --------------- |
| Free     | £0     | 5               |
| Pro      | £14.99 | 25              |
| Business | £34.99 | 100             |
| Scale    | £74.99 | 999 (unlimited) |


**Proposed New Pricing:**


| Tier     | Price     | Credits              | Est. API Cost | Gross Margin |
| -------- | --------- | -------------------- | ------------- | ------------ |
| Free     | £0        | 5                    | ~£0.13        | N/A          |
| Pro      | £9.99/mo  | 50                   | ~£1.25        | 87%          |
| Business | £24.99/mo | 200                  | ~£5.00        | 80%          |
| Scale    | £49.99/mo | Unlimited (cap 1000) | ~£25          | 50%          |


**Annual pricing (20% off):**

- Pro: £7.99/mo (£95.88/yr)
- Business: £19.99/mo (£239.88/yr)
- Scale: £39.99/mo (£479.88/yr)

**Rationale:** Lower prices dramatically increases conversion from free to paid. At 50 credits for £9.99, the Pro tier becomes a no-brainer for any seller doing 10+ items/month. The margin stays healthy because API costs are so low.

---

## Part 2: What Each Tier Actually Includes (Based on Real Features)

### Feature Inventory — What Actually Works Today


| Feature                       | Status | Edge Function            | Tier Gate                 |
| ----------------------------- | ------ | ------------------------ | ------------------------- |
| Price Check                   | LIVE   | price-check              | Free (credits)            |
| AI Listing Optimiser          | LIVE   | optimize-listing         | Pro (credits)             |
| Vintography (Photo Studio)    | LIVE   | vintography              | Free (credits)            |
| Trend Radar                   | LIVE   | fetch-trends             | Free (top 5) / Pro (full) |
| Arbitrage Scanner             | LIVE   | arbitrage-scan           | Business                  |
| Clearance Radar               | LIVE   | clearance-radar          | Business                  |
| Competitor Tracker            | LIVE   | competitor-scan          | Pro                       |
| Niche Finder                  | LIVE   | niche-finder             | Pro                       |
| Dead Stock / Inventory Health | LIVE   | dead-stock-analyze       | Pro                       |
| Relist Scheduler              | LIVE   | relist-scheduler         | Pro                       |
| Portfolio Optimizer           | LIVE   | portfolio-optimizer      | Pro                       |
| Seasonal Calendar             | LIVE   | static data              | Pro                       |
| Charity Briefing              | LIVE   | charity-briefing         | Pro                       |
| Multi-Language Translation    | LIVE   | translate-listing        | Business                  |
| Bulk Optimise                 | LIVE   | optimize-listing (batch) | Business                  |
| Import Wardrobe               | LIVE   | import-wardrobe          | Free                      |
| eBay Cross-Listing            | LIVE   | publish-to-platform      | Business                  |
| Analytics Dashboard           | LIVE   | N/A (client-side)        | Free                      |
| P&L Tracker                   | LIVE   | N/A (client-side)        | Free                      |


### Features Promised on Marketing BUT Not Real


| Claimed Feature                                  | Reality                                         | Action                                                  |
| ------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------- |
| "10,000+ Active Sellers"                         | No real data on user count yet                  | Remove or change to "Growing community"                 |
| "500K+ Prices Analysed"                          | No real count                                   | Remove or change to "Thousands"                         |
| "32% avg revenue increase"                       | Made up statistic                               | Remove specific number                                  |
| "£340 avg monthly arbitrage profit"              | Made up                                         | Remove                                                  |
| "3x faster listing creation"                     | Plausible but unverified                        | Soften to "minutes not hours"                           |
| "5 days earlier trend detection"                 | Unverified                                      | Remove                                                  |
| "4.5 hrs saved per week"                         | Unverified                                      | Remove                                                  |
| Testimonials (Sarah K, Marcus T, Emma L)         | Fabricated                                      | Remove entirely or replace with "Early user" disclaimer |
| "Trusted by 10,000+ sellers across 18 countries" | False                                           | Remove                                                  |
| "API access" on Scale tier                       | No public API exists                            | Remove                                                  |
| "White-label reports" on Scale tier              | Doesn't exist                                   | Remove                                                  |
| "Custom integrations" on Scale tier              | Doesn't exist                                   | Remove                                                  |
| "Team accounts" on Scale tier                    | Doesn't exist                                   | Remove                                                  |
| "Dedicated account manager"                      | Not real                                        | Change to "Priority support"                            |
| "Data Refresh: Real-time / Twice Daily"          | All tiers use same on-demand system             | Remove this row entirely                                |
| "Semi-auto / Fully automated relist"             | Relist scheduler is AI-suggested, not automated | Simplify to "AI relist suggestions"                     |
| "Accounting integration" for P&L                 | No integration, just CSV-level tracking         | Change to "Export to CSV"                               |
| "One-Click Apply" prices to listings             | Can't auto-apply to Vinted                      | Remove or change to "Copy to clipboard"                 |
| "GPT-4o vision" mentioned on Features page       | Using Lovable AI (Gemini)                       | Remove specific model references                        |


---

## Part 3: Revised Tier Feature Matrix

### New Honest Feature Lists (for `constants.ts` and marketing)

**Free (£0):**

- 5 credits/month (price checks + photo edits)
- Basic trend overview (top 5)
- Up to 20 items tracked
- P&L tracking
- Import from Vinted URL

**Pro (£9.99/mo):**

- 50 credits/month
- AI listing optimisation
- Full Trend Radar + Seasonal Calendar
- Niche Finder
- Competitor tracking (3 competitors)
- Portfolio health analysis
- Dead stock alerts
- AI relist suggestions
- Charity sourcing briefing
- Unlimited items tracked
- Email support

**Business (£24.99/mo):**

- 200 credits/month
- Everything in Pro
- Arbitrage Scanner (cross-platform)
- Clearance Radar
- Multi-language listings (5 languages)
- Bulk listing optimisation
- eBay cross-listing
- Competitor tracking (15 competitors)
- Export reports to CSV
- Priority support

**Scale (£49.99/mo):**

- Unlimited credits
- Everything in Business
- All languages supported
- Competitor tracking (50 competitors)
- Priority support with fast response

---

## Part 4: Marketing Pages Overhaul

### Landing Page (`Landing.tsx`)

- Remove "Trusted by sellers of top brands" section (implied endorsement)
- Update pricing section with new prices
- Replace feature grid with honest feature descriptions
- Remove "One-Click Apply" feature card
- Change model reference from GPT-4o to generic "AI"

### Features Page (`Features.tsx`)

- Remove specific made-up statistics ("32%", "3x", "5 days", "£340", "4.5 hrs")
- Replace with honest value props: "Save hours of manual research", "Find pricing confidence in seconds"
- Remove GPT-4o vision reference
- Add Vintography (Photo Studio) as a feature section — it's a real, working feature not showcased
- Add eBay Cross-Listing as a feature section

### How It Works Page (`HowItWorks.tsx`)

- Remove all fake testimonials (Sarah K, Marcus T, Emma L) or add clear disclaimer "Based on projected outcomes"
- Remove fabricated "Before/After" statistics or soften them
- Keep the 3-step flow (it's accurate)

### About Page (`About.tsx`)

- Remove "500K+ Prices Analysed" and "10K+ Active Sellers" counters
- Replace with honest early-stage messaging
- Keep the mission and values sections

### Pricing Page (`Pricing.tsx`)

- Update all prices to new structure
- Remove comparison features that don't exist (API access, white-label, team accounts, dedicated manager, data refresh frequency, accounting integration)
- Add real features: Vintography, eBay cross-listing, charity briefing
- Update social proof from "10,000+ sellers" to something honest

---

## Part 5: Code Changes Required

### 1. `src/lib/constants.ts`

- Update all prices: Pro £9.99, Business £24.99, Scale £49.99
- Update credits: Pro 50, Business 200, Scale 999
- Update feature lists per tier to reflect real features only
- Update annual prices accordingly
- **NOTE:** Stripe price_ids will need new prices created in Stripe to match

### 2. `src/pages/marketing/Pricing.tsx`

- Update `comparisonFeatures` array to remove fake features and add real ones
- Remove "Trusted by 10,000+" social proof
- Update FAQ answers for new pricing

### 3. `src/pages/marketing/Features.tsx`

- Remove all fabricated statistics
- Add Vintography and eBay cross-listing feature sections
- Remove GPT-4o references
- Soften value claims to honest statements

### 4. `src/pages/Landing.tsx`

- Update pricing section with new prices
- Remove "One-Click Apply" feature
- Remove "Trusted by sellers of top brands" or soften
- Update feature descriptions to match real capabilities

### 5. `src/pages/marketing/HowItWorks.tsx`

- Remove fake testimonials section entirely, OR add "Projected outcomes" disclaimer
- Soften Before/After statistics

### 6. `src/pages/marketing/About.tsx`

- Replace animated counters with honest early-stage numbers or remove

### 7. `src/components/UpgradeModal.tsx`

- Will auto-update from `constants.ts` changes

### 8. `src/hooks/useFeatureGate.ts`

- No structural changes needed — tier gating is already correct

### 9. Stripe Configuration

- New Stripe prices need to be created for £9.99, £24.99, £49.99 monthly
- New annual prices for £7.99, £19.99, £39.99
- Update `constants.ts` with new price_ids after creation
- Update `stripe-webhook/index.ts` TIER_MAP if product_ids change

---

## Part 6: Summary of Impact


| Area             | Before                        | After                       |
| ---------------- | ----------------------------- | --------------------------- |
| Pro price        | £14.99/mo                     | £9.99/mo (33% cheaper)      |
| Business price   | £34.99/mo                     | £24.99/mo (29% cheaper)     |
| Scale price      | £74.99/mo                     | £49.99/mo (33% cheaper)     |
| Pro credits      | 25                            | 50 (2x more)                |
| Business credits | 100                           | 200 (2x more)               |
| Marketing claims | Multiple fabricated stats     | Honest, evidence-based      |
| Feature promises | Several non-existent features | Only real, working features |
| Testimonials     | 3 fake people                 | Removed or disclaimed       |


**Expected outcome:** More affordable pricing drives higher conversion. Honest marketing builds trust and avoids legal risk. Feature lists match reality — users get exactly what's promised.  
  
**NOTE: marketing claims can stay as is unless they reference a feature that doesnt exist, i want to keep these claims in.**