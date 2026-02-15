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
import { ArrowLeft, User, CreditCard, Loader2, Check, Mail, Send, Globe, RotateCcw, Zap, Gift, Copy, Share2 } from "lucide-react";
import { STRIPE_TIERS, TierKey, TIMEZONES, CREDIT_PACKS } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SettingsPage() {
  const { user, profile, credits, signOut, refreshProfile } = useAuth();
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

  const currentTier = (profile?.subscription_tier || "free") as TierKey;

  useEffect(() => {
    if (!user) return;
    // Fetch referral code from profile
    supabase
      .from("profiles")
      .select("referral_code")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.referral_code) setReferralCode(data.referral_code);
      });
    // Fetch referral stats
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

  const [billingAnnual, setBillingAnnual] = useState(false);

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

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <header className="border-b border-border glass sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display font-bold text-lg">Settings</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-8">
        {/* Profile */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold text-lg">Profile</h2>
          </div>
          <div className="space-y-4">
            <div>
              <Label>Display Name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled />
            </div>
            <div>
              <Label className="flex items-center gap-1.5 mb-1.5">
                <Globe className="w-3.5 h-3.5" /> Timezone
              </Label>
              <Select
                value={selectedTimezone}
                onValueChange={async (val) => {
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
                }}
                disabled={timezoneSaving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </Card>

        {/* Subscription */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold text-lg">Subscription</h2>
          </div>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">Current plan</p>
            <p className="font-display font-bold text-xl capitalize">{STRIPE_TIERS[currentTier].name}</p>
            {credits && (
              <p className="text-sm text-muted-foreground mt-1">
                {credits.price_checks_used} / {credits.credits_limit} price checks used this month
              </p>
            )}
          </div>

          {currentTier !== "free" && (
            <Button variant="outline" onClick={handleManageSubscription} disabled={portalLoading} className="mb-6">
              {portalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Manage Subscription
            </Button>
          )}

          <div className="flex items-center justify-center gap-3 mb-4">
            <span className={`text-sm font-medium ${!billingAnnual ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
            <Switch checked={billingAnnual} onCheckedChange={setBillingAnnual} />
            <span className={`text-sm font-medium ${billingAnnual ? "text-foreground" : "text-muted-foreground"}`}>Annual</span>
            {billingAnnual && (
              <Badge className="bg-success text-success-foreground ml-1 text-[10px]">Save 20%</Badge>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {(["pro", "business", "scale"] as TierKey[]).map((key) => {
              const tier = STRIPE_TIERS[key];
              const isCurrent = currentTier === key;
              const displayPrice = billingAnnual && 'annual_price' in tier
                ? `£${((tier as any).annual_price / 12).toFixed(2)}`
                : `£${tier.price}`;
              return (
                <Card key={key} className={`p-4 ${isCurrent ? "border-primary ring-1 ring-primary" : ""}`}>
                  <h3 className="font-display font-bold">{tier.name}</h3>
                  <p className="font-display text-2xl font-bold mt-1">{displayPrice}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                  {billingAnnual && (
                    <p className="text-xs text-muted-foreground line-through">£{tier.price}/mo</p>
                  )}
                  <ul className="mt-3 space-y-1.5">
                    {tier.features.slice(0, 3).map((f) => (
                      <li key={f} className="text-xs flex items-start gap-1.5">
                        <Check className="w-3 h-3 text-success mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full mt-4"
                    variant={isCurrent ? "outline" : "default"}
                    size="sm"
                    disabled={isCurrent || checkoutLoading === key}
                    onClick={() => handleCheckout(key)}
                  >
                    {checkoutLoading === key ? <Loader2 className="w-4 h-4 animate-spin" /> : isCurrent ? "Current Plan" : "Start 7-Day Free Trial"}
                  </Button>
                </Card>
              );
            })}
          </div>
        </Card>

        {/* Credit Packs */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold text-lg">Credit Packs</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Need more price checks or listing optimisations? Buy a top-up pack — credits are added instantly.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {CREDIT_PACKS.map((pack) => (
              <Card
                key={pack.price_id}
                className={`p-4 relative ${pack.popular ? "border-primary ring-1 ring-primary" : ""}`}
              >
                {pack.popular && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px]">
                    Best Value
                  </Badge>
                )}
                <h3 className="font-display font-bold text-center">{pack.label}</h3>
                <p className="font-display text-2xl font-bold text-center mt-1">
                  £{pack.price}
                </p>
                <p className="text-xs text-muted-foreground text-center mt-0.5">
                  £{(pack.price / pack.credits).toFixed(2)}/credit
                </p>
                <Button
                  className="w-full mt-4"
                  size="sm"
                  variant={pack.popular ? "default" : "outline"}
                  disabled={creditPackLoading === pack.price_id}
                  onClick={() => handleBuyCredits(pack.price_id)}
                >
                  {creditPackLoading === pack.price_id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Buy Now"
                  )}
                </Button>
              </Card>
            ))}
          </div>
        </Card>

        {/* Weekly Digest */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold text-lg">Weekly Digest</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Get a weekly email with your top trends, stale listings, and profit summary every Monday.
          </p>
          <div className="flex items-center justify-between mb-4">
            <Label htmlFor="digest-toggle" className="text-sm font-medium">
              Email digest enabled
            </Label>
            <Switch
              id="digest-toggle"
              checked={digestEnabled}
              disabled={digestSaving}
              onCheckedChange={async (checked) => {
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
              }}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={sendingDigest}
            onClick={async () => {
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
            }}
          >
            {sendingDigest ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Send Test Digest Now
          </Button>
        </Card>

        {/* Referral Program */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold text-lg">Referral Program</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Share your code — you and your friend both earn 5 bonus credits!
          </p>

          {referralCode && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Your referral code</p>
                <p className="font-display text-3xl font-extrabold tracking-widest">{referralCode}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const link = `${window.location.origin}/auth?mode=signup&ref=${referralCode}`;
                    navigator.clipboard.writeText(link);
                    toast.success("Referral link copied!");
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" /> Copy Link
                </Button>
                {typeof navigator.share === "function" && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      navigator.share({
                        title: "Join Vintifi",
                        text: `Use my referral code ${referralCode} and get 5 free credits!`,
                        url: `${window.location.origin}/auth?mode=signup&ref=${referralCode}`,
                      });
                    }}
                  >
                    <Share2 className="w-4 h-4 mr-2" /> Share
                  </Button>
                )}
              </div>

              <div className="flex gap-4 text-center">
                <div className="flex-1 bg-muted/50 rounded-lg p-3">
                  <p className="font-display text-2xl font-bold">{referralCount}</p>
                  <p className="text-xs text-muted-foreground">Referrals</p>
                </div>
                <div className="flex-1 bg-muted/50 rounded-lg p-3">
                  <p className="font-display text-2xl font-bold">{referralCredits}</p>
                  <p className="text-xs text-muted-foreground">Credits earned</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Guided Tour - desktop only */}
        <Card className="p-6 hidden lg:block">
          <div className="flex items-center gap-2 mb-4">
            <RotateCcw className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold text-lg">Guided Tour</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Replay the onboarding tour to revisit key features on the dashboard.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              localStorage.removeItem("vintifi_tour_completed");
              toast.success("Tour reset! Head to the dashboard to start it.");
              navigate("/dashboard");
            }}
          >
            <RotateCcw className="w-4 h-4 mr-2" /> Restart Tour
          </Button>
        </Card>

        {/* Account Actions */}
        <Card className="p-6">
          <Button variant="destructive" onClick={signOut}>Sign Out</Button>
        </Card>
      </div>
    </div>
  );
}
