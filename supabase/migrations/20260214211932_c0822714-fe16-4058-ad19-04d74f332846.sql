
-- Create relist_schedules table for tracking scheduled relists
CREATE TABLE public.relist_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  new_price NUMERIC,
  price_adjustment_percent NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  strategy TEXT DEFAULT 'optimal_timing',
  ai_reason TEXT,
  executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.relist_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own relist schedules"
ON public.relist_schedules FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own relist schedules"
ON public.relist_schedules FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own relist schedules"
ON public.relist_schedules FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own relist schedules"
ON public.relist_schedules FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage relist schedules"
ON public.relist_schedules FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
