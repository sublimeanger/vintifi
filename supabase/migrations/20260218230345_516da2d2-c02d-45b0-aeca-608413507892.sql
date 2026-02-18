
CREATE OR REPLACE FUNCTION public.enforce_listing_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    WHEN 'free'       THEN 20
    WHEN 'pro'        THEN 200
    WHEN 'business'   THEN 1000
    WHEN 'scale'      THEN 5000
    WHEN 'enterprise' THEN 999999
    ELSE 20
  END;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Listing limit reached for your % plan (% of % allowed). Upgrade to add more items.', 
      COALESCE(current_tier, 'free'), current_count, max_allowed;
  END IF;

  RETURN NEW;
END;
$function$;
