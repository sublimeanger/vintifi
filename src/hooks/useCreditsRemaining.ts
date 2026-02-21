import { useAuth } from "@/contexts/AuthContext";

export function useCreditsRemaining() {
  const { credits } = useAuth();

  if (!credits) return { remaining: null, limit: null, used: null, isUnlimited: false, isLow: false, isDepleted: false };

  const isUnlimited = credits.credits_limit >= 999999;
  const used = credits.price_checks_used + credits.optimizations_used + credits.vintography_used;
  const remaining = Math.max(0, credits.credits_limit - used);

  return {
    remaining,
    limit: credits.credits_limit,
    used,
    isUnlimited,
    isLow: !isUnlimited && remaining <= 5,
    isDepleted: !isUnlimited && remaining <= 0,
  };
}
