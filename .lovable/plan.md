

# Dashboard Page -- World-Class Mobile & Desktop Polish

This is Phase 1 of a systematic polish pass across every page. We start with the Dashboard and make it feel genuinely premium on both mobile (390px) and desktop (1920px).

## Issues Identified

1. **Guided Tour still fires on mobile** -- the `useEffect` dependency array is missing `isMobile`, so if the hook resolves after the initial render, the tour launches anyway.
2. **Mobile metric cards feel flat** -- no visual hierarchy, no colour differentiation, values are small for a glanceable dashboard.
3. **Price Intelligence Engine card is too wordy on mobile** -- takes up precious viewport space with a paragraph of text.
4. **Quick action cards are cramped on mobile** -- 2-column grid with small text, descriptions get truncated, icons are too small.
5. **No visual separation between sections** -- everything runs together in one long scroll.
6. **Mobile header lacks personality** -- plain white bar with just the logo and a hamburger.
7. **Bottom nav has no active background** -- only a tiny red dot at top, easy to miss.
8. **Desktop sidebar lacks hover micro-interactions** and the nav sections feel dense.
9. **Empty states are bland** -- "No price checks yet" with a faded icon doesn't inspire action.
10. **No pull-to-refresh or scroll indicators** on mobile.

## Plan

### 1. Fix Guided Tour mobile bug (GuidedTour.tsx)
- Add `isMobile` to the `useEffect` dependency array so the check actually works when the hook resolves asynchronously.

### 2. Upgrade mobile metric cards (Dashboard.tsx)
- Give each card a subtle left-border colour matching its icon (primary, success, accent, primary).
- Increase value font size on mobile from `text-xl` to `text-2xl`.
- Add a very subtle background tint per card (e.g. `bg-primary/5` for Active Listings).
- Make the cards tappable -- clicking "Active Listings" goes to `/listings`, "Sold This Week" goes to `/analytics`, etc.

### 3. Tighten the Price Intelligence Engine card on mobile
- Hide the paragraph description on mobile (`hidden sm:block`).
- Make the input and button slightly larger touch targets on mobile (min h-12).
- Add a subtle animated gradient border to make it the visual focal point.

### 4. Improve Recent Price Checks empty state
- Replace the faded icon with a more engaging illustration-style empty state.
- Add a direct CTA button "Run Your First Price Check" instead of just text.

### 5. Redesign Quick Action grid for mobile
- Switch from 2-column to a scrollable horizontal card row on mobile for each section (swipeable, like app store cards).
- Each card gets a larger icon (w-8 h-8), bolder title, and the description hidden on mobile to keep cards compact.
- Add a subtle gradient or coloured icon background circle per card.
- On desktop, keep the 4-column grid but add hover lift effect (`hover:-translate-y-0.5 hover:shadow-lg`).

### 6. Add section dividers and better spacing
- Add subtle section headers with a decorative element (small coloured bar before text).
- Increase spacing between major dashboard sections on mobile.

### 7. Polish the mobile bottom nav (MobileBottomNav.tsx)
- Add a subtle filled background pill behind the active icon+label for better visibility.
- Slightly increase icon size from `w-5 h-5` to `w-5.5 h-5.5`.

### 8. Polish the desktop sidebar
- Add a subtle scale + background transition on hover for nav items.
- Add a small coloured dot indicator next to the active item label.
- Improve the user profile area at the bottom with a subtle gradient background.

### 9. Mobile header refinement
- Add a subtle bottom shadow for depth separation.
- Ensure the credits badge has better contrast and padding.

## Technical Details

### Files to modify:
- `src/pages/Dashboard.tsx` -- Main dashboard layout, metric cards, quick actions, empty states
- `src/components/GuidedTour.tsx` -- Fix dependency array (line 53: add `isMobile`)
- `src/components/MobileBottomNav.tsx` -- Active state styling upgrade

### No new dependencies needed
All changes use existing Tailwind classes, Framer Motion (already installed), and Lucide icons.

### No database or backend changes required.

