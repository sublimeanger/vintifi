

# Bulk Listing Optimiser — CSV Upload for Batch AI Optimisation

## Overview
A new page where sellers upload a CSV file of their inventory, and the system processes each row through the AI listing optimiser to generate SEO-optimised titles, descriptions, tags, and health scores in batch. Results are displayed in a reviewable table with options to save all or selectively to My Listings.

## User Flow

1. Navigate to `/bulk-optimize` (accessible from Dashboard and Listings page)
2. Download a CSV template with expected columns
3. Upload a CSV file (parsed client-side, no server upload needed for the CSV itself)
4. Preview parsed items in a table before processing
5. Click "Optimise All" to process items sequentially through the existing `optimize-listing` edge function
6. Watch real-time progress as each item completes (progress bar + status per row)
7. Review results: expand any row to see full optimised title, description, tags, and health score
8. "Save All to Listings" inserts all optimised items into the `listings` table, or cherry-pick individual items

## What Gets Built

### 1. New Page: `src/pages/BulkOptimize.tsx`
- Header with back navigation (consistent with other pages)
- **Template Download**: Button to download a sample CSV with columns: `title, brand, category, size, condition, description, purchase_price`
- **CSV Upload Zone**: Drag-and-drop or click-to-upload area accepting `.csv` files
- **Preview Table**: Shows parsed rows before processing with validation indicators (missing required fields highlighted)
- **Processing State**: Progress bar showing "Optimising 3 of 12...", each row gets a spinner then checkmark
- **Results Table**: Expandable rows showing original vs optimised data, health score badge, suggested tags
- **Bulk Actions**: "Save All to Listings" button, individual row "Save" and "Copy" buttons
- Limit: max 50 items per batch (to respect API rate limits and credits)

### 2. New Route in `App.tsx`
- Add `/bulk-optimize` route wrapped in `ProtectedRoute` and `OnboardingGuard`

### 3. CSV Parsing (Client-Side)
- Simple client-side CSV parser (no library needed — split by newlines and commas with quote handling)
- Validates required columns exist
- Shows row count and any validation warnings before processing

### 4. Processing Logic
- Items are sent one-by-one to the existing `optimize-listing` edge function (no new edge function needed)
- Sequential processing with a small delay between calls to avoid rate limiting
- Each item's result is stored in component state and displayed as it completes
- If a single item fails, it's marked as failed and processing continues with the next item
- Credit usage is tracked per-item by the existing edge function logic

### 5. Navigation Links
- Add "Bulk Upload" button on the Listings page header
- Add quick action on Dashboard if appropriate

## Technical Details

### CSV Template Format
```text
title,brand,category,size,condition,description,purchase_price
"Nike Air Max 90",Nike,Trainers,UK 9,Very Good,"Original Nike trainers, barely worn",25
"Carhartt WIP Hoodie",Carhartt WIP,Hoodies,M,Good,"Classic logo hoodie",15
```

### Processing Architecture
- Reuses the existing `optimize-listing` edge function without modification
- Each row is sent as: `{ brand, category, size, condition, currentTitle: title, currentDescription: description }`
- No photo support in bulk mode (text-only optimisation) — keeps it fast and practical for CSV imports
- Results are held in React state; nothing is persisted until the user explicitly saves

### Saving to Listings
- Uses `supabase.from("listings").insert()` with the existing schema
- Maps optimised fields: `title`, `description`, `brand`, `category`, `condition`, `size`, `health_score`, `purchase_price`, `status: "active"`

### Rate Limit Handling
- 1-second delay between API calls to avoid 429 errors
- If a 429 is received, pause for 5 seconds then retry that item once
- Shows clear messaging if credit limit is hit mid-batch

### UI Patterns
- Consistent with existing pages: same header style, Card components, motion animations
- Progress uses the existing `Progress` component
- Health scores use the existing `HealthScoreMini` component
- Expandable rows use Collapsible or Accordion from the existing UI library

