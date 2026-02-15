

# Visual Upgrade & Full-System Polish

## Scope
This is a major visual overhaul across two domains: (1) all marketing/public pages and (2) the entire app dashboard and feature pages. Every change targets both desktop and mobile viewports.

---

## Part 1: Marketing Pages Visual Upgrade

### 1.1 Landing Page (`src/pages/Landing.tsx`)
- Add animated gradient mesh background to hero (like Features page has, but more prominent with animated blob movement via CSS keyframes)
- Add a glowing border effect on the mock UI preview card (subtle animated gradient border)
- Increase hero spacing on mobile -- more generous padding top/bottom
- Add logo/brand trust badges row below the hero ("As seen on..." or "Trusted by sellers from Zara, Nike, Carhartt WIP..." with small brand text)
- Feature cards: add hover lift animation with subtle gradient border reveal on hover
- Pricing section: add the monthly/annual toggle (like the dedicated pricing page) and highlight the popular tier more prominently
- CTA section: add animated gradient background instead of flat `bg-secondary`
- Mobile: ensure CTA buttons are full-width and have more breathing room
- Mobile: reduce hero font size slightly for better text wrapping

### 1.2 Features Page (`src/pages/marketing/Features.tsx`)
- Add a CTA button in the hero ("Explore Features" that smooth-scrolls to first feature)
- Add animated floating decorative elements (small dots/circles) in the hero background
- Feature mock UI cards: add a subtle floating/hover animation (gentle translateY oscillation)
- Add numbered step indicators connecting the feature chapters (1-5 with a subtle vertical progress line)
- Stat callout boxes: make more prominent with a left accent border and slightly larger stat text
- Bottom CTA: add floating animated particles/sparkle effect
- Mobile: ensure mock UI cards stack cleanly below text with proper spacing
- Mobile: reduce feature headline font sizes for better readability

### 1.3 Pricing Page (`src/pages/marketing/Pricing.tsx`)
- Add a subtle animated gradient background to the hero section
- Pricing cards: add hover elevation with shadow growth animation
- "Most Popular" tier: add animated pulsing glow border effect
- Comparison table: add sticky header row so tier names stay visible when scrolling
- FAQ section: add subtle left border accent to the active/open accordion item
- Mobile pricing cards: add swipeable carousel behavior hint (subtle horizontal scroll indicator)
- Add a "Trusted by 10,000+ sellers" social proof bar between pricing cards and comparison table

### 1.4 How It Works Page (`src/pages/marketing/HowItWorks.tsx`)
- Add pulsing dot animations on the connecting vertical line between steps
- Step number boxes: add gradient background fill instead of flat primary/10
- Mock UI elements: add subtle typing/scanning animation on step 2 ("Scanning market..." with animated dots)
- Before/After cards: add a more dramatic visual split with an animated divider between them
- Testimonial cards: add subtle quote mark watermark in background, photo placeholder avatars (initials-based)
- Mobile: ensure testimonial cards stack vertically with proper spacing

### 1.5 About Page (`src/pages/marketing/About.tsx`)
- Mission quote: add large decorative quotation marks and a subtle left/right border accent
- Pain point cards: add animated count-up for the stat numbers (they currently just show static text)
- Solution flow: add animated connecting arrows between the 3 cards (currently the arrow positioning is broken)
- Values cards: add icon background glow effect on hover
- Add a "Join us" or team placeholder section with illustrated values
- Mobile: ensure the solution flow stacks properly with downward arrows between cards

### 1.6 MarketingLayout (`src/components/MarketingLayout.tsx`)
- Add mobile hamburger menu (currently nav links are hidden on mobile with no fallback)
- Add scroll-based header background transition (transparent at top, solid glass on scroll)
- Footer: add subtle hover effects on footer links
- Add "Back to top" scroll button that appears after scrolling past the fold
- Mobile: add a sticky mobile CTA bar at bottom on landing page

---

## Part 2: Dashboard & App Pages Polish

### 2.1 Dashboard (`src/pages/Dashboard.tsx`)
- Metric cards: add subtle gradient accent on the left edge based on metric type
- Price Check CTA card: add animated glow pulse on the border to draw attention
- Quick action cards: add icon background circles with color tinting matching their section
- Recent reports empty state: add a more engaging illustration/visual
- Desktop sidebar: add active state indicator (left border accent on current page)
- Desktop sidebar: add hover transition effects on nav items
- Mobile header: clean up spacing, ensure credits badge is properly centered
- Mobile: ensure quick action grids are properly 2-column with consistent card heights
- Mobile: add safe-area padding for bottom nav to avoid content overlap

