
CREATE TABLE public.clearance_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  retailer TEXT NOT NULL,
  item_title TEXT NOT NULL,
  item_url TEXT,
  image_url TEXT,
  sale_price DECIMAL,
  vinted_resale_price DECIMAL,
  estimated_profit DECIMAL,
  profit_margin DECIMAL,
  brand TEXT,
  category TEXT,
  ai_notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clearance_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own clearance opportunities"
  ON public.clearance_opportunities FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
