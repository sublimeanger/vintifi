

# Fix eBay Verification Challenge

## What's Wrong

When eBay sends a test notification to your endpoint, it first sends a **GET request** with a `challenge_code` parameter. Your edge function currently only handles POST requests (with auth headers), so it rejects eBay's verification request and the validation fails.

## What I'll Do

Update `supabase/functions/connect-ebay/index.ts` to handle two extra request types **before** the existing auth logic:

### 1. Store your verification token as a secret

Add `EBAY_VERIFICATION_TOKEN` with value `vintifi-ebay-verify-2026-eewq-3343` (the token you used).

### 2. Handle GET requests (eBay verification challenge)

When eBay sends a GET request with `?challenge_code=xxx`, the function will:
- Read the `challenge_code` from the URL
- Hash it: `SHA256(challenge_code + verificationToken + endpointURL)`
- Return `{ "challengeResponse": "<hex hash>" }` with status 200

No auth required -- this is eBay's server calling.

### 3. Handle POST account deletion notifications

When eBay sends a POST with a deletion notification (no Authorization header, body contains notification data), the function will:
- Log the notification for compliance
- Return 200 OK

The existing user-facing logic (get_auth_url, exchange_code) stays exactly the same.

## After Deployment

1. Go back to the eBay Developer Portal
2. Make sure the endpoint is set to: `https://jufvrlenxbcmohpkuvlo.supabase.co/functions/v1/connect-ebay`
3. Make sure the verification token is: `vintifi-ebay-verify-2026-eewq-3343`
4. Click **"Send Test Notification"** again -- it should pass this time
5. Your keyset gets enabled and we move on to entering your Client ID, Secret, and RuName

