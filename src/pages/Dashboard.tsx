import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  FileSpreadsheet,
} from "lucide-react";
import { STRIPE_TIERS } from "@/lib/constants";

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

export default function Dashboard() {
  const { user, profile, credits, signOut } = useAuth();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [recentReports, setRecentReports] = useState<PriceReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const tier = (profile?.subscription_tier || "free") as keyof typeof STRIPE_TIERS;
  const tierInfo = STRIPE_TIERS[tier] || STRIPE_TIERS.free;
  const checksRemaining = credits ? credits.credits_limit - credits.price_checks_used : 0;

  useEffect(() => {
    if (!user) return;
    const fetchReports = async () => {
      const { data } = await supabase
        .from("price_reports")
        .select("id, item_title, item_brand, recommended_price, confidence_score, created_at, vinted_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentReports((data as PriceReport[]) || []);
      setLoadingReports(false);
    };
    fetchReports();
  }, [user]);

  const handleAnalyze = async () => {
    if (!url.trim()) { toast.error("Paste a Vinted URL or enter item details"); return; }
    navigate(`/price-check?url=${encodeURIComponent(url.trim())}`);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="p-6">
          <h1 className="font-display text-xl font-extrabold"><span className="text-gradient">Vintifi</span></h1>
        </div>
        <nav className="flex-1 px-3 space-y-4 overflow-y-auto scrollbar-hide">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">{section.label}</p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <button
                    key={item.label + item.path}
                    onClick={() => navigate(item.path)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-bold shrink-0">
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
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-border flex items-center justify-between px-4 h-14">
        <h1 className="font-display text-lg font-extrabold"><span className="text-gradient">Vintifi</span></h1>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-sidebar text-sidebar-foreground">
            <SheetHeader className="p-5 border-b border-sidebar-border">
              <SheetTitle className="font-display text-xl font-extrabold text-sidebar-foreground">
                <span className="text-gradient">Vintifi</span>
              </SheetTitle>
            </SheetHeader>
            <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto max-h-[calc(100vh-140px)] scrollbar-hide">
              {navSections.map((section) => (
                <div key={section.label}>
                  <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">{section.label}</p>
                  <div className="space-y-0.5">
                    {section.items.map((item) => (
                      <button
                        key={item.label + item.path}
                        onClick={() => { navigate(item.path); setSheetOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                      >
                        <item.icon className="w-4 h-4 shrink-0" /> {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
            <div className="p-4 border-t border-sidebar-border">
              <button onClick={() => { signOut(); setSheetOpen(false); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-destructive">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-14 lg:pt-0 pb-20 lg:pb-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
          {/* Welcome */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold mb-1">
              Welcome back, {profile?.display_name?.split(" ")[0] || "there"} 👋
            </h2>
            <p className="text-muted-foreground text-sm mb-6 sm:mb-8">Here's your selling intelligence overview</p>
          </motion.div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {[
              { icon: Package, label: "Active Listings", value: "0", color: "text-primary" },
              { icon: DollarSign, label: "Portfolio Value", value: "£0", color: "text-success" },
              { icon: ShoppingBag, label: "Sold This Week", value: "0", color: "text-accent" },
              { icon: Zap, label: "Checks Left", value: `${Math.max(0, checksRemaining)}`, color: "text-primary" },
            ].map((m, i) => (
              <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="p-3 sm:p-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <m.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${m.color}`} />
                    <span className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate">{m.label}</span>
                  </div>
                  <p className="font-display text-xl sm:text-2xl font-bold">{m.value}</p>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Price Check CTA */}
          <Card className="p-4 sm:p-6 mb-6 sm:mb-8 border-primary/20 bg-primary/[0.02]">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-primary" />
              <h3 className="font-display font-bold text-base sm:text-lg">Price Intelligence Engine</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Paste a Vinted URL or enter item details to get AI-powered pricing intelligence
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.vinted.co.uk/items/..."
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              />
              <Button onClick={handleAnalyze} disabled={analyzing} className="font-semibold shrink-0 h-10">
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Analyse
              </Button>
            </div>
          </Card>

          {/* Recent Price Checks */}
          <Card className="p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-base sm:text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Recent Price Checks
              </h3>
              {recentReports.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => navigate("/price-check")} className="text-xs">
                  New Check <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
            {loadingReports ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
              </div>
            ) : recentReports.length === 0 ? (
              <div className="text-center py-8">
                <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No price checks yet. Run your first analysis above!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentReports.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/80 cursor-pointer transition-colors"
                    onClick={() => r.vinted_url ? navigate(`/price-check?url=${encodeURIComponent(r.vinted_url)}`) : navigate("/price-check")}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.item_title || "Untitled Item"}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {r.item_brand && <span className="text-xs text-muted-foreground">{r.item_brand}</span>}
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      {r.recommended_price !== null && (
                        <p className="font-display font-bold text-sm">£{r.recommended_price.toFixed(2)}</p>
                      )}
                      {r.confidence_score !== null && (
                        <Badge variant="outline" className={`text-[10px] ${
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

          {/* Quick Actions - Grouped */}
          <div className="space-y-6">
            {/* Intelligence Tools */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Intelligence Tools</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: Search, label: "Price Check", desc: "Get instant pricing", path: "/price-check" },
                  { icon: Zap, label: "Optimise Listing", desc: "AI-powered listing optimisation", path: "/optimize" },
                  { icon: FileSpreadsheet, label: "Bulk Optimise", desc: "CSV batch AI listings", path: "/bulk-optimize", accent: "accent" },
                  { icon: TrendingUp, label: "Trend Radar", desc: "Rising brands & styles", path: "/trends" },
                ].map((item) => (
                  <Card
                    key={item.path + item.label}
                    className="p-4 cursor-pointer hover:shadow-md transition-shadow border-border/50"
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon className={`w-5 h-5 mb-2 ${item.accent ? "text-accent" : "text-primary"}`} />
                    <h4 className="font-display font-bold text-sm mb-0.5">{item.label}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.desc}</p>
                  </Card>
                ))}
              </div>
            </div>

            {/* Market Analysis */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Market Analysis</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: ArrowRightLeft, label: "Arbitrage Scanner", desc: "Find profitable flips", path: "/arbitrage" },
                  { icon: Radar, label: "Competitor Tracker", desc: "Monitor rivals", path: "/competitors" },
                  { icon: CalendarDays, label: "Seasonal Calendar", desc: "Demand peaks by category", path: "/seasonal" },
                  { icon: MapPin, label: "Charity Briefing", desc: "AI sourcing list", path: "/charity-briefing" },
                ].map((item) => (
                  <Card
                    key={item.path}
                    className="p-4 cursor-pointer hover:shadow-md transition-shadow border-border/50"
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon className="w-5 h-5 text-primary mb-2" />
                    <h4 className="font-display font-bold text-sm mb-0.5">{item.label}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.desc}</p>
                  </Card>
                ))}
              </div>
            </div>

            {/* Inventory Management */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Inventory Management</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: Tag, label: "My Listings", desc: "Track and manage items", path: "/listings" },
                  { icon: AlertTriangle, label: "Dead Stock", desc: "Liquidate stale inventory", path: "/dead-stock", color: "text-destructive" },
                  { icon: Timer, label: "Relist Scheduler", desc: "Auto-schedule relists", path: "/relist" },
                  { icon: Target, label: "Portfolio Optimiser", desc: "Bulk-fix pricing", path: "/portfolio" },
                  { icon: PieChart, label: "P&L Analytics", desc: "Revenue, margins & ROI", path: "/analytics", color: "text-success" },
                ].map((item) => (
                  <Card
                    key={item.path + item.label}
                    className="p-4 cursor-pointer hover:shadow-md transition-shadow border-border/50"
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon className={`w-5 h-5 mb-2 ${item.color || "text-primary"}`} />
                    <h4 className="font-display font-bold text-sm mb-0.5">{item.label}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.desc}</p>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav />
    </div>
  );
}
