
-- Create scrape_jobs table to track Lobstr.io scraping runs
CREATE TABLE public.scrape_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type TEXT NOT NULL DEFAULT 'trend_scan',
  lobstr_run_id TEXT,
  lobstr_squid_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  category TEXT,
  raw_results JSONB,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scrape_jobs ENABLE ROW LEVEL SECURITY;

-- Only service role can manage scrape jobs
CREATE POLICY "Service role can manage scrape_jobs"
ON public.scrape_jobs
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Authenticated users can view scrape jobs (for status display)
CREATE POLICY "Authenticated users can view scrape_jobs"
ON public.scrape_jobs
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Add data_source column to trends table
ALTER TABLE public.trends ADD COLUMN IF NOT EXISTS data_source TEXT NOT NULL DEFAULT 'ai_generated';

-- Add trigger for updated_at on scrape_jobs
CREATE TRIGGER update_scrape_jobs_updated_at
BEFORE UPDATE ON public.scrape_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
