import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { PageShell } from "@/components/PageShell";

import {
  Flame, BarChart3, Clock, Crown, CalendarDays, Target,
  ChevronLeft, ChevronRight, Snowflake, Sun, Leaf, TrendingUp, TrendingDown,
  Minus, Info, Search, MapPin, Loader2, Zap, ShoppingBag, Users, Lightbulb, ArrowRightLeft,
} from "lucide-react";
import TrendCard from "@/components/trends/TrendCard";
import TrendStats from "@/components/trends/TrendStats";
import { UseCaseSpotlight } from "@/components/UseCaseSpotlight";
import { TrendCardSkeleton, ArbitrageCardSkeleton } from "@/components/LoadingSkeletons";
import { UpgradeModal } from "@/components/UpgradeModal";
import { FeatureGate } from "@/components/FeatureGate";

// ─── Trend types ───
type Trend = {
  id: string;
  brand_or_item: string;
  category: string;
  trend_direction: string;
  search_volume_change_7d: number | null;
  search_volume_change_30d: number | null;
  avg_price: number | null;
  price_change_30d: number | null;
  supply_demand_ratio: number | null;
  opportunity_score: number | null;
  ai_summary: string | null;
  estimated_peak_date: string | null;
  detected_at: string;
  updated_at: string;
  data_source?: string;
};

const categories = [
  "All", "Womenswear", "Menswear", "Streetwear", "Vintage",
  "Designer", "Shoes", "Accessories", "Kids",
];

const FREE_TREND_LIMIT = 5;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours === 1) return "1h ago";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

