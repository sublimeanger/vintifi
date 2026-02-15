import { useFeatureGate, type FeatureKey } from "@/hooks/useFeatureGate";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";

type Props = {
  feature: FeatureKey;
  children: React.ReactNode;
};

/**
 * Wraps a feature page. If the user's tier is insufficient,
 * shows a banner + blocks the content behind a blur overlay.
 */
export function FeatureGate({ feature, children }: Props) {
  const gate = useFeatureGate(feature);

  // If user has access, render children directly
  if (gate.allowed) {
    return (
      <>
        {children}
        <UpgradeModal
          open={gate.upgradeOpen}
          onClose={gate.hideUpgrade}
          reason={gate.reason}
          tierRequired={gate.tierRequired}
          showCredits={gate.config.usesCredits}
        />
      </>
    );
  }

  // Locked state
  return (
    <>
      {/* Gate banner */}
      <div className="mb-4 p-3.5 sm:p-4 rounded-xl border border-primary/20 bg-primary/[0.03] flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Crown className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{gate.reason}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Upgrade to access {gate.featureLabel}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button onClick={gate.showUpgrade} size="sm" className="font-semibold h-9 active:scale-95 transition-transform">
            <Crown className="w-3.5 h-3.5 mr-1.5" />
            Upgrade Now
          </Button>
        </div>
      </div>

      {/* Blurred content preview */}
      <div className="relative">
        <div className="blur-[3px] pointer-events-none select-none opacity-50">
          {children}
        </div>
      </div>

      <UpgradeModal
        open={gate.upgradeOpen}
        onClose={gate.hideUpgrade}
        reason={gate.reason}
        tierRequired={gate.tierRequired}
        showCredits={gate.config.usesCredits}
      />
    </>
  );
}
