

# Full Cohesion Audit and World-Class Flow Roadmap

## Current State: Feature Map

Vintifi has 18 feature pages built. Here's an honest assessment of how they connect -- and where they don't.

---

## COHESION SCORECARD

| Area | Score | Verdict |
|---|---|---|
| Welcome/Onboarding flow | 8/10 | Strong. Import then price check is excellent. |
| Dashboard as command centre | 6/10 | Shows metrics and recent checks, but doesn't surface intelligence from other features. |
| Listing to Action flow | 7/10 | Listings link to Price Check and Optimise well via URL params. |
| Intelligence cross-linking | 5/10 | Trend cards link to Price Check and Arbitrage. But results from those tools don't link back or forward. |
| Report to Action conversion | 3/10 | Major gap. Price Check results have "Optimise This Listing" but no "Save to Inventory", "Track Competitor", or "Set Price Alert". |
| Inventory to Intelligence loop | 4/10 | Dead Stock and Portfolio Optimiser read from listings. But their recommendations don't flow into the Relist Scheduler or cross-reference Trends. |
| Sourcing pipeline | 3/10 | Charity Briefing, Clearance Radar, Arbitrage, and Niche Finder all output opportunities -- but none feed into a unified "Sourcing Queue" or link to each other. |
| Mobile cohesion | 6/10 | Bottom nav only shows 5 pages. 13 features are buried in the hamburger menu. |
| Empty states | 5/10 | Most have them, but they don't guide users to the right next action. |

---

## IDENTIFIED HOLES (Priority Order)

### 1. Dead-End Reports (Critical)
Every AI-powered tool (Price Check, Arbitrage, Clearance Radar, Niche Finder, Charity Briefing) generates a report that the user reads... and then what? There's no "next step" wiring.

**What's missing:**
- Price Check result has no "Save to My Listings" button (only Optimise has this)
- Arbitrage finds have no "Add to Sourcing List" or "Track This Deal"
- Clearance Radar finds don't link to "Check Vinted Price" for validation
- Niche Finder links to Price Check and Arbitrage (good!) but not to Charity Briefing or Seasonal Calendar
- Charity Briefing items have a "Check Price" button but no "Add to Shopping List"

### 2. No Contextual Suggestions on Dashboard (High)
The dashboard shows 4 metrics and recent price checks. It should be the intelligence hub showing:
- "3 items need relisting" (link to Relist Scheduler)
- "5 dead stock items detected" (link to Dead Stock)
- "Nike trending +280%" (link to Trends)
- "Portfolio health: 72/100" (link to Portfolio Optimiser)

### 3. Feature Discovery is Broken (High)
18 features across 5 sidebar sections. A new user has no idea what "Dead Stock Liquidation" or "Niche Finder" does without clicking into each one. Progressive disclosure was specced but never built -- every feature is visible from day one.

### 4. No Unified Action Queue (Medium)
Dead Stock says "relist these 5 items". Portfolio Optimiser says "reduce price on 12 items". Relist Scheduler generates schedules. But none of these talk to each other. A user has to mentally track which items need what action across 3 different pages.

### 5. Seasonal Calendar is Static (Medium)
It's hardcoded data, not connected to actual trend data. It should cross-reference real Trend Radar data to show "This month: Carhartt is hot (Trend Radar confirms +280%)".

### 6. Cross-Platform Pages Feel Orphaned (Low-Medium)
Cross-Listings and Platform Connections exist but aren't referenced from Listings, Dead Stock, or Arbitrage results.

---

## PROPOSED ROADMAP: 4 Sprints

### Sprint 1: "Close the Loops" (Highest Impact)
**Goal:** Every AI report ends with clear next-step CTAs that feed data forward.

| Change | Details |
|---|---|
| Price Check: Add "Save to Inventory" CTA | After getting a report, one click saves the item to listings with the recommended price pre-filled. |
| Price Check: Add "Track This Brand" CTA | Links to Competitor Tracker with brand pre-filled. |
| Arbitrage/Clearance results: Add "Check Vinted Price" | Each deal card gets a button that opens Price Check with brand+category pre-filled. |
| Clearance/Arbitrage results: Add "Save to Sourcing List" | Creates a listing in "watchlist" status for tracking. |
| Dead Stock recommendations: Wire "Relist" action | "Relist" button creates an entry in the Relist Scheduler directly, not just navigates to the page. |
| Portfolio Optimiser "Apply" actions: Batch mode | "Apply All Suggestions" button to bulk-update prices instead of one at a time. |

