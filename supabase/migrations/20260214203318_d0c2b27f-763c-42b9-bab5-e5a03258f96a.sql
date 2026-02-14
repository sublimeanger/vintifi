
-- Create trends table for Trend Radar
CREATE TABLE public.trends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_or_item TEXT NOT NULL,
  category TEXT NOT NULL,
  trend_direction TEXT NOT NULL DEFAULT 'rising',
  search_volume_change_7d DECIMAL,
  search_volume_change_30d DECIMAL,
  avg_price DECIMAL,
  price_change_30d DECIMAL,
  supply_demand_ratio DECIMAL,
  opportunity_score INTEGER DEFAULT 0,
  ai_summary TEXT,
  estimated_peak_date DATE,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;

-- Trends are readable by all authenticated users
CREATE POLICY "Authenticated users can view trends"
ON public.trends
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only service role can insert/update (via edge functions)
CREATE POLICY "Service role can manage trends"
ON public.trends
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Update trigger
CREATE TRIGGER update_trends_updated_at
BEFORE UPDATE ON public.trends
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
