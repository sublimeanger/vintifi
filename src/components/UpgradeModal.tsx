import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { STRIPE_TIERS, CREDIT_PACKS, type TierKey } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Zap, Crown, Sparkles, X, CreditCard, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

type UpgradeModalProps = {
  open: boolean;
  onClose: () => void;
  reason?: string | null;
  tierRequired?: string;
  showCredits?: boolean;
};

const TIER_ICONS: Record<string, typeof Crown> = {
  pro: Sparkles,
  business: Zap,
  scale: Crown,
  enterprise: Shield,
};

const UPGRADE_TIERS: TierKey[] = ["pro", "business", "scale", "enterprise"];

export function UpgradeModal({ open, onClose, reason, tierRequired, showCredits }: UpgradeModalProps) {
  const isMobile = useIsMobile();
  const { profile } = useAuth();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [loadingCredit, setLoadingCredit] = useState<string | null>(null);

  const userTier = (profile?.subscription_tier || "free") as TierKey;

  const handleUpgrade = async (tier: TierKey) => {
    const priceId = STRIPE_TIERS[tier].price_id;
    if (!priceId) return;

    setLoadingTier(tier);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { price_id: priceId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e.message || "Failed to start checkout");
    } finally {
      setLoadingTier(null);
    }
  };

  const handleBuyCredits = async (priceId: string) => {
    setLoadingCredit(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("buy-credits", {
        body: { price_id: priceId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e.message || "Failed to start checkout");
    } finally {
      setLoadingCredit(null);
    }
  };

  const content = (
    <div className="space-y-4 sm:space-y-5 pb-2">
      {reason && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
          {reason}
        </div>
      )}

      {/* Plan cards */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Upgrade Your Plan</h4>
        {UPGRADE_TIERS.map((tier) => {
          const t = STRIPE_TIERS[tier];
          const Icon = TIER_ICONS[tier] || Sparkles;
          const isCurrent = userTier === tier;
          const isHighlighted = tierRequired === tier;

          return (
            <Card
              key={tier}
              className={`p-3.5 sm:p-4 transition-all ${
                isHighlighted ? "border-primary/40 bg-primary/[0.03]" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isHighlighted ? "bg-primary/10" : "bg-muted"
                  }`}>
                    <Icon className={`w-4 h-4 ${isHighlighted ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-display font-bold text-sm">{t.name}</span>
                      {isCurrent && (
                        <Badge variant="outline" className="text-[9px] py-0">Current</Badge>
                      )}
                      {isHighlighted && !isCurrent && (
                        <Badge className="text-[9px] py-0 bg-primary text-primary-foreground">Required</Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{t.credits.toLocaleString()} credits/mo</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-display font-bold text-sm">£{t.price}</span>
                  <span className="text-[10px] text-muted-foreground">/mo</span>
                  {!isCurrent && (
                    <Button
                      size="sm"
                      className="h-8 text-xs font-semibold active:scale-95 transition-transform"
                      variant={isHighlighted ? "default" : "outline"}
                      onClick={() => handleUpgrade(tier)}
                      disabled={loadingTier === tier}
                    >
                      {loadingTier === tier ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        "Upgrade"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Credit packs */}
      {(showCredits || reason?.includes("used all")) && (
        <div className="space-y-2.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            Or Buy Credit Packs
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {CREDIT_PACKS.map((pack) => (
              <Card
                key={pack.price_id}
                className={`p-3 text-center cursor-pointer hover:border-primary/40 active:scale-[0.98] transition-all ${
                  pack.popular ? "border-primary/30 bg-primary/[0.02]" : ""
                }`}
                onClick={() => handleBuyCredits(pack.price_id)}
              >
                {pack.popular && (
                  <Badge className="text-[8px] py-0 mb-1.5 bg-primary text-primary-foreground">Popular</Badge>
                )}
                <p className="font-display font-bold text-lg">{pack.credits}</p>
                <p className="text-[10px] text-muted-foreground mb-2">credits</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-[10px] font-semibold"
                  disabled={loadingCredit === pack.price_id}
                >
                  {loadingCredit === pack.price_id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    `£${pack.price}`
                  )}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="font-display flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Upgrade to Unlock
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            Upgrade to Unlock
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
