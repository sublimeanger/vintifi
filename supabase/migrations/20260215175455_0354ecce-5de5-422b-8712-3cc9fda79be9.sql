
-- Create vintography_jobs table
CREATE TABLE public.vintography_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_url TEXT NOT NULL,
  processed_url TEXT,
  operation TEXT NOT NULL DEFAULT 'remove_bg',
  parameters JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'processing',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vintography_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own vintography jobs"
  ON public.vintography_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vintography jobs"
  ON public.vintography_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vintography jobs"
  ON public.vintography_jobs FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage vintography jobs"
  ON public.vintography_jobs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Trigger for updated_at
CREATE TRIGGER update_vintography_jobs_updated_at
  BEFORE UPDATE ON public.vintography_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add vintography_used to usage_credits
ALTER TABLE public.usage_credits ADD COLUMN vintography_used INTEGER NOT NULL DEFAULT 0;

-- Create vintography storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('vintography', 'vintography', true);

-- Storage policies for vintography bucket
CREATE POLICY "Vintography images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vintography');

CREATE POLICY "Users can upload own vintography images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'vintography' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own vintography images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'vintography' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own vintography images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'vintography' AND auth.uid()::text = (storage.foldername(name))[1]);
