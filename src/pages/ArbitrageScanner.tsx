import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Loader2, Zap, ExternalLink,
  TrendingUp, ShoppingBag, BarChart3, ArrowRightLeft,
  Copy, ChevronDown, Star, Clock, Shield, Flame,
  BookmarkPlus, History, Filter, Sparkles,
} from "lucide-react";
import { ArbitrageCardSkeleton } from "@/components/LoadingSkeletons";
import { UseCaseSpotlight } from "@/components/UseCaseSpotlight";
import { PageShell } from "@/components/PageShell";
import { MobileBottomNav } from "@/components/MobileBottomNav";

type Opportunity = {
  source_platform: string;
  source_url: string | null;
  source_title: string;
  source_price: number;
  vinted_estimated_price: number;
  estimated_profit: number;
  profit_margin: number;
  brand: string;
  category: string;
  condition: string;
  ai_notes: string;
  deal_score?: number;
  risk_level?: string;
  estimated_days_to_sell?: number;
  demand_indicator?: string;
  suggested_listing_title?: string;
  shipping_estimate?: number;
  net_profit?: number;
};

type SavedSearch = {
  id: string;
  brand: string | null;
  category: string | null;
  min_margin: number;
  platforms: string[];
  label: string | null;
  last_run_at: string | null;
  created_at: string;
};

const PLATFORMS = [
  { name: "eBay", color: "hsl(210 80% 50%)" },
  { name: "Depop", color: "hsl(350 80% 55%)" },
  { name: "Facebook Marketplace", color: "hsl(220 60% 50%)" },
  { name: "Gumtree", color: "hsl(152 69% 41%)" },
];

function getPlatformBorderColor(platform: string) {
  const p = PLATFORMS.find(pl => pl.name === platform);
  return p?.color || "hsl(var(--muted-foreground))";
}

function getPlatformBadgeClass(platform: string) {
  switch (platform) {
    case "eBay": return "bg-[hsl(210,80%,50%)]/10 text-[hsl(210,80%,50%)] border-[hsl(210,80%,50%)]/20";
    case "Depop": return "bg-[hsl(350,80%,55%)]/10 text-[hsl(350,80%,55%)] border-[hsl(350,80%,55%)]/20";
    case "Facebook Marketplace": return "bg-[hsl(220,60%,50%)]/10 text-[hsl(220,60%,50%)] border-[hsl(220,60%,50%)]/20";
    case "Gumtree": return "bg-[hsl(152,69%,41%)]/10 text-[hsl(152,69%,41%)] border-[hsl(152,69%,41%)]/20";
    default: return "bg-muted text-muted-foreground";
  }
}

function getDealScoreColor(score: number) {
  if (score >= 80) return { bg: "bg-success/15", text: "text-success", label: "Hot Deal" };
  if (score >= 60) return { bg: "bg-accent/15", text: "text-accent", label: "Good Deal" };
  return { bg: "bg-primary/15", text: "text-primary", label: "Fair Deal" };
}

function getDemandBadge(indicator?: string) {
  switch (indicator) {
    case "hot": return { icon: Flame, class: "bg-destructive/10 text-destructive border-destructive/20", label: "Hot" };
    case "warm": return { icon: TrendingUp, class: "bg-accent/10 text-accent border-accent/20", label: "Warm" };
    case "cold": return { icon: Clock, class: "bg-muted text-muted-foreground border-border", label: "Cold" };
    default: return null;
  }
}

function getRiskBadge(level?: string) {
  switch (level) {
    case "low": return "text-success";
    case "medium": return "text-accent";
    case "high": return "text-destructive";
    default: return "text-muted-foreground";
  }
}

type SortKey = "deal_score" | "profit" | "margin" | "speed";

