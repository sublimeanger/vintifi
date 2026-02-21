import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { STRIPE_TIERS, CREDIT_PACKS, type TierKey, TIER_ORDER } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Zap, Crown, Sparkles, CreditCard, Coffee, ArrowRight, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  starter: Sparkles,
  pro: Zap,
  business: Crown,
};

const TIER_GRADIENTS: Record<string, string> = {
  starter: "from-primary/10 to-primary/5",
  pro: "from-accent/10 to-accent/5",
  business: "from-primary/15 to-primary/5",
};

const UPGRADE_TIERS: TierKey[] = ["starter", "pro", "business"];

export function UpgradeModal({ open, onClose, reason, tierRequired, showCredits }: UpgradeModalProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { profile, credits } = useAuth();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [loadingCredit, setLoadingCredit] = useState<string | null>(null);

  const userTier = (profile?.subscription_tier || "free") as TierKey;
  const totalUsed = credits ? credits.price_checks_used + credits.optimizations_used + credits.vintography_used : 0;
  const creditsRemaining = credits ? credits.credits_limit - totalUsed : null;
  const isZeroCredits = creditsRemaining !== null && creditsRemaining <= 0 && (credits?.credits_limit ?? 0) < 999999;

  const smallPack = CREDIT_PACKS[0];
  const starterPlan = STRIPE_TIERS.starter;

  const handleBuySmallPack = async () => {
    setLoadingCredit(smallPack.price_id);
    try {
      const { data, error } = await supabase.functions.invoke("buy-credits", {
        body: { price_id: smallPack.price_id },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e.message || "Failed to start checkout");
    } finally {
      setLoadingCredit(null);
    }
  };

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
    <div className="space-y-5 pb-2">
      {/* Zero-credit emergency card */}
      {isZeroCredits && (
        <div className="rounded-2xl border border-destructive/20 bg-gradient-to-br from-destructive/[0.04] to-destructive/[0.01] p-4 space-y-3">
          <p className="font-display font-bold text-sm text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center">⚡</span>
            You're out of credits
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleBuySmallPack}
              disabled={loadingCredit === smallPack.price_id}
              className="group relative rounded-xl border border-border bg-card p-3.5 text-center hover:border-primary/40 hover:shadow-sm active:scale-[0.97] transition-all"
            >
              <p className="font-display font-bold text-xl text-foreground">{smallPack.credits}</p>
              <p className="text-[10px] text-muted-foreground mb-2">credits</p>
              <div className="inline-flex items-center h-7 px-3 rounded-full bg-muted text-xs font-semibold text-foreground">
                {loadingCredit === smallPack.price_id ? <Loader2 className="w-3 h-3 animate-spin" /> : `£${smallPack.price}`}
              </div>
            </button>
            <button
              onClick={() => handleUpgrade("starter")}
              disabled={loadingTier === "starter"}
              className="group relative rounded-xl border border-primary/30 bg-gradient-to-br from-primary/[0.06] to-primary/[0.02] p-3.5 text-center hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 active:scale-[0.97] transition-all"
            >
              <p className="font-display font-bold text-xl text-primary">{starterPlan.credits}</p>
              <p className="text-[10px] text-muted-foreground mb-2">credits/mo</p>
              <div className="inline-flex items-center h-7 px-3 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                {loadingTier === "starter" ? <Loader2 className="w-3 h-3 animate-spin" /> : `£${starterPlan.price}/mo`}
              </div>
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
            <Coffee className="w-3 h-3" /> Less than a coffee → {smallPack.credits} more edits
          </p>
        </div>
      )}

      {reason && (
        <div className="p-3.5 rounded-xl bg-primary/[0.04] border border-primary/15 text-sm text-foreground/80 leading-relaxed">
          {reason}
        </div>
      )}

      {/* Plan cards */}
      <div className="space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <span className="h-px flex-1 bg-border" />
          Upgrade Your Plan
          <span className="h-px flex-1 bg-border" />
        </h4>
        <div className="space-y-2">
          {UPGRADE_TIERS.map((tier) => {
            const t = STRIPE_TIERS[tier];
            const Icon = TIER_ICONS[tier] || Sparkles;
            const isCurrent = userTier === tier;
            const isHighlighted = tierRequired === tier;
            const userLevel = TIER_ORDER[userTier] ?? 0;
            const tierLevel = TIER_ORDER[tier] ?? 0;
            const isDowngrade = tierLevel <= userLevel;

            return (
              <button
                key={tier}
                onClick={() => !isCurrent && !isDowngrade && handleUpgrade(tier)}
                disabled={isCurrent || isDowngrade || loadingTier === tier}
                className={`w-full text-left rounded-xl border p-4 transition-all active:scale-[0.98] ${
                  isCurrent
                    ? "border-primary/30 bg-primary/[0.04] ring-1 ring-primary/20"
                    : isHighlighted
                    ? "border-primary/40 bg-gradient-to-r from-primary/[0.05] to-transparent hover:border-primary/60 hover:shadow-md hover:shadow-primary/5 cursor-pointer"
                    : isDowngrade
                    ? "border-border/50 opacity-50 cursor-not-allowed"
                    : "border-border hover:border-primary/30 hover:bg-primary/[0.02] hover:shadow-sm cursor-pointer"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isCurrent
                        ? "bg-primary/15"
                        : isHighlighted
                        ? "bg-primary/10"
                        : "bg-muted"
                    }`}>
                      <Icon className={`w-[18px] h-[18px] ${
                        isCurrent || isHighlighted ? "text-primary" : "text-muted-foreground"
                      }`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-extrabold text-[15px] text-foreground">{t.name}</span>
                        {isCurrent && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-semibold border-primary/30 text-primary">Current</Badge>
                        )}
                        {isHighlighted && !isCurrent && (
                          <Badge className="text-[9px] h-4 px-1.5 bg-primary text-primary-foreground font-semibold animate-pulse">Required</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {t.credits.toLocaleString()} credits/mo
                      </p>
                      {"perCredit" in t && t.perCredit && (
                        <p className="text-[10px] text-muted-foreground/70">£{t.perCredit}/credit</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="text-right">
                      <span className="font-display font-extrabold text-lg text-foreground">£{t.price}</span>
                      <span className="text-[11px] text-muted-foreground ml-0.5">/mo</span>
                    </div>
                    {!isCurrent && !isDowngrade && (
                      <ArrowRight className={`w-4 h-4 ml-1 transition-transform ${
                        isHighlighted ? "text-primary" : "text-muted-foreground"
                      } group-hover:translate-x-0.5`} />
                    )}
                    {isCurrent && (
                      <Check className="w-4 h-4 ml-1 text-primary" />
                    )}
                  </div>
                </div>
                {loadingTier === tier && (
                  <div className="flex items-center justify-center mt-2 pt-2 border-t border-border/50">
                    <Loader2 className="w-4 h-4 animate-spin text-primary mr-2" />
                    <span className="text-xs text-muted-foreground">Opening checkout…</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Credit packs */}
      {(showCredits || reason?.includes("used all") || isZeroCredits === false) && (
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <span className="h-px flex-1 bg-border" />
            <CreditCard className="w-3.5 h-3.5" />
            Or Buy Credit Packs
            <span className="h-px flex-1 bg-border" />
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {CREDIT_PACKS.map((pack) => (
              <button
                key={pack.price_id || pack.label}
                onClick={() => handleBuyCredits(pack.price_id)}
                disabled={loadingCredit === pack.price_id}
                className={`group relative rounded-xl border p-3 text-center transition-all active:scale-[0.96] ${
                  pack.popular
                    ? "border-primary/40 bg-gradient-to-b from-primary/[0.06] to-transparent shadow-sm shadow-primary/5 hover:shadow-md hover:shadow-primary/10 hover:border-primary/60"
                    : "border-border hover:border-primary/30 hover:bg-primary/[0.02] hover:shadow-sm"
                }`}
              >
                {pack.popular && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] h-4 px-2 bg-primary text-primary-foreground font-bold shadow-sm">
                    Popular
                  </Badge>
                )}
                <p className={`font-display font-extrabold text-2xl mt-1 ${
                  pack.popular ? "text-primary" : "text-foreground"
                }`}>
                  {pack.credits}
                </p>
                <p className="text-[10px] text-muted-foreground mb-2.5">credits</p>
                <div className={`inline-flex items-center h-7 px-3 rounded-full text-[11px] font-semibold transition-colors ${
                  pack.popular
                    ? "bg-primary/10 text-primary group-hover:bg-primary/15"
                    : "bg-muted text-foreground group-hover:bg-muted/80"
                }`}>
                  {loadingCredit === pack.price_id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    `£${pack.price}`
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="max-h-[88vh]">
          <DrawerHeader className="pb-1 pt-3">
            <DrawerTitle className="font-display font-extrabold text-lg flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Crown className="w-[18px] h-[18px] text-primary" />
              </div>
              Upgrade to Unlock
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8 overflow-y-auto">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="font-display font-extrabold text-lg flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Crown className="w-[18px] h-[18px] text-primary" />
            </div>
            Upgrade to Unlock
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}