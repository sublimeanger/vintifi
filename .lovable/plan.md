# One-Click Cross-Platform Publishing System for Vintifi

## Research Summary

After intensive research into every major reselling platform's API capabilities, here is a complete, honest assessment of what is possible, what is hard, and what is blocked -- followed by a robust implementation plan.

---

## Platform API Landscape (The Reality)

### 1. eBay -- FULLY FEASIBLE (Official API)

**Status:** Open developer programme, mature REST APIs, well-documented.


| Detail         | Info                                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| API            | Inventory API (REST) + Trading API (XML, legacy)                                                      |
| Auth           | OAuth 2.0 user consent flow -- user links their eBay account once                                     |
| Create listing | `createOrReplaceInventoryItem` then `createOffer` then `publishOffer`                                 |
| Bulk create    | `bulkCreateOffer` (up to 25 at once)                                                                  |
| Read listings  | `getInventoryItems`, `getOffers`                                                                      |
| Update/delete  | Full CRUD support                                                                                     |
| Webhooks       | Account Deletion notifications; marketplace events via platform notifications                         |
| Fees           | Listing may incur eBay seller fees (insertion fees, final value fees)                                 |
| Requirements   | Register at developer.ebay.com, create app keyset, get user OAuth consent                             |
| Red tape       | Need to apply for production keyset. eBay reviews app purpose. Usually approved in 1-3 business days. |


**Bidirectional sync:** Fully possible. eBay provides `getOrders` and platform notification webhooks for sold items.

---

### 2. Vinted -- PARTIALLY FEASIBLE (Pro Only, Allowlisted)

**Status:** Official API exists ("Vinted Pro Integrations") but is **locked behind an allowlist**.


| Detail         | Info                                                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| API            | Vinted Pro Integrations API (REST, v0.246.0)                                                                                                    |
| Auth           | Access key + request signing (HMAC)                                                                                                             |
| Create listing | `CreateItems` endpoint -- full item creation with photos, brand, size, category, price                                                          |
| Read listings  | `GetItems`, `GetItemStatus`, `GetImportedItems`                                                                                                 |
| Update/delete  | `UpdateItems`, `DeleteItems`                                                                                                                    |
| Webhooks       | Full webhook support -- item created/updated/deleted/sold, order created, shipment label                                                        |
| Slot system    | Initially 500 active items per API user, expandable after 30 days                                                                               |
| Requirements   | **Must be a Vinted Pro seller** (registered business). Must apply to be added to the allowlist at vinted.fr/pro/integrations.                   |
| Red tape       | Allowlist approval is not guaranteed. Vinted Pro requires business registration (VAT number, company details). Not available to casual sellers. |


**Bidirectional sync:** Excellent. Webhooks notify on item sold, order created, shipment label ready.

**Critical limitation:** Casual/individual sellers CANNOT use this API. Only registered businesses with Vinted Pro accounts that have been allowlisted.

---

### 3. Depop -- PARTIALLY FEASIBLE (Partner API, Restricted)

**Status:** Official "Selling API" exists but access is **by invitation only**.


| Detail       | Info                                                                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| API          | Depop Selling API v1.0.0 (REST)                                                                                                        |
| Auth         | OAuth 2.0 (for third-party tools) or API Keys (for direct partners)                                                                    |
| Capabilities | Create/update/delete listings, manage inventory, manage orders, set offer prices                                                       |
| Scopes       | `shop_read`, `listings_write`, `listings_read`, `orders_read`, `orders_write`, `offers_write`                                          |
| Requirements | Must contact Depop directly at their partner email. Cannot self-register.                                                              |
| Red tape     | Depop manually reviews and approves partner applications. Primarily targets enterprise sellers and established crosslisting platforms. |


**Bidirectional sync:** Possible via orders API if approved.

**Critical limitation:** No self-service access. Vintifi would need to apply as a technology partner and wait for approval.

---

### 4. Facebook Marketplace -- NOT FEASIBLE

**Status:** No public listing creation API for third-party tools.


