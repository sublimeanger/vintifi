import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Loader2, Zap, ExternalLink,
  TrendingUp, ShoppingBag, BarChart3, ShoppingCart, Sparkles, BookmarkPlus,
  Save, CheckCircle2, Package, Trash2, Clock, Image as ImageIcon,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ArbitrageCardSkeleton } from "@/components/LoadingSkeletons";
import { UseCaseSpotlight } from "@/components/UseCaseSpotlight";
import { FeatureGate } from "@/components/FeatureGate";

const RETAILERS = [
  { id: "ASOS Outlet", label: "ASOS Outlet", color: "bg-[hsl(200,70%,50%)]/10 text-[hsl(200,70%,50%)] border-[hsl(200,70%,50%)]/20" },
  { id: "End Clothing", label: "End Clothing", color: "bg-[hsl(0,0%,20%)]/10 text-[hsl(0,0%,40%)] border-[hsl(0,0%,20%)]/20" },
  { id: "TK Maxx", label: "TK Maxx", color: "bg-[hsl(0,70%,50%)]/10 text-[hsl(0,70%,50%)] border-[hsl(0,70%,50%)]/20" },
  { id: "Nike Clearance", label: "Nike", color: "bg-[hsl(25,90%,55%)]/10 text-[hsl(25,90%,55%)] border-[hsl(25,90%,55%)]/20" },
  { id: "Adidas Outlet", label: "Adidas", color: "bg-[hsl(210,10%,30%)]/10 text-[hsl(210,10%,30%)] border-[hsl(210,10%,30%)]/20" },
  { id: "ZARA Sale", label: "ZARA", color: "bg-[hsl(0,0%,10%)]/10 text-[hsl(0,0%,10%)] border-[hsl(0,0%,10%)]/20" },
  { id: "H&M Sale", label: "H&M", color: "bg-[hsl(0,70%,45%)]/10 text-[hsl(0,70%,45%)] border-[hsl(0,70%,45%)]/20" },
  { id: "Uniqlo Sale", label: "Uniqlo", color: "bg-[hsl(0,70%,40%)]/10 text-[hsl(0,70%,40%)] border-[hsl(0,70%,40%)]/20" },
  { id: "COS Sale", label: "COS", color: "bg-[hsl(0,0%,15%)]/10 text-[hsl(0,0%,15%)] border-[hsl(0,0%,15%)]/20" },
  { id: "Ralph Lauren", label: "Ralph Lauren", color: "bg-[hsl(210,60%,30%)]/10 text-[hsl(210,60%,30%)] border-[hsl(210,60%,30%)]/20" },
  { id: "Depop", label: "Depop", color: "bg-[hsl(350,80%,55%)]/10 text-[hsl(350,80%,55%)] border-[hsl(350,80%,55%)]/20" },
  { id: "Vinted UK", label: "Vinted UK", color: "bg-[hsl(170,60%,40%)]/10 text-[hsl(170,60%,40%)] border-[hsl(170,60%,40%)]/20" },
];

type Opportunity = {
  retailer: string;
  item_title: string;
  item_url: string | null;
  image_url?: string | null;
  sale_price: number;
  vinted_resale_price: number;
  estimated_profit: number;
  profit_margin: number;
  brand: string;
  category: string;
  ai_notes: string;
};

type SavedOpportunity = {
  id: string;
  retailer: string;
  item_title: string;
  item_url: string | null;
  image_url: string | null;
  sale_price: number | null;
  vinted_resale_price: number | null;
  estimated_profit: number | null;
  profit_margin: number | null;
  brand: string | null;
  category: string | null;
  ai_notes: string | null;
  status: string;
  created_at: string;
};

function getRetailerColor(retailer: string) {
  return RETAILERS.find((r) => r.id === retailer)?.color || "bg-muted text-muted-foreground";
}

