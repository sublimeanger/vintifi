# Vintifi — Token Economics & API Cost Audit
*Generated: February 2026 | Confidential — For Consultant Review*

---

## Overview

Vintifi uses a unified credit pool model. Every user has a single `credits_limit` bucket per month, and all feature usage (price checks, listing optimisations, vintography) draws from the same pool. The cost per credit to us varies by action. This document maps what each action costs us in real API spend versus what we earn per credit charged to the user.

---

## Subscription Tier Pricing vs Credits

| Tier        | Monthly Price | Credits | Price per Credit (£) |
|-------------|--------------|---------|----------------------|
| Free        | £0           | 5       | £0.00 (loss leader)  |
| Pro         | £9.99        | 50      | £0.20                |
| Business    | £24.99       | 200     | £0.12                |
| Scale       | £49.99       | 600     | £0.08                |
| Enterprise  | £99.99       | 1,500   | £0.07                |

**Annual pricing discount: ~20% (e.g. Pro annual = £95.88/yr = £7.99/mo)**

---

## Credit Pack (Top-Up) Pricing

| Pack      | Credits | Price   | Price per Credit | Actual Cost per Credit | Gross Margin |
|-----------|---------|---------|-----------------|----------------------|--------------|
| Starter   | 10      | £2.99   | £0.299           | ~£0.010              | ~96.7%        |
| Popular   | 25      | £5.99   | £0.240           | ~£0.010              | ~95.8%        |
| Value     | 50      | £9.99   | £0.200           | ~£0.010              | ~95.0%        |

**Credit packs are the highest margin revenue line — no subscription overhead, pure top-up.**

---

## Feature-by-Feature API Cost Breakdown

### 1. PRICE CHECK — 1 Credit Charged

**Trigger:** User submits item details or a Vinted URL for pricing intelligence.

**APIs called per price check:**

| API | Purpose | Est. Cost per Call |
|-----|---------|-------------------|
| Firecrawl `/v1/scrape` | Extract item context from Vinted listing URL (only if URL provided) | ~$0.003 |
| Firecrawl `/v1/scrape` | Scrape live Vinted search results for comparable prices | ~$0.003 |
| Perplexity `sonar-pro` | Broad secondhand market context (eBay/Depop reference, demand signals) | ~$0.005–$0.015 |
| Lovable AI `gemini-2.5-flash` | Analyse all data → generate full pricing report JSON | ~$0.001–$0.004 |

**Total API cost per price check: ~£0.008–£0.018 (~1–1.5p)**

**Revenue vs cost per check:**

| Tier     | Earned per Credit | API Cost | Gross Profit per Check | Margin |
|----------|------------------|----------|----------------------|--------|
| Free     | £0.00            | ~£0.013  | -£0.013 (loss)       | —      |
| Pro      | £0.20            | ~£0.013  | ~£0.187              | 93.5%  |
| Business | £0.12            | ~£0.013  | ~£0.107              | 89.2%  |
| Scale    | £0.08            | ~£0.013  | ~£0.067              | 83.8%  |
| Enterprise | £0.07          | ~£0.013  | ~£0.057              | 81.4%  |

**Firecrawl note:** If user provides a Vinted URL, that's 2 Firecrawl calls. If manual entry only, just 1 (search results). Cost therefore varies between £0.008–£0.018.

---

### 2. LISTING OPTIMISER — 1 Credit Charged

**Trigger:** User submits photos + item details for AI-generated title, description, hashtags, and health score.

**APIs called per optimisation:**

| API | Purpose | Est. Cost per Call |
|-----|---------|-------------------|
| Firecrawl `/v1/scrape` | Scrape listing data & photos (only if Vinted URL provided) | ~$0.003 |
| Lovable AI `gemini-2.5-flash` (multimodal) | Analyse up to 4 photos + metadata → generate title, description, hashtags, health score | ~$0.003–$0.012 |
| Lovable AI `gemini-2.5-flash` | Colour detection micro-call (max_tokens: 20) | ~$0.0003 |

**Total API cost per optimisation: ~£0.005–£0.012 (~0.5–1p)**

**Revenue vs cost:** Same tier table as above (1 credit = same economics).

**Note:** `detectColourOnly` (automatic on photo upload) and `fetchOnly` (URL pre-fill) are sub-operations that cost API money but consume 0 credits — they are helper calls within the wizard flow.

---

### 3. VINTED URL SCRAPE / WARDROBE IMPORT — 0 Credits Charged

**Trigger:** User pastes a Vinted listing URL to pre-populate the Sell Wizard.

**4-tier cascade system (attempts each in order until success):**

| Tier | Method | Cost | Typical Success Rate |
|------|--------|------|---------------------|
| 1 | Vinted Public API (free, direct JSON) | £0.00 | ~60–70% |
| 2 | Firecrawl raw HTML → JSON-LD parse | ~£0.002 | +15% |
| 3 | Firecrawl markdown + Gemini 2.5 Flash AI | ~£0.005 | +10% |
| 4 | Apify `kazkn~vinted-smart-scraper` | ~£0.01–£0.05 | +10% |