| Detail         | Info                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------- |
| API            | Meta Content Library API (read-only, research purposes only)                              |
| Create listing | **Not possible via API**. No public write access.                                         |
| Red tape       | Meta restricts Marketplace API to approved commerce partners (Shopify, BigCommerce, etc.) |


**Recommendation:** Exclude from initial scope entirely. Could offer a "copy to clipboard" flow where Vintifi formats the listing and the user pastes it manually.

---

### 5. Gumtree / Shpock / Other -- NOT FEASIBLE

No public APIs for listing creation exist for these platforms.

---

## What Existing Crosslisting Tools Actually Do

Tools like **Vendoo**, **List Perfectly**, and **Crosslist** use a combination of:

1. **Official APIs** where available (eBay, Poshmark, Mercari)
2. **Browser automation** (Selenium/Puppeteer) for platforms without APIs -- this is fragile, breaks frequently, and violates platform ToS
3. **Browser extensions** that inject into the platform's web interface

Vintifi should **only use official APIs** to avoid account bans and legal risk.

---

## Recommended Phased Architecture

```text
Phase 1 (Buildable Now)         Phase 2 (Apply + Wait)        Phase 3 (Future)
========================        ======================        ================
eBay (full API access)          Vinted Pro (allowlist)         Facebook (clipboard)
                                Depop (partner apply)          Gumtree (clipboard)
```

---

## System Design

### Core Concept: Universal Listing Format

Vintifi stores listings in a **platform-agnostic format** internally. When publishing, a "publisher" adapter transforms the universal listing into each platform's required format.

```text
+-------------------+
|  Vintifi Listing   |  (title, description, photos, brand, size, price, condition)
+--------+----------+
         |
    +----v----+--------------------+-------------------+
    |         |                    |                   |
    v         v                    v                   v
  eBay     Vinted Pro           Depop            Clipboard
 Adapter    Adapter             Adapter           (manual)
    |         |                    |                   |
    v         v                    v                   v
 eBay API  Vinted API          Depop API         User pastes
```

### Database Schema Changes

New tables needed:

`**platform_connections**` -- stores each user's linked platform accounts


| Column            | Type              | Description                            |
| ----------------- | ----------------- | -------------------------------------- |
| id                | UUID PK           | Connection ID                          |
| user_id           | UUID FK           | References profiles.user_id            |
| platform          | TEXT              | 'ebay', 'vinted_pro', 'depop'          |
| auth_data         | JSONB (encrypted) | OAuth tokens, refresh tokens, API keys |
| platform_user_id  | TEXT              | User's ID on that platform             |
| platform_username | TEXT              | Display name on platform               |
| status            | TEXT              | 'active', 'expired', 'revoked'         |
| connected_at      | TIMESTAMPTZ       | When connected                         |
| token_expires_at  | TIMESTAMPTZ       | When OAuth token expires               |


`**cross_listings**` -- tracks where each Vintifi listing has been published


| Column              | Type        | Description                                      |
| ------------------- | ----------- | ------------------------------------------------ |
| id                  | UUID PK     | Cross-listing ID                                 |
| listing_id          | UUID FK     | References listings.id                           |
| user_id             | UUID FK     | References profiles.user_id                      |
| platform            | TEXT        | 'ebay', 'vinted_pro', 'depop'                    |
| platform_listing_id | TEXT        | ID on the external platform                      |
| platform_url        | TEXT        | Direct URL to the listing                        |
| status              | TEXT        | 'draft', 'published', 'sold', 'removed', 'error' |
| platform_price      | DECIMAL     | Price set on that platform (may differ)          |
| last_synced_at      | TIMESTAMPTZ | Last sync timestamp                              |
| sync_error          | TEXT        | Last error message if any                        |
| published_at        | TIMESTAMPTZ | When published                                   |


`**platform_sync_log**` -- audit trail for all sync operations