### Sprint 2: "Intelligent Dashboard" (High Impact)
**Goal:** Dashboard becomes a true command centre that surfaces actionable intelligence from every module.

| Change | Details |
|---|---|
| Smart Action Cards | Add a section below metrics: "Your Attention Needed" with cards like "5 stale items (30+ days)", "Portfolio health: 68/100", "3 trends match your inventory". Each links to the relevant tool. |
| Trending Brands Strip | Horizontal scrollable strip showing top 5 rising trends with opportunity scores. Tap to see trend detail. |
| Quick Actions Grid | Replace the single Price Check bar with a 2x2 grid: Price Check, Import/Sync, Optimise Listing, View Trends. More discoverable entry points. |
| Recent Activity Feed | Combine recent price checks, recent imports, and recent sales into a unified timeline. |

### Sprint 3: "Guided Journeys" (Medium Impact)
**Goal:** Connect features into logical workflows so users don't have to figure out the order themselves.

| Change | Details |
|---|---|
| Sourcing Journey | Charity Briefing results show "Check Price" which goes to Price Check. Price Check results show "Source This Item" which goes to Arbitrage with brand pre-filled. Creates a loop: Briefing -> Price Check -> Arbitrage -> Add to Inventory. |
| Listing Lifecycle Journey | New listing -> Optimise -> Price Check -> Publish. At each stage, the next step CTA is prominent. After optimising, show "Now check the price" button. After price checking an existing listing, show "Update your listing price" one-click action. |
| Inventory Health Journey | Dashboard "Attention Needed" card -> Dead Stock/Portfolio Optimiser -> Apply fixes -> Relist Scheduler. Each step naturally leads to the next. |
| Empty State CTAs | Every empty state page should guide to the most logical entry point. Empty Listings? "Import from Vinted". Empty Analytics? "Mark some items as sold". Empty Relist Scheduler? "Run Portfolio Optimiser first". |

### Sprint 4: "Polish and Progressive Disclosure" (Refinement)
**Goal:** Make the 18-feature platform feel simple, not overwhelming.

| Change | Details |
|---|---|
| Feature unlock notifications | Show a toast when a user "unlocks" access to a new feature through usage (e.g. after 5 price checks: "You've unlocked the Arbitrage Scanner!"). |
| Sidebar grouping with badges | Show count badges on sidebar items: "Dead Stock (5)", "Relist (3 due today)". Makes the sidebar actionable, not just navigational. |
| "For You" dashboard tab | Personalised suggestions based on user's inventory, selling categories, and usage patterns. |
| Seasonal Calendar: wire to real data | Cross-reference Trend Radar data with the static seasonal calendar to add "live" confirmation badges. |

---

## Technical Approach

All changes are frontend-only (no new edge functions or database tables needed for Sprints 1-3). The key pattern is:

1. **URL parameter passing** -- already used between Listings, Price Check, and Optimise. Extend this pattern to all cross-feature links.
2. **Supabase mutations** -- "Save to Inventory" from Price Check just inserts into the `listings` table (already done in OptimizeListing's `handleSaveAsListing`).
3. **Dashboard queries** -- fetch counts from `listings` (stale items, portfolio health) and `trends` (top rising) to populate the intelligence cards.
4. **No new tables** -- sourcing list items use the existing `listings` table with a new `status` value like "watchlist".

---

## Recommended Order

Sprint 1 first -- it immediately makes every existing feature more valuable by connecting outputs to inputs. Sprint 2 next -- it makes the dashboard the hub everything radiates from. Sprint 3 follows naturally. Sprint 4 is polish.

Estimated scope: Sprint 1 is ~4-5 messages. Sprint 2 is ~3-4 messages. Sprint 3 is ~3 messages. Sprint 4 is ~2-3 messages.