**Average cost per URL import: ~£0.002–£0.030**

**Zero credits charged — deliberate zero-friction onboarding strategy.**

**Risk:** If Vinted blocks their public API (Tier 1), all imports cascade to Firecrawl + Apify, increasing per-import cost ~10x with no revenue compensation. This is the single biggest cost risk in the system.

---

### 4. VINTOGRAPHY — PHOTO STUDIO

| Operation | Credits Charged | AI Model Used | Est. API Cost | Gross Margin (Pro) |
|-----------|----------------|---------------|---------------|-------------------|
| Remove Background | 1 | `gemini-2.5-flash-image` | ~£0.005–£0.012 | ~94% |
| Smart Background | 1 | `gemini-2.5-flash-image` | ~£0.005–£0.012 | ~94% |
| Flat-Lay Pro | 1 | `gemini-2.5-flash-image` | ~£0.005–£0.012 | ~94% |
| Mannequin | 1 | `gemini-2.5-flash-image` | ~£0.005–£0.012 | ~94% |
| Enhance & Steam | 1 | `gemini-2.5-flash-image` | ~£0.005–£0.012 | ~94% |
| **AI Model Shot** | **4** | **`gemini-3-pro-image-preview`** | **~£0.03–£0.06** | **~90%** |

**Tier access restrictions:**
- `free`: remove_bg, smart_bg
- `pro`: + flat_lay, mannequin, enhance
- `business`+: + model_shot (AI Model Shot)

**AI Model Shot economics (highest revenue-per-operation):**
- API cost: ~£0.03–£0.06
- Revenue at 4 credits × Pro rate (£0.20/credit): **£0.80**
- **Net per shot: ~£0.74–£0.77 ← highest margin single operation**

---

### 5. GENERATE HASHTAGS — 0 Credits Charged

| API | Purpose | Est. Cost |
|-----|---------|-----------|
| Lovable AI `gemini-3-flash-preview` | Generate 5 Vinted-optimised hashtags | ~£0.0002 |

**Currently free to all users.** Negligible cost per call (~0.02p). No rate limiting. Users could theoretically click many times but the cost impact is immaterial.

---

### 6. TRANSLATE LISTING — 0 Credits Charged ⚠️ BUG

**Tier gate:** Business+ only (enforced server-side). Free/Pro get 403.

| API | Purpose | Est. Cost |
|-----|---------|-----------|
| Lovable AI `gemini-2.5-flash` | Translate title + description + tags into up to 4 languages | ~£0.003–£0.008 |

**⚠️ CRITICAL BUG: The `translate-listing` edge function calls `increment_usage_credit` nowhere.** A Business+ user can call this unlimited times with no credit deduction. Should charge 1 credit per translation. At Business tier with 200 credits, this could mean 200 "free" translation calls costing us ~£0.60–£1.60 in API spend that should have been covered by 200 credits × £0.12 = £24.00 in revenue already paid. The revenue is captured but the usage isn't metered, creating a misaligned incentive.

---

### 7. CSV WARDROBE IMPORT — 0 Credits Charged

**No external API calls.** Pure database insert operation.

**Tier row limits:**
- Free: blocked (Pro+ required)
- Pro: 200 rows
- Business: 1,000 rows
- Scale: 5,000 rows
- Enterprise: 999,999 rows

**Cost: Negligible (database compute only). Correctly free.**

---

## Stripe Transaction Fees

Stripe fees: 1.4% + 20p per transaction (EU cards, standard rate).

| Tier | Monthly Revenue | Stripe Fee | Net After Stripe |
|------|----------------|------------|-----------------|
| Pro | £9.99 | ~£0.34 | £9.65 |
| Business | £24.99 | ~£0.55 | £24.44 |
| Scale | £49.99 | ~£0.90 | £49.09 |
| Enterprise | £99.99 | ~£1.60 | £98.39 |

---

## Full Gross Margin by Tier

**Assumptions:** Average user uses 40% of credits on price checks, 40% optimisations, 20% Vintography (standard ops). No AI Model Shots in baseline.

| Tier | Monthly Revenue | Est. API Cost | Stripe Fee | Net Margin | Margin % |
|------|----------------|--------------|------------|------------|----------|
| Free | £0 | ~£0.03–£0.05 | £0 | -£0.04 | — |
| Pro | £9.99 | ~£0.50 | £0.34 | ~£9.15 | **91.6%** |
| Business | £24.99 | ~£1.20 | £0.55 | ~£23.24 | **93.0%** |
| Scale | £49.99 | ~£3.00 | £0.90 | ~£46.09 | **92.2%** |
| Enterprise | £99.99 | ~£7.50 | £1.60 | ~£90.89 | **90.9%** |

---

## Cost Risk Scenarios

### Scenario A: Pro user maxes all 50 credits (worst case: all URL price checks)
- 50 × 2 Firecrawl calls × £0.003 = £0.30
- 50 × Perplexity sonar-pro × £0.010 = £0.50
- 50 × Gemini AI × £0.003 = £0.15
- **Total cost: ~£0.95 on £9.99 revenue = 90.5% gross margin ✅**

