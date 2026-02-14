
-- Create arbitrage_opportunities table
CREATE TABLE public.arbitrage_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_platform TEXT NOT NULL,
  source_url TEXT,
  source_title TEXT,
  source_price NUMERIC,
  vinted_estimated_price NUMERIC,
  estimated_profit NUMERIC,
  profit_margin NUMERIC,
  brand TEXT,
  category TEXT,
  condition TEXT,
  image_url TEXT,
  ai_notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.arbitrage_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own arbitrage opportunities"
ON public.arbitrage_opportunities FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own arbitrage opportunities"
ON public.arbitrage_opportunities FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own arbitrage opportunities"
ON public.arbitrage_opportunities FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage arbitrage opportunities"
ON public.arbitrage_opportunities FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_arbitrage_opportunities_updated_at
BEFORE UPDATE ON public.arbitrage_opportunities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
