
-- Add referral_code column to profiles
ALTER TABLE public.profiles ADD COLUMN referral_code TEXT UNIQUE;

-- Create referrals table
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referee_id UUID NOT NULL UNIQUE,
  referral_code TEXT NOT NULL,
  credits_awarded INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view referrals where they are the referrer
CREATE POLICY "Users can view own referrals as referrer"
ON public.referrals
FOR SELECT
USING (auth.uid() = referrer_id);

-- Service role can manage all referrals
CREATE POLICY "Service role can manage referrals"
ON public.referrals
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Update handle_new_user to generate referral codes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    upper(substr(md5(random()::text), 1, 8))
  );

  INSERT INTO public.usage_credits (user_id, credits_limit)
  VALUES (NEW.id, 5);

  RETURN NEW;
END;
$$;

-- Backfill existing profiles that don't have a referral code
UPDATE public.profiles
SET referral_code = upper(substr(md5(random()::text || id::text), 1, 8))
WHERE referral_code IS NULL;
