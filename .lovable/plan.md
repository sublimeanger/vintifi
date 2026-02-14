

## Add User Timezone Setting

### Overview
Add a timezone preference to user profiles, collected during onboarding and editable in Settings. This timezone will be used across all backend functions that deal with scheduling and time-sensitive content (relist scheduler, weekly digest, charity briefing).

### What Changes

**1. Database Migration**
- Add a `timezone` column to the `profiles` table (type `text`, default `'Europe/London'`, not null).

**2. Constants (`src/lib/constants.ts`)**
- Add a `TIMEZONES` array with common European timezones relevant to Vinted markets (e.g., `Europe/London`, `Europe/Paris`, `Europe/Berlin`, `Europe/Amsterdam`, `Europe/Madrid`, `Europe/Rome`, `Europe/Warsaw`, `Europe/Stockholm`).

**3. Onboarding (`src/pages/Onboarding.tsx`)**
- Add a 4th step: "What's your timezone?" with a selectable list of timezone options (auto-detect the browser's timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone` to pre-select).
- Update the `handleFinish` function to save the selected timezone to the profile.
- Update progress indicators from 3 steps to 4 steps.

**4. Auth Context (`src/contexts/AuthContext.tsx`)**
- Add `timezone` to the `Profile` type definition so it's available app-wide.

**5. Settings Page (`src/pages/SettingsPage.tsx`)**
- Add a timezone selector (dropdown) in the Profile section so users can change it after onboarding.

**6. Edge Functions Updates**

- **`weekly-digest/index.ts`**: Read the user's timezone from their profile. Use it to format dates/times in the email subject and body so they reflect the user's local time.

- **`relist-scheduler/index.ts`**: Pass the user's timezone to the AI prompt so scheduling recommendations (e.g., "Sunday evening 18:00-20:00") are in the user's local time, not hardcoded GMT.

- **`charity-briefing/index.ts`**: Read the user's timezone from their profile and include it in the AI prompt context so time-sensitive tips reference the user's local context.

### Technical Details

**Database SQL:**
```sql
ALTER TABLE public.profiles
ADD COLUMN timezone text NOT NULL DEFAULT 'Europe/London';
```

**Browser auto-detection logic (onboarding):**
```typescript
const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
```

**Edge function timezone usage pattern:**
Each function that reads a profile will also select the `timezone` column. For the relist scheduler, the AI system prompt will change from hardcoded "GMT" references to use the user's timezone string. For the weekly digest, date formatting will use the timezone for localized output.

**Affected files:**
- `supabase/migrations/` (new migration)
- `src/lib/constants.ts`
- `src/pages/Onboarding.tsx`
- `src/contexts/AuthContext.tsx`
- `src/pages/SettingsPage.tsx`
- `supabase/functions/weekly-digest/index.ts`
- `supabase/functions/relist-scheduler/index.ts`
- `supabase/functions/charity-briefing/index.ts`

