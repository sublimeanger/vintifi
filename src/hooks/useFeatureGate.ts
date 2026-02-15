import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

export type FeatureKey =
  | "price_check"
  | "optimize_listing"
  | "bulk_optimize"
  | "arbitrage_scanner"
  | "niche_finder"
  | "competitor_tracker"
  | "trend_radar_full"
  | "dead_stock"
  | "clearance_radar"
  | "seasonal_calendar"
  | "relist_scheduler"
  | "cross_listings"
  | "portfolio_optimizer"
  | "charity_briefing";

type TierLevel = "free" | "pro" | "business" | "scale";

type FeatureConfig = {
  minTier: TierLevel;
  usesCredits: boolean;
  creditType?: "price_checks" | "optimizations";
  label: string;
};

const TIER_ORDER: Record<TierLevel, number> = {
  free: 0,
  pro: 1,
  business: 2,
  scale: 3,
};

const FEATURE_CONFIG: Record<FeatureKey, FeatureConfig> = {
  price_check: { minTier: "free", usesCredits: true, creditType: "price_checks", label: "Price Check" },
  optimize_listing: { minTier: "pro", usesCredits: true, creditType: "optimizations", label: "Listing Optimiser" },
  bulk_optimize: { minTier: "business", usesCredits: true, creditType: "optimizations", label: "Bulk Optimiser" },
  arbitrage_scanner: { minTier: "business", usesCredits: false, label: "Arbitrage Scanner" },
  niche_finder: { minTier: "pro", usesCredits: false, label: "Niche Finder" },
  competitor_tracker: { minTier: "pro", usesCredits: false, label: "Competitor Tracker" },
  trend_radar_full: { minTier: "pro", usesCredits: false, label: "Full Trend Radar" },
  dead_stock: { minTier: "pro", usesCredits: false, label: "Dead Stock Engine" },
  clearance_radar: { minTier: "business", usesCredits: false, label: "Clearance Radar" },
  seasonal_calendar: { minTier: "pro", usesCredits: false, label: "Seasonal Calendar" },
  relist_scheduler: { minTier: "pro", usesCredits: false, label: "Relist Scheduler" },
  cross_listings: { minTier: "business", usesCredits: false, label: "Cross-Listings" },
  portfolio_optimizer: { minTier: "pro", usesCredits: false, label: "Portfolio Optimiser" },
  charity_briefing: { minTier: "pro", usesCredits: false, label: "Charity Briefing" },
};

export function useFeatureGate(feature: FeatureKey) {
  const { profile, credits } = useAuth();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const config = FEATURE_CONFIG[feature];
  const userTier = (profile?.subscription_tier || "free") as TierLevel;
  const userTierLevel = TIER_ORDER[userTier] ?? 0;
  const requiredTierLevel = TIER_ORDER[config.minTier] ?? 0;

  const tierAllowed = userTierLevel >= requiredTierLevel;

  let creditsRemaining = Infinity;
  let creditsExhausted = false;

  if (config.usesCredits && credits) {
    if (config.creditType === "price_checks") {
      creditsRemaining = Math.max(0, credits.credits_limit - credits.price_checks_used);
    } else if (config.creditType === "optimizations") {
      creditsRemaining = Math.max(0, credits.credits_limit - credits.optimizations_used);
    }
    creditsExhausted = creditsRemaining <= 0;
  }

  const allowed = tierAllowed && !creditsExhausted;

  let reason: string | null = null;
  if (!tierAllowed) {
    reason = `${config.label} requires a ${config.minTier.charAt(0).toUpperCase() + config.minTier.slice(1)} plan. You're on ${userTier.charAt(0).toUpperCase() + userTier.slice(1)}.`;
  } else if (creditsExhausted) {
    reason = `You've used all your ${config.creditType === "price_checks" ? "price checks" : "optimisations"} this month.`;
  }

  const showUpgrade = useCallback(() => setUpgradeOpen(true), []);
  const hideUpgrade = useCallback(() => setUpgradeOpen(false), []);

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
  };
}
