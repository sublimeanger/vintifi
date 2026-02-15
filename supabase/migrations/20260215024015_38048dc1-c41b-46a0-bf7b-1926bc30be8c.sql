
-- Add enrichment columns to arbitrage_opportunities
ALTER TABLE public.arbitrage_opportunities
  ADD COLUMN IF NOT EXISTS deal_score integer,
  ADD COLUMN IF NOT EXISTS risk_level text,
  ADD COLUMN IF NOT EXISTS estimated_days_to_sell integer,
  ADD COLUMN IF NOT EXISTS demand_indicator text,
  ADD COLUMN IF NOT EXISTS suggested_listing_title text,
  ADD COLUMN IF NOT EXISTS shipping_estimate numeric,
  ADD COLUMN IF NOT EXISTS net_profit numeric;

-- Create saved_searches table
CREATE TABLE public.saved_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  brand TEXT,
  category TEXT,
  min_margin INTEGER NOT NULL DEFAULT 30,
  platforms TEXT[] NOT NULL DEFAULT ARRAY['eBay', 'Depop', 'Facebook Marketplace', 'Gumtree'],
  label TEXT,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved searches"
  ON public.saved_searches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved searches"
  ON public.saved_searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved searches"
  ON public.saved_searches FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved searches"
  ON public.saved_searches FOR DELETE
  USING (auth.uid() = user_id);
