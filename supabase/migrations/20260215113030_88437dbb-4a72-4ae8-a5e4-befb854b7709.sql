
-- Platform connections: stores each user's linked platform accounts
CREATE TABLE public.platform_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,
  auth_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  platform_user_id TEXT,
  platform_username TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform)
);

ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own platform connections"
  ON public.platform_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own platform connections"
  ON public.platform_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own platform connections"
  ON public.platform_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own platform connections"
  ON public.platform_connections FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage platform connections"
  ON public.platform_connections FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Cross listings: tracks where each listing has been published
CREATE TABLE public.cross_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,
  platform_listing_id TEXT,
  platform_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  platform_price NUMERIC,
  last_synced_at TIMESTAMPTZ,
  sync_error TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(listing_id, platform)
);

ALTER TABLE public.cross_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cross listings"
  ON public.cross_listings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cross listings"
  ON public.cross_listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cross listings"
  ON public.cross_listings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cross listings"
  ON public.cross_listings FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage cross listings"
  ON public.cross_listings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Platform sync log: audit trail
CREATE TABLE public.platform_sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cross_listing_id UUID REFERENCES public.cross_listings(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync logs"
  ON public.platform_sync_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage sync logs"
  ON public.platform_sync_log FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
