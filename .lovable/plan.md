

# Lobstr.io Integration Plan

## Overview

Integrate Lobstr.io as the scheduled bulk data collection layer to replace the current AI-simulated trend data with real Vinted marketplace data. This creates the "real intelligence" backbone described in the spec.

## How It Works

Currently, the Trend Radar generates fake trends using AI. With Lobstr.io, the system will:

1. Use the Google Search Scraper crawler to search for Vinted marketplace data (trending brands, categories, pricing)
2. Store raw scraped results in a staging table
3. Process results through AI to extract structured trend insights
4. Feed real data into the existing `trends` table

Since Lobstr.io doesn't have a dedicated Vinted crawler, we'll use the **Google Search Scraper** to search for Vinted-specific queries (e.g., "site:vinted.co.uk Carhartt WIP", trending brand searches) and combine this with Firecrawl for direct Vinted page scraping.

## Implementation Steps

### Step 1: Store the API Key

Save the Lobstr.io API key (`c1add0fb...`) as a backend secret named `LOBSTR_API_KEY`.

### Step 2: Create Database Tables

**`scrape_jobs` table** -- tracks Lobstr.io scraping jobs:
- `id` (UUID, PK)
- `job_type` (TEXT) -- "trend_scan", "category_scan", "competitor_scan"
- `lobstr_run_id` (TEXT) -- Lobstr.io run ID for polling
- `lobstr_squid_id` (TEXT) -- Squid/cluster ID
- `status` (TEXT) -- "pending", "running", "completed", "failed"
- `category` (TEXT, nullable)
- `raw_results` (JSONB, nullable)
- `processed` (BOOLEAN, default false)
- `created_at`, `updated_at` (TIMESTAMPTZ)

RLS: service role only (no direct user access needed).

### Step 3: Create `lobstr-sync` Edge Function

A new edge function that handles the full Lobstr.io lifecycle:

**Action: `launch`** -- Starts a scraping job:
1. Calls `POST https://api.lobstr.io/v1/squids` to create a squid using Google Search Scraper
2. Adds tasks with Vinted search queries per category (e.g., "vinted trending womenswear UK 2026", "site:vinted.co.uk most popular brands")
3. Launches a run via `POST https://api.lobstr.io/v1/squids/{id}/launch`
4. Stores the run ID in `scrape_jobs`

**Action: `poll`** -- Checks run status and fetches results:
1. Calls `GET https://api.lobstr.io/v1/runs/{run_id}` to check status
2. When complete, fetches results via `GET https://api.lobstr.io/v1/runs/{run_id}/results`
3. Stores raw results in `scrape_jobs.raw_results`

**Action: `process`** -- Enriches raw data with AI:
1. Takes raw Google Search results about Vinted trends
2. Sends to Gemini AI for structured analysis (extract brand names, price points, demand signals)
3. Writes enriched trend data to the existing `trends` table
4. Marks the scrape job as processed

### Step 4: Update `fetch-trends` Edge Function

Modify the existing function to:
- First check for recent real data from Lobstr.io (processed scrape jobs)
- If no real data exists, fall back to AI-generated trends (current behaviour)
- Add a `source` field indicator ("lobstr" vs "ai_generated") so users know data provenance

### Step 5: Add `data_source` Column to `trends` Table

Add a `data_source` TEXT column (default "ai_generated") to distinguish between real scraped data and AI-simulated data.

### Step 6: Update Trend Radar UI

- Show a badge indicating whether trends are from real market data or AI-generated
- Add a "Scan Market" button that triggers a Lobstr.io scraping job
- Show scrape job status (running/completed) with a progress indicator
- Display "Last scraped: X hours ago" timestamp

### Step 7: Scheduled Scraping (Optional / Future)

Set up a `pg_cron` job to automatically trigger the `lobstr-sync` edge function every 6 hours, replacing manual triggers.

## Technical Details

### Lobstr.io API Pattern

All requests use:
```text
Authorization: Token c1add0fb1b3260c64a71c1e2449f26c35b601763
Base URL: https://api.lobstr.io/v1
```

Key endpoints:
- `GET /crawlers` -- list available scrapers
- `POST /squids` -- create a scraping cluster
- `POST /squids/{id}/tasks` -- add URLs/queries to scrape
- `POST /squids/{id}/launch` -- start the run
- `GET /runs/{id}` -- check run status
- `GET /runs/{id}/results` -- download results

### Vinted Search Strategy

Since there's no dedicated Vinted crawler, we use Google Search Scraper with targeted queries:
- "site:vinted.co.uk {brand} {category}" for specific brand monitoring
- "vinted trending brands {month} {year}" for trend detection
- "vinted most sold items UK" for demand signals

These results are then enriched by AI to extract structured trend data.

### Files to Create/Modify

| File | Action |
|---|---|
| `supabase/functions/lobstr-sync/index.ts` | Create -- Lobstr.io API integration |
| `supabase/functions/fetch-trends/index.ts` | Modify -- add real data fallback |
| `src/pages/TrendRadar.tsx` | Modify -- add data source indicator and scan button |
| `supabase/config.toml` | Modify -- add lobstr-sync function config |
| Database migration | Create -- `scrape_jobs` table + `data_source` column on `trends` |

