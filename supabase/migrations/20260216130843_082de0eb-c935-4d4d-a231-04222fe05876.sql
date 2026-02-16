ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS colour text,
  ADD COLUMN IF NOT EXISTS material text;