function getMarginColor(margin: number) {
  if (margin >= 60) return "text-success";
  if (margin >= 40) return "text-accent";
  return "text-primary";
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  new: { label: "New", icon: Sparkles, className: "bg-primary/10 text-primary" },
  saved: { label: "Saved", icon: BookmarkPlus, className: "bg-accent/10 text-accent" },
  purchased: { label: "Purchased", icon: ShoppingCart, className: "bg-warning/10 text-warning" },
  listed: { label: "Listed", icon: Package, className: "bg-success/10 text-success" },
  expired: { label: "Expired", icon: Clock, className: "bg-muted text-muted-foreground" },
};

export default function ClearanceRadar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedRetailers, setSelectedRetailers] = useState<string[]>([]);
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [minMargin, setMinMargin] = useState(40);
  const [loading, setLoading] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState("scan");

  // Saved opportunities
  const [savedOpps, setSavedOpps] = useState<SavedOpportunity[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);

  const toggleRetailer = (id: string) => {
    setSelectedRetailers((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  // Fetch saved opportunities
  const fetchSaved = async () => {
    if (!user) return;
    setLoadingSaved(true);
    const { data, error } = await supabase
      .from("clearance_opportunities")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error && data) setSavedOpps(data as SavedOpportunity[]);
    setLoadingSaved(false);
  };

  useEffect(() => {
    if (activeTab === "saved") fetchSaved();
  }, [activeTab, user]);

  const handleScan = async () => {
    if (selectedRetailers.length === 0) {
      toast.error("Select at least one retailer to scan");
      return;
    }

    setLoading(true);
    setOpportunities([]);
    setHasSearched(false);

    try {
      const { data, error } = await supabase.functions.invoke("clearance-radar", {
        body: { retailers: selectedRetailers, brand, category, min_margin: minMargin },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setOpportunities(data?.opportunities || []);
      setHasSearched(true);

      if (data?.opportunities?.length > 0) {
        toast.success(`Found ${data.opportunities.length} clearance opportunities!`);
      } else {
        toast.info("No profitable opportunities found. Try different filters or lower your margin.");
      }
    } catch (e: any) {
      toast.error(e.message || "Scan failed");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveOpportunity = async (opp: Opportunity, index: number) => {
    if (!user) { toast.error("Sign in first"); return; }
    setSavingId(index);
    const { error } = await supabase.from("clearance_opportunities").insert({
      user_id: user.id,
      retailer: opp.retailer,
      item_title: opp.item_title,
      item_url: opp.item_url || null,
      image_url: opp.image_url || null,
      sale_price: opp.sale_price,
      vinted_resale_price: opp.vinted_resale_price,
      estimated_profit: opp.estimated_profit,
      profit_margin: opp.profit_margin,
      brand: opp.brand || null,
      category: opp.category || null,
      ai_notes: opp.ai_notes || null,
      status: "saved",
    });
    setSavingId(null);
    if (error) toast.error("Failed to save");
    else toast.success("Opportunity saved!");
  };

  const updateSavedStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("clearance_opportunities").update({ status }).eq("id", id);
    if (error) toast.error("Update failed");
    else {
      setSavedOpps((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
      toast.success(`Marked as ${status}`);
    }
  };

  const deleteSaved = async (id: string) => {
    const { error } = await supabase.from("clearance_opportunities").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else {
      setSavedOpps((prev) => prev.filter((o) => o.id !== id));
      toast.success("Removed");
    }
  };

  const totalPotentialProfit = opportunities.reduce((sum, o) => sum + (o.estimated_profit || 0), 0);
  const avgMargin = opportunities.length > 0
    ? Math.round(opportunities.reduce((sum, o) => sum + (o.profit_margin || 0), 0) / opportunities.length)
    : 0;

  const savedStats = {
    total: savedOpps.length,
    totalProfit: savedOpps.reduce((s, o) => s + (o.estimated_profit || 0), 0),
    purchased: savedOpps.filter((o) => o.status === "purchased").length,
    listed: savedOpps.filter((o) => o.status === "listed").length,
  };

  return (
    <PageShell
      title="Clearance Radar"
      subtitle="Find clearance items to flip on Vinted"
      icon={<ShoppingCart className="w-5 h-5 text-primary" />}
      maxWidth="max-w-4xl"
    >
      <FeatureGate feature="clearance_radar">
        <UseCaseSpotlight
          featureKey="clearance-radar"
          icon={ShoppingCart}
          scenario="ASOS Outlet has a flash sale but you don't know which items actually resell well on Vinted..."
          description="Buying clearance blindly means half your stock never sells. You need data to pick winners."
          outcome="Clearance Radar scrapes sale pages directly, cross-references with Vinted resale data, and highlights items with 50%+ margins."
          tip="Check multiple retailers at once to find the best cross-platform opportunities."
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="scan" className="gap-2">
              <Search className="w-3.5 h-3.5" /> New Scan
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <BookmarkPlus className="w-3.5 h-3.5" /> Saved ({savedOpps.length})
            </TabsTrigger>
          </TabsList>

          {/* ── SCAN TAB ── */}
          <TabsContent value="scan">
            <Card className="p-4 sm:p-6 mb-6 sm:mb-8">
              <h2 className="font-display font-bold text-sm sm:text-base mb-3 sm:mb-4 flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                Select Retailers to Scan
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-5">
                {RETAILERS.map((retailer) => (
                  <label
                    key={retailer.id}
                    className={`flex items-center gap-2 sm:gap-2.5 p-2.5 sm:p-3 rounded-lg border cursor-pointer transition-all active:scale-[0.98] ${
                      selectedRetailers.includes(retailer.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <Checkbox
                      checked={selectedRetailers.includes(retailer.id)}
                      onCheckedChange={() => toggleRetailer(retailer.id)}
                    />
                    <span className="text-xs sm:text-sm font-medium">{retailer.label}</span>
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Brand (optional)</Label>
                  <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Nike, Carhartt, Levi's" className="h-11 sm:h-10 text-base sm:text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category (optional)</Label>
                  <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Jacket, Trainers, Bag" className="h-11 sm:h-10 text-base sm:text-sm" />
                </div>
              </div>

              <div className="mb-5">
                <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Minimum Profit Margin: {minMargin}%</Label>
                <Slider value={[minMargin]} onValueChange={(v) => setMinMargin(v[0])} min={10} max={80} step={5} className="mt-2" />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>10% (more results)</span>
                  <span>80% (high margin only)</span>
                </div>
              </div>

              <Button onClick={handleScan} disabled={loading || selectedRetailers.length === 0} className="w-full font-semibold h-12 sm:h-11 active:scale-[0.98] transition-transform">
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Scanning clearance pages...</>
                ) : (
                  <><Zap className="w-4 h-4 mr-2" /> Scan {selectedRetailers.length} Retailer{selectedRetailers.length !== 1 ? "s" : ""}</>
                )}
              </Button>
            </Card>

            {loading && <ArbitrageCardSkeleton count={4} />}

            {hasSearched && !loading && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 sm:space-y-6">
                {opportunities.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <Card className="p-3 sm:p-4">
                      <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Opportunities</p>
                      <p className="font-display text-xl sm:text-2xl font-bold">{opportunities.length}</p>
                    </Card>
                    <Card className="p-3 sm:p-4">
                      <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Total Potential</p>
                      <p className="font-display text-xl sm:text-2xl font-bold text-success">£{totalPotentialProfit.toFixed(0)}</p>
                    </Card>
                    <Card className="p-3 sm:p-4">
                      <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Avg Margin</p>
                      <p className={`font-display text-xl sm:text-2xl font-bold ${getMarginColor(avgMargin)}`}>{avgMargin}%</p>
                    </Card>
                  </div>
                )}

                {opportunities.length === 0 ? (
                  <Card className="p-8 sm:p-10 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
                      <ShoppingBag className="w-7 h-7 text-muted-foreground/40" />
                    </div>
                    <h3 className="font-display font-bold text-base sm:text-lg mb-2">No opportunities found</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                      No clearance items matched with ≥{minMargin}% margin on Vinted. Try more retailers, different filters, or a lower margin.
                    </p>
                    <Button onClick={() => setMinMargin(Math.max(10, minMargin - 10))} variant="outline" size="sm">
                      Lower margin to {Math.max(10, minMargin - 10)}%
                    </Button>
                  </Card>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    <h3 className="font-display font-bold text-sm sm:text-base flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      {opportunities.length} Clearance Flip Opportunities
                    </h3>

                    <AnimatePresence>
                      {opportunities.map((opp, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                          <Card className="p-3.5 sm:p-5 hover:shadow-md transition-all">
                            <div className="flex items-start gap-3 sm:gap-4 mb-3">
                              {/* Image */}
                              {opp.image_url && (
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-muted overflow-hidden shrink-0">
                                  <img src={opp.image_url} alt={opp.item_title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <h4 className="font-display font-bold text-sm truncate">{opp.item_title}</h4>
                                <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                                  <Badge variant="outline" className={`text-[10px] ${getRetailerColor(opp.retailer)}`}>{opp.retailer}</Badge>
                                  {opp.brand && <Badge variant="outline" className="text-[10px]">{opp.brand}</Badge>}
                                  {opp.category && <Badge variant="outline" className="text-[10px] text-muted-foreground">{opp.category}</Badge>}
                                </div>
                              </div>
                              <div className="bg-success/10 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-center shrink-0">
                                <p className="font-display text-base sm:text-lg font-extrabold text-success leading-none">+£{opp.estimated_profit?.toFixed(0)}</p>
                                <p className="text-[9px] text-success/80 mt-0.5">{opp.profit_margin?.toFixed(0)}% margin</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-3 mb-3 p-2.5 sm:p-3 rounded-lg bg-muted/50">
                              <div className="flex-1 text-center">
                                <p className="text-[10px] text-muted-foreground">Buy at {opp.retailer}</p>
                                <p className="font-display font-bold text-sm sm:text-base">£{opp.sale_price?.toFixed(2)}</p>
                              </div>
                              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-success shrink-0" />
                              <div className="flex-1 text-center">
                                <p className="text-[10px] text-muted-foreground">Sell on Vinted</p>
                                <p className="font-display font-bold text-sm sm:text-base text-success">£{opp.vinted_resale_price?.toFixed(2)}</p>
                              </div>
                            </div>

                            {opp.ai_notes && <p className="text-xs text-muted-foreground leading-relaxed mb-3">{opp.ai_notes}</p>}

                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                              {opp.item_url && (
                                <a href={opp.item_url} target="_blank" rel="noopener noreferrer">
                                  <Button variant="outline" size="sm" className="text-[10px] sm:text-xs h-9 active:scale-95 transition-transform">
                                    <ExternalLink className="w-3 h-3 mr-1" /> Buy Now
                                  </Button>
                                </a>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-[10px] sm:text-xs h-9 active:scale-95 transition-transform"
                                disabled={savingId === i}
                                onClick={() => saveOpportunity(opp, i)}
                              >
                                {savingId === i ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />} Save
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-[10px] sm:text-xs h-9 active:scale-95 transition-transform"
                                onClick={() => navigate(`/price-check?brand=${encodeURIComponent(opp.brand || "")}&category=${encodeURIComponent(opp.category || "")}`)}
                              >
                                <Search className="w-3 h-3 mr-1" /> Check Price
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-[10px] sm:text-xs h-9 active:scale-95 transition-transform"
                                onClick={() => navigate(`/optimize?brand=${encodeURIComponent(opp.brand || "")}&category=${encodeURIComponent(opp.category || "")}`)}
                              >
                                <Sparkles className="w-3 h-3 mr-1" /> Create Listing
                              </Button>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                <div className="flex justify-center pt-4">
                  <Button onClick={() => { setHasSearched(false); setOpportunities([]); }} variant="outline">New Search</Button>
                </div>
              </motion.div>
            )}
          </TabsContent>

          {/* ── SAVED TAB ── */}
          <TabsContent value="saved">
            {/* Saved stats */}
            {savedOpps.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
                <Card className="p-3">
                  <p className="text-[10px] text-muted-foreground font-medium">Saved</p>
                  <p className="font-display text-lg font-bold">{savedStats.total}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-[10px] text-muted-foreground font-medium">Total Potential</p>
                  <p className="font-display text-lg font-bold text-success">£{savedStats.totalProfit.toFixed(0)}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-[10px] text-muted-foreground font-medium">Purchased</p>
                  <p className="font-display text-lg font-bold text-warning">{savedStats.purchased}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-[10px] text-muted-foreground font-medium">Listed</p>
                  <p className="font-display text-lg font-bold text-success">{savedStats.listed}</p>
                </Card>
              </div>
            )}

            {loadingSaved ? (
              <ArbitrageCardSkeleton count={3} />
            ) : savedOpps.length === 0 ? (
              <Card className="p-8 sm:p-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
                  <BookmarkPlus className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <h3 className="font-display font-bold text-base sm:text-lg mb-2">No saved opportunities</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4">Run a scan and save the best opportunities to track them here.</p>
                <Button onClick={() => setActiveTab("scan")} variant="outline" size="sm">
                  <Search className="w-3.5 h-3.5 mr-1.5" /> Run a Scan
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {savedOpps.map((opp) => {
                  const statusCfg = STATUS_CONFIG[opp.status] || STATUS_CONFIG.new;
                  const StatusIcon = statusCfg.icon;
                  return (
                    <Card key={opp.id} className="p-3.5 sm:p-5 hover:shadow-md transition-all">
                      <div className="flex items-start gap-3 sm:gap-4 mb-3">
                        {opp.image_url && (
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-muted overflow-hidden shrink-0">
                            <img src={opp.image_url} alt={opp.item_title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-display font-bold text-sm truncate">{opp.item_title}</h4>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <Badge variant="outline" className={`text-[10px] ${getRetailerColor(opp.retailer)}`}>{opp.retailer}</Badge>
                            {opp.brand && <Badge variant="outline" className="text-[10px]">{opp.brand}</Badge>}
                            <Badge className={`text-[10px] ${statusCfg.className} border-0`}>
                              <StatusIcon className="w-2.5 h-2.5 mr-0.5" /> {statusCfg.label}
                            </Badge>
                          </div>
                        </div>
                        {opp.estimated_profit != null && (
                          <div className="bg-success/10 rounded-xl px-2.5 py-1.5 text-center shrink-0">
                            <p className="font-display text-sm font-extrabold text-success leading-none">+£{opp.estimated_profit.toFixed(0)}</p>
                            <p className="text-[9px] text-success/80 mt-0.5">{opp.profit_margin?.toFixed(0)}%</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-muted/50 text-xs">
                        <span>Buy: <strong>£{opp.sale_price?.toFixed(2)}</strong></span>
                        <TrendingUp className="w-3.5 h-3.5 text-success" />
                        <span>Sell: <strong className="text-success">£{opp.vinted_resale_price?.toFixed(2)}</strong></span>
                      </div>

                      {opp.ai_notes && <p className="text-xs text-muted-foreground leading-relaxed mb-3">{opp.ai_notes}</p>}

                      <div className="flex flex-wrap gap-1.5">
                        {opp.status !== "purchased" && (
                          <Button variant="outline" size="sm" className="text-[10px] h-8" onClick={() => updateSavedStatus(opp.id, "purchased")}>
                            <ShoppingCart className="w-3 h-3 mr-1" /> Mark Purchased
                          </Button>
                        )}
                        {opp.status !== "listed" && (
                          <Button variant="outline" size="sm" className="text-[10px] h-8 text-success" onClick={() => updateSavedStatus(opp.id, "listed")}>
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Mark Listed
                          </Button>
                        )}
                        {opp.item_url && (
                          <a href={opp.item_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="text-[10px] h-8">
                              <ExternalLink className="w-3 h-3 mr-1" /> View
                            </Button>
                          </a>
                        )}
                        <Button variant="ghost" size="sm" className="text-[10px] h-8 text-destructive" onClick={() => deleteSaved(opp.id)}>
                          <Trash2 className="w-3 h-3 mr-1" /> Remove
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </FeatureGate>
    </PageShell>
  );
}
