

# Two-Step Welcome Flow: Wardrobe Import + Guided Price Check

After onboarding, instead of dumping users on an empty dashboard, we guide them through two high-value actions that populate their account and demonstrate intelligence.

## Flow Overview

```text
Onboarding Complete
        |
        v
  /welcome (new page)
  Step 1: "Import Your Vinted Wardrobe"
  - Paste your Vinted profile URL
  - One-click import with progress feedback
  - Shows count of items imported
        |
        v
  Step 2: "Try a Price Check"
  - Shows 3 of the just-imported items as cards
  - "Check the price on this one" CTA per card
  - Or "Skip to Dashboard" link
        |
        v
  /price-check?url=... (existing page)
  or /dashboard (if skipped)
```

## What Gets Built

### 1. New Welcome Page (`src/pages/Welcome.tsx`)

A standalone full-screen page (no sidebar/nav) with two sequential steps inside a single card, similar to the Onboarding page style.

**Step 1 -- Import Wardrobe:**
- Headline: "Let's fill your shop with data"
- Subtext: "Paste your Vinted profile URL and we'll import your listings in seconds"
- URL input field (auto-focused) + "Import" button
- Shows a progress state while importing (reuses the existing `import-vinted-wardrobe` edge function)
- On success: displays "X items imported!" with a celebratory animation, then auto-advances to Step 2
- "Skip" link at the bottom for users who want to add items manually later

**Step 2 -- Guided Price Check:**
- Headline: "See what your items are really worth"
- Subtext: "Pick any item below for a free AI price check"
- Shows up to 3 imported items as small cards (image, title, brand, price)
- Each card has a "Check Price" button that navigates to `/price-check?url=...`
- "Go to Dashboard" link at the bottom

If import was skipped (no items), Step 2 shows the manual price check input instead (paste any Vinted URL).

### 2. Route Registration (`src/App.tsx`)

Add `/welcome` as a protected route (no OnboardingGuard needed since onboarding just completed).

### 3. Onboarding Redirect (`src/pages/Onboarding.tsx`)

Change `navigate("/dashboard")` to `navigate("/welcome")` in `handleFinish`.

### 4. SEO Hook (`src/hooks/usePageMeta.ts`) -- Bonus

Since we're touching multiple pages, also add the lightweight meta hook and apply it to the 5 marketing pages as discussed previously.

## Technical Details

- **No new edge functions.** The Welcome page calls the existing `import-vinted-wardrobe` function directly (same fetch pattern as `Listings.tsx`).
- **No new database tables.** We read from the `listings` table after import to show the item cards.
- **Skippable.** Both steps have skip links. If a user navigates to `/welcome` after already having items, Step 1 shows a "You already have X items" state and lets them proceed directly.
- **One-time.** After visiting `/welcome`, subsequent logins go to `/dashboard` as normal (the `OnboardingGuard` handles this via the `onboarding_completed` flag which is already set).
- **Mobile-friendly.** Same responsive patterns as the Onboarding page (full-screen centered card, touch-friendly targets).

## Files

| File | Action | Purpose |
|---|---|---|
| `src/pages/Welcome.tsx` | Create | Two-step welcome flow page |
| `src/hooks/usePageMeta.ts` | Create | Lightweight document.title + meta description hook |
| `src/App.tsx` | Modify | Add `/welcome` route |
| `src/pages/Onboarding.tsx` | Modify | Redirect to `/welcome` instead of `/dashboard` |
| `src/pages/Landing.tsx` | Modify | Add usePageMeta call |
| `src/pages/marketing/Features.tsx` | Modify | Add usePageMeta call |
| `src/pages/marketing/Pricing.tsx` | Modify | Add usePageMeta call |
| `src/pages/marketing/HowItWorks.tsx` | Modify | Add usePageMeta call |
| `src/pages/marketing/About.tsx` | Modify | Add usePageMeta call |

