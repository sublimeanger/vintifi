
-- Sprint 1.1: Add tracking columns to listings
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_meta JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_price_check_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_optimised_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_photo_edit_at TIMESTAMPTZ;

-- Sprint 1.1: Create item_activity table
CREATE TABLE public.item_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.item_activity ENABLE ROW LEVEL SECURITY;

-- RLS: users can only read their own activity
CREATE POLICY "Users can view own activity"
  ON public.item_activity FOR SELECT
  USING (auth.uid() = user_id);

-- RLS: users can insert their own activity
CREATE POLICY "Users can insert own activity"
  ON public.item_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS: users can delete own activity
CREATE POLICY "Users can delete own activity"
  ON public.item_activity FOR DELETE
  USING (auth.uid() = user_id);

-- RLS: service role full access
CREATE POLICY "Service role can manage activity"
  ON public.item_activity FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Index for fast user queries
CREATE INDEX idx_item_activity_user_id ON public.item_activity(user_id);
CREATE INDEX idx_item_activity_listing_id ON public.item_activity(listing_id);
CREATE INDEX idx_item_activity_created_at ON public.item_activity(created_at DESC);
