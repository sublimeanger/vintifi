import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Loader2, Eye, Trash2, RefreshCw,
  TrendingUp, TrendingDown, Minus, Bell, BellOff,
  Users, Search, BarChart3, Radar, Lock,
  ExternalLink, Star, ShieldCheck, ChevronDown, ChevronUp,
  Target, Zap,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { CompetitorCardSkeleton } from "@/components/LoadingSkeletons";
import { UseCaseSpotlight } from "@/components/UseCaseSpotlight";
import { FeatureGate } from "@/components/FeatureGate";
import { UpgradeModal } from "@/components/UpgradeModal";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

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
  vinted_profile_url?: string | null;
  profile_photo_url?: string | null;
  seller_rating?: number | null;
  follower_count?: number | null;
  total_items_sold?: number | null;
  verification_status?: string | null;
  top_items?: any[];
  ai_summary?: string | null;
  last_scan_data?: any;
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

type ScanHistory = {
  id: string;
  avg_price: number | null;
  listing_count: number | null;
  seller_rating: number | null;
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

function getThreatColor(score: number | undefined) {
  if (!score) return "text-muted-foreground";
  if (score >= 8) return "text-destructive";
  if (score >= 5) return "text-warning";
  return "text-success";
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scanHistories, setScanHistories] = useState<Record<string, ScanHistory[]>>({});

  // Smart add form state
  const [addInput, setAddInput] = useState("");
  const [addCategory, setAddCategory] = useState("");
  const [adding, setAdding] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

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

  const fetchScanHistory = async (competitorId: string) => {
    if (scanHistories[competitorId]) return;
    const { data } = await supabase
      .from("competitor_scans")
      .select("id, avg_price, listing_count, seller_rating, created_at")
      .eq("competitor_id", competitorId)
      .order("created_at", { ascending: true })
      .limit(20);
    setScanHistories((prev) => ({ ...prev, [competitorId]: (data as ScanHistory[]) || [] }));
  };

  const isVintedUrl = (s: string) => /vinted\.\w+\/member\/\d+/i.test(s);

  const handleAddClick = () => {
    if (atLimit) { setShowUpgrade(true); return; }
    setShowAddForm(!showAddForm);
    setPreviewData(null);
    setAddInput("");
    setAddCategory("");
  };

  // Smart preview: when a Vinted URL is pasted, fetch seller data
  const handlePreview = async () => {
    if (!addInput.trim() || !isVintedUrl(addInput)) return;
    setPreviewing(true);
    try {
      const { data, error } = await supabase.functions.invoke("competitor-scan", {
        body: { input: addInput.trim(), mode: "preview" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.preview) setPreviewData(data);
    } catch (e: any) {
      toast.error(e.message || "Could not fetch seller profile");
    } finally {
      setPreviewing(false);
    }
  };

  // When input changes and looks like a URL, auto-preview
  const handleInputChange = (val: string) => {
    setAddInput(val);
    setPreviewData(null);
  };

  const handleAdd = async () => {
    if (!user || !addInput.trim()) {
      toast.error("Enter a Vinted profile URL or search query");
      return;
    }
    if (atLimit) { setShowUpgrade(true); return; }
    setAdding(true);
    try {
      const isUrl = isVintedUrl(addInput);
      const name = previewData?.competitor_name || addInput.trim();
      const { error } = await supabase.from("competitor_profiles").insert({
        user_id: user.id,
        competitor_name: name,
        vinted_username: previewData?.competitor_name || (!isUrl ? addInput.trim() : null),
        search_query: !isUrl ? addInput.trim() : null,
        category: addCategory.trim() || null,
        vinted_profile_url: isUrl ? addInput.trim() : null,
        profile_photo_url: previewData?.profile_photo_url || null,
        seller_rating: previewData?.seller_rating || null,
        follower_count: previewData?.follower_count || null,
        total_items_sold: previewData?.total_items_sold || null,
        verification_status: previewData?.verification_status || null,
      });
      if (error) throw error;
      toast.success(`Added "${name}" to tracked competitors`);
      setAddInput("");
      setAddCategory("");
      setPreviewData(null);
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
          input: comp.vinted_profile_url || comp.vinted_username || comp.search_query || comp.competitor_name,
          search_query: comp.search_query,
          category: comp.category,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const alertCount = data?.alerts?.length || 0;
      toast.success(`Scan complete! ${alertCount} alert${alertCount !== 1 ? "s" : ""} generated.`);
      // Clear cached scan history so it refetches
      setScanHistories((prev) => { const n = { ...prev }; delete n[comp.id]; return n; });
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Scan failed");
    } finally {
      setScanningId(null);
    }
  };

  const handleMarkRead = async (alertId: string) => {
    await supabase.from("competitor_alerts").update({ is_read: true }).eq("id", alertId);
    setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, is_read: true } : a));
  };

  const toggleExpand = (compId: string) => {
    if (expandedId === compId) {
      setExpandedId(null);
    } else {
      setExpandedId(compId);
      fetchScanHistory(compId);
    }
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
          tip="Paste a Vinted seller profile URL for deep intelligence, or enter a niche keyword to monitor."
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
                  {atLimit ? <><Lock className="w-3 h-3 mr-1" /> Limit Reached</> : <><Plus className="w-3 h-3 mr-1" /> Add</>}
                </Button>
              </div>

              {atLimit && (
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs text-muted-foreground">
                    You're tracking {competitors.length}/{maxCompetitors} competitors. Upgrade to {nextTierName} for {nextTierLimit}.
                  </p>
                  <Button size="sm" className="h-7 text-xs shrink-0" onClick={() => setShowUpgrade(true)}>Upgrade</Button>
                </div>
              )}

              {/* Smart Add Form */}
              <AnimatePresence>
                {showAddForm && !atLimit && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <Card className="p-4 sm:p-5">
                      <h3 className="font-display font-bold text-sm mb-1">Track a competitor or niche</h3>
                      <p className="text-[11px] text-muted-foreground mb-3">Paste a Vinted seller profile URL for deep intelligence, or enter a search query to monitor a niche.</p>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            value={addInput}
                            onChange={(e) => handleInputChange(e.target.value)}
                            placeholder="https://www.vinted.co.uk/member/12345 or 'vintage Levi's 501'"
                            className="h-11 sm:h-10 text-base sm:text-sm flex-1"
                          />
                          {isVintedUrl(addInput) && !previewData && (
                            <Button variant="outline" size="sm" className="h-11 sm:h-10 shrink-0" onClick={handlePreview} disabled={previewing}>
                              {previewing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3 mr-1" />}
                              {previewing ? "Fetching..." : "Preview"}
                            </Button>
                          )}
                        </div>

                        {/* Preview card */}
                        {previewData && (
                          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
                            {previewData.profile_photo_url && (
                              <img src={previewData.profile_photo_url} alt="" className="w-10 h-10 rounded-full object-cover border" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-display font-bold text-sm truncate">{previewData.competitor_name}</p>
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                {previewData.seller_rating != null && (
                                  <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-warning" /> {Number(previewData.seller_rating).toFixed(1)}</span>
                                )}
                                {previewData.follower_count != null && <span>{previewData.follower_count} followers</span>}
                                {previewData.total_items_sold != null && <span>{previewData.total_items_sold} items</span>}
                                {previewData.verification_status === "verified" && (
                                  <span className="flex items-center gap-0.5 text-success"><ShieldCheck className="w-3 h-3" /> Verified</span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}

                        <Input
                          value={addCategory}
                          onChange={(e) => setAddCategory(e.target.value)}
                          placeholder="Category (optional, e.g. Menswear, Trainers)"
                          className="h-10 text-sm"
                        />

                        <div className="flex gap-2">
                          <Button onClick={handleAdd} disabled={adding} size="sm" className="flex-1 h-10 active:scale-95 transition-transform">
                            {adding ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                            Add & Start Tracking
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)} className="h-10">Cancel</Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Competitor Cards */}
              {competitors.length === 0 ? (
                <Card className="p-8 sm:p-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <h3 className="font-display font-bold text-sm sm:text-lg mb-1.5">No competitors tracked yet</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                    Paste a Vinted seller URL or search query to start monitoring.
                  </p>
                  <Button onClick={handleAddClick} size="sm" className="active:scale-95 transition-transform">
                    <Plus className="w-3 h-3 mr-1" /> Add Your First Competitor
                  </Button>
                </Card>
              ) : (
                <div className="space-y-3">
                  {competitors.map((comp) => {
                    const isExpanded = expandedId === comp.id;
                    const history = scanHistories[comp.id] || [];
                    const compAlerts = alerts.filter((a) => a.competitor_id === comp.id);
                    const threatScore = comp.last_scan_data?.threat_score;
                    const topItems = (comp.top_items as any[]) || [];

                    return (
                      <motion.div key={comp.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="overflow-hidden hover:shadow-md transition-all">
                          {/* Card header - clickable */}
                          <div
                            className="p-3.5 sm:p-5 cursor-pointer active:scale-[0.995] transition-transform"
                            onClick={() => toggleExpand(comp.id)}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {/* Profile photo */}
                                {comp.profile_photo_url ? (
                                  <img src={comp.profile_photo_url} alt="" className="w-10 h-10 rounded-full object-cover border shrink-0" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                                    <Users className="w-5 h-5 text-muted-foreground/40" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <h4 className="font-display font-bold text-sm truncate">{comp.competitor_name}</h4>
                                    {getTrendIcon(comp.price_trend)}
                                    {comp.verification_status === "verified" && <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />}
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {comp.seller_rating != null && (
                                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                        <Star className="w-3 h-3 text-warning" /> {Number(comp.seller_rating).toFixed(1)}
                                      </span>
                                    )}
                                    {comp.follower_count != null && (
                                      <span className="text-[10px] text-muted-foreground">{comp.follower_count} followers</span>
                                    )}
                                    {comp.search_query && (
                                      <Badge variant="outline" className="text-[10px]">"{comp.search_query}"</Badge>
                                    )}
                                    {comp.category && (
                                      <Badge variant="outline" className="text-[10px] text-muted-foreground">{comp.category}</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Stats */}
                              <div className="flex items-center gap-3 shrink-0">
                                {threatScore && (
                                  <div className="text-center">
                                    <p className="text-[10px] text-muted-foreground">Threat</p>
                                    <p className={`font-display font-bold text-sm ${getThreatColor(threatScore)}`}>{threatScore}/10</p>
                                  </div>
                                )}
                                {comp.avg_price != null && (
                                  <div className="text-center">
                                    <p className="text-[10px] text-muted-foreground">Avg Price</p>
                                    <p className="font-display font-bold text-sm">£{comp.avg_price.toFixed(0)}</p>
                                  </div>
                                )}
                                {comp.listing_count != null && comp.listing_count > 0 && (
                                  <div className="text-center">
                                    <p className="text-[10px] text-muted-foreground">Listings</p>
                                    <p className="font-display font-bold text-sm">{comp.listing_count}</p>
                                  </div>
                                )}
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                              </div>
                            </div>
                          </div>

                          {/* Expanded detail view */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-3.5 sm:px-5 pb-4 sm:pb-5 space-y-4 border-t pt-4">
                                  {/* AI Summary */}
                                  {comp.ai_summary && (
                                    <div className="p-3 rounded-lg bg-muted/40 border">
                                      <h5 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                                        <Zap className="w-3 h-3" /> AI Intelligence Summary
                                      </h5>
                                      <p className="text-xs leading-relaxed">{comp.ai_summary}</p>
                                    </div>
                                  )}

                                  {/* Pricing strategy & counter-strategies */}
                                  {comp.last_scan_data?.pricing_strategy && (
                                    <div className="grid sm:grid-cols-2 gap-3">
                                      <div className="p-3 rounded-lg bg-muted/30">
                                        <h5 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                          <Target className="w-3 h-3 inline mr-1" />Their Strategy
                                        </h5>
                                        <p className="text-xs">{comp.last_scan_data.pricing_strategy}</p>
                                      </div>
                                      {comp.last_scan_data?.counter_strategies?.length > 0 && (
                                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                                          <h5 className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">Your Counter-Moves</h5>
                                          <ul className="text-xs space-y-1">
                                            {comp.last_scan_data.counter_strategies.map((s: string, i: number) => (
                                              <li key={i} className="flex gap-1.5">
                                                <span className="text-primary shrink-0">→</span> {s}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Top Items */}
                                  {topItems.length > 0 && (
                                    <div>
                                      <h5 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Top Items</h5>
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {topItems.slice(0, 6).map((item: any, i: number) => (
                                          <a
                                            key={i}
                                            href={item.url || "#"}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group p-2 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                                          >
                                            {item.image_url && (
                                              <img src={item.image_url} alt="" className="w-full h-20 object-cover rounded mb-1.5" />
                                            )}
                                            <p className="text-[11px] font-medium truncate">{item.title}</p>
                                            <p className="text-xs font-display font-bold text-primary">£{Number(item.price).toFixed(0)}</p>
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Scan history chart */}
                                  {history.length >= 2 && (
                                    <div>
                                      <h5 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Price History</h5>
                                      <div className="h-32 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                          <LineChart data={history.map((h) => ({
                                            date: new Date(h.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
                                            price: h.avg_price,
                                            listings: h.listing_count,
                                          }))}>
                                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                            <YAxis tick={{ fontSize: 10 }} width={40} />
                                            <Tooltip contentStyle={{ fontSize: 11 }} />
                                            <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Avg Price (£)" />
                                            <Line type="monotone" dataKey="listings" stroke="hsl(var(--muted-foreground))" strokeWidth={1} dot={false} name="Listings" />
                                          </LineChart>
                                        </ResponsiveContainer>
                                      </div>
                                    </div>
                                  )}

                                  {/* Alerts for this competitor */}
                                  {compAlerts.length > 0 && (
                                    <div>
                                      <h5 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Recent Alerts</h5>
                                      <div className="space-y-1.5">
                                        {compAlerts.slice(0, 5).map((alert) => (
                                          <div key={alert.id} className="flex items-center gap-2 text-xs">
                                            {getAlertBadge(alert.alert_type)}
                                            <span className="truncate flex-1">{alert.title}</span>
                                            <span className="text-[10px] text-muted-foreground shrink-0">
                                              {new Date(alert.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Quick actions */}
                                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs h-8 active:scale-95 transition-transform"
                                      onClick={(e) => { e.stopPropagation(); handleScan(comp); }}
                                      disabled={scanningId === comp.id}
                                    >
                                      {scanningId === comp.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                                      {scanningId === comp.id ? "Scanning..." : "Scan Now"}
                                    </Button>
                                    {comp.vinted_profile_url && (
                                      <Button variant="outline" size="sm" className="text-xs h-8" asChild>
                                        <a href={comp.vinted_profile_url} target="_blank" rel="noopener noreferrer">
                                          <ExternalLink className="w-3 h-3 mr-1" /> View on Vinted
                                        </a>
                                      </Button>
                                    )}
                                    {comp.category && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs h-8"
                                        onClick={(e) => { e.stopPropagation(); navigate(`/price-check?category=${encodeURIComponent(comp.category!)}`); }}
                                      >
                                        <Search className="w-3 h-3 mr-1" /> Price Check Niche
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs h-8 text-destructive hover:text-destructive"
                                      onClick={(e) => { e.stopPropagation(); handleDelete(comp.id); }}
                                    >
                                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                                    </Button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Collapsed footer */}
                          {!isExpanded && (
                            <div className="flex items-center justify-between px-3.5 sm:px-5 pb-3 pt-0">
                              <p className="text-[10px] text-muted-foreground">
                                {comp.last_scanned_at
                                  ? `Scanned ${new Date(comp.last_scanned_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                                  : "Never scanned"}
                              </p>
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-[10px] h-7 active:scale-95 transition-transform"
                                  onClick={(e) => { e.stopPropagation(); handleScan(comp); }}
                                  disabled={scanningId === comp.id}
                                >
                                  {scanningId === comp.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                                  Scan
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-[10px] h-7 text-destructive hover:text-destructive"
                                  onClick={(e) => { e.stopPropagation(); handleDelete(comp.id); }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </Card>
                      </motion.div>
                    );
                  })}
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
                          {alert.old_value != null && alert.new_value != null && (
                            <div className="flex items-center gap-2 mt-2 text-xs">
                              <span className="text-muted-foreground line-through">£{alert.old_value.toFixed(0)}</span>
                              <span className="text-foreground font-bold">→ £{alert.new_value.toFixed(0)}</span>
                            </div>
                          )}
                          {!alert.is_read && <div className="w-2 h-2 rounded-full bg-primary absolute top-3 right-3" />}
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