export default function ArbitrageScanner() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [minMargin, setMinMargin] = useState(30);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(PLATFORMS.map(p => p.name));

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [conditionFilter, setConditionFilter] = useState("any");
  const [maxBuyPrice, setMaxBuyPrice] = useState("");

  const [loading, setLoading] = useState(false);
  const [scanningPlatform, setScanningPlatform] = useState("");
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [sortBy, setSortBy] = useState<SortKey>("deal_score");
  const [platformFilter, setPlatformFilter] = useState("all");

  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [historyOpps, setHistoryOpps] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user) return;
    supabase
      .from("saved_searches" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setSavedSearches(data as unknown as SavedSearch[]);
      });
  }, [user]);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    const { data } = await supabase
      .from("arbitrage_opportunities")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setHistoryOpps(data || []);
    setHistoryLoading(false);
  }, [user]);

  const togglePlatform = (name: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
    );
  };

  const handleScan = async () => {
    if (!brand && !category) {
      toast.error("Enter at least a brand or category to scan");
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Select at least one platform to scan");
      return;
    }

    setLoading(true);
    setOpportunities([]);
    setHasSearched(false);

    for (const p of selectedPlatforms) {
      setScanningPlatform(p);
      await new Promise(r => setTimeout(r, 600));
    }
    setScanningPlatform("Analysing deals...");

    try {
      const { data, error } = await supabase.functions.invoke("arbitrage-scan", {
        body: { brand, category, min_profit_margin: minMargin, platforms: selectedPlatforms },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      let results: Opportunity[] = data?.opportunities || [];

      if (conditionFilter !== "any") {
        results = results.filter(o => o.condition?.toLowerCase().includes(conditionFilter.toLowerCase()));
      }
      if (maxBuyPrice && !isNaN(Number(maxBuyPrice))) {
        results = results.filter(o => o.source_price <= Number(maxBuyPrice));
      }

      setOpportunities(results);
      setSearchTerm(data?.search_term || "");
      setHasSearched(true);

      if (results.length > 0) {
        const bestScore = Math.max(...results.map(o => o.deal_score || 0));
        if (bestScore >= 90) {
          toast.success(`🔥 Found a ${bestScore}-score Hot Deal among ${results.length} opportunities!`);
        } else {
          toast.success(`Found ${results.length} arbitrage opportunities!`);
        }
      } else {
        toast.info("No profitable opportunities found. Try adjusting your criteria.");
      }
    } catch (e: any) {
      toast.error(e.message || "Scan failed");
      console.error(e);
    } finally {
      setLoading(false);
      setScanningPlatform("");
    }
  };

  const saveSearch = async () => {
    if (!user || (!brand && !category)) return;
    const label = [brand, category].filter(Boolean).join(" ") + ` (${minMargin}%+)`;
    const { error } = await supabase.from("saved_searches" as any).insert({
      user_id: user.id,
      brand: brand || null,
      category: category || null,
      min_margin: minMargin,
      platforms: selectedPlatforms,
      label,
    } as any);
    if (!error) {
      toast.success("Search saved!");
      const { data } = await supabase
        .from("saved_searches" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) setSavedSearches(data as unknown as SavedSearch[]);
    }
  };

  const runSavedSearch = (s: SavedSearch) => {
    setBrand(s.brand || "");
    setCategory(s.category || "");
    setMinMargin(s.min_margin);
    setSelectedPlatforms(s.platforms || PLATFORMS.map(p => p.name));
    setTimeout(() => handleScan(), 100);
  };

  const copyTitle = (title: string) => {
    navigator.clipboard.writeText(title);
    toast.success("Listing title copied!");
  };

  const sortedOpps = [...opportunities]
    .filter(o => platformFilter === "all" || o.source_platform === platformFilter)
    .sort((a, b) => {
      switch (sortBy) {
        case "deal_score": return (b.deal_score || 0) - (a.deal_score || 0);
        case "profit": return (b.net_profit || b.estimated_profit || 0) - (a.net_profit || a.estimated_profit || 0);
        case "margin": return (b.profit_margin || 0) - (a.profit_margin || 0);
        case "speed": return (a.estimated_days_to_sell || 99) - (b.estimated_days_to_sell || 99);
        default: return 0;
      }
    });

  const totalPotentialProfit = opportunities.reduce((sum, o) => sum + (o.net_profit || o.estimated_profit || 0), 0);
  const avgMargin = opportunities.length > 0
    ? Math.round(opportunities.reduce((sum, o) => sum + (o.profit_margin || 0), 0) / opportunities.length)
    : 0;
  const bestDealScore = opportunities.length > 0
    ? Math.max(...opportunities.map(o => o.deal_score || 0))
    : 0;

  return (
    <PageShell
      title="Arbitrage Scanner"
      subtitle="Find profitable deals across UK platforms"
      icon={<ArrowRightLeft className="w-5 h-5 text-primary" />}
      maxWidth="max-w-4xl"
    >
      <UseCaseSpotlight
        featureKey="arbitrage-scanner"
        icon={ArrowRightLeft}
        scenario="You wonder if the North Face puffer on eBay for £25 is worth flipping..."
        description="Manually checking Vinted prices for every find is slow and you might miss the best deals."
        outcome="Arbitrage Scanner shows the same jacket sells for £55–65 on Vinted. That's a £30+ profit per flip."
        tip="Set your minimum margin to 40%+ to filter for only the most profitable opportunities."
      />

      <Tabs defaultValue="scan" className="mb-6">
        <TabsList className="w-full h-11">
          <TabsTrigger value="scan" className="flex-1 gap-1.5 h-9">
            <Search className="w-3.5 h-3.5" /> New Scan
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 gap-1.5 h-9" onClick={loadHistory}>
            <History className="w-3.5 h-3.5" /> Past Finds
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="space-y-5 sm:space-y-6 mt-4">
          {/* Saved Searches */}
          {savedSearches.length > 0 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
              {savedSearches.map(s => (
                <button
                  key={s.id}
                  onClick={() => runSavedSearch(s)}
                  className="shrink-0 px-3 py-2 rounded-full text-xs font-medium bg-muted hover:bg-muted/80 active:scale-95 border border-border transition-all"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Search Form */}
          <Card className="p-4 sm:p-6 border-border/50">
            <h2 className="font-display font-bold text-sm sm:text-base mb-4 flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              What are you looking to flip?
            </h2>

            {/* Platform Chips */}
            <div className="mb-4">
              <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Platforms to scan</Label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => {
                  const active = selectedPlatforms.includes(p.name);
                  return (
                    <button
                      key={p.name}
                      onClick={() => togglePlatform(p.name)}
                      className={`flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95 ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: active ? p.color : "hsl(var(--muted-foreground) / 0.3)" }}
                      />
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Brand</Label>
                <Input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Nike, Carhartt, Levi's"
                  className="h-11 sm:h-10 text-base sm:text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleScan()}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Jacket, Trainers, Bag"
                  className="h-11 sm:h-10 text-base sm:text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleScan()}
                />
              </div>
            </div>

            <div className="mb-4">
              <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Minimum Profit Margin: <span className="text-foreground">{minMargin}%</span>
              </Label>
              <Slider
                value={[minMargin]}
                onValueChange={(v) => setMinMargin(v[0])}
                min={10}
                max={80}
                step={5}
                className="mt-3"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
                <span>10% (more results)</span>
                <span>80% (high margin)</span>
              </div>
            </div>

            {/* Advanced Filters */}
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3 py-1">
                  <Filter className="w-3.5 h-3.5" />
                  Advanced Filters
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Condition</Label>
                    <Select value={conditionFilter} onValueChange={setConditionFilter}>
                      <SelectTrigger className="h-11 sm:h-9 text-base sm:text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any condition</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="like new">Like New</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Max buy price (£)</Label>
                    <Input
                      type="number"
                      value={maxBuyPrice}
                      onChange={e => setMaxBuyPrice(e.target.value)}
                      placeholder="e.g. 50"
                      className="h-11 sm:h-9 text-base sm:text-xs"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="flex gap-2">
              <Button onClick={handleScan} disabled={loading} className="flex-1 font-semibold h-12 sm:h-10 active:scale-95 transition-transform">
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {scanningPlatform || "Scanning..."}</>
                ) : (
                  <><Zap className="w-4 h-4 mr-2" /> Scan for Arbitrage</>
                )}
              </Button>
              {(brand || category) && (
                <Button variant="outline" size="icon" onClick={saveSearch} title="Save this search" className="h-12 sm:h-10 w-12 sm:w-10 shrink-0 active:scale-95 transition-transform">
                  <BookmarkPlus className="w-4 h-4" />
                </Button>
              )}
            </div>
          </Card>

          {/* Loading */}
          {loading && <ArbitrageCardSkeleton count={4} />}

          {/* Results */}
          {hasSearched && !loading && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              {/* Summary Stats */}
              {opportunities.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  <Card className="p-3 bg-muted/30">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Found</p>
                    <p className="font-display text-xl sm:text-2xl font-bold">{opportunities.length}</p>
                  </Card>
                  <Card className="p-3 bg-success/5 border-success/10">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Profit</p>
                    <p className="font-display text-xl sm:text-2xl font-bold text-success">£{totalPotentialProfit.toFixed(0)}</p>
                  </Card>
                  <Card className="p-3 bg-accent/5 border-accent/10">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Avg Margin</p>
                    <p className="font-display text-xl sm:text-2xl font-bold text-accent">{avgMargin}%</p>
                  </Card>
                  <Card className="p-3 bg-primary/5 border-primary/10">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Best Deal</p>
                    <p className="font-display text-xl sm:text-2xl font-bold text-primary flex items-center gap-1">
                      <Star className="w-3.5 h-3.5" /> {bestDealScore}
                    </p>
                  </Card>
                </div>
              )}

              {/* Sort & Filter Bar */}
              {opportunities.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                    <SelectTrigger className="w-[140px] sm:w-[160px] h-9 text-xs">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deal_score">Best deals</SelectItem>
                      <SelectItem value="profit">Highest profit</SelectItem>
                      <SelectItem value="margin">Highest margin</SelectItem>
                      <SelectItem value="speed">Fastest sell</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1 min-w-0">
                    <button
                      onClick={() => setPlatformFilter("all")}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-medium border transition-all active:scale-95 shrink-0 ${
                        platformFilter === "all" ? "bg-primary/10 text-primary border-primary/30" : "bg-background text-muted-foreground border-border"
                      }`}
                    >
                      All
                    </button>
                    {PLATFORMS.filter(p => selectedPlatforms.includes(p.name)).map(p => (
                      <button
                        key={p.name}
                        onClick={() => setPlatformFilter(p.name)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-medium border transition-all active:scale-95 whitespace-nowrap shrink-0 ${
                          platformFilter === p.name ? "bg-primary/10 text-primary border-primary/30" : "bg-background text-muted-foreground border-border"
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Opportunity Cards */}
              {sortedOpps.length === 0 && opportunities.length === 0 ? (
                <Card className="p-8 sm:p-10 text-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
                    <ShoppingBag className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground/40" />
                  </div>
                  <h3 className="font-display font-bold text-sm sm:text-lg mb-1.5">No opportunities found</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                    No items matched your criteria with ≥{minMargin}% margin.
                  </p>
                  <Button onClick={() => setMinMargin(Math.max(10, minMargin - 10))} variant="outline" className="h-10 active:scale-95 transition-transform">
                    Lower margin to {Math.max(10, minMargin - 10)}% and retry
                  </Button>
                </Card>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="font-display font-bold text-sm sm:text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    {sortedOpps.length} {sortedOpps.length === 1 ? "opportunity" : "opportunities"} for "{searchTerm}"
                  </h3>

                  <AnimatePresence>
                    {sortedOpps.map((opp, i) => {
                      const dealInfo = getDealScoreColor(opp.deal_score || 50);
                      const demandBadge = getDemandBadge(opp.demand_indicator);
                      const expanded = expandedCards.has(i);

                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                        >
                          <Card
                            className="p-3.5 sm:p-5 hover:shadow-md active:scale-[0.99] transition-all overflow-hidden"
                            style={{ borderLeft: `3px solid ${getPlatformBorderColor(opp.source_platform)}` }}
                          >
                            {/* Header */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-display font-bold text-sm leading-snug line-clamp-2">{opp.source_title}</h4>
                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                  <Badge variant="outline" className={`text-[10px] py-0 ${getPlatformBadgeClass(opp.source_platform)}`}>
                                    {opp.source_platform}
                                  </Badge>
                                  {opp.brand && <Badge variant="outline" className="text-[10px] py-0">{opp.brand}</Badge>}
                                  {opp.condition && <Badge variant="outline" className="text-[10px] py-0 text-muted-foreground">{opp.condition}</Badge>}
                                  {demandBadge && (
                                    <Badge variant="outline" className={`text-[10px] py-0 ${demandBadge.class}`}>
                                      <demandBadge.icon className="w-2.5 h-2.5 mr-0.5" />
                                      {demandBadge.label}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {opp.deal_score != null && (
                                <div className={`${dealInfo.bg} rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-center shrink-0`}>
                                  <p className={`font-display text-base sm:text-lg font-extrabold ${dealInfo.text} leading-none`}>
                                    {opp.deal_score}
                                  </p>
                                  <p className={`text-[8px] sm:text-[9px] ${dealInfo.text} opacity-80 mt-0.5`}>{dealInfo.label}</p>
                                </div>
                              )}
                            </div>

                            {/* Price Comparison */}
                            <div className="mb-3">
                              <div className="flex items-center gap-2 sm:gap-3 p-3 rounded-xl bg-muted/40">
                                <div className="flex-1 text-center">
                                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">Buy</p>
                                  <p className="font-display font-bold text-sm sm:text-base">£{opp.source_price?.toFixed(2)}</p>
                                </div>
                                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-success shrink-0" />
                                <div className="flex-1 text-center">
                                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">Sell on Vinted</p>
                                  <p className="font-display font-bold text-sm sm:text-base text-success">£{opp.vinted_estimated_price?.toFixed(2)}</p>
                                </div>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-primary to-success transition-all"
                                  style={{ width: `${Math.min(100, opp.profit_margin || 0)}%` }}
                                />
                              </div>
                            </div>

                            {/* Metrics Row */}
                            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-3 text-center">
                              <div className="p-1.5 sm:p-2 rounded-lg bg-success/5">
                                <p className="text-[8px] sm:text-[9px] text-muted-foreground">Profit</p>
                                <p className="font-display font-bold text-xs sm:text-sm text-success">
                                  +£{(opp.net_profit || opp.estimated_profit || 0).toFixed(0)}
                                </p>
                              </div>
                              <div className="p-1.5 sm:p-2 rounded-lg bg-muted/40">
                                <p className="text-[8px] sm:text-[9px] text-muted-foreground">Margin</p>
                                <p className="font-display font-bold text-xs sm:text-sm">{opp.profit_margin?.toFixed(0)}%</p>
                              </div>
                              <div className="p-1.5 sm:p-2 rounded-lg bg-muted/40">
                                <p className="text-[8px] sm:text-[9px] text-muted-foreground flex items-center justify-center gap-0.5">
                                  <Shield className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> Risk
                                </p>
                                <p className={`font-display font-bold text-xs sm:text-sm capitalize ${getRiskBadge(opp.risk_level)}`}>
                                  {opp.risk_level || "—"}
                                </p>
                              </div>
                              <div className="p-1.5 sm:p-2 rounded-lg bg-muted/40">
                                <p className="text-[8px] sm:text-[9px] text-muted-foreground flex items-center justify-center gap-0.5">
                                  <Clock className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> Sell
                                </p>
                                <p className="font-display font-bold text-xs sm:text-sm">
                                  {opp.estimated_days_to_sell ? `${opp.estimated_days_to_sell}d` : "—"}
                                </p>
                              </div>
                            </div>

                            {/* Expandable AI Notes */}
                            {opp.ai_notes && (
                              <button
                                onClick={() => setExpandedCards(prev => {
                                  const next = new Set(prev);
                                  next.has(i) ? next.delete(i) : next.add(i);
                                  return next;
                                })}
                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3 transition-colors py-1"
                              >
                                <Sparkles className="w-3 h-3" />
                                AI Analysis
                                <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
                              </button>
                            )}
                            <AnimatePresence>
                              {expanded && opp.ai_notes && (
                                <motion.p
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="text-xs text-muted-foreground leading-relaxed mb-3 overflow-hidden"
                                >
                                  {opp.ai_notes}
                                </motion.p>
                              )}
                            </AnimatePresence>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                              {opp.source_url && (
                                <a href={opp.source_url} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none">
                                  <Button variant="outline" size="sm" className="text-[10px] sm:text-xs w-full sm:w-auto h-9 active:scale-95 transition-transform">
                                    <ExternalLink className="w-3 h-3 mr-1" />
                                    View Source
                                  </Button>
                                </a>
                              )}
                              {opp.suggested_listing_title && (
                                <Button variant="outline" size="sm" className="text-[10px] sm:text-xs h-9 active:scale-95 transition-transform" onClick={() => copyTitle(opp.suggested_listing_title!)}>
                                  <Copy className="w-3 h-3 mr-1" /> Copy Title
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px] sm:text-xs text-primary h-9 active:scale-95 transition-transform"
                                onClick={() => navigate(`/optimize?brand=${encodeURIComponent(opp.brand || "")}&category=${encodeURIComponent(opp.category || "")}&title=${encodeURIComponent(opp.suggested_listing_title || opp.source_title)}`)}
                              >
                                <Sparkles className="w-3 h-3 mr-1" /> Create Listing
                              </Button>
                            </div>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}

              {/* New Search */}
              <div className="flex justify-center pt-2 pb-4">
                <Button
                  onClick={() => { setHasSearched(false); setOpportunities([]); setPlatformFilter("all"); }}
                  variant="outline"
                  className="h-10"
                >
                  New Search
                </Button>
              </div>
            </motion.div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          {historyLoading ? (
            <ArbitrageCardSkeleton count={3} />
          ) : historyOpps.length === 0 ? (
            <Card className="p-8 sm:p-10 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
                <History className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground/40" />
              </div>
              <h3 className="font-display font-bold text-sm sm:text-lg mb-1.5">No past finds yet</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Run your first scan to start building history.</p>
            </Card>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {historyOpps.map((opp: any) => {
                const dealInfo = getDealScoreColor(opp.deal_score || 50);
                return (
                  <Card
                    key={opp.id}
                    className="p-3 sm:p-4 active:scale-[0.99] transition-transform"
                    style={{ borderLeft: `3px solid ${getPlatformBorderColor(opp.source_platform)}` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-display font-bold text-sm truncate">{opp.source_title}</h4>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <Badge variant="outline" className={`text-[10px] py-0 ${getPlatformBadgeClass(opp.source_platform)}`}>
                            {opp.source_platform}
                          </Badge>
                          {opp.brand && <Badge variant="outline" className="text-[10px] py-0">{opp.brand}</Badge>}
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(opp.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {opp.deal_score != null && (
                          <span className={`font-display font-bold text-sm ${dealInfo.text}`}>{opp.deal_score}</span>
                        )}
                        <span className="font-display font-bold text-sm text-success">
                          +£{(opp.net_profit || opp.estimated_profit || 0).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <MobileBottomNav />
    </PageShell>
  );
}
