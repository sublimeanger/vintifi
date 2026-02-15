import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Flame, Snowflake,
  Sun, Leaf, TrendingUp, TrendingDown, Minus, Info, Search, MapPin,
} from "lucide-react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { UseCaseSpotlight } from "@/components/UseCaseSpotlight";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type DemandLevel = "very_high" | "high" | "medium" | "low" | "very_low";

interface CategoryDemand {
  category: string;
  icon: string;
  monthlyDemand: { month: number; level: DemandLevel; notes: string }[];
  peakMonths: number[];
  lowMonths: number[];
  tip: string;
}

const DEMAND_DATA: CategoryDemand[] = [
  {
    category: "Womenswear",
    icon: "👗",
    monthlyDemand: [
      { month: 0, level: "high", notes: "New Year wardrobe refresh, winter sales bargain hunters" },
      { month: 1, level: "medium", notes: "Valentine's date night outfits, transitional pieces" },
      { month: 2, level: "high", notes: "Spring wardrobe transition begins, Easter dresses" },
      { month: 3, level: "very_high", notes: "Spring/summer buying peak, holiday shopping starts" },
      { month: 4, level: "very_high", notes: "Wedding guest outfits, summer dresses peak" },
      { month: 5, level: "high", notes: "Holiday wardrobe, festival fashion, swimwear" },
      { month: 6, level: "medium", notes: "Mid-summer lull, back-to-school starting" },
      { month: 7, level: "medium", notes: "Late summer clearance, autumn preview" },
      { month: 8, level: "very_high", notes: "Autumn wardrobe overhaul, biggest buying month" },
      { month: 9, level: "high", notes: "Coats and knitwear surge, layering pieces" },
      { month: 10, level: "high", notes: "Black Friday deals, party season dresses" },
      { month: 11, level: "medium", notes: "Christmas gift buying, party outfits" },
    ],
    peakMonths: [3, 4, 8],
    lowMonths: [6, 7],
    tip: "List spring dresses in March, coats in September. Relist summer items by April for maximum visibility.",
  },
  {
    category: "Menswear",
    icon: "👔",
    monthlyDemand: [
      { month: 0, level: "high", notes: "New year refresh, winter jacket demand" },
      { month: 1, level: "low", notes: "Post-January quiet period" },
      { month: 2, level: "medium", notes: "Spring transition, lighter layers" },
      { month: 3, level: "high", notes: "Spring shopping, smart casual demand rises" },
      { month: 4, level: "medium", notes: "Steady demand, summer shirts & shorts" },
      { month: 5, level: "medium", notes: "Holiday clothing, linen & lightweight" },
      { month: 6, level: "low", notes: "Summer lull, lowest engagement" },
      { month: 7, level: "medium", notes: "Back-to-school, early autumn buying" },
      { month: 8, level: "very_high", notes: "Biggest month — autumn/winter wardrobe overhaul" },
      { month: 9, level: "high", notes: "Coat & hoodie season, layering demand" },
      { month: 10, level: "very_high", notes: "Black Friday + Christmas gift buying" },
      { month: 11, level: "high", notes: "Last-minute Christmas, party outfits" },
    ],
    peakMonths: [8, 10],
    lowMonths: [1, 6],
    tip: "Menswear peaks in September and November. List hoodies and coats by late August for best results.",
  },
  {
    category: "Shoes",
    icon: "👟",
    monthlyDemand: [
      { month: 0, level: "medium", notes: "Post-Christmas returns, winter boots" },
      { month: 1, level: "low", notes: "Quiet month for footwear" },
      { month: 2, level: "high", notes: "Spring trainers, lighter shoes" },
      { month: 3, level: "very_high", notes: "Peak trainer & sandal season begins" },
      { month: 4, level: "very_high", notes: "Summer shoes at peak demand" },
      { month: 5, level: "high", notes: "Festival season, sandals & platforms" },
      { month: 6, level: "medium", notes: "Mid-summer steady demand" },
      { month: 7, level: "medium", notes: "Back-to-school shoes" },
      { month: 8, level: "high", notes: "Autumn boots & trainers resurge" },
      { month: 9, level: "very_high", notes: "Boot season — highest demand" },
      { month: 10, level: "high", notes: "Black Friday, Christmas gifts" },
      { month: 11, level: "medium", notes: "Gift purchases wind down" },
    ],
    peakMonths: [3, 4, 9],
    lowMonths: [1],
    tip: "Trainers sell best March–May. List boots by September. Nike & Adidas have year-round demand.",
  },
  {
    category: "Streetwear",
    icon: "🧢",
    monthlyDemand: [
      { month: 0, level: "high", notes: "New drops, resale demand high" },
      { month: 1, level: "medium", notes: "Steady demand, hype drops" },
      { month: 2, level: "high", notes: "Spring drops, hoodie clearance" },
      { month: 3, level: "high", notes: "T-shirt & cap season begins" },
      { month: 4, level: "medium", notes: "Steady, festival-driven demand" },
      { month: 5, level: "medium", notes: "Summer tees & shorts" },
      { month: 6, level: "low", notes: "Summer lull for heavier pieces" },
      { month: 7, level: "medium", notes: "Back-to-school streetwear surge" },
      { month: 8, level: "very_high", notes: "FW drops, hoodie & jacket peak" },
      { month: 9, level: "very_high", notes: "Peak hype season, layering" },
      { month: 10, level: "high", notes: "Black Friday, gift shopping" },
      { month: 11, level: "high", notes: "Christmas gifts, winter staples" },
    ],
    peakMonths: [8, 9],
    lowMonths: [6],
    tip: "Carhartt WIP, Stüssy, and Nike hoodies sell fastest Sept–Oct. List graphic tees from March.",
  },
  {
    category: "Designer",
    icon: "💎",
    monthlyDemand: [
      { month: 0, level: "medium", notes: "Post-holiday, sales-driven buying" },
      { month: 1, level: "high", notes: "Valentine's gifts, luxury demand" },
      { month: 2, level: "medium", notes: "Transitional luxury pieces" },
      { month: 3, level: "high", notes: "Spring luxury refresh" },
      { month: 4, level: "very_high", notes: "Wedding season, special occasions" },
      { month: 5, level: "high", notes: "Holiday luxury, resort wear" },
      { month: 6, level: "low", notes: "Summer quiet, budget-conscious" },
      { month: 7, level: "low", notes: "Pre-autumn lull" },
      { month: 8, level: "high", notes: "AW luxury shopping begins" },
      { month: 9, level: "high", notes: "Designer coats & bags surge" },
      { month: 10, level: "very_high", notes: "Black Friday luxury, Christmas gifts" },
      { month: 11, level: "very_high", notes: "Christmas luxury gift peak" },
    ],
    peakMonths: [4, 10, 11],
    lowMonths: [6, 7],
    tip: "Designer bags peak Nov–Dec for gifting. List luxury coats by October. Authentication boosts value 20%+.",
  },
  {
    category: "Vintage",
    icon: "🕰️",
    monthlyDemand: [
      { month: 0, level: "medium", notes: "Post-holiday browsing" },
      { month: 1, level: "medium", notes: "Steady vintage collectors" },
      { month: 2, level: "high", notes: "Spring vintage fairs drive interest" },
      { month: 3, level: "very_high", notes: "Spring wardrobe, 70s/90s revival" },
      { month: 4, level: "high", notes: "Festival fashion, boho vintage" },
      { month: 5, level: "high", notes: "Summer vintage, retro swimwear" },
      { month: 6, level: "medium", notes: "Steady niche demand" },
      { month: 7, level: "medium", notes: "Late summer vintage fairs" },
      { month: 8, level: "very_high", notes: "Autumn vintage surge, 90s trend" },
      { month: 9, level: "high", notes: "Vintage coats & leather jackets" },
      { month: 10, level: "high", notes: "Holiday party vintage glam" },
      { month: 11, level: "medium", notes: "Gift-driven vintage purchases" },
    ],
    peakMonths: [3, 8],
    lowMonths: [6],
    tip: "Vintage leather jackets sell best Sep–Oct. 90s band tees have year-round demand but peak in festival season.",
  },
  {
    category: "Kids",
    icon: "🧸",
    monthlyDemand: [
      { month: 0, level: "medium", notes: "Post-Christmas next-size-up buying" },
      { month: 1, level: "low", notes: "Quiet month" },
      { month: 2, level: "high", notes: "Spring clothing needed as kids grow" },
      { month: 3, level: "high", notes: "Easter outfits, spring wardrobe" },
      { month: 4, level: "medium", notes: "Summer prep" },
      { month: 5, level: "medium", notes: "Holiday clothing" },
      { month: 6, level: "low", notes: "Summer lull" },
      { month: 7, level: "very_high", notes: "Back-to-school — biggest peak" },
      { month: 8, level: "very_high", notes: "School uniform & autumn clothes" },
      { month: 9, level: "high", notes: "Winter coats & boots for kids" },
      { month: 10, level: "high", notes: "Christmas outfit shopping begins" },
      { month: 11, level: "very_high", notes: "Christmas gifts — toys & outfits" },
    ],
    peakMonths: [7, 8, 11],
    lowMonths: [1, 6],
    tip: "Back-to-school (Aug–Sep) is the #1 window. Bundle kids' clothing by size for faster sales.",
  },
  {
    category: "Accessories",
    icon: "👜",
    monthlyDemand: [
      { month: 0, level: "medium", notes: "New year accessories refresh" },
      { month: 1, level: "very_high", notes: "Valentine's gifts — jewellery & scarves" },
      { month: 2, level: "medium", notes: "Spring accessories" },
      { month: 3, level: "high", notes: "Sunglasses & bags for spring" },
      { month: 4, level: "high", notes: "Wedding accessories, hats" },
      { month: 5, level: "high", notes: "Summer bags, sunglasses peak" },
      { month: 6, level: "medium", notes: "Steady summer demand" },
      { month: 7, level: "low", notes: "Late summer quiet" },
      { month: 8, level: "high", notes: "Autumn bags & scarves" },
      { month: 9, level: "high", notes: "Winter accessories begin" },
      { month: 10, level: "very_high", notes: "Gift season — jewellery & bags" },
      { month: 11, level: "very_high", notes: "Christmas gifting peak" },
    ],
    peakMonths: [1, 10, 11],
    lowMonths: [7],
    tip: "Jewellery and bags spike for Valentine's and Christmas. List gift-worthy items by late October.",
  },
];

