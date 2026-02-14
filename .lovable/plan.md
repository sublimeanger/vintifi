

# Lobstr.io Integration for Real Vinted Marketplace Data

## Overview

Replace the current Firecrawl-based web search approach in the `lobstr-sync` edge function with a proper Lobstr.io API integration. This connects to real Vinted scrapers configured on Lobstr.io's platform to collect actual marketplace data (listings, prices, sold items, volumes) that feeds into the Trend Radar.

## Prerequisites

- A Lobstr.io account with Vinted scrapers ("Squids") configured for each target category and market (UK, FR, DE, etc.)
- The `LOBSTR_API_KEY` secret is already configured

## How It Works

```text
User clicks "Scan Market"
        |
        v
lobstr-sync (action: launch)
        |
        +--> POST https://api.lobstr.io/v1/squids/{id}/launch
        |    (launches a Run for each configured Squid)
        |
        +--> Stores run IDs in scrape_jobs table
        |
        v
lobstr-sync (action: poll)
        |
        +--> GET https://api.lobstr.io/v1/runs/{id}
        |    (checks if runs are complete)
        |
        v
lobstr-sync (action: process)
        |
        +--> GET https://api.lobstr.io/v1/runs/{id}/results
        |    (fetches all scraped Vinted listing data)
        |
        +--> Sends raw data to AI for trend analysis
        |
        +--> Inserts enriched trends into trends table
        |
        v
Trend Radar displays real marketplace data
```

## Implementation

### 1. Update `lobstr-sync` Edge Function

Rewrite `supabase/functions/lobstr-sync/index.ts` with three actions:

**launch**: 
- Accepts an optional `squid_ids` array (defaults to a hardcoded list of configured Vinted Squid IDs stored as a constant)
- For each Squid ID, calls `POST https://api.lobstr.io/v1/squids/{squid_id}/launch` with header `Authorization: Token {LOBSTR_API_KEY}`
- Records each run ID returned from Lobstr.io in the `scrape_jobs` table (using `lobstr_run_id` and `lobstr_squid_id` columns already in the schema)
- Returns the job ID and list of launched run IDs

**poll**:
- Takes a `job_id` parameter
- Fetches the scrape_job record to get the stored Lobstr.io run IDs
- For each run, calls `GET https://api.lobstr.io/v1/runs/{run_id}` to check status
- Returns overall status: "running" (any run still active), "completed" (all done), or "failed"
- Updates the scrape_job status accordingly

**process**:
- Takes a `job_id` parameter
- For each completed run, calls `GET https://api.lobstr.io/v1/runs/{run_id}/results?limit=500` to fetch scraped Vinted data
- Aggregates all results (listing titles, brands, prices, categories, sold status)
- Sends aggregated data to AI (Lovable AI Gateway / Gemini 2.5 Flash) with a prompt to:
  - Identify trending brands and items from the real data
  - Calculate price distributions and changes
  - Compute supply/demand ratios from listing volumes
  - Score opportunities
- Clears old trends and inserts new AI-enriched trends with `data_source: "lobstr"`
- Marks the job as processed

### 2. Update `scrape_jobs` Table

Add a new column to store multiple run IDs:
- `lobstr_run_ids` (JSONB) -- array of `{squid_id, run_id, status}` objects

This is needed because one "scan" launches multiple Lobstr.io runs (one per category/market).

### 3. Update Frontend (`TrendRadar.tsx`)

Modify the `launchScan` function to support the asynchronous nature of Lobstr.io:
- **launch** returns immediately with a job ID
- **poll** is called on an interval (every 5 seconds) until all runs complete
- **process** is called once all runs finish
- Progress bar updates based on how many runs have completed vs total
- Status messages reflect actual stages: "Launching Vinted scrapers...", "Collecting marketplace data (3/8 complete)...", "AI analysing real listing data..."

### 4. Settings Page: Squid Configuration

Add a small "Market Scan Settings" section to the Settings page where users (or admins) can enter their Lobstr.io Squid IDs. For now, hardcode default Squid IDs as constants in `src/lib/constants.ts` with a comment explaining these need to be configured per Lobstr.io account.

### 5. Fallback Behaviour

If the Lobstr.io API call fails (no API key, invalid Squid IDs, etc.), fall back to the existing Firecrawl search approach so the feature never fully breaks.

## Files Changed/Created

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/lobstr-sync/index.ts` | Rewrite | Full Lobstr.io API integration with launch/poll/process |
| `src/pages/TrendRadar.tsx` | Update | Polling loop for async Lobstr.io runs, better progress |
| `src/lib/constants.ts` | Update | Add default Lobstr.io Squid ID constants |
| Migration SQL | Create | Add `lobstr_run_ids` JSONB column to `scrape_jobs` |

## Technical Details

### Lobstr.io API Endpoints Used

All requests use `Authorization: Token {LOBSTR_API_KEY}` header.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/squids/{id}/launch` | POST | Start a scraping run |
| `/v1/runs/{id}` | GET | Check run status |
| `/v1/runs/{id}/results` | GET | Fetch collected data |
| `/v1/me` | GET | Verify API key / check credits |

### Data Flow

1. Lobstr.io returns raw scraped Vinted data (JSON with fields like title, price, brand, category, condition, views, favourites)
2. Edge function aggregates up to 500 results across all runs
3. AI analyses the real data to extract trends, compute metrics, and generate insights
4. Results stored in `trends` table with `data_source: "lobstr"` for UI differentiation

