import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Loader2, Eye, Trash2, RefreshCw,
  TrendingUp, TrendingDown, Minus, Bell, BellOff,
  Users, Search, BarChart3, Radar, Lock,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { CompetitorCardSkeleton } from "@/components/LoadingSkeletons";
import { UseCaseSpotlight } from "@/components/UseCaseSpotlight";
import { FeatureGate } from "@/components/FeatureGate";
import { UpgradeModal } from "@/components/UpgradeModal";

type Competitor = {
  id: string;
  competitor_name: string;
  vinted_username: string | null;
  search_query: string | null;
  category: string | null;
  avg_price: number | null;
  listing_count: number | null;
  price_trend: string | null;
  last_scanned_at: string | null;
  notes: string | null;
  created_at: string;
};

type Alert = {
  id: string;
  competitor_id: string | null;
  alert_type: string;
  title: string;
  description: string | null;
  old_value: number | null;
  new_value: number | null;
  source_url: string | null;
  is_read: boolean;
  created_at: string;
};

function getTrendIcon(trend: string | null) {
  if (trend === "rising") return <TrendingUp className="w-4 h-4 text-success" />;
  if (trend === "falling") return <TrendingDown className="w-4 h-4 text-destructive" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

function getAlertBadge(type: string) {
  switch (type) {
    case "price_drop": return <Badge variant="outline" className="text-[10px] text-success border-success/20 bg-success/5">Price Drop</Badge>;
    case "price_increase": return <Badge variant="outline" className="text-[10px] text-destructive border-destructive/20 bg-destructive/5">Price Increase</Badge>;
    case "new_listings": return <Badge variant="outline" className="text-[10px] text-primary border-primary/20 bg-primary/5">New Listings</Badge>;
    case "new_seller": return <Badge variant="outline" className="text-[10px] text-accent border-accent/20 bg-accent/5">New Seller</Badge>;
    case "trend_change": return <Badge variant="outline" className="text-[10px] text-accent border-accent/20 bg-accent/5">Trend Change</Badge>;
    default: return <Badge variant="outline" className="text-[10px]">{type}</Badge>;
  }
}

const COMPETITOR_LIMITS: Record<string, number> = {
  free: 0,
  pro: 3,
  business: 15,
  scale: 50,
};

export default function CompetitorTracker() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Add form state
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newQuery, setNewQuery] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [adding, setAdding] = useState(false);

  const tier = (profile?.subscription_tier || "free") as string;
  const maxCompetitors = COMPETITOR_LIMITS[tier] ?? 0;
  const atLimit = competitors.length >= maxCompetitors;

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [compRes, alertRes] = await Promise.all([
      supabase
        .from("competitor_profiles")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("competitor_alerts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setCompetitors((compRes.data as Competitor[]) || []);
    setAlerts((alertRes.data as Alert[]) || []);
    setLoading(false);
  };

  const handleAddClick = () => {
    if (atLimit) {
      setShowUpgrade(true);
      return;
    }
    setShowAddForm(!showAddForm);
  };

  const handleAdd = async () => {
    if (!user || !newName.trim()) {
      toast.error("Enter a competitor name");
      return;
    }
    if (atLimit) {
      setShowUpgrade(true);
      return;
    }
    setAdding(true);
    try {
      const { error } = await supabase.from("competitor_profiles").insert({
        user_id: user.id,
        competitor_name: newName.trim(),
        vinted_username: newUsername.trim() || null,
        search_query: newQuery.trim() || null,
        category: newCategory.trim() || null,
      });
      if (error) throw error;
      toast.success(`Added "${newName}" to your tracked competitors`);
      setNewName(""); setNewUsername(""); setNewQuery(""); setNewCategory("");
      setShowAddForm(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed to add competitor");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("competitor_profiles").delete().eq("id", id);
    toast.success("Competitor removed");
    fetchData();
  };

  const handleScan = async (comp: Competitor) => {
    setScanningId(comp.id);
    try {
      const { data, error } = await supabase.functions.invoke("competitor-scan", {
        body: {
          competitor_id: comp.id,
          competitor_name: comp.competitor_name,
          vinted_username: comp.vinted_username,
          search_query: comp.search_query,
          category: comp.category,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const alertCount = data?.alerts?.length || 0;
      toast.success(`Scan complete! ${alertCount} new alert${alertCount !== 1 ? "s" : ""} generated.`);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Scan failed");
      console.error(e);
    } finally {
      setScanningId(null);
    }
  };

  const handleMarkRead = async (alertId: string) => {
    await supabase.from("competitor_alerts").update({ is_read: true }).eq("id", alertId);
    setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, is_read: true } : a));
  };

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  const nextTierName = tier === "pro" ? "Business" : tier === "business" ? "Scale" : "Pro";
  const nextTierLimit = tier === "pro" ? 15 : tier === "business" ? 50 : 3;

  return (
    <PageShell
      title="Competitor Tracker"
      subtitle="Monitor competitors and get alerts on price changes"
      icon={<Radar className="w-5 h-5 text-primary" />}
      maxWidth="max-w-5xl"
      actions={unreadCount > 0 ? <Badge className="bg-primary text-primary-foreground">{unreadCount} new</Badge> : undefined}
    >
        <FeatureGate feature="competitor_tracker">
        <UseCaseSpotlight
          featureKey="competitor-tracker"
          icon={Radar}
          scenario="A rival seller keeps undercutting your Nike listings and you don't know their strategy..."
          description="Without competitor intelligence, you're always reacting instead of anticipating market moves."
          outcome="Competitor Tracker reveals they drop prices every Friday. You adjust your timing and win more sales."
          tip="Track search queries as well as usernames to monitor entire niches."
        />
        {loading ? (
          <CompetitorCardSkeleton count={3} />
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left column: Competitors list */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Tracked Competitors ({competitors.length} of {maxCompetitors})
                </h2>
                <Button
                  size="sm"
                  onClick={handleAddClick}
                  className="active:scale-95 transition-transform"
                  variant={atLimit ? "outline" : "default"}
                >
                  {atLimit ? (
                    <><Lock className="w-3 h-3 mr-1" /> Limit Reached</>
                  ) : (
                    <><Plus className="w-3 h-3 mr-1" /> Add</>
                  )}
                </Button>
              </div>

              {/* Limit banner */}
              {atLimit && (
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs text-muted-foreground">
                    You're tracking {competitors.length}/{maxCompetitors} competitors. Upgrade to {nextTierName} for {nextTierLimit}.
                  </p>
                  <Button size="sm" className="h-7 text-xs shrink-0" onClick={() => setShowUpgrade(true)}>
                    Upgrade
                  </Button>
                </div>
              )}

              {/* Add Form */}
              <AnimatePresence>
                {showAddForm && !atLimit && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <Card className="p-4 sm:p-5">
                      <h3 className="font-display font-bold text-sm mb-3">Track a new competitor or niche</h3>
                      <div className="space-y-2.5 sm:space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name *</Label>
                          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. VintageVibes_UK" className="h-11 sm:h-10 text-base sm:text-sm" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vinted Username</Label>
                            <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="e.g. seller123" className="h-11 sm:h-10 text-base sm:text-sm" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Search Query</Label>
                            <Input value={newQuery} onChange={(e) => setNewQuery(e.target.value)} placeholder="e.g. vintage Levi's 501" className="h-11 sm:h-10 text-base sm:text-sm" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
                          <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g. Menswear, Trainers" className="h-11 sm:h-10 text-base sm:text-sm" />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleAdd} disabled={adding} size="sm" className="flex-1 h-11 sm:h-9 active:scale-95 transition-transform">
                            {adding ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                            Add & Start Tracking
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)} className="h-11 sm:h-9">Cancel</Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Competitor Cards */}
              {competitors.length === 0 ? (
                <Card className="p-8 sm:p-10 text-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground/40" />
                  </div>
                  <h3 className="font-display font-bold text-sm sm:text-lg mb-1.5">No competitors tracked yet</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                    Add a Vinted seller or search query to start monitoring.
                  </p>
                  <Button onClick={handleAddClick} size="sm" className="active:scale-95 transition-transform">
                    <Plus className="w-3 h-3 mr-1" /> Add Your First Competitor
                  </Button>
                </Card>
              ) : (
                <div className="space-y-3">
                  {competitors.map((comp) => (
                    <motion.div key={comp.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                      <Card className="p-3.5 sm:p-5 hover:shadow-md active:scale-[0.99] transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-display font-bold text-sm truncate">{comp.competitor_name}</h4>
                              {getTrendIcon(comp.price_trend)}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {comp.vinted_username && (
                                <Badge variant="outline" className="text-[10px]">@{comp.vinted_username}</Badge>
                              )}
                              {comp.search_query && (
                                <Badge variant="outline" className="text-[10px]">"{comp.search_query}"</Badge>
                              )}
                              {comp.category && (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground">{comp.category}</Badge>
                              )}
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-4 shrink-0">
                            {comp.avg_price !== null && (
                              <div className="text-center">
                                <p className="text-[10px] text-muted-foreground">Avg Price</p>
                                <p className="font-display font-bold text-sm">£{comp.avg_price.toFixed(0)}</p>
                              </div>
                            )}
                            {comp.listing_count !== null && comp.listing_count > 0 && (
                              <div className="text-center">
                                <p className="text-[10px] text-muted-foreground">Listings</p>
                                <p className="font-display font-bold text-sm">{comp.listing_count}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Last scanned + actions */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                          <p className="text-[10px] text-muted-foreground">
                            {comp.last_scanned_at
                              ? `Last scanned ${new Date(comp.last_scanned_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                              : "Never scanned"}
                          </p>
                          <div className="flex gap-1 sm:gap-1.5 flex-wrap">
                            {comp.category && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px] sm:text-xs h-7 active:scale-95 transition-transform"
                                onClick={() => navigate(`/price-check?category=${encodeURIComponent(comp.category!)}`)}
                              >
                                <Search className="w-3 h-3 mr-1" /> Price Check
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[10px] sm:text-xs h-7 active:scale-95 transition-transform"
                              onClick={() => navigate("/trends")}
                            >
                              <BarChart3 className="w-3 h-3 mr-1" /> Trends
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[10px] sm:text-xs h-7 active:scale-95 transition-transform"
                              onClick={() => handleScan(comp)}
                              disabled={scanningId === comp.id}
                            >
                              {scanningId === comp.id ? (
                                <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Scanning...</>
                              ) : (
                                <><RefreshCw className="w-3 h-3 mr-1" /> Scan</>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[10px] sm:text-xs h-7 text-destructive hover:text-destructive active:scale-95 transition-transform"
                              onClick={() => handleDelete(comp.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Right column: Alerts feed */}
            <div className="space-y-4">
              <h2 className="font-display font-bold text-base flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                Alerts ({unreadCount} unread)
              </h2>

              {alerts.length === 0 ? (
                <Card className="p-6 sm:p-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3">
                    <BellOff className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    No alerts yet. Scan a competitor to generate intelligence.
                  </p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {alerts.map((alert) => {
                    const comp = competitors.find((c) => c.id === alert.competitor_id);
                    return (
                      <motion.div key={alert.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Card
                          className={`p-3.5 sm:p-4 cursor-pointer active:scale-[0.99] transition-all relative ${
                            alert.is_read ? "opacity-60" : "border-primary/20 shadow-sm"
                          }`}
                          onClick={() => handleMarkRead(alert.id)}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            {getAlertBadge(alert.alert_type)}
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(alert.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </span>
                          </div>
                          <p className="font-display font-bold text-xs mb-1">{alert.title}</p>
                          {alert.description && (
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{alert.description}</p>
                          )}
                          {comp && (
                            <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                              <Eye className="w-3 h-3" /> {comp.competitor_name}
                            </p>
                          )}
                          {alert.old_value !== null && alert.new_value !== null && (
                            <div className="flex items-center gap-2 mt-2 text-xs">
                              <span className="text-muted-foreground line-through">£{alert.old_value.toFixed(0)}</span>
                              <span className="text-foreground font-bold">→ £{alert.new_value.toFixed(0)}</span>
                            </div>
                          )}
                          {!alert.is_read && (
                            <div className="w-2 h-2 rounded-full bg-primary absolute top-3 right-3" />
                          )}
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
        </FeatureGate>

      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        reason={`You've reached your competitor tracking limit (${maxCompetitors}). Upgrade to ${nextTierName} for up to ${nextTierLimit} competitors.`}
        tierRequired={tier === "pro" ? "business" : tier === "business" ? "scale" : "pro"}
      />
    </PageShell>
  );
}
