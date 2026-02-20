import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { type TierKey, TIER_ORDER, isAtLeastTier } from "@/lib/constants";

export type FeatureKey =
  | "price_check"
  | "optimize_listing"
  | "bulk_optimize"
  | "niche_finder"
  | "trend_radar_full"
  | "vintography"
  | "vintography_flatlay"
  | "vintography_mannequin"
  | "vintography_ai_model"
  | "sell_wizard";

type FeatureConfig = {
  minTier: TierKey;
  usesCredits: boolean;
  creditType?: "price_checks" | "optimizations";
  label: string;
};

const FEATURE_CONFIG: Record<FeatureKey, FeatureConfig> = {
  price_check: { minTier: "free", usesCredits: true, creditType: "price_checks", label: "Price Check" },
  optimize_listing: { minTier: "starter", usesCredits: true, creditType: "optimizations", label: "Listing Optimiser" },
  bulk_optimize: { minTier: "pro", usesCredits: true, creditType: "optimizations", label: "Bulk Optimiser" },
  niche_finder: { minTier: "pro", usesCredits: false, label: "Niche Finder" },
  trend_radar_full: { minTier: "starter", usesCredits: false, label: "Full Trend Radar" },
  vintography: { minTier: "free", usesCredits: true, creditType: "optimizations", label: "Photo Studio" },
  vintography_flatlay: { minTier: "starter", usesCredits: true, creditType: "optimizations", label: "Flat-Lay Pro" },
  vintography_mannequin: { minTier: "starter", usesCredits: true, creditType: "optimizations", label: "Mannequin Shot" },
  vintography_ai_model: { minTier: "business", usesCredits: true, creditType: "optimizations", label: "AI Model Shot" },
  sell_wizard: { minTier: "free", usesCredits: true, creditType: "optimizations", label: "Sell Wizard" },
};

export function useFeatureGate(feature: FeatureKey) {
  const { profile, credits } = useAuth();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const config = FEATURE_CONFIG[feature];
  const userTier = (profile?.subscription_tier || "free") as TierKey;
  const userTierLevel = TIER_ORDER[userTier] ?? 0;
  const requiredTierLevel = TIER_ORDER[config.minTier] ?? 0;

  const tierAllowed = userTierLevel >= requiredTierLevel;
  // Only manually-gifted accounts (credits_limit >= 999999) are truly unlimited
  const isUnlimited = (credits?.credits_limit ?? 0) >= 999999;

  let creditsRemaining = Infinity;
  let creditsExhausted = false;

  if (config.usesCredits && credits && !isUnlimited) {
    const totalUsed = credits.price_checks_used + credits.optimizations_used + credits.vintography_used;
    creditsRemaining = Math.max(0, credits.credits_limit - totalUsed);
    creditsExhausted = creditsRemaining <= 0;
  }

  const allowed = tierAllowed && !creditsExhausted;

  let reason: string | null = null;
  if (!tierAllowed) {
    reason = `${config.label} requires a ${config.minTier.charAt(0).toUpperCase() + config.minTier.slice(1)} plan. You're on ${userTier.charAt(0).toUpperCase() + userTier.slice(1)}.`;
  } else if (creditsExhausted) {
    reason = `You've used all your credits this month.`;
  }

  const showUpgrade = useCallback(() => setUpgradeOpen(true), []);
  const hideUpgrade = useCallback(() => setUpgradeOpen(false), []);

  // first-item-free pass awareness (only relevant for sell_wizard feature)
  const firstItemPassUsed = profile?.first_item_pass_used ?? false;
  const freePassActive = feature === "sell_wizard" && userTier === "free" && !firstItemPassUsed;

  return {
    allowed,
    reason,
    showUpgrade,
    hideUpgrade,
    upgradeOpen,
    creditsRemaining,
    tierRequired: config.minTier,
    featureLabel: config.label,
    userTier,
    config,
    freePassActive,
    firstItemPassUsed,
  };
}
