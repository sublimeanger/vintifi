-- Phase 1: Add first_item_pass_used column to profiles
ALTER TABLE profiles ADD COLUMN first_item_pass_used BOOLEAN DEFAULT false;

-- Free users with no listings: pass not yet used
UPDATE profiles
SET first_item_pass_used = false
WHERE subscription_tier = 'free'
  AND user_id NOT IN (SELECT DISTINCT user_id FROM listings);

-- Free users with ≥1 listing: pass implicitly consumed
UPDATE profiles
SET first_item_pass_used = true
WHERE subscription_tier = 'free'
  AND user_id IN (SELECT DISTINCT user_id FROM listings);

-- All paid users: pass concept doesn't apply
UPDATE profiles
SET first_item_pass_used = true
WHERE subscription_tier IN ('pro', 'business', 'scale', 'enterprise');