### Scenario B: Enterprise user maxes all 1,500 credits (same mix)
- Firecrawl: ~£9.00
- Perplexity: ~£15.00
- Gemini AI: ~£4.50
- **Total cost: ~£28.50 on £99.99 revenue = 71.5% gross margin ⚠️ Watch at scale**

### Scenario C: Enterprise user uses all credits on AI Model Shots (4 credits each = 375 shots)
- 375 × £0.05 (Gemini 3 Pro image) = £18.75
- **Revenue: £99.99, Cost: ~£18.75, Margin: 81.3% ✅**

### Scenario D: Vinted blocks public API — all URL imports fall to Apify (Tier 4)
- Assume 1,000 Pro users each import 10 items/month
- 10,000 imports × £0.03 (Apify) = £300/month NEW cost
- Current revenue from 1,000 Pro users: £9,990/month
- Impact: -£300 from margins, margin drops from 91.6% → 88.6% **Manageable ✅ but monitor**

---

## Monthly Fixed Overheads

| Service | Estimated Monthly Cost | Notes |
|---------|----------------------|-------|
| Lovable Cloud | Included in platform | Edge functions, DB, storage, auth |
| Firecrawl | £50–£200/mo | Scales with usage; connector-managed |
| Perplexity API | £30–£150/mo | Scales with price check volume |
| Apify | £20–£100/mo | Tier 4 fallback only |
| Resend (email) | £0–£20/mo | Welcome emails, weekly digest |
| Stripe fees | ~2% of revenue | Variable per transaction |
| **Total fixed overhead** | **~£100–£470/mo** | At current early-stage scale |

At 1,000 paying subscribers (~£15,000 MRR), fixed overhead is <3% of revenue.

---

## Issues Identified

### 🔴 CRITICAL — Fix Immediately

**1. translate-listing: no credit deduction**
- **What:** Edge function calls Lovable AI but never calls `increment_usage_credit`
- **Impact:** Business+ users can translate unlimited times, invisible to credit metering
- **Fix:** Add `p_column: 'optimizations_used'` RPC call before returning response
- **Time to fix:** ~30 minutes

### 🟡 MODERATE — Fix Before Scale

**2. Apify Tier 4 cost variability**
- If Vinted breaks their public API, per-import cost jumps from £0.00 → £0.01–£0.05
- No monitoring exists to detect Tier 1 failure rate
- **Fix:** Log which tier resolves each scrape to the database; alert if Tier 1 < 50%

**3. No hashtag rate limiting**
- Users can call generate-hashtags repeatedly; each call costs £0.0002
- At scale (100k users, 10 calls/session) = £200/month in unmetered cost
- **Fix:** Debounce on frontend or session-level deduplication

**4. detectColourOnly calls untracked**
- Auto-fires on photo upload in Sell Wizard — cost ~£0.0003 per session
- Not billed, not logged, invisible in analytics
- **Fix:** Log to `item_activity` table for visibility

### 🟢 HEALTHY — No Action Needed

**5. Vintography model routing is optimal**
- Flash model for standard ops (cheap), Pro model only for AI Model Shots (4x credit charge compensates correctly)

**6. Credit pool atomic increment prevents double-spend**
- `increment_usage_credit` PostgreSQL RPC ensures concurrent requests can't race condition past the credit limit

**7. Price check Perplexity usage is appropriate**
- `sonar-pro` is the most expensive per-call API but provides real market intelligence that justifies the cost as the primary value driver

---

## Recommendations for Consultant

1. **Immediate:** Fix translate-listing credit deduction (30 min engineering task).

2. **Short-term:** Build a Tier 1 (Vinted API) success rate monitor. If it starts degrading, negotiate bulk Apify pricing or explore alternative scraping strategies before costs escalate.

3. **Pricing opportunity:** Credit packs have ~95%+ gross margin. Current placement is buried. Making them more prominent (e.g., surfacing "need more credits?" in-context with a 1-click purchase) could meaningfully increase ARPU.

4. **Enterprise risk mitigation:** At 1,500 credits/month, enterprise users are the only segment where API costs can materially dent margins. Consider an enterprise usage dashboard and proactive account management calls.

5. **Annual plan lever:** With 90%+ gross margins, the platform could increase annual discount to 25–30% (from current ~20%) to improve annual conversion and reduce churn, with minimal impact on economics.

6. **Free tier CAC calculation:** Each free user costs £0.03–£0.08/month in API costs. If 5% convert to paid in month 1, effective CAC from free tier = £0.60–£1.60 per converted user. Exceptional.

7. **Perplexity contingency:** sonar-pro is the highest per-call cost and has no fallback. If Perplexity raises pricing or has outages, the price check feature is fully dependent. Consider caching common brand/category market context data in the database (refreshed weekly) to reduce API dependency.

---

*All costs are estimates based on published API pricing as of February 2026. Actual costs may vary based on token counts, response lengths, and provider pricing changes. Internal use only.*