// ─── Seasonal data ───
type DemandLevel = "very_high" | "high" | "medium" | "low" | "very_low";
interface CategoryDemand {
  category: string; icon: string;
  monthlyDemand: { month: number; level: DemandLevel; notes: string }[];
  peakMonths: number[]; lowMonths: number[]; tip: string;
}
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DEMAND_DATA: CategoryDemand[] = [
  { category:"Womenswear", icon:"👗", monthlyDemand:[{month:0,level:"high",notes:"New Year refresh"},{month:1,level:"medium",notes:"Valentine's outfits"},{month:2,level:"high",notes:"Spring transition"},{month:3,level:"very_high",notes:"Spring/summer peak"},{month:4,level:"very_high",notes:"Wedding guest outfits"},{month:5,level:"high",notes:"Holiday wardrobe"},{month:6,level:"medium",notes:"Mid-summer lull"},{month:7,level:"medium",notes:"Autumn preview"},{month:8,level:"very_high",notes:"Autumn wardrobe overhaul"},{month:9,level:"high",notes:"Coats & knitwear"},{month:10,level:"high",notes:"Party season"},{month:11,level:"medium",notes:"Christmas gifts"}], peakMonths:[3,4,8], lowMonths:[6,7], tip:"List spring dresses in March, coats in September." },
  { category:"Menswear", icon:"👔", monthlyDemand:[{month:0,level:"high",notes:"Winter jackets"},{month:1,level:"low",notes:"Quiet period"},{month:2,level:"medium",notes:"Lighter layers"},{month:3,level:"high",notes:"Smart casual"},{month:4,level:"medium",notes:"Summer shirts"},{month:5,level:"medium",notes:"Linen & lightweight"},{month:6,level:"low",notes:"Summer lull"},{month:7,level:"medium",notes:"Back-to-school"},{month:8,level:"very_high",notes:"AW wardrobe overhaul"},{month:9,level:"high",notes:"Coat season"},{month:10,level:"very_high",notes:"Black Friday + gifts"},{month:11,level:"high",notes:"Christmas gifts"}], peakMonths:[8,10], lowMonths:[1,6], tip:"Menswear peaks Sep & Nov. List hoodies by late August." },
  { category:"Shoes", icon:"👟", monthlyDemand:[{month:0,level:"medium",notes:"Winter boots"},{month:1,level:"low",notes:"Quiet"},{month:2,level:"high",notes:"Spring trainers"},{month:3,level:"very_high",notes:"Trainers & sandals"},{month:4,level:"very_high",notes:"Summer shoes peak"},{month:5,level:"high",notes:"Festival sandals"},{month:6,level:"medium",notes:"Steady"},{month:7,level:"medium",notes:"Back-to-school"},{month:8,level:"high",notes:"Autumn boots"},{month:9,level:"very_high",notes:"Boot season"},{month:10,level:"high",notes:"Black Friday"},{month:11,level:"medium",notes:"Gifts"}], peakMonths:[3,4,9], lowMonths:[1], tip:"Trainers sell best March–May. List boots by September." },
  { category:"Streetwear", icon:"🧢", monthlyDemand:[{month:0,level:"high",notes:"New drops"},{month:1,level:"medium",notes:"Hype drops"},{month:2,level:"high",notes:"Hoodie clearance"},{month:3,level:"high",notes:"T-shirt season"},{month:4,level:"medium",notes:"Festival"},{month:5,level:"medium",notes:"Summer tees"},{month:6,level:"low",notes:"Lull"},{month:7,level:"medium",notes:"Back-to-school"},{month:8,level:"very_high",notes:"FW drops"},{month:9,level:"very_high",notes:"Peak hype"},{month:10,level:"high",notes:"Black Friday"},{month:11,level:"high",notes:"Winter staples"}], peakMonths:[8,9], lowMonths:[6], tip:"Carhartt & Nike hoodies sell fastest Sept–Oct." },
  { category:"Designer", icon:"💎", monthlyDemand:[{month:0,level:"medium",notes:"Sales"},{month:1,level:"high",notes:"Valentine's"},{month:2,level:"medium",notes:"Transitional"},{month:3,level:"high",notes:"Spring luxury"},{month:4,level:"very_high",notes:"Weddings"},{month:5,level:"high",notes:"Resort wear"},{month:6,level:"low",notes:"Summer quiet"},{month:7,level:"low",notes:"Lull"},{month:8,level:"high",notes:"AW luxury"},{month:9,level:"high",notes:"Designer coats"},{month:10,level:"very_high",notes:"Black Friday"},{month:11,level:"very_high",notes:"Christmas gifts"}], peakMonths:[4,10,11], lowMonths:[6,7], tip:"Designer bags peak Nov–Dec. List luxury coats by October." },
  { category:"Vintage", icon:"🕰️", monthlyDemand:[{month:0,level:"medium",notes:"Browsing"},{month:1,level:"medium",notes:"Collectors"},{month:2,level:"high",notes:"Vintage fairs"},{month:3,level:"very_high",notes:"70s/90s revival"},{month:4,level:"high",notes:"Festival boho"},{month:5,level:"high",notes:"Summer vintage"},{month:6,level:"medium",notes:"Steady"},{month:7,level:"medium",notes:"Late summer fairs"},{month:8,level:"very_high",notes:"Autumn vintage surge"},{month:9,level:"high",notes:"Leather jackets"},{month:10,level:"high",notes:"Party glam"},{month:11,level:"medium",notes:"Gift purchases"}], peakMonths:[3,8], lowMonths:[6], tip:"Vintage leather jackets sell best Sep–Oct." },
  { category:"Kids", icon:"🧸", monthlyDemand:[{month:0,level:"medium",notes:"Next-size-up"},{month:1,level:"low",notes:"Quiet"},{month:2,level:"high",notes:"Spring growth"},{month:3,level:"high",notes:"Easter outfits"},{month:4,level:"medium",notes:"Summer prep"},{month:5,level:"medium",notes:"Holiday"},{month:6,level:"low",notes:"Lull"},{month:7,level:"very_high",notes:"Back-to-school"},{month:8,level:"very_high",notes:"School uniform"},{month:9,level:"high",notes:"Winter coats"},{month:10,level:"high",notes:"Christmas"},{month:11,level:"very_high",notes:"Christmas gifts"}], peakMonths:[7,8,11], lowMonths:[1,6], tip:"Back-to-school (Aug–Sep) is the #1 window." },
  { category:"Accessories", icon:"👜", monthlyDemand:[{month:0,level:"medium",notes:"Refresh"},{month:1,level:"very_high",notes:"Valentine's"},{month:2,level:"medium",notes:"Spring"},{month:3,level:"high",notes:"Sunglasses"},{month:4,level:"high",notes:"Wedding"},{month:5,level:"high",notes:"Summer bags"},{month:6,level:"medium",notes:"Steady"},{month:7,level:"low",notes:"Quiet"},{month:8,level:"high",notes:"Autumn bags"},{month:9,level:"high",notes:"Winter accessories"},{month:10,level:"very_high",notes:"Gift season"},{month:11,level:"very_high",notes:"Christmas peak"}], peakMonths:[1,10,11], lowMonths:[7], tip:"Jewellery spikes for Valentine's and Christmas." },
];
const DEMAND_COLORS: Record<DemandLevel, string> = { very_high:"bg-primary text-primary-foreground", high:"bg-primary/60 text-primary-foreground", medium:"bg-accent/40 text-accent-foreground", low:"bg-muted text-muted-foreground", very_low:"bg-muted/50 text-muted-foreground" };
const DEMAND_LABELS: Record<DemandLevel, string> = { very_high:"🔥 Very High", high:"High", medium:"Medium", low:"Low", very_low:"Very Low" };
function getSeasonIcon(month: number) {
  if (month >= 2 && month <= 4) return <Leaf className="w-4 h-4 text-success" />;
  if (month >= 5 && month <= 7) return <Sun className="w-4 h-4 text-accent" />;
  if (month >= 8 && month <= 10) return <Leaf className="w-4 h-4 text-primary" />;
  return <Snowflake className="w-4 h-4 text-muted-foreground" />;
}

