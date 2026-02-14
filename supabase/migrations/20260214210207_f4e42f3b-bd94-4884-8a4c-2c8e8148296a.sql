
-- Competitor profiles: users track specific Vinted sellers or search terms
CREATE TABLE public.competitor_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  competitor_name TEXT NOT NULL,
  vinted_username TEXT,
  search_query TEXT,
  category TEXT,
  last_scanned_at TIMESTAMP WITH TIME ZONE,
  avg_price NUMERIC,
  listing_count INTEGER DEFAULT 0,
  price_trend TEXT DEFAULT 'stable',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.competitor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own competitors"
  ON public.competitor_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own competitors"
  ON public.competitor_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own competitors"
  ON public.competitor_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own competitors"
  ON public.competitor_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Competitor alerts: price drops, new listings, new sellers in niche
CREATE TABLE public.competitor_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  competitor_id UUID REFERENCES public.competitor_profiles(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL DEFAULT 'price_drop',
  title TEXT NOT NULL,
  description TEXT,
  old_value NUMERIC,
  new_value NUMERIC,
  source_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.competitor_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts"
  ON public.competitor_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON public.competitor_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
  ON public.competitor_alerts FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage alerts"
  ON public.competitor_alerts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
