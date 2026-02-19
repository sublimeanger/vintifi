
# Gap Analysis: What Remains Unimplemented from the Repositioning Brief (v3.0)

Below is a complete audit of every requirement in the brief against the current codebase, with a clear status for each.

---

## ALREADY DONE (no action needed)

These have been implemented in previous sessions:

- Pricing page 3-tier structure (Free/Pro/Business only) — done
- `useFeatureGate` ghost key removal + vintography sub-operation keys — done
- Vintography per-card tier gating with lock overlays + UpgradeModal — done
- `AppShellV2` credits display bug (`isUnlimited >= 999999`) — done
- Desktop sidebar reordered to Dashboard → Photo Studio → Sell → My Items — done
- Mobile bottom nav: Home, Photos, [Sell FAB], Items, More — done
- Mobile "More" sheet with Trends, Price Check, Optimise, Settings, Sign Out — done
- Sell Wizard reordered to Add → Photos → Optimise → Price → Pack — done
- Wizard version flag `sell_wizard_version = v3` — done
- Dashboard first-item-free banner — done
- Translation credit deduction (`increment_usage_credit` in edge function) — confirmed already present at lines 146–152 of translate-listing

---

## GAPS REMAINING — prioritised by spec section

### GAP 1 — Dashboard Quick Actions: "Optimise" button should be "Enhance Photos"
**Section 6.1, item 5**

`src/pages/Dashboard.tsx` lines 263–282: The Quick Actions section shows "Add Item" and "Optimise" buttons. The spec says the second action should be "Enhance Photos" → `/vintography`, replacing "Optimise".

**File:** `src/pages/Dashboard.tsx`
**Change:** Replace the second quick-action button label from "Optimise" (pointing to `/optimize`) to "Enhance Photos" (pointing to `/vintography`), and swap the icon from `Sparkles` to `ImageIcon`.

---

### GAP 2 — Credit Pack Surfacing: 3 new touchpoints not implemented
**Section 4.8**

The spec requires 3 new surfaces for credit pack upsells. None of these exist today:

**2a. Low credit banner in Photo Studio (≤2 credits remaining)**
The Vintography page has no banner when credits are low. Must add a dismissable amber banner at the top of the page:
> "You have 2 credits left. Top up 10 for £2.99 →"

**2b. Credit exhaustion inline prompt**
When a user attempts an action with 0 credits and hits the UpgradeModal, the spec wants an inline card that shows both a credit pack option and the Pro upgrade side by side.

**2c. Post-wizard completion low-credit prompt**
`src/pages/SellWizard.tsx` Step 5 (Pack) — after the "Sell another item" button, if ≤5 credits remain, show a card:
> "Ready to list more? Top up credits or upgrade your plan →"
With two CTAs: "Buy 10 credits — £2.99" and "Upgrade to Pro — £9.99/mo"

**Files:** `src/pages/Vintography.tsx`, `src/pages/SellWizard.tsx`

---

### GAP 3 — Hashtag Rate Limiting (frontend debounce)
**Section 9.4**

The spec requires:
- Disable the "Generate Hashtags" button for 5 seconds after each call
- Per-session counter: max 3 hashtag generations per item per session
- After 3 calls: show "Max regenerations reached" and disable permanently

The `VintedReadyPack.tsx` component contains the hashtag generation UI. This is a frontend-only change — no backend needed.

**File:** `src/components/VintedReadyPack.tsx`

---

### GAP 4 — Auth Page Left Panel: messaging is outdated
**Section 5.6**

`src/pages/Auth.tsx` lines 117 and 122–133: The left brand panel says:
- Tagline: "AI-Powered Vinted Intelligence" (old positioning)
- Bullet points: "AI-powered pricing in under 8 seconds", "Catch trends before they peak", "Data-driven decisions, not guesswork"

The spec requires:
- Tagline: "Professional Vinted listings start here."
- Bullet points: "AI photo studio — transform any photo", "Smart listings — AI-written titles & descriptions", "Market pricing — know what to charge", "Your first item is completely free"

**File:** `src/pages/Auth.tsx`

