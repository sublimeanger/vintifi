import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  LayoutDashboard, Search, Tag, TrendingUp, Settings, LogOut, Zap,
  Package, DollarSign, ShoppingBag, BarChart3, Loader2, Menu, CreditCard,
  Clock, ChevronRight, ArrowRightLeft, Radar, AlertTriangle, PieChart, Timer, Target, CalendarDays, MapPin,
  FileSpreadsheet, Sparkles,
} from "lucide-react";
import { STRIPE_TIERS } from "@/lib/constants";
import { GuidedTour } from "@/components/GuidedTour";

const navSections = [
  {
    label: "Core",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: Search, label: "Price Check", path: "/price-check" },
      { icon: Zap, label: "Optimise", path: "/optimize" },
      { icon: FileSpreadsheet, label: "Bulk Optimise", path: "/bulk-optimize" },
      { icon: Tag, label: "My Listings", path: "/listings" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { icon: TrendingUp, label: "Trends", path: "/trends" },
      { icon: ArrowRightLeft, label: "Arbitrage", path: "/arbitrage" },
      { icon: Radar, label: "Competitors", path: "/competitors" },
      { icon: CalendarDays, label: "Seasonal Calendar", path: "/seasonal" },
      { icon: MapPin, label: "Charity Briefing", path: "/charity-briefing" },
      { icon: ShoppingBag, label: "Clearance Radar", path: "/clearance-radar" },
      { icon: Target, label: "Niche Finder", path: "/niche-finder" },
    ],
  },
  {
    label: "Inventory",
    items: [
      { icon: AlertTriangle, label: "Dead Stock", path: "/dead-stock" },
      { icon: Timer, label: "Relist Scheduler", path: "/relist" },
      { icon: Target, label: "Portfolio Optimiser", path: "/portfolio" },
      { icon: PieChart, label: "P&L Analytics", path: "/analytics" },
    ],
  },
  {
    label: "Account",
    items: [
      { icon: CreditCard, label: "Billing", path: "/settings" },
      { icon: Settings, label: "Settings", path: "/settings" },
    ],
  },
];

const allNavItems = navSections.flatMap((s) => s.items);

type PriceReport = {
  id: string;
  item_title: string | null;
  item_brand: string | null;
  recommended_price: number | null;
  confidence_score: number | null;
  created_at: string;
  vinted_url: string | null;
};

const metricConfig = [
  { icon: Package, label: "Active Listings", color: "text-primary", border: "border-l-primary", tint: "border-primary/10 bg-primary/[0.03]", path: "/listings" },
  { icon: DollarSign, label: "Portfolio Value", color: "text-success", border: "border-l-success", tint: "border-success/10 bg-success/[0.03]", path: "/portfolio" },
  { icon: ShoppingBag, label: "Sold This Week", color: "text-accent", border: "border-l-accent", tint: "border-accent/10 bg-accent/[0.03]", path: "/analytics" },
  { icon: Zap, label: "Monthly Profit", color: "text-primary", border: "border-l-primary", tint: "border-primary/10 bg-primary/[0.03]", path: "/analytics" },
];

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-4 rounded-full bg-primary" />
      <h3 className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</h3>
    </div>
  );
}

