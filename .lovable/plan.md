

# Vinted Pro Connection Flow

## Overview
Add a complete Vinted Pro API connection flow to the Platform Connections page. Since the Vinted Pro API uses an **Access Key + Signing Key** model (not OAuth), users will paste their credentials directly into a secure modal. The feature will be gated behind a config flag so it can be toggled on when your Vinted allowlisting comes through.

## What You'll See
- The Vinted Pro card on `/platforms` will change from "Coming Soon" to a new state: **"Beta / Invite Only"** (controlled by the config flag)
- Clicking "Connect" opens a modal where you paste your **Access Key** and **Signing Key** from the Vinted Pro Integrations Portal
- On save, the credentials are validated by a backend function that makes a test API call to Vinted Pro
- If valid, the connection shows as "Connected" with your Vinted Pro username
- A "Test Connection" button lets you re-verify at any time
- Disconnect removes the stored credentials

## Technical Details

### 1. Feature Flag (constants.ts)
Add `FEATURE_FLAGS.VINTED_PRO_ENABLED = false` to `src/lib/constants.ts`. When `false`, the Vinted Pro card stays as "Coming Soon". When `true`, the connect flow becomes available.

### 2. Frontend Changes (PlatformConnections.tsx)
- Update the Vinted Pro platform entry to check the feature flag — if enabled, change status to `"available"` with badge "Beta"
- Add a **credentials modal** (Dialog) with two password-masked input fields: Access Key and Signing Key
- On submit, call the new `connect-vinted-pro` backend function with `{ action: "validate_and_save" }`
- Show connection status, connected username, and a "Test Connection" button when connected

### 3. Backend Function (supabase/functions/connect-vinted-pro/index.ts)
A new backend function with two actions:

- **`validate_and_save`**: Takes the access key and signing key, makes a test HMAC-signed request to `https://pro.svc.vinted.com/api/v1/items` (GET with empty body) to validate credentials. If successful, stores both keys encrypted in `platform_connections.auth_data` as JSON and sets status to `active`.

- **`test_connection`**: Retrieves stored credentials and re-runs the validation test. Returns success/failure status.

The HMAC signing follows the pattern:
```text
signature = HMAC-SHA256(signing_key, "${timestamp}.GET./api/v1/items.${access_key}.")
```

### 4. Database
No schema changes needed — the existing `platform_connections` table with its `auth_data` JSONB column and `platform` field already supports this. The credentials will be stored as:
```json
{
  "access_key": "vpi_...",
  "signing_key": "vps_..."
}
```

### 5. Config (supabase/config.toml)
Add the new function entry:
```toml
[functions.connect-vinted-pro]
verify_jwt = false
```

### 6. Files Changed
| File | Change |
|------|--------|
| `src/lib/constants.ts` | Add `FEATURE_FLAGS` object with `VINTED_PRO_ENABLED` |
| `src/pages/PlatformConnections.tsx` | Add credentials modal, feature flag check, test connection button |
| `supabase/functions/connect-vinted-pro/index.ts` | New backend function for validation and storage |
| `supabase/config.toml` | Auto-updated with new function entry |