const DEMAND_COLORS: Record<DemandLevel, string> = {
  very_high: "bg-primary text-primary-foreground",
  high: "bg-primary/60 text-primary-foreground",
  medium: "bg-accent/40 text-accent-foreground",
  low: "bg-muted text-muted-foreground",
  very_low: "bg-muted/50 text-muted-foreground",
};

const DEMAND_LABELS: Record<DemandLevel, string> = {
  very_high: "🔥 Very High",
  high: "High",
  medium: "Medium",
  low: "Low",
  very_low: "Very Low",
};

function getSeasonIcon(month: number) {
  if (month >= 2 && month <= 4) return <Leaf className="w-4 h-4 text-success" />;
  if (month >= 5 && month <= 7) return <Sun className="w-4 h-4 text-accent" />;
  if (month >= 8 && month <= 10) return <Leaf className="w-4 h-4 text-primary" />;
  return <Snowflake className="w-4 h-4 text-muted-foreground" />;
}

function getSeasonLabel(month: number) {
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  if (month >= 8 && month <= 10) return "Autumn";
  return "Winter";
}

export default function SeasonalCalendar() {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [view, setView] = useState<"calendar" | "category">("calendar");

  const currentMonthData = useMemo(() => {
    return DEMAND_DATA.map((cat) => ({
      ...cat,
      demand: cat.monthlyDemand[selectedMonth],
    })).sort((a, b) => {
      const order: Record<DemandLevel, number> = { very_high: 0, high: 1, medium: 2, low: 3, very_low: 4 };
      return order[a.demand.level] - order[b.demand.level];
    });
  }, [selectedMonth]);

  const selectedCatData = useMemo(() => {
    if (!selectedCategory) return null;
    return DEMAND_DATA.find((c) => c.category === selectedCategory) || null;
  }, [selectedCategory]);

  const hotCategories = currentMonthData.filter((c) => c.demand.level === "very_high" || c.demand.level === "high");

  return (
    <div className="flex h-screen bg-background pb-20 lg:pb-0">
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl lg:text-3xl font-bold flex items-center gap-2">
                <CalendarDays className="w-7 h-7 text-primary" />
                Seasonal Demand Calendar
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Know exactly when to list each category for maximum sales
              </p>
            </div>
          </div>

          <UseCaseSpotlight
            featureKey="seasonal-calendar"
            icon={CalendarDays}
            scenario="It's September and your summer dresses aren't shifting. You're stuck with dead stock..."
            description="Seasonal demand shifts are predictable — but only if you plan ahead."
            outcome="The Seasonal Calendar would have told you to discount summer stock in August and start listing coats in September."
            tip="Plan your sourcing 1 month ahead of each season's demand peak."
          />

          {/* Month Selector */}
          <Card className="p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <Button variant="ghost" size="icon" onClick={() => setSelectedMonth((p) => (p === 0 ? 11 : p - 1))}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                {getSeasonIcon(selectedMonth)}
                <h2 className="font-display text-xl font-bold">{MONTHS[selectedMonth]}</h2>
                <Badge variant="outline" className="text-xs">{getSeasonLabel(selectedMonth)}</Badge>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedMonth((p) => (p === 11 ? 0 : p + 1))}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Mini month tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              {MONTHS_SHORT.map((m, i) => (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(i)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 ${
                    i === selectedMonth
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </Card>

          {/* Hot this month */}
          {hotCategories.length > 0 && (
            <Card className="p-4 mb-6 border-primary/20 bg-primary/[0.02]">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-5 h-5 text-primary" />
                <h3 className="font-display font-bold">Hot in {MONTHS[selectedMonth]}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {hotCategories.map((c) => (
                  <Badge
                    key={c.category}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-sm py-1 px-3"
                    onClick={() => { setSelectedCategory(c.category); setView("category"); }}
                  >
                    {c.icon} {c.category}
                    {c.demand.level === "very_high" && <Flame className="w-3 h-3 ml-1" />}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* View toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={view === "calendar" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("calendar")}
            >
              <CalendarDays className="w-4 h-4 mr-1" /> Heatmap View
            </Button>
            <Button
              variant={view === "category" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("category")}
              disabled={!selectedCategory}
            >
              <TrendingUp className="w-4 h-4 mr-1" /> Category Deep Dive
            </Button>
          </div>

          <AnimatePresence mode="wait">
            {view === "calendar" ? (
              <motion.div
                key="calendar"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {/* Heatmap grid */}
                <Card className="p-4 mb-6 overflow-x-auto">
                  <h3 className="font-display font-bold mb-4 flex items-center gap-2">
                    <Info className="w-4 h-4 text-muted-foreground" />
                    Full Year Heatmap
                  </h3>
                  <div className="min-w-[700px]">
                    {/* Header row */}
                    <div className="grid grid-cols-[140px_repeat(12,1fr)] gap-1 mb-1">
                      <div className="text-xs font-medium text-muted-foreground px-2">Category</div>
                      {MONTHS_SHORT.map((m, i) => (
                        <button
                          key={m}
                          onClick={() => setSelectedMonth(i)}
                          className={`text-xs text-center py-1 rounded transition-colors ${
                            i === selectedMonth ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>

                    {/* Data rows */}
                    {DEMAND_DATA.map((cat) => (
                      <div
                        key={cat.category}
                        className="grid grid-cols-[140px_repeat(12,1fr)] gap-1 mb-1"
                      >
                        <button
                          className="text-xs font-medium text-left px-2 py-2 rounded hover:bg-muted transition-colors truncate"
                          onClick={() => { setSelectedCategory(cat.category); setView("category"); }}
                        >
                          {cat.icon} {cat.category}
                        </button>
                        {cat.monthlyDemand.map((md, i) => (
                          <Tooltip key={i}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => { setSelectedMonth(i); setSelectedCategory(cat.category); setView("category"); }}
                                className={`rounded py-2 text-[10px] font-medium transition-all hover:scale-105 ${DEMAND_COLORS[md.level]} ${
                                  i === selectedMonth ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
                                }`}
                              >
                                {md.level === "very_high" ? "🔥" : md.level === "high" ? "↑" : md.level === "low" ? "↓" : "·"}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[200px]">
                              <p className="font-bold text-xs">{cat.category} — {MONTHS[i]}</p>
                              <p className="text-xs mt-1">{md.notes}</p>
                              <Badge className="mt-1 text-[10px]">{DEMAND_LABELS[md.level]}</Badge>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">Demand:</span>
                    {(["very_high", "high", "medium", "low"] as DemandLevel[]).map((level) => (
                      <div key={level} className="flex items-center gap-1">
                        <div className={`w-4 h-4 rounded ${DEMAND_COLORS[level]}`} />
                        <span className="text-xs text-muted-foreground capitalize">{level.replace("_", " ")}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Category cards for selected month */}
                <h3 className="font-display font-bold mb-3">{MONTHS[selectedMonth]} Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentMonthData.map((cat, i) => (
                    <motion.div
                      key={cat.category}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <Card
                        className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => { setSelectedCategory(cat.category); setView("category"); }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{cat.icon}</span>
                            <div>
                              <h4 className="font-display font-bold text-sm">{cat.category}</h4>
                              <p className="text-xs text-muted-foreground mt-0.5">{cat.demand.notes}</p>
                            </div>
                          </div>
                          <Badge className={`shrink-0 ${DEMAND_COLORS[cat.demand.level]} border-0`}>
                            {DEMAND_LABELS[cat.demand.level]}
                          </Badge>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : selectedCatData ? (
              <motion.div
                key="category"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {/* Category deep dive */}
                <Card className="p-6 mb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{selectedCatData.icon}</span>
                    <div>
                      <h3 className="font-display text-xl font-bold">{selectedCatData.category}</h3>
                      <p className="text-sm text-muted-foreground">12-month demand cycle</p>
                    </div>
                  </div>

                  {/* Demand bar chart */}
                  <div className="flex items-end gap-1 h-40 mb-4">
                    {selectedCatData.monthlyDemand.map((md, i) => {
                      const heights: Record<DemandLevel, string> = {
                        very_high: "h-full",
                        high: "h-3/4",
                        medium: "h-1/2",
                        low: "h-1/4",
                        very_low: "h-[12%]",
                      };
                      return (
                        <Tooltip key={i}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setSelectedMonth(i)}
                              className={`flex-1 rounded-t-md transition-all hover:opacity-80 ${heights[md.level]} ${DEMAND_COLORS[md.level]} ${
                                i === selectedMonth ? "ring-2 ring-foreground ring-offset-1 ring-offset-background" : ""
                              }`}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-bold text-xs">{MONTHS[i]}</p>
                            <p className="text-xs">{md.notes}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                  <div className="flex gap-1">
                    {MONTHS_SHORT.map((m, i) => (
                      <div
                        key={m}
                        className={`flex-1 text-center text-[10px] ${
                          i === selectedMonth ? "text-primary font-bold" : "text-muted-foreground"
                        }`}
                      >
                        {m}
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Peaks & Lows */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <Card className="p-4 border-success/20 bg-success/[0.02]">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-success" />
                      <h4 className="font-display font-bold text-sm">Peak Months</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedCatData.peakMonths.map((m) => (
                        <Badge key={m} className="bg-success text-success-foreground border-0">
                          🔥 {MONTHS[m]}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                  <Card className="p-4 border-destructive/20 bg-destructive/[0.02]">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="w-4 h-4 text-destructive" />
                      <h4 className="font-display font-bold text-sm">Low Months</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedCatData.lowMonths.map((m) => (
                        <Badge key={m} variant="outline" className="text-muted-foreground">
                          {MONTHS[m]}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Seller tip */}
                <Card className="p-4 border-accent/30 bg-accent/[0.03]">
                  <div className="flex items-start gap-2">
                    <Flame className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-display font-bold text-sm mb-1">Seller Tip</h4>
                      <p className="text-sm text-muted-foreground">{selectedCatData.tip}</p>
                    </div>
                  </div>
                </Card>

                {/* Action Links */}
                <div className="flex gap-3 mt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate(`/price-check?category=${encodeURIComponent(selectedCatData.category)}`)}
                  >
                    <Search className="w-4 h-4 mr-2" /> Check Prices
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate("/charity-briefing")}
                  >
                    <MapPin className="w-4 h-4 mr-2" /> Source Now
                  </Button>
                </div>

                {/* Category selector */}
                <div className="mt-6">
                  <h4 className="text-xs text-muted-foreground font-medium mb-2">Explore other categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {DEMAND_DATA.filter((c) => c.category !== selectedCategory).map((c) => (
                      <Badge
                        key={c.category}
                        variant="outline"
                        className="cursor-pointer hover:bg-muted transition-colors py-1 px-3"
                        onClick={() => setSelectedCategory(c.category)}
                      >
                        {c.icon} {c.category}
                      </Badge>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Select a category to see its demand cycle</p>
              </Card>
            )}
          </AnimatePresence>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
