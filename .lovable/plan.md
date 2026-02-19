
## Audit: FeatureGate Tier Alignment

### What the Correct Tier Structure Is

Based on the pricing page and repositioning doc:

| Feature | Free | Pro | Business |
|---|---|---|---|
| Photo Studio (clean bg, lifestyle bg, enhance, steam & press) | ✓ | ✓ | ✓ |
| Photo Studio — Flat-Lay Pro | — | ✓ | ✓ |
| Photo Studio — Mannequin | — | ✓ | ✓ |
| AI Model Shots | — | — | ✓ |
| AI Listing Optimiser | First item free | ✓ | ✓ |
| AI Price Check | First item free | ✓ | ✓ |
| Full Trend Radar | — | ✓ | ✓ |
| Niche Finder | — | ✓ | ✓ |
| Multi-language listings | — | — | ✓ |
| Bulk Optimiser | — | — | ✓ |

### Problems Found

**1. `useFeatureGate.ts` — Ghost feature keys and missing operation-level keys**

The `FeatureKey` union and `FEATURE_CONFIG` contain keys for 9 features that have no working UI and are no longer on the pricing page: `arbitrage_scanner`, `competitor_tracker`, `dead_stock`, `clearance_radar`, `seasonal_calendar`, `relist_scheduler`, `cross_listings`, `portfolio_optimizer`, `charity_briefing`.

Additionally, there are no feature keys for the Vintography sub-operations that need gating: `flatlay`, `mannequin`, and `ai_model`. The entire Photo Studio page is gated as `vintography: minTier: "free"` — which allows every tier in — but the individual premium operations inside have no gate.

**New keys needed:**
- `vintography_flatlay` — minTier: `"pro"`, usesCredits: true
- `vintography_mannequin` — minTier: `"pro"`, usesCredits: true
- `vintography_ai_model` — minTier: `"business"`, usesCredits: true

**2. `Vintography.tsx` — No per-operation tier enforcement in the UI**

The operation cards (lines 749–795) render all operations identically for all tiers. When a free user clicks Flat-Lay Pro or Mannequin, the card selects and the Generate button fires — the edge function is the only backstop. This is a bad UX: users hit a confusing backend error rather than a clear upgrade prompt.

The AI Model section has a visual "Premium AI Feature" divider but no actual gate — a Pro user can click and attempt it, again failing only at the backend.

**Fix needed:** Each locked operation card should render with:
- A lock icon overlay and reduced opacity (but still visible/selectable to drive upgrade intent)
- Clicking the card opens the UpgradeModal with the correct tier requirement
- The Generate button should be disabled when a locked op is selected, replaced with an upgrade CTA

**3. `useFeatureGate.ts` — `niche_finder` label inconsistency**

`niche_finder` is still in FEATURE_CONFIG as `minTier: "pro"` but isn't used anywhere in the codebase via FeatureGate. The TrendRadar page only uses `trend_radar_full`. This is fine to keep as-is since it's correctly gated, but the ghost keys should be cleaned up.

---

### Files to Change

**1. `src/hooks/useFeatureGate.ts`**

- Remove ghost FeatureKey entries: `arbitrage_scanner`, `competitor_tracker`, `dead_stock`, `clearance_radar`, `seasonal_calendar`, `relist_scheduler`, `cross_listings`, `portfolio_optimizer`, `charity_briefing`
- Add three new keys: `vintography_flatlay`, `vintography_mannequin`, `vintography_ai_model`
- Set their configs:
  - `vintography_flatlay: { minTier: "pro", usesCredits: true, creditType: "optimizations", label: "Flat-Lay Pro" }`
  - `vintography_mannequin: { minTier: "pro", usesCredits: true, creditType: "optimizations", label: "Mannequin Shot" }`
  - `vintography_ai_model: { minTier: "business", usesCredits: true, creditType: "optimizations", label: "AI Model Shot" }`

**2. `src/pages/Vintography.tsx`**

Add per-operation tier gating in the operation card grid. The approach:

- Call `useFeatureGate("vintography_flatlay")`, `useFeatureGate("vintography_mannequin")`, `useFeatureGate("vintography_ai_model")` at the top of the component
- In the 2×2 operation card grid (lines 749–795), for `flatlay` and `mannequin` cards:
  - If the gate is not `allowed`: render with a `Lock` icon overlay in the top-right corner, a `Pro` badge instead of the credit badge, and `onClick` opens the upgrade modal instead of selecting the op
  - If `allowed`: render as normal (current behavior)
- For the AI Model Shot card (lines 863–924):
  - If `vintography_ai_model.allowed` is false: show an `Upgrade to Business` button instead of just being selectable. The card becomes non-functional — click triggers `showUpgrade()` instead of `setSelectedOp("ai_model")`
- Ensure the Generate button (lines 618–627) is disabled if the `selectedOp` is one a locked tier user somehow has selected (defensive)
- Render the three UpgradeModals for the three gates (one modal suffices — reuse `upgradeOpen` from whichever gate fired)

**Technical note on state management:** A single `upgradeModalOpen` state with a `requiredTier` string is cleaner than three separate modal states. We'll use a local `lockedOpGate` state that holds which gate fired, and render one `UpgradeModal` that reads from that gate's `tierRequired`.

---

### Summary Table

| File | Change |
|---|---|
| `src/hooks/useFeatureGate.ts` | Remove 9 ghost keys, add 3 new Vintography sub-operation keys with correct minTier |
| `src/pages/Vintography.tsx` | Add `useFeatureGate` calls for flatlay/mannequin/ai_model, lock cards visually and functionally for under-tier users, show UpgradeModal on click |

No database changes, no edge function changes, no Stripe changes required.
