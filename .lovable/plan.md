

## Rebrand from Raqkt to Vintifi

### Overview
Rename the brand from "Raqkt" to "Vintifi" across the entire application, update the domain to vintifi.com, update the Resend email sender to use @vintifi.com, and generate a professional logo using AI image generation.

### Changes

**1. Logo Generation**
- Use the Lovable AI image generation API (Nano banana pro model) to create a professional logo for "Vintifi" -- a clean, modern wordmark/icon that fits the coral red (#E94560) and deep navy (#1A1A2E) colour palette.
- Save the generated logo as `public/vintifi-logo.png` and use it in the navbar, auth page, dashboard sidebar, and footer.

**2. `index.html` -- Meta Tags & SEO**
- Update `<title>` to "Vintifi -- AI-Powered Vinted Selling Intelligence"
- Update all `<meta>` tags (description, og:title, og:description, twitter:title, twitter:description, author) from "Raqkt" to "Vintifi"
- Update canonical URL from `https://raqkt.com` to `https://vintifi.com`

**3. `src/pages/Landing.tsx` -- Landing Page**
- Replace all 7 instances of "Raqkt" with "Vintifi" (navbar logo, hero description, mock UI preview URL, features description, CTA section, footer logo, footer copyright)
- Update mock browser bar from `raqkt.com/dashboard` to `vintifi.com/dashboard`

**4. `src/pages/Auth.tsx` -- Auth Page**
- Replace "Raqkt" logo text with "Vintifi"

**5. `src/pages/Dashboard.tsx` -- Dashboard Sidebar & Mobile Header**
- Replace "Raqkt" logo text in desktop sidebar and mobile header with "Vintifi"

**6. `src/pages/Onboarding.tsx` -- Welcome Toast**
- Change "Welcome to Raqkt!" to "Welcome to Vintifi!"

**7. `supabase/functions/weekly-digest/index.ts` -- Email Branding**
- Update `from` field from `"Raqkt <onboarding@resend.dev>"` to `"Vintifi <hello@vintifi.com>"`
- Update email subject from "Your Weekly Raqkt Digest" to "Your Weekly Vintifi Digest"
- Update HTML email header logo text from "Raqkt" to "Vintifi"
- Update dashboard CTA link from `raqkt.lovable.app/dashboard` to `vintifi.com/dashboard`
- Update footer text from "Raqkt" to "Vintifi"

### Files Affected
| File | Changes |
|------|---------|
| `index.html` | 8 text replacements (meta tags, title, canonical URL) |
| `src/pages/Landing.tsx` | 7 text replacements + domain update |
| `src/pages/Auth.tsx` | 1 text replacement |
| `src/pages/Dashboard.tsx` | 2 text replacements (sidebar + mobile) |
| `src/pages/Onboarding.tsx` | 1 text replacement (toast) |
| `supabase/functions/weekly-digest/index.ts` | 5 replacements (from, subject, HTML logo, CTA link, footer) |
| `public/vintifi-logo.png` | New file -- AI-generated logo |

### Logo Design Brief
The logo will be generated with these specifications:
- Modern, clean wordmark reading "Vintifi"
- Uses the brand colours: coral red (#E94560) as primary, deep navy (#1A1A2E) as secondary
- Style: bold, professional SaaS aesthetic matching Plus Jakarta Sans typography
- Transparent or white background, suitable for both light and dark contexts
- Compact enough for navbar use (approx 120x32px display size)

