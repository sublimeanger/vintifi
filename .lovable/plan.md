

# Referral Program

## Overview
Add a referral system where each user gets a unique referral code. When a new user signs up using that code, both the referrer and referee receive 5 bonus credits. Users can share their code from a new Referral card on the Settings page.

## Database Changes

### New table: `referrals`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| referrer_id | UUID (NOT NULL) | The user who shared the code |
| referee_id | UUID (NOT NULL, UNIQUE) | The user who signed up with the code |
| referral_code | TEXT (NOT NULL) | The code used |
| credits_awarded | INTEGER (default 5) | Credits given to each party |
| created_at | TIMESTAMPTZ | When the referral was redeemed |

RLS: Users can view their own referrals (as referrer). Service role can insert/manage.

### Add `referral_code` column to `profiles`
A unique 8-character alphanumeric code auto-generated for every user. The `handle_new_user` trigger will be updated to generate this on sign-up using `upper(substr(md5(random()::text), 1, 8))`.

## Backend Changes

### Update trigger: `handle_new_user`
Add referral code generation when creating the profile row.

### New edge function: `redeem-referral`
- Called after a new user completes onboarding
- Accepts `{ referral_code: string }`
- Validates: code exists, isn't the user's own, user hasn't already redeemed one
- Creates a `referrals` row
- Adds 5 credits to both referrer and referee `usage_credits.credits_limit`
- Returns success/failure

## Frontend Changes

### 1. Auth page (`src/pages/Auth.tsx`)
- Accept `?ref=CODE` query param and store it in `localStorage` (key: `vintifi_referral_code`)
- No UI change needed on the auth page itself

### 2. Onboarding page (`src/pages/Onboarding.tsx`)
- After onboarding completes, check `localStorage` for a stored referral code
- If found, call the `redeem-referral` edge function
- Show a toast: "Referral applied! You earned 5 bonus credits"
- Clear the localStorage key

### 3. Settings page (`src/pages/SettingsPage.tsx`)
- Add a "Referral Program" card showing:
  - The user's unique referral code (large, copyable)
  - A share link: `{origin}/auth?mode=signup&ref=CODE`
  - Copy button and native share button (via `navigator.share` on mobile)
  - Count of successful referrals
  - Total credits earned from referrals

### 4. Dashboard sidebar
- No changes needed (Settings already linked)

## Technical Details

### Referral code format
8-character uppercase alphanumeric (e.g., `A3F7B2C1`), generated server-side in the trigger to guarantee uniqueness.

### Credit bonus amount
5 credits to both referrer and referee (configurable in the edge function).

### Security
- Edge function uses service role to modify credits (users cannot self-award)
- Unique constraint on `referee_id` prevents double-redemption
- Code validation checks prevent self-referral

## Files to create
- `supabase/functions/redeem-referral/index.ts`

## Files to modify
- `src/pages/Auth.tsx` -- capture `ref` query param to localStorage
- `src/pages/Onboarding.tsx` -- redeem referral after onboarding completion
- `src/pages/SettingsPage.tsx` -- add Referral Program card with code, share, and stats

## Migration
- Add `referral_code` column to `profiles`
- Create `referrals` table with RLS
- Update `handle_new_user` trigger to generate referral codes

