
-- Create atomic increment function for usage credits (prevents race conditions)
CREATE OR REPLACE FUNCTION public.increment_usage_credit(
  p_user_id uuid,
  p_column text,
  p_amount int DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_column = 'price_checks_used' THEN
    UPDATE usage_credits SET price_checks_used = price_checks_used + p_amount, updated_at = now() WHERE user_id = p_user_id;
  ELSIF p_column = 'optimizations_used' THEN
    UPDATE usage_credits SET optimizations_used = optimizations_used + p_amount, updated_at = now() WHERE user_id = p_user_id;
  ELSIF p_column = 'vintography_used' THEN
    UPDATE usage_credits SET vintography_used = vintography_used + p_amount, updated_at = now() WHERE user_id = p_user_id;
  END IF;
END;
$$;

-- Enable Realtime on usage_credits so the frontend can subscribe to live changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.usage_credits;