// ─── Niche types ───
type Niche = {
  niche_name: string; category: string;
  demand_level: "high" | "medium" | "low"; supply_level: "high" | "medium" | "low";
  opportunity_score: number; avg_price: number;
  estimated_monthly_sales: number; competition_count: number;
  sourcing_tips: string; ai_reasoning: string;
};
const NICHE_CATEGORIES = ["Womenswear","Menswear","Streetwear","Vintage","Designer","Shoes","Accessories","Kids","Home"];
function nicheScoreColor(s: number) { return s >= 80 ? "text-success" : s >= 60 ? "text-accent" : "text-primary"; }
function nicheScoreBg(s: number) { return s >= 80 ? "bg-success/10 border-success/20" : s >= 60 ? "bg-accent/10 border-accent/20" : "bg-primary/10 border-primary/20"; }
function levelBar(l: "high"|"medium"|"low") { return l === "high" ? "w-full" : l === "medium" ? "w-2/3" : "w-1/3"; }

export default function TrendRadar() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [allTrends, setAllTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<string>("none");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [activeTab, setActiveTab] = useState("trending");

  const tier = profile?.subscription_tier || "free";
  const isFree = tier === "free";

  // ─── Trending data ───
  const fetchTrends = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-trends", { body: { category: "all" } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAllTrends((data?.trends as Trend[]) || []);
      setDataSource(data?.data_source || "none");
      setLastUpdated(data?.last_updated || null);
    } catch (e: any) {
      toast.error(e.message || "Failed to load trends");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchTrends(); }, [user]);

  const filteredTrends = selectedCategory === "All" ? allTrends : allTrends.filter((t) => t.category === selectedCategory);
  const risingCount = filteredTrends.filter((t) => t.trend_direction === "rising").length;
  const peakingCount = filteredTrends.filter((t) => t.trend_direction === "peaking").length;
  const decliningCount = filteredTrends.filter((t) => t.trend_direction === "declining").length;
  const avgOpportunity = filteredTrends.length > 0 ? Math.round(filteredTrends.reduce((sum, t) => sum + (t.opportunity_score || 0), 0) / filteredTrends.length) : 0;
  const displayTrends = isFree ? filteredTrends.slice(0, FREE_TREND_LIMIT) : filteredTrends;
  const hiddenCount = isFree ? Math.max(0, filteredTrends.length - FREE_TREND_LIMIT) : 0;

  // ─── Seasonal state ───
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const currentMonthData = useMemo(() => {
    return DEMAND_DATA.map((cat) => ({ ...cat, demand: cat.monthlyDemand[selectedMonth] }))
      .sort((a, b) => {
        const order: Record<DemandLevel, number> = { very_high: 0, high: 1, medium: 2, low: 3, very_low: 4 };
        return order[a.demand.level] - order[b.demand.level];
      });
  }, [selectedMonth]);
  const hotCategories = currentMonthData.filter((c) => c.demand.level === "very_high" || c.demand.level === "high");

  // ─── Niche state ───
  const [nicheCategories, setNicheCategories] = useState<string[]>([]);
  const [nicheLoading, setNicheLoading] = useState(false);
  const [niches, setNiches] = useState<Niche[]>([]);
  const [nicheSearched, setNicheSearched] = useState(false);
  const toggleNicheCat = (cat: string) => setNicheCategories((p) => p.includes(cat) ? p.filter((c) => c !== cat) : [...p, cat]);
  const handleNicheScan = async () => {
    if (nicheCategories.length === 0) { toast.error("Select at least one category"); return; }
    setNicheLoading(true); setNiches([]); setNicheSearched(false);
    try {
      const { data, error } = await supabase.functions.invoke("niche-finder", { body: { categories: nicheCategories } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setNiches(data?.niches || []); setNicheSearched(true);
      toast.success(data?.niches?.length > 0 ? `Found ${data.niches.length} niches!` : "No strong niches found");
    } catch (e: any) { toast.error(e.message || "Scan failed"); }
    finally { setNicheLoading(false); }
  };

  const subtitleParts = [
    dataSource === "apify" ? "Real market data" : dataSource === "firecrawl" ? "Web search data" : "No data yet",
    `${allTrends.length} trends`,
  ];

  return (
    <PageShell
      title="Trend Radar"
      icon={<Flame className="w-5 h-5 text-primary" />}
      subtitle={subtitleParts.join(" · ")}
      actions={
        lastUpdated ? (
          <Badge variant="outline" className="text-[10px] sm:text-xs gap-1 font-normal py-0.5">
            <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            {timeAgo(lastUpdated)}
          </Badge>
        ) : null
      }
    >
      <UseCaseSpotlight
        featureKey="trend-radar"
        icon={Flame}
        scenario="You keep seeing Carhartt WIP jackets selling fast but you're not sure if the trend has peaked..."
        description="Without data, you might source stock right as demand falls — leaving you with unsold inventory."
        outcome="Trend Radar shows demand is up 280% and hasn't peaked yet. You source 5 jackets and sell them all within a week."
        tip="Check the 'Rising' tab for early opportunities before everyone else catches on."
      />

      {/* Tabs: Trending / Seasonal / Niches */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-5">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="trending" className="gap-1.5 text-xs sm:text-sm"><Flame className="w-3.5 h-3.5" /> Trending</TabsTrigger>
          <TabsTrigger value="seasonal" className="gap-1.5 text-xs sm:text-sm"><CalendarDays className="w-3.5 h-3.5" /> Seasonal</TabsTrigger>
          <TabsTrigger value="niches" className="gap-1.5 text-xs sm:text-sm"><Target className="w-3.5 h-3.5" /> Niches</TabsTrigger>
        </TabsList>

        {/* ═══ TRENDING TAB ═══ */}
        <TabsContent value="trending">
          <TrendStats risingCount={risingCount} peakingCount={peakingCount} decliningCount={decliningCount} avgOpportunity={avgOpportunity} />

          {/* Category Chips */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-5 sm:mb-6 -mx-1 px-1 pb-1">
            {categories.map((cat) => {
              const count = cat === "All" ? allTrends.length : allTrends.filter((t) => t.category === cat).length;
              const active = selectedCategory === cat;
              return (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`shrink-0 px-3 py-2 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium border transition-all active:scale-95 flex items-center gap-1.5 ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/30"}`}>
                  {cat}
                  {count > 0 && <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${active ? "bg-primary-foreground/20" : "bg-muted"}`}>{count}</span>}
                </button>
              );
            })}
          </div>

          {/* Trend Grid */}
          {loading ? (
            <TrendCardSkeleton count={4} />
          ) : filteredTrends.length === 0 ? (
            <div className="text-center py-12 sm:py-16">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground/40" />
              </div>
              <h3 className="font-display font-bold text-sm sm:text-lg mb-1.5">No trends found</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {allTrends.length === 0 ? "Trends update daily at 6am UK time. Check back soon!" : `No trends in ${selectedCategory} right now. Try another category.`}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
                <AnimatePresence>
                  {displayTrends.map((trend, i) => <TrendCard key={trend.id} trend={trend} index={i} />)}
                </AnimatePresence>
              </div>
              {isFree && hiddenCount > 0 && (
                <div className="mt-6 p-4 sm:p-5 rounded-xl border border-primary/20 bg-primary/[0.03] text-center">
                  <Crown className="w-6 h-6 text-primary mx-auto mb-2" />
                  <h3 className="font-display font-bold text-sm sm:text-base mb-1">See all {filteredTrends.length} trends with a Pro plan</h3>
                  <p className="text-xs text-muted-foreground mb-3">You're seeing the top {FREE_TREND_LIMIT} trends. Unlock full access.</p>
                  <Button size="sm" onClick={() => setShowUpgrade(true)} className="active:scale-95 transition-transform">Upgrade Now</Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ═══ SEASONAL TAB ═══ */}
        <TabsContent value="seasonal">
          {/* Month Selector */}
          <Card className="p-3.5 sm:p-4 mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-3">
              <Button variant="ghost" size="icon" onClick={() => setSelectedMonth((p) => (p === 0 ? 11 : p - 1))} className="h-9 w-9 active:scale-95"><ChevronLeft className="w-5 h-5" /></Button>
              <div className="flex items-center gap-2">
                {getSeasonIcon(selectedMonth)}
                <h2 className="font-display text-lg sm:text-xl font-bold">{MONTHS[selectedMonth]}</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedMonth((p) => (p === 11 ? 0 : p + 1))} className="h-9 w-9 active:scale-95"><ChevronRight className="w-5 h-5" /></Button>
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
              {MONTHS_SHORT.map((m, i) => (
                <button key={m} onClick={() => setSelectedMonth(i)} className={`px-2.5 sm:px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-all shrink-0 active:scale-95 ${i === selectedMonth ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{m}</button>
              ))}
            </div>
          </Card>

          {/* Hot this month */}
          {hotCategories.length > 0 && (
            <Card className="p-3.5 sm:p-4 mb-4 sm:mb-6 border-primary/20 bg-primary/[0.02]">
              <div className="flex items-center gap-2 mb-3"><Flame className="w-5 h-5 text-primary" /><h3 className="font-display font-bold">Hot in {MONTHS[selectedMonth]}</h3></div>
              <div className="flex flex-wrap gap-2">
                {hotCategories.map((c) => (
                  <Badge key={c.category} variant="secondary" className="text-xs sm:text-sm py-1 px-2.5 sm:px-3">
                    {c.icon} {c.category} {c.demand.level === "very_high" && <Flame className="w-3 h-3 ml-1" />}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Category Demand Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {currentMonthData.map((cat) => (
              <Card key={cat.category} className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cat.icon}</span>
                    <h4 className="font-display font-bold text-sm">{cat.category}</h4>
                  </div>
                  <Badge className={`text-[10px] px-2 py-0.5 ${DEMAND_COLORS[cat.demand.level]}`}>
                    {DEMAND_LABELS[cat.demand.level]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{cat.demand.notes}</p>
                <div className="flex items-start gap-1.5 p-2 rounded-lg bg-primary/5 border border-primary/10">
                  <Lightbulb className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] sm:text-xs">{cat.tip}</p>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ═══ NICHES TAB ═══ */}
        <TabsContent value="niches">
          <FeatureGate feature="niche_finder">
            <Card className="p-4 sm:p-6 mb-6">
              <h2 className="font-display font-bold text-sm sm:text-base mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Select Categories to Analyse
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
                {NICHE_CATEGORIES.map((cat) => (
                  <label key={cat} className={`flex items-center gap-2 p-2.5 sm:p-3 rounded-lg border cursor-pointer transition-all active:scale-[0.98] ${nicheCategories.includes(cat) ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                    <Checkbox checked={nicheCategories.includes(cat)} onCheckedChange={() => toggleNicheCat(cat)} />
                    <span className="text-xs sm:text-sm font-medium">{cat}</span>
                  </label>
                ))}
              </div>
              <Button onClick={handleNicheScan} disabled={nicheLoading || nicheCategories.length === 0} className="w-full font-semibold h-12 sm:h-11 active:scale-[0.98]">
                {nicheLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Analysing...</> : <><Zap className="w-4 h-4 mr-2" /> Find Niches</>}
              </Button>
            </Card>

            {nicheLoading && <ArbitrageCardSkeleton count={4} />}

            {nicheSearched && !nicheLoading && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {niches.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Target className="w-7 h-7 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="font-display font-bold text-base mb-2">No strong niches found</h3>
                    <p className="text-xs text-muted-foreground">Try different categories.</p>
                  </Card>
                ) : (
                  niches.map((niche, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                      <Card className="p-3.5 sm:p-5">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div><h4 className="font-display font-bold text-sm">{niche.niche_name}</h4><Badge variant="outline" className="text-[10px] mt-1">{niche.category}</Badge></div>
                          <div className={`rounded-xl px-2.5 py-1.5 text-center border ${nicheScoreBg(niche.opportunity_score)}`}>
                            <p className={`font-display text-base font-extrabold leading-none ${nicheScoreColor(niche.opportunity_score)}`}>{niche.opportunity_score}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">score</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5 mb-3 p-2.5 rounded-lg bg-muted/50">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1"><TrendingUp className="w-3 h-3 text-success" /><span className="text-[10px] font-medium">Demand</span><span className="text-[10px] font-semibold capitalize">{niche.demand_level}</span></div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full bg-success rounded-full ${levelBar(niche.demand_level)}`} /></div>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 mb-1"><TrendingDown className="w-3 h-3 text-destructive" /><span className="text-[10px] font-medium">Supply</span><span className="text-[10px] font-semibold capitalize">{niche.supply_level}</span></div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full bg-destructive/60 rounded-full ${levelBar(niche.supply_level)}`} /></div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                          <div><p className="text-[10px] text-muted-foreground">Avg Price</p><p className="font-display font-bold text-xs">£{niche.avg_price}</p></div>
                          <div><p className="text-[10px] text-muted-foreground">Sales/mo</p><p className="font-display font-bold text-xs">{niche.estimated_monthly_sales}</p></div>
                          <div><p className="text-[10px] text-muted-foreground">Sellers</p><p className="font-display font-bold text-xs">{niche.competition_count}</p></div>
                        </div>
                        {niche.sourcing_tips && (
                          <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10 mb-2">
                            <p className="text-xs flex items-start gap-1.5"><Lightbulb className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />{niche.sourcing_tips}</p>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          <Button variant="outline" size="sm" className="text-[10px] h-9 active:scale-95" onClick={() => navigate(`/price-check?category=${encodeURIComponent(niche.niche_name)}`)}><Search className="w-3 h-3 mr-1" /> Price Check</Button>
                          <Button variant="outline" size="sm" className="text-[10px] h-9 active:scale-95" onClick={() => navigate(`/arbitrage?category=${encodeURIComponent(niche.niche_name)}`)}><ArrowRightLeft className="w-3 h-3 mr-1" /> Find Deals</Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </FeatureGate>
        </TabsContent>
      </Tabs>

      
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} reason="Upgrade to Pro to see all trends, get personalised insights, and unlock the full Trend Radar." tierRequired="pro" />
    </PageShell>
  );
}
