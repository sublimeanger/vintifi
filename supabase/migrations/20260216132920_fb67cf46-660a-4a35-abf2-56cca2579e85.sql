
-- Add rich seller profile columns to competitor_profiles
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

-- Create competitor_scans table for scan history
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