export default function Dashboard() {
  const { user, profile, credits, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [recentReports, setRecentReports] = useState<PriceReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const [activeCount, setActiveCount] = useState<number>(0);
  const [portfolioValue, setPortfolioValue] = useState<number>(0);
  const [soldThisWeek, setSoldThisWeek] = useState<number>(0);
  const [monthlyProfit, setMonthlyProfit] = useState<number>(0);

  const tier = (profile?.subscription_tier || "free") as keyof typeof STRIPE_TIERS;
  const tierInfo = STRIPE_TIERS[tier] || STRIPE_TIERS.free;
  const checksRemaining = credits ? credits.credits_limit - credits.price_checks_used : 0;
  const creditsLow = checksRemaining <= 2;

  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      const { data: reports } = await supabase
        .from("price_reports")
        .select("id, item_title, item_brand, recommended_price, confidence_score, created_at, vinted_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentReports((reports as PriceReport[]) || []);

      const { data: activeListings } = await supabase
        .from("listings")
        .select("id, current_price")
        .eq("user_id", user.id)
        .eq("status", "active");
      if (activeListings) {
        setActiveCount(activeListings.length);
        setPortfolioValue(activeListings.reduce((sum, l) => sum + (Number(l.current_price) || 0), 0));
      }

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { data: soldItems } = await supabase
        .from("listings")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "sold")
        .gte("sold_at", weekAgo.toISOString());
      setSoldThisWeek(soldItems?.length || 0);

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { data: soldThisMonth } = await supabase
        .from("listings")
        .select("sale_price, purchase_price")
        .eq("user_id", user.id)
        .eq("status", "sold")
        .gte("sold_at", monthStart.toISOString());
      if (soldThisMonth) {
        const profit = soldThisMonth.reduce((sum, l) => {
          const sale = Number(l.sale_price) || 0;
          const cost = Number(l.purchase_price) || 0;
          return sum + (sale - cost);
        }, 0);
        setMonthlyProfit(profit);
      }

      setLoadingReports(false);
    };
    fetchAll();
  }, [user]);

  const handleAnalyze = async () => {
    if (!url.trim()) { toast.error("Paste a Vinted URL or enter item details"); return; }
    navigate(`/price-check?url=${encodeURIComponent(url.trim())}`);
  };

  const metricValues = [
    `${activeCount}`,
    `£${portfolioValue.toFixed(0)}`,
    `${soldThisWeek}`,
    `£${monthlyProfit.toFixed(0)}`,
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="p-6">
          <h1 className="font-display text-xl font-extrabold"><span className="text-gradient">Vintifi</span></h1>
          <button onClick={() => navigate("/settings")} className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 transition-all w-full ${creditsLow ? "bg-warning/20 hover:bg-warning/30" : "bg-sidebar-accent/60 hover:bg-sidebar-accent"}`}>
            <Zap className={`w-3.5 h-3.5 shrink-0 ${creditsLow ? "text-warning" : "text-primary"}`} />
            <span className={`text-xs font-medium ${creditsLow ? "text-warning" : "text-sidebar-foreground/80"}`}>{checksRemaining} credits left</span>
          </button>
        </div>
        <nav className="flex-1 px-3 space-y-4 overflow-y-auto scrollbar-hide">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">{section.label}</p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.label + item.path}
                      onClick={() => navigate(item.path)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                        isActive
                          ? "bg-sidebar-accent text-sidebar-foreground font-semibold"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground hover:translate-x-0.5"
                      }`}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      {item.label}
                      {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-sidebar-border bg-gradient-to-t from-sidebar-accent/30 to-transparent">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold shrink-0 text-primary">
              {profile?.display_name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.display_name || user?.email}</p>
              <p className="text-xs text-sidebar-foreground/50 capitalize">{tierInfo.name} Plan</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/60" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-border shadow-sm flex items-center justify-between px-4 h-14">
        <h1 className="font-display text-lg font-extrabold"><span className="text-gradient">Vintifi</span></h1>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/settings")} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors active:scale-95 ${creditsLow ? "bg-warning/20 hover:bg-warning/30" : "bg-muted hover:bg-muted/80"}`}>
            <Zap className={`w-3.5 h-3.5 ${creditsLow ? "text-warning" : "text-primary"}`} />
            <span className={`text-xs font-semibold ${creditsLow ? "text-warning" : ""}`}>{checksRemaining}</span>
          </button>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-sidebar text-sidebar-foreground flex flex-col h-full">
              <SheetHeader className="p-5 border-b border-sidebar-border shrink-0">
                <SheetTitle className="font-display text-xl font-extrabold text-sidebar-foreground">
                  <span className="text-gradient">Vintifi</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex-1 min-h-0 px-3 py-4 space-y-4 overflow-y-auto">
                {navSections.map((section) => (
                  <div key={section.label}>
                    <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">{section.label}</p>
                    <div className="space-y-0.5">
                      {section.items.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                          <button
                            key={item.label + item.path}
                            onClick={() => { navigate(item.path); setSheetOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors active:scale-[0.98] ${
                              isActive
                                ? "bg-sidebar-accent text-sidebar-foreground font-semibold"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                            }`}
                          >
                            <item.icon className="w-4 h-4 shrink-0" /> {item.label}
                            {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
              <div className="p-4 border-t border-sidebar-border shrink-0">
                <button onClick={() => { signOut(); setSheetOpen(false); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-destructive active:scale-[0.98]">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-14 lg:pt-0 pb-24 lg:pb-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-5 sm:space-y-8">
          {/* Welcome */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold mb-0.5 sm:mb-1">
              Welcome back, {profile?.display_name?.split(" ")[0] || "there"} 👋
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm">Here's your selling intelligence overview</p>
          </motion.div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {metricConfig.map((m, i) => (
              <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card
                  className={`p-3 sm:p-4 border-l-[3px] ${m.border} ${m.tint} cursor-pointer hover:shadow-md active:scale-[0.97] transition-all`}
                  onClick={() => navigate(m.path)}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <m.icon className={`w-3 h-3 sm:w-4 sm:h-4 ${m.color}`} />
                    <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider truncate">{m.label}</span>
                  </div>
                  <p className="font-display text-xl sm:text-2xl lg:text-3xl font-bold">{metricValues[i]}</p>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Price Check CTA */}
          <Card id="tour-price-check" className="gradient-border p-4 sm:p-6 border-primary/20">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <h3 className="font-display font-bold text-sm sm:text-base lg:text-lg">Price Intelligence Engine</h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 hidden sm:block">
              Paste a Vinted URL or enter item details to get AI-powered pricing intelligence
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste Vinted URL or item details..."
                className="flex-1 h-11 sm:h-10 text-base sm:text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              />
              <Button onClick={handleAnalyze} disabled={analyzing} className="font-semibold shrink-0 h-12 sm:h-10 active:scale-95 transition-transform">
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Analyse
              </Button>
            </div>
          </Card>

          {/* Recent Price Checks */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-display font-bold text-sm sm:text-base flex items-center gap-2">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Recent Price Checks
              </h3>
              {recentReports.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => navigate("/price-check")} className="text-[10px] sm:text-xs h-8">
                  New Check <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
            {loadingReports ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
              </div>
            ) : recentReports.length === 0 ? (
              <div className="text-center py-8 sm:py-10">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                </div>
                <p className="text-xs sm:text-sm font-medium mb-1">No price checks yet</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-4">Discover what your items are really worth</p>
                <Button size="sm" onClick={() => document.getElementById("tour-price-check")?.scrollIntoView({ behavior: "smooth" })} className="font-semibold h-10 sm:h-9 active:scale-95 transition-transform">
                  <Search className="w-3.5 h-3.5 mr-1.5" /> Run Your First Price Check
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5 sm:space-y-2">
                {recentReports.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 cursor-pointer transition-colors active:bg-muted/70"
                    onClick={() => r.vinted_url ? navigate(`/price-check?url=${encodeURIComponent(r.vinted_url)}`) : navigate("/price-check")}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate">{r.item_title || "Untitled Item"}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {r.item_brand && <span className="text-[10px] sm:text-xs text-muted-foreground">{r.item_brand}</span>}
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      {r.recommended_price !== null && (
                        <p className="font-display font-bold text-xs sm:text-sm">£{r.recommended_price.toFixed(2)}</p>
                      )}
                      {r.confidence_score !== null && (
                        <Badge variant="outline" className={`text-[9px] sm:text-[10px] py-0 ${
                          r.confidence_score >= 80 ? "text-success border-success/30" :
                          r.confidence_score >= 60 ? "text-accent border-accent/30" :
                          "text-destructive border-destructive/30"
                        }`}>
                          {r.confidence_score}%
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <div className="space-y-6 sm:space-y-8">
            {/* Intelligence Tools */}
            <div>
              <SectionHeader>Intelligence Tools</SectionHeader>
              <div className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide pb-2 sm:pb-0 sm:grid sm:grid-cols-4 -mx-1 px-1">
                {[
                  { icon: Search, label: "Price Check", desc: "Get instant pricing", path: "/price-check", accent: false },
                  { icon: Zap, label: "Optimise Listing", desc: "AI-powered listing optimisation", path: "/optimize", accent: false },
                  { icon: FileSpreadsheet, label: "Bulk Optimise", desc: "CSV batch AI listings", path: "/bulk-optimize", accent: true },
                  { icon: TrendingUp, label: "Trend Radar", desc: "Rising brands & styles", path: "/trends", tourId: "tour-trends", accent: false },
                ].map((item) => (
                  <Card
                    key={item.path + item.label}
                    id={(item as any).tourId}
                    className="min-w-[130px] sm:min-w-0 p-3 sm:p-4 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] transition-all border-border/50 flex-shrink-0"
                    onClick={() => navigate(item.path)}
                  >
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-2.5 sm:mb-3 ${item.accent ? "bg-accent/15" : "bg-primary/10"}`}>
                      <item.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${item.accent ? "text-accent" : "text-primary"}`} />
                    </div>
                    <h4 className="font-display font-bold text-xs sm:text-sm mb-0.5">{item.label}</h4>
                    <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 hidden sm:block">{item.desc}</p>
                  </Card>
                ))}
              </div>
            </div>

            {/* Market Analysis */}
            <div>
              <SectionHeader>Market Analysis</SectionHeader>
              <div className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide pb-2 sm:pb-0 sm:grid sm:grid-cols-4 -mx-1 px-1">
                {[
                  { icon: ArrowRightLeft, label: "Arbitrage Scanner", desc: "Find profitable flips", path: "/arbitrage", tourId: "tour-arbitrage" },
                  { icon: Radar, label: "Competitor Tracker", desc: "Monitor rivals", path: "/competitors" },
                  { icon: CalendarDays, label: "Seasonal Calendar", desc: "Demand peaks by category", path: "/seasonal" },
                  { icon: MapPin, label: "Charity Briefing", desc: "AI sourcing list", path: "/charity-briefing" },
                ].map((item) => (
                  <Card
                    key={item.path}
                    id={(item as any).tourId}
                    className="min-w-[130px] sm:min-w-0 p-3 sm:p-4 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] transition-all border-border/50 flex-shrink-0"
                    onClick={() => navigate(item.path)}
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2.5 sm:mb-3">
                      <item.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <h4 className="font-display font-bold text-xs sm:text-sm mb-0.5">{item.label}</h4>
                    <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 hidden sm:block">{item.desc}</p>
                  </Card>
                ))}
              </div>
            </div>

            {/* Inventory Management */}
            <div>
              <SectionHeader>Inventory Management</SectionHeader>
              <div className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide pb-2 sm:pb-0 sm:grid sm:grid-cols-4 sm:[&>:nth-child(5)]:col-start-1 -mx-1 px-1">
                {[
                  { icon: Tag, label: "My Listings", desc: "Track and manage items", path: "/listings", tourId: "tour-listings", color: "text-primary", bg: "bg-primary/10" },
                  { icon: AlertTriangle, label: "Dead Stock", desc: "Liquidate stale inventory", path: "/dead-stock", color: "text-destructive", bg: "bg-destructive/10" },
                  { icon: Timer, label: "Relist Scheduler", desc: "Auto-schedule relists", path: "/relist", color: "text-primary", bg: "bg-primary/10" },
                  { icon: Target, label: "Portfolio Optimiser", desc: "Bulk-fix pricing", path: "/portfolio", color: "text-primary", bg: "bg-primary/10" },
                  { icon: PieChart, label: "P&L Analytics", desc: "Revenue, margins & ROI", path: "/analytics", color: "text-success", bg: "bg-success/10" },
                ].map((item) => (
                  <Card
                    key={item.path + item.label}
                    id={(item as any).tourId}
                    className="min-w-[130px] sm:min-w-0 p-3 sm:p-4 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] transition-all border-border/50 flex-shrink-0"
                    onClick={() => navigate(item.path)}
                  >
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${item.bg} flex items-center justify-center mb-2.5 sm:mb-3`}>
                      <item.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${item.color}`} />
                    </div>
                    <h4 className="font-display font-bold text-xs sm:text-sm mb-0.5">{item.label}</h4>
                    <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 hidden sm:block">{item.desc}</p>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <MobileBottomNav />
      {!loadingReports && <GuidedTour />}
    </div>
  );
}