### 2.2 PageShell (`src/components/PageShell.tsx`)
- Add subtle page entrance animation (fade in from bottom)
- Ensure consistent max-width and padding across all breakpoints
- Mobile: ensure back button and title don't overflow on small screens

### 2.3 Price Check (`src/pages/PriceCheck.tsx`)
- Input card: add focus ring animation on the URL input
- Report hero metrics: add subtle background gradient per card
- Price distribution chart: improve chart colors and add proper axis labels
- Comparable items: add alternating row shading for readability
- Mobile: ensure chart is properly sized and scrollable if needed
- Mobile: full-width action buttons with proper spacing

### 2.4 Listings (`src/pages/Listings.tsx`)
- Stats bar cards: add colored left accent borders
- Listing cards: improve the traffic light health indicators with ring backgrounds
- Profit indicator: add color-coded up/down arrows
- Search/filter bar: improve with proper input group styling
- Mobile: ensure listing cards don't overflow and text truncates properly
- Mobile: make filter dropdowns full-width in a collapsible filter panel

### 2.5 MobileBottomNav (`src/components/MobileBottomNav.tsx`)
- Add active indicator dot or pill background behind active tab
- Add subtle backdrop blur effect
- Ensure safe-area-inset-bottom padding for notched devices
- Add subtle haptic-style scale animation on tap

### 2.6 Settings Page (`src/pages/SettingsPage.tsx`)
- Add section dividers with subtle headings
- Card sections: add consistent spacing and visual hierarchy
- Mobile: ensure all form inputs are properly sized for touch targets

### 2.7 Auth Page (`src/pages/Auth.tsx`)
- Add split-layout on desktop (brand/testimonial on left, form on right)
- Add subtle background pattern or gradient
- Improve form card styling with more generous padding
- Mobile: full-width form with centered layout

### 2.8 All Feature Pages (Arbitrage, Trends, Optimize, etc.)
- Ensure consistent use of PageShell with proper back navigation
- Add MobileBottomNav to any pages missing it
- Ensure loading skeletons display properly on mobile
- Ensure all cards have consistent border-radius and shadow treatment

---

## Part 3: Global CSS & Design Tokens

### 3.1 `src/index.css`
- Add new utility classes: `gradient-border` for animated gradient borders, `float-animation` for subtle floating elements
- Add smooth scroll behavior to html element
- Improve focus-visible styles for accessibility

### 3.2 `tailwind.config.ts`
- Add new keyframe animations: `float`, `glow-pulse`, `gradient-shift`
- Add corresponding animation utilities

---

## Technical Approach
- All changes are frontend-only (no backend/database changes)
- Use existing Framer Motion library for animations
- Use existing Tailwind classes + new utilities where needed
- Maintain existing component patterns and file structure
- Changes will be made file-by-file, prioritizing the marketing pages first, then the dashboard/app pages
- Focus on CSS/Tailwind improvements and Framer Motion enhancements -- no new dependencies needed

## Files Modified (estimated 15-18 files)
- `src/index.css` -- new utility classes and animations
- `tailwind.config.ts` -- new keyframes
- `src/components/MarketingLayout.tsx` -- mobile menu, scroll header
- `src/pages/Landing.tsx` -- hero upgrade, visual enhancements
- `src/pages/marketing/Features.tsx` -- animations, visual polish
- `src/pages/marketing/Pricing.tsx` -- hover effects, social proof
- `src/pages/marketing/HowItWorks.tsx` -- step animations, visual polish
- `src/pages/marketing/About.tsx` -- animated elements, flow fix
- `src/pages/Dashboard.tsx` -- sidebar active state, card polish
- `src/pages/PriceCheck.tsx` -- report visual polish
- `src/pages/Listings.tsx` -- card polish, mobile fixes
- `src/pages/Auth.tsx` -- split layout, visual upgrade
- `src/components/MobileBottomNav.tsx` -- active indicator, blur
- `src/components/PageShell.tsx` -- entrance animation
- `src/pages/SettingsPage.tsx` -- layout polish
- Various feature pages -- consistency pass

