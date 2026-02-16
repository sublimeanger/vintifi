
# Competitor Tracker — Enterprise Deep-Dive Upgrade

## Problems Identified

1. **No Vinted profile scraping**: The add form asks for manual text fields (name, username, query, category) but never actually scrapes a Vinted seller profile. The Apify actor has a dedicated `SELLER_PROFILE` mode that takes a Vinted member URL and returns full seller data (rating, reviews, followers, sold items, verification status) — this is completely unused.

2. **Competitor cards are not clickable**: After scanning, the card just sits there showing avg price and listing count. No way to drill into results, see the seller's top items, read the AI summary, or visit their Vinted profile.

3. **Weak data model**: The `competitor_profiles` table only stores `avg_price`, `listing_count`, and `price_trend`. There's no room for seller profile data (rating, followers, sold count, profile URL, profile photo), scan summaries, or top items from the last scan.

4. **Generic search, not seller intelligence**: The edge function does a generic Apify SEARCH with the username as a keyword. This returns random items matching that text, not the actual seller's listings. The intelligence is fabricated by the AI from irrelevant search results.

5. **No scan history**: Each scan overwrites the previous data. There's no way to see how a competitor's metrics changed over time.

---

## Upgrade Plan

### A. Database Migration

Add new columns to `competitor_profiles` to store real seller intelligence:

```sql
ALTER TABLE public.competitor_profiles
  ADD COLUMN IF NOT EXISTS vinted_profile_url text,
  ADD COLUMN IF NOT EXISTS profile_photo_url text,
  ADD COLUMN IF NOT EXISTS seller_rating numeric,
  ADD COLUMN IF NOT EXISTS follower_count integer,
  ADD COLUMN IF NOT EXISTS total_items_sold integer,
  ADD COLUMN IF NOT EXISTS verification_status text,
  ADD COLUMN IF NOT EXISTS top_items jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS last_scan_data jsonb;
```

Create a `competitor_scans` table for scan history:

```sql
CREATE TABLE public.competitor_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES public.competitor_profiles(id) ON DELETE CASCADE,
  avg_price numeric,
  listing_count integer,
  seller_rating numeric,
  follower_count integer,
  total_items_sold integer,
  price_trend text,
  top_items jsonb DEFAULT '[]',
  ai_summary text,
  raw_data jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.competitor_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own scans"
  ON public.competitor_scans FOR ALL USING (auth.uid() = user_id);
```

### B. Edge Function: Real Seller Intelligence (`competitor-scan`)

Complete rewrite with three intelligence modes:

**Mode 1 — Seller Profile scan** (when `vinted_profile_url` is provided):
- Use Apify `SELLER_PROFILE` mode with the member URL to get real seller data: rating, followers, sold count, verification status, profile photo
- Use Apify `SEARCH` mode filtered to that seller's username to get their current active listings with prices, views, and favourites
- AI analyses the full dataset and generates a competitive intelligence summary

**Mode 2 — Niche/keyword scan** (when only `search_query` is provided):
- Use Apify `SEARCH` mode with the query (current behaviour, but improved)
- AI identifies dominant sellers within that niche, pricing patterns, and competitive density

**Mode 3 — Combined** (both URL and query):
- Scrape the seller profile AND search their niche to provide contextual positioning

The AI prompt will be significantly upgraded to produce richer analysis including: seller strength assessment, pricing strategy detection, threat level rating, and specific actionable recommendations.

All scan results are saved to `competitor_scans` for history tracking.

### C. Frontend: Smart Add Flow

Replace the current dumb text-field form with an intelligent add flow:

1. **URL-first input**: Primary input is a single field: "Paste a Vinted seller profile URL or enter a search query". The system detects whether it's a URL (contains `vinted.` and `/member/`) or a search query.

2. **Auto-populate from URL**: When a Vinted profile URL is pasted, the system immediately calls the edge function in "preview" mode to fetch the seller's name, photo, rating, and item count. The form auto-fills with real data before saving.

3. **Fallback to manual**: If no URL, the user can still enter a search query / niche keyword to track. The category field remains optional.

### D. Frontend: Clickable Competitor Detail View

Competitor cards become clickable and expand into a rich detail view:

1. **Expandable card**: Clicking a competitor card expands it inline (or navigates to a detail section) showing:
   - Seller profile header: photo, name, rating stars, follower count, items sold, verification badge
   - Link to their Vinted profile (opens in new tab)
   - AI intelligence summary from the last scan
   - Top items grid: 3-6 items with thumbnails, prices, and links
   - Price trend sparkline from scan history
   - All alerts for this competitor

2. **Scan history chart**: A small line chart showing avg_price and listing_count over time from `competitor_scans`.

3. **Quick actions**: "Scan Now", "View on Vinted", "Price Check This Niche", "Delete"

### E. Smarter AI Prompt

The upgraded AI prompt will:
- Receive structured seller profile data (not just search snippets)
- Produce a threat assessment: "High Threat — this seller dominates your niche with 340 listings and a 4.9 rating"
- Identify their pricing strategy: "Prices 15% below market average, likely competing on volume"
- Suggest counter-strategies: "Consider bundling or premium positioning to differentiate"
- Score the competitive threat on a 1-10 scale
- Identify their best-selling categories and price ranges

---

## Files Changed Summary

| File | Change |
|------|--------|
| Database migration | Add profile columns to `competitor_profiles`, create `competitor_scans` table |
| `supabase/functions/competitor-scan/index.ts` | Full rewrite: SELLER_PROFILE mode, scan history, richer AI analysis |
| `src/pages/CompetitorTracker.tsx` | URL-first add flow, expandable detail cards, scan history, seller profile display |
