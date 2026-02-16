-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Create a function to reset monthly usage credits
CREATE OR REPLACE FUNCTION public.reset_monthly_usage_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.usage_credits
  SET
    price_checks_used = 0,
    optimizations_used = 0,
    vintography_used = 0,
    period_start = date_trunc('month', now()),
    period_end = date_trunc('month', now()) + interval '1 month',
    updated_at = now();
    
  RAISE LOG '[CREDIT-RESET] Reset usage credits for all users at %', now();
END;
$$;

-- Schedule the credit reset to run at midnight on the 1st of every month (UTC)
SELECT cron.schedule(
  'reset-monthly-credits',
  '0 0 1 * *',
  $$SELECT public.reset_monthly_usage_credits()$$
);