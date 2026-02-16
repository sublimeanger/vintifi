import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { User, CreditCard, Loader2, Check, Mail, Send, Globe, RotateCcw, Zap, Gift, Copy, Share2, LogOut, Settings, Link2, Layers } from "lucide-react";
import { STRIPE_TIERS, TierKey, TIMEZONES, CREDIT_PACKS } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageShell } from "@/components/PageShell";

import { motion } from "framer-motion";

/* ─── Section wrapper ─── */
function Section({ icon: Icon, title, children, tint = "" }: {
  icon: React.ElementType; title: string; children: React.ReactNode; tint?: string;
}) {
  return (
    <Card className={`p-5 sm:p-6 ${tint}`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
        <h2 className="font-display font-bold text-base sm:text-lg">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

export default function SettingsPage() {
  const { user, profile, credits, signOut, refreshProfile } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [saving, setSaving] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [digestEnabled, setDigestEnabled] = useState(
    (profile as any)?.weekly_digest_enabled ?? true
  );
  const [digestSaving, setDigestSaving] = useState(false);
  const [sendingDigest, setSendingDigest] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState(
    (profile as any)?.timezone || "Europe/London"
  );
  const [timezoneSaving, setTimezoneSaving] = useState(false);
  const [creditPackLoading, setCreditPackLoading] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string>("");
  const [referralCount, setReferralCount] = useState(0);
  const [referralCredits, setReferralCredits] = useState(0);
  const [billingAnnual, setBillingAnnual] = useState(false);

  const currentTier = (profile?.subscription_tier || "free") as TierKey;

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("referral_code")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.referral_code) setReferralCode(data.referral_code);
      });
    supabase
      .from("referrals")
      .select("id, credits_awarded")
      .eq("referrer_id", user.id)
      .then(({ data }) => {
        if (data) {
          setReferralCount(data.length);
          setReferralCredits(data.reduce((sum, r) => sum + (r.credits_awarded || 0), 0));
        }
      });
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName })
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Profile updated!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCheckout = async (tierKey: TierKey) => {
    const tier = STRIPE_TIERS[tierKey];
    const priceId = billingAnnual && 'annual_price_id' in tier ? (tier as any).annual_price_id : tier.price_id;
    if (!priceId) return;
    setCheckoutLoading(tierKey);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { price_id: priceId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to create checkout");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleBuyCredits = async (priceId: string) => {
    setCreditPackLoading(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("buy-credits", {
        body: { price_id: priceId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setCreditPackLoading(null);
    }
  };

  const handleTimezoneChange = async (val: string) => {
    if (!user) return;
    setSelectedTimezone(val);
    setTimezoneSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ timezone: val } as any)
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Timezone updated!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTimezoneSaving(false);
    }
  };

  const handleDigestToggle = async (checked: boolean) => {
    if (!user) return;
    setDigestSaving(true);
    setDigestEnabled(checked);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ weekly_digest_enabled: checked } as any)
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success(checked ? "Weekly digest enabled" : "Weekly digest disabled");
    } catch (err: any) {
      setDigestEnabled(!checked);
      toast.error(err.message);
    } finally {
      setDigestSaving(false);
    }
  };

  const handleSendDigest = async () => {
    if (!user) return;
    setSendingDigest(true);
    try {
      const { data, error } = await supabase.functions.invoke("weekly-digest", {
        body: { user_id: user.id },
      });
      if (error) throw error;
      toast.success("Digest sent! Check your email.");
    } catch (err: any) {
      toast.error(err.message || "Failed to send digest");
    } finally {
      setSendingDigest(false);
    }
  };

  return (
    <PageShell title="Settings" icon={<Settings className="w-5 h-5 text-primary" />} maxWidth="max-w-3xl">
      <div className="space-y-4 sm:space-y-6">

        {/* ─── Profile ─── */}
        <Section icon={User} title="Profile">
          <div className="space-y-4">
            <div>
              <Label className="text-xs sm:text-sm mb-1.5 block">Display Name</Label>
              <Input className="h-11 sm:h-10 text-base sm:text-sm" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs sm:text-sm mb-1.5 block">Email</Label>
              <Input className="h-11 sm:h-10 text-base sm:text-sm" value={user?.email || ""} disabled />
            </div>
            <div>
              <Label className="flex items-center gap-1.5 text-xs sm:text-sm mb-1.5">
                <Globe className="w-3.5 h-3.5" /> Timezone
              </Label>
              <Select value={selectedTimezone} onValueChange={handleTimezoneChange} disabled={timezoneSaving}>
                <SelectTrigger className="h-11 sm:h-10 text-base sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveProfile} disabled={saving} className="h-11 sm:h-10 active:scale-95 transition-transform">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </Section>

        {/* ─── Platform Connections ─── */}
        <Section icon={Link2} title="eBay Connection" tint="border-blue-500/5">
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">
            Connect your eBay seller account to publish listings with one click.
          </p>
          <Button
            variant="outline"
            className="h-10 active:scale-95 transition-transform text-xs sm:text-sm"
            onClick={() => navigate("/platforms")}
          >
            <Link2 className="w-4 h-4 mr-2" /> Manage Connection
          </Button>
        </Section>

        {/* ─── Subscription ─── */}
        <Section icon={CreditCard} title="Subscription" tint="border-primary/5">
          <div className="mb-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Current plan</p>
            <p className="font-display font-bold text-xl sm:text-2xl capitalize">{STRIPE_TIERS[currentTier].name}</p>
            {credits && (() => {
              const isUnlimited = currentTier === "scale" || credits.credits_limit >= 999;
              const totalUsed = credits.price_checks_used + credits.optimizations_used + credits.vintography_used;
              return isUnlimited ? (
                <Badge className="mt-2 bg-primary/10 text-primary border-primary/20">Unlimited credits</Badge>
              ) : (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, (totalUsed / credits.credits_limit) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                    {totalUsed}/{credits.credits_limit} used
                  </span>
                </div>
              );
            })()}
          </div>

          {currentTier !== "free" && (
            <Button variant="outline" onClick={handleManageSubscription} disabled={portalLoading} className="mb-5 h-10 active:scale-95 transition-transform">
              {portalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Manage Subscription
            </Button>
          )}

          <div className="flex items-center justify-center gap-3 mb-4">
            <span className={`text-xs sm:text-sm font-medium ${!billingAnnual ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
            <Switch checked={billingAnnual} onCheckedChange={setBillingAnnual} />
            <span className={`text-xs sm:text-sm font-medium ${billingAnnual ? "text-foreground" : "text-muted-foreground"}`}>Annual</span>
            {billingAnnual && (
              <Badge className="bg-success text-success-foreground text-[10px]">Save 20%</Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(["pro", "business", "scale"] as TierKey[]).map((key, i) => {
              const tier = STRIPE_TIERS[key];
              const isCurrent = currentTier === key;
              const displayPrice = billingAnnual && 'annual_price' in tier
                ? `£${((tier as any).annual_price / 12).toFixed(2)}`
                : `£${tier.price}`;
              return (
                <motion.div key={key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className={`p-4 h-full flex flex-col ${isCurrent ? "border-primary ring-1 ring-primary" : ""}`}>
                    <h3 className="font-display font-bold text-sm">{tier.name}</h3>
                    <p className="font-display text-2xl font-bold mt-1">
                      {displayPrice}<span className="text-xs sm:text-sm font-normal text-muted-foreground">/mo</span>
                    </p>
                    {billingAnnual && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground line-through">£{tier.price}/mo</p>
                    )}
                    <ul className="mt-3 space-y-1.5 flex-1">
                      {tier.features.slice(0, 3).map((f) => (
                        <li key={f} className="text-[10px] sm:text-xs flex items-start gap-1.5">
                          <Check className="w-3 h-3 text-success mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full mt-4 h-10 active:scale-95 transition-transform"
                      variant={isCurrent ? "outline" : "default"}
                      size="sm"
                      disabled={isCurrent || checkoutLoading === key}
                      onClick={() => handleCheckout(key)}
                    >
                      {checkoutLoading === key ? <Loader2 className="w-4 h-4 animate-spin" /> : isCurrent ? "Current Plan" : "Start 7-Day Free Trial"}
                    </Button>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </Section>

        {/* ─── Credit Packs ─── */}
        <Section icon={Zap} title="Credit Packs" tint="border-accent/5">
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">
            Need more price checks? Buy a top-up pack — credits are added instantly.
          </p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {CREDIT_PACKS.map((pack) => (
              <Card
                key={pack.price_id}
                className={`p-3 sm:p-4 relative text-center ${pack.popular ? "border-primary ring-1 ring-primary" : ""}`}
              >
                {pack.popular && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px]">
                    Best Value
                  </Badge>
                )}
                <h3 className="font-display font-bold text-xs sm:text-sm">{pack.label}</h3>
                <p className="font-display text-xl sm:text-2xl font-bold mt-1">£{pack.price}</p>
                <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5">
                  £{(pack.price / pack.credits).toFixed(2)}/credit
                </p>
                <Button
                  className="w-full mt-3 h-9 sm:h-10 active:scale-95 transition-transform"
                  size="sm"
                  variant={pack.popular ? "default" : "outline"}
                  disabled={creditPackLoading === pack.price_id}
                  onClick={() => handleBuyCredits(pack.price_id)}
                >
                  {creditPackLoading === pack.price_id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buy"}
                </Button>
              </Card>
            ))}
          </div>
        </Section>

        {/* ─── Weekly Digest ─── */}
        <Section icon={Mail} title="Weekly Digest">
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">
            Get a weekly email with your top trends, stale listings, and profit summary every Monday.
          </p>
          <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-muted/40">
            <Label htmlFor="digest-toggle" className="text-xs sm:text-sm font-medium">Email digest enabled</Label>
            <Switch id="digest-toggle" checked={digestEnabled} disabled={digestSaving} onCheckedChange={handleDigestToggle} />
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={sendingDigest}
            onClick={handleSendDigest}
            className="h-10 active:scale-95 transition-transform"
          >
            {sendingDigest ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Send Test Digest Now
          </Button>
        </Section>

        {/* ─── Referral Program ─── */}
        <Section icon={Gift} title="Referral Program" tint="border-success/5">
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">
            Share your code — you and your friend both earn 5 bonus credits!
          </p>
          {referralCode && (
            <div className="space-y-4">
              <div className="bg-muted rounded-xl p-4 sm:p-5 text-center">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Your referral code</p>
                <p className="font-display text-2xl sm:text-3xl font-extrabold tracking-widest">{referralCode}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-10 active:scale-95 transition-transform text-xs sm:text-sm"
                  onClick={() => {
                    const link = `${window.location.origin}/auth?mode=signup&ref=${referralCode}`;
                    navigator.clipboard.writeText(link);
                    toast.success("Referral link copied!");
                  }}
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Link
                </Button>
                {typeof navigator.share === "function" && (
                  <Button
                    variant="outline"
                    className="flex-1 h-10 active:scale-95 transition-transform text-xs sm:text-sm"
                    onClick={() => {
                      navigator.share({
                        title: "Join Vintifi",
                        text: `Use my referral code ${referralCode} and get 5 free credits!`,
                        url: `${window.location.origin}/auth?mode=signup&ref=${referralCode}`,
                      });
                    }}
                  >
                    <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/40 rounded-xl p-3 sm:p-4 text-center">
                  <p className="font-display text-xl sm:text-2xl font-bold">{referralCount}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Referrals</p>
                </div>
                <div className="bg-muted/40 rounded-xl p-3 sm:p-4 text-center">
                  <p className="font-display text-xl sm:text-2xl font-bold">{referralCredits}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Credits earned</p>
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* ─── Guided Tour (desktop) ─── */}
        <Card className="p-5 sm:p-6 hidden lg:block">
          <div className="flex items-center gap-2 mb-4">
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <h2 className="font-display font-bold text-base sm:text-lg">Guided Tour</h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">
            Replay the onboarding tour to revisit key features on the dashboard.
          </p>
          <Button
            variant="outline"
            className="h-10 active:scale-95 transition-transform"
            onClick={async () => {
              localStorage.removeItem("vintifi_tour_completed");
              if (user) {
                await supabase
                  .from("profiles")
                  .update({ tour_completed: false } as any)
                  .eq("user_id", user.id);
                await refreshProfile();
              }
              toast.success("Tour reset! Head to the dashboard to start it.");
              navigate("/dashboard");
            }}
          >
            <RotateCcw className="w-4 h-4 mr-2" /> Restart Tour
          </Button>
        </Card>

        {/* ─── Sign Out ─── */}
        <Card className="p-5 sm:p-6">
          <Button variant="destructive" onClick={signOut} className="h-11 sm:h-10 active:scale-95 transition-transform">
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </Card>
      </div>

      
    </PageShell>
  );
}