| Column           | Type        | Description                                   |
| ---------------- | ----------- | --------------------------------------------- |
| id               | UUID PK     | Log ID                                        |
| cross_listing_id | UUID FK     | References cross_listings.id                  |
| action           | TEXT        | 'publish', 'update', 'delete', 'sync', 'sold' |
| status           | TEXT        | 'success', 'failed'                           |
| details          | JSONB       | Request/response details                      |
| created_at       | TIMESTAMPTZ | Timestamp                                     |


### Edge Functions

`**connect-ebay**` -- Initiates eBay OAuth flow

- Generates OAuth consent URL with required scopes (`https://api.ebay.com/oauth/api_scope/sell.inventory`, `sell.account`, `sell.fulfillment`)
- User clicks link, authorises on eBay, redirected back with auth code
- Edge function exchanges code for access + refresh tokens
- Stores encrypted tokens in `platform_connections`

`**ebay-token-refresh**` -- Refreshes expired eBay tokens

- eBay access tokens expire after 2 hours; refresh tokens last 18 months
- Called automatically before any eBay API call if token is near expiry

`**publish-to-platform**` -- The core publishing engine

- Accepts: `listing_id`, `platforms[]` (array of target platforms), optional per-platform price overrides
- For each platform:
  1. Retrieves listing data + photos from Vintifi
  2. Transforms into platform-specific format via adapter
  3. Calls platform API to create listing
  4. Stores result in `cross_listings`
  5. Returns success/failure per platform

`**sync-platform-status**` -- Bidirectional sync (scheduled via pg_cron)

- Polls each platform for status changes on published listings
- Detects: sold items, price changes, removed listings
- Updates `cross_listings` and `listings` tables accordingly
- If item sold on one platform, optionally removes from others ("sold-elsewhere" auto-delist)

`**platform-webhook-handler**` -- Receives webhooks from platforms

- Vinted Pro and eBay can push events (item sold, order created)
- Updates listing status in real-time without polling

### Frontend Pages

**Platform Connections page** (new page in Settings)

- Shows cards for each supported platform (eBay, Vinted Pro, Depop)
- "Connect" button initiates OAuth flow
- Shows connection status, username, token health
- "Disconnect" option

**Publish Modal** (on any listing)

- User clicks "Publish" on a listing card
- Modal shows connected platforms with checkboxes
- Per-platform price override fields (pre-filled with AI-recommended prices per platform)
- "Publish to Selected" button
- Real-time status indicators as each platform publishes

**Cross-Listing Dashboard** (new page or tab on Listings)

- Shows all listings with their cross-platform status
- Columns: Vintifi status, eBay status, Vinted status, Depop status
- Filter by platform, status
- Bulk actions: publish selected to platform, remove from platform

---

## Red Tape and Requirements Checklist

### To launch eBay integration (can start immediately):

1. Register at developer.ebay.com with a business email
2. Create an application and get Sandbox keyset (instant)
3. Build and test in Sandbox environment
4. Apply for Production keyset (1-3 day review)
5. Implement OAuth consent flow so each Vintifi user can link their eBay account
6. Store eBay app credentials (client ID, client secret) as backend secrets

### To launch Vinted Pro integration (requires application):

1. Vintifi (the company) needs a Vinted Pro business account
2. Apply at vinted.fr/pro/integrations to be added to the allowlist
3. Wait for approval (timeline unknown, could be weeks/months)
4. Once approved: get access to Pro Integrations Portal, obtain API access key
5. Each Vintifi user who wants Vinted publishing must ALSO have a Vinted Pro account
6. Implement HMAC request signing (not OAuth -- different auth model)

### To launch Depop integration (requires partnership):

1. Email Depop's partner team requesting Selling API access
2. Explain Vintifi's use case and user base
3. Wait for approval and onboarding
4. Once approved: receive OAuth client credentials or API keys
5. Implement OAuth 2.0 flow for user consent

---

## Risks and Honest Assessment


