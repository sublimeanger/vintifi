
-- Phase 2: Update handle_new_user to grant 3 credits to new free users
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
  VALUES (NEW.id, 3);

  RETURN NEW;
END;
$$;

-- Phase 2: Update enforce_listing_limit — free tier cap drops from 20 to 10
CREATE OR REPLACE FUNCTION public.enforce_listing_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_tier TEXT;
  current_count INTEGER;
  max_allowed INTEGER;
BEGIN
  SELECT subscription_tier INTO current_tier
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  SELECT count(*) INTO current_count
  FROM public.listings
  WHERE user_id = NEW.user_id
    AND status IN ('active', 'reserved');

  max_allowed := CASE current_tier
    WHEN 'free'       THEN 10
    WHEN 'pro'        THEN 200
    WHEN 'business'   THEN 1000
    WHEN 'scale'      THEN 5000
    WHEN 'enterprise' THEN 999999
    ELSE 10
  END;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Listing limit reached for your % plan (% of % allowed). Upgrade to add more items.',
      COALESCE(current_tier, 'free'), current_count, max_allowed;
  END IF;

  RETURN NEW;
END;
$$;