---

### GAP 5 — Welcome Page: still price-check focused, needs photo-first flow
**Section 8.2**

`src/pages/Welcome.tsx` shows a price-check hook as the primary action. The spec says:
- Headline: "Welcome to Vintifi! 🎉"
- Primary action: Upload a photo OR paste a Vinted URL — both routing to `/sell`
- "Your first item is on us. Let's make it look amazing."
- Skip link → Dashboard

Currently the page has: "See what your items are really worth" with a price check form, item list for price-checking, and Trends link. This is entirely the wrong entry point per the new photo-first positioning.

**File:** `src/pages/Welcome.tsx`

---

### GAP 6 — About Page: mission statement needs photo-first update
**Section 5.5**

`src/pages/marketing/About.tsx` line 107: The mission statement reads "democratise reselling intelligence" — pure data/analytics framing. The spec requires an updated opening paragraph:

> "Vintifi started with a simple question: why do professional retailers get beautiful product photos and small Vinted sellers don't? We built an AI photo studio that turns any phone camera photo into a professional listing image — then added smart pricing and listing tools to help you sell faster."

The About page hero section (line 86) also reads: "We believe every Vinted seller deserves the same data intelligence that powers enterprise e-commerce." This needs to be updated to the photo-first narrative.

**File:** `src/pages/marketing/About.tsx`

---

### GAP 7 — Dashboard Onboarding Tour: references old nav items
**Section 6.2**

The spec says to update the onboarding tour steps 3 and 4 to reference the new nav:
- Step 3: Photo Studio nav link (was: Trends)
- Step 4: Sell nav link (was: Optimise)

This requires finding where the tour is defined. Let me confirm it exists in the Dashboard — but based on the dashboard code reviewed, I did not see an explicit tour component rendered. This may be in a separate component or may already reference the new nav items. This should be checked but is lower priority.

---

### NOT IN SCOPE (spec explicitly says don't change)

- Stripe integration / checkout flows
- Edge function core AI logic
- Database schema (except first_item_pass_used column — already done)
- Auth flow
- Item Detail page
- Listings page
- Referral system
- Dark mode toggle

---

## Implementation Plan

### Files to Change

| # | File | Section | Change |
|---|---|---|---|
| 1 | `src/pages/Dashboard.tsx` | 6.1 | Replace "Optimise" quick action with "Enhance Photos" → `/vintography` |
| 2 | `src/pages/Vintography.tsx` | 4.8 | Add low-credit amber banner (≤2 credits) at top of page |
| 3 | `src/pages/SellWizard.tsx` | 4.8 | Add post-Pack low-credit prompt (≤5 credits) below "Sell another item" |
| 4 | `src/components/VintedReadyPack.tsx` | 9.4 | Add hashtag rate limiting: 5-second debounce + 3-per-session max |
| 5 | `src/pages/Auth.tsx` | 5.6 | Update left panel tagline + 4 bullet points to photo-first messaging |
| 6 | `src/pages/Welcome.tsx` | 8.2 | Rebuild as photo-first welcome: upload photo or paste URL → both go to `/sell` |
| 7 | `src/pages/marketing/About.tsx` | 5.5 | Update mission statement + hero paragraph to photo-first language |

### No Database or Edge Function Changes Required

All 7 gaps are frontend-only changes.

---

## What's NOT Being Changed (already done or out of scope)

- Navigation structure — already matches spec
- Sell Wizard step order — already Add → Photos → Optimise → Price → Pack
- Pricing page — already 3-tier with correct features
- FeatureGate tier alignment — already done
- Translation credit deduction — already implemented
- Credits display bug — already fixed
- First-item-free pass — already implemented
- Dashboard first-item-free banner — already present
- Selling Wizard version flag — already `v3`

---

## Execution Order

1. Dashboard quick action (30-second change)
2. Auth page left panel (messaging swap)
3. About page mission statement (copy update)
4. Welcome page rebuild (photo-first)
5. Vintography low-credit banner
6. SellWizard post-Pack nudge
7. VintedReadyPack hashtag rate limiting