| Risk                                       | Severity | Mitigation                                                                                    |
| ------------------------------------------ | -------- | --------------------------------------------------------------------------------------------- |
| Vinted Pro allowlist rejection             | HIGH     | Build eBay first. Apply early. Prepare a compelling case showing user volume.                 |
| Depop partner rejection                    | MEDIUM   | Apply early. Start with eBay-only launch. Depop is a nice-to-have.                            |
| eBay OAuth token management complexity     | MEDIUM   | Token refresh is well-documented. Build robust refresh logic with retry.                      |
| Platform API rate limits                   | MEDIUM   | Queue publishing jobs. Implement backoff. Batch where possible (eBay supports bulk).          |
| Photo format/size differences per platform | LOW      | Normalise photos to meet all platforms' requirements (max dimensions, file size, format).     |
| Price differences across platforms (fees)  | LOW      | Show fee breakdown per platform in the publish modal. eBay charges fees; Vinted does not.     |
| User confusion about platform requirements | MEDIUM   | Clear onboarding explaining what each platform needs (eBay account, Vinted Pro status, etc.)  |
| Sold-elsewhere sync delay                  | MEDIUM   | Use webhooks where available. Poll every 15 minutes as fallback. Show clear "syncing" status. |


---

## API Keys / Secrets Needed


| Secret                  | For                              | How to Obtain                                              |
| ----------------------- | -------------------------------- | ---------------------------------------------------------- |
| `EBAY_CLIENT_ID`        | eBay API authentication          | developer.ebay.com app dashboard                           |
| `EBAY_CLIENT_SECRET`    | eBay API authentication          | developer.ebay.com app dashboard                           |
| `EBAY_REDIRECT_URI`     | eBay OAuth callback              | Set in eBay app settings (points to Vintifi edge function) |
| `VINTED_PRO_ACCESS_KEY` | Vinted Pro API (future)          | Vinted Pro Integrations Portal (after allowlist approval)  |
| `VINTED_PRO_SECRET_KEY` | Vinted Pro HMAC signing (future) | Vinted Pro Integrations Portal                             |
| `DEPOP_CLIENT_ID`       | Depop OAuth (future)             | Depop partner onboarding (after approval)                  |
| `DEPOP_CLIENT_SECRET`   | Depop OAuth (future)             | Depop partner onboarding                                   |


---

## Recommended Implementation Order

### Sprint 1: Foundation (Week 1-2)

- Create `platform_connections`, `cross_listings`, and `platform_sync_log` database tables with RLS
- Build the Platform Connections settings page (UI only, with "coming soon" badges for Vinted/Depop)
- Build the universal listing adapter architecture in edge functions

### Sprint 2: eBay Integration (Week 3-4)

- Register eBay developer account and get sandbox keys
- Build `connect-ebay` edge function (OAuth flow)
- Build `publish-to-ebay` adapter (createInventoryItem, createOffer, publishOffer)
- Build the Publish Modal component
- Test end-to-end in eBay Sandbox

### Sprint 3: Bidirectional Sync (Week 5-6)

- Build `sync-platform-status` scheduled function
- Build `platform-webhook-handler` for eBay notifications
- Implement "sold elsewhere" auto-delist logic
- Build Cross-Listing Dashboard page
- Apply for eBay production keyset

### Sprint 4: Vinted Pro + Depop (Week 7-8, dependent on approvals)

- Build Vinted Pro adapter (HMAC auth, CreateItems, webhooks)
- Build Depop adapter (OAuth, listings API)
- Wire up additional platforms into existing publish flow

### Ongoing:

- Apply for Vinted Pro allowlist as early as possible (do this on Day 1)
- Apply for Depop partner access as early as possible (do this on Day 1)

---

## Summary

The one-click cross-platform publishing system is absolutely buildable. **eBay is the immediate win** -- fully open APIs, well-documented, no approval gatekeeping. Vinted Pro and Depop are real but require business applications that take time. The architecture should be built platform-agnostic from day one so adding new platforms is just writing a new adapter function.

The bidirectional sync (detecting sales on other platforms and auto-delisting) is feasible for eBay immediately and for Vinted Pro once approved, using a combination of webhooks and polling.

**Recommended first step:** Build the eBay integration end-to-end, including the universal listing format and adapter pattern. This proves the system works and delivers immediate value while Vinted Pro and Depop applications are pending.