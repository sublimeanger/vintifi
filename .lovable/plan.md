

# World-Class Marketing Pages

## Overview
Create 4 new public marketing pages with unique SEO-friendly routes, plus a shared reusable marketing layout (header/footer). Each page will be a standalone, richly designed marketing experience using Framer Motion animations, the existing design system, and compelling storytelling.

## New Files

### 1. `src/components/MarketingLayout.tsx` -- Shared Layout
A reusable wrapper providing the marketing header (with nav links to all marketing pages) and a rich footer with link columns, social proof stats, and legal links. Used by all marketing pages including the existing Landing page.

**Header nav links:** Home, Features, Pricing, How It Works
**Footer:** 4-column layout with product links, company links, legal links, and a newsletter-style CTA. Includes social proof counters ("10,000+ sellers", "500K+ price checks").

### 2. `src/pages/marketing/Features.tsx` -- Route: `/features`
A deep-dive features page showcasing every Vintifi capability. Design:

- **Hero**: Large headline "Your Unfair Advantage on Vinted" with animated gradient background mesh
- **Feature Showcase**: 5 major feature "chapters", each as a full-width alternating section (image-left/text-right, then reversed). Each chapter includes:
  - Icon + feature name badge
  - Bold headline + 2-paragraph description
  - A mock UI card showing the feature in action (styled like the landing page's browser mockup)
  - A "mini stat" callout (e.g., "Sellers using Price Check earn 32% more")
- **Features covered**: Price Intelligence, AI Listing Optimiser, Trend Radar, Arbitrage Scanner, Smart Inventory
- **Bottom CTA**: "Ready to level up?" with gradient background

### 3. `src/pages/marketing/Pricing.tsx` -- Route: `/pricing`
A dedicated pricing page with more detail than the landing page section. Design:

- **Hero**: "Simple pricing, serious results" with toggle for monthly/annual (annual shows 20% discount badge)
- **Pricing cards**: Same 4 tiers from constants but with expanded feature lists and comparison checkmarks
- **Feature comparison table**: Full-width responsive table with all features as rows and tiers as columns, with check/cross icons
- **FAQ accordion**: 8 common pricing questions using Radix Accordion with smooth animations
- **Social proof bar**: "Trusted by 10,000+ Vinted sellers across 18 countries"
- **Bottom CTA**: Money-back guarantee badge + "Start Free" button

### 4. `src/pages/marketing/HowItWorks.tsx` -- Route: `/how-it-works`
A step-by-step walkthrough page. Design:

- **Hero**: "From guesswork to profit in 3 steps"
- **3-Step Journey**: Large numbered steps with connecting vertical line/dots:
  1. "Paste a URL or describe your item" -- with mock input UI
  2. "AI analyses the market in seconds" -- with animated scanning/loading visual
  3. "Get your optimal price + insights" -- with mock results card
- **Before/After section**: Split comparison showing "Without Vintifi" (red-tinted, messy) vs "With Vintifi" (green-tinted, organised) selling stats
- **Testimonial-style cards**: 3 fictional seller stories with avatar, name, results ("Sarah increased her monthly profit by 47%")
- **Video placeholder**: A styled 16:9 container with play button overlay (placeholder for future demo video)
- **Bottom CTA**

### 5. `src/pages/marketing/About.tsx` -- Route: `/about`
A brand story and mission page. Design:

- **Hero**: "Built by sellers, for sellers" with a large typographic treatment
- **Mission statement**: Large pull-quote style text about democratising reselling intelligence
- **The Problem section**: 3 pain-point cards with icons and stats ("73% of Vinted sellers underprice their items")
- **The Solution section**: How Vintifi's tech stack works in plain English (no jargon), presented as an elegant flow diagram using styled divs
- **Stats bar**: Animated counter section ("500K+ prices analysed", "18 countries", "8 second average analysis time")
- **Team/Values section**: 3 value cards (Data-Driven, Seller-First, Beautifully Simple) with large icons

## Modified Files

### `src/App.tsx`
- Import the 4 new marketing pages
- Add 4 new public routes: `/features`, `/pricing`, `/how-it-works`, `/about`

### `src/pages/Landing.tsx`
- Wrap content in the new `MarketingLayout` component
- Update nav links to point to new routes instead of anchor links
- Remove the inline header/footer (now provided by MarketingLayout)

## Technical Details

### SEO
- Each page sets `document.title` via a `useEffect` on mount (e.g., "Vintifi Features -- AI-Powered Vinted Selling Intelligence")
- Semantic HTML: proper `<section>`, `<article>`, `<h1>`/`<h2>` hierarchy per page
- Only one `<h1>` per page

### Animations
- All sections use Framer Motion `whileInView` with `viewport={{ once: true }}` for scroll-triggered entrance
- Staggered children animations for card grids
- Counter animations for stats (count up from 0 on scroll into view)
- Subtle parallax on hero sections via `useScroll` + `useTransform`

### Responsive
- All pages mobile-first with Tailwind breakpoints
- Feature comparison table converts to stacked cards on mobile
- Hero text scales from `text-4xl` to `text-7xl` across breakpoints

### No backend changes needed
All pages are static marketing content -- no database, no auth, no edge functions.

