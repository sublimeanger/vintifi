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
import {
  LayoutDashboard, Search, Tag, TrendingUp, Settings, LogOut, Zap,
  Package, DollarSign, ShoppingBag, BarChart3, Loader2, Menu, X, CreditCard,
  Clock, ChevronRight, ArrowRightLeft, Radar, AlertTriangle, PieChart, Timer, Target, CalendarDays, MapPin,
} from "lucide-react";
import { STRIPE_TIERS } from "@/lib/constants";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Search, label: "Price Check", path: "/price-check" },
  { icon: Zap, label: "Optimise", path: "/optimize" },
  { icon: Tag, label: "My Listings", path: "/listings" },
  { icon: TrendingUp, label: "Trends", path: "/trends" },
  { icon: ArrowRightLeft, label: "Arbitrage", path: "/arbitrage" },
  { icon: Radar, label: "Competitors", path: "/competitors" },
  { icon: AlertTriangle, label: "Dead Stock", path: "/dead-stock" },
  { icon: PieChart, label: "P&L Analytics", path: "/analytics" },
  { icon: Timer, label: "Relist Scheduler", path: "/relist" },
  { icon: Target, label: "Portfolio Optimiser", path: "/portfolio" },
  { icon: CalendarDays, label: "Seasonal Calendar", path: "/seasonal" },
  { icon: MapPin, label: "Charity Briefing", path: "/charity-briefing" },
  { icon: CreditCard, label: "Billing", path: "/settings" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
          <img src="/vintifi-logo.png" alt="Vintifi" className="h-9 w-auto" />
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
              {(item as any).badge && <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">{(item as any).badge}</Badge>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-bold">
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
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass flex items-center justify-between px-4 py-3">
        <img src="/vintifi-logo.png" alt="Vintifi" className="h-8 w-auto" />
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-secondary/95 backdrop-blur-sm pt-16">
          <nav className="px-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-secondary-foreground/80 hover:bg-muted/10 transition-colors"
              >
                <item.icon className="w-4 h-4" /> {item.label}
              </button>
            ))}
            <button onClick={signOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-16 lg:pt-0">
        <div className="p-6 lg:p-8 max-w-5xl mx-auto">
          {/* Welcome */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="font-display text-2xl lg:text-3xl font-bold mb-1">
              Welcome back, {profile?.display_name?.split(" ")[0] || "there"} 👋
            </h2>
            <p className="text-muted-foreground mb-8">Here's your selling intelligence overview</p>
          </motion.div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Package, label: "Active Listings", value: "0", color: "text-primary" },
              { icon: DollarSign, label: "Portfolio Value", value: "£0", color: "text-success" },
              { icon: ShoppingBag, label: "Sold This Week", value: "0", color: "text-accent" },
              { icon: Zap, label: "Price Checks Left", value: `${Math.max(0, checksRemaining)}`, color: "text-primary" },
            ].map((m, i) => (
              <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <m.icon className={`w-4 h-4 ${m.color}`} />
                    <span className="text-xs text-muted-foreground font-medium">{m.label}</span>
                  </div>
                  <p className="font-display text-2xl font-bold">{m.value}</p>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Price Check CTA */}
          <Card className="p-6 mb-8 border-primary/20 bg-primary/[0.02]">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-primary" />
              <h3 className="font-display font-bold text-lg">Price Intelligence Engine</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Paste a Vinted URL or enter item details to get AI-powered pricing intelligence
            </p>
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.vinted.co.uk/items/... or describe your item"
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              />
              <Button onClick={handleAnalyze} disabled={analyzing} className="font-semibold shrink-0">
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Analyse
              </Button>
            </div>
          </Card>

          {/* Recent Price Checks */}
          <Card className="p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg flex items-center gap-2">
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

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card
              className="p-5 cursor-pointer hover:shadow-md transition-shadow border-border/50"
              onClick={() => navigate("/price-check")}
            >
              <Search className="w-5 h-5 text-primary mb-3" />
              <h4 className="font-display font-bold mb-1">Price Check</h4>
              <p className="text-sm text-muted-foreground">Get instant pricing for any item</p>
            </Card>
            <Card
              className="p-5 cursor-pointer hover:shadow-md transition-shadow border-border/50"
              onClick={() => navigate("/listings")}
            >
              <Tag className="w-5 h-5 text-primary mb-3" />
              <h4 className="font-display font-bold mb-1">My Listings</h4>
              <p className="text-sm text-muted-foreground">Track and manage your items</p>
            </Card>
            <Card
              className="p-5 cursor-pointer hover:shadow-md transition-shadow border-border/50"
              onClick={() => navigate("/optimize")}
            >
              <Zap className="w-5 h-5 text-primary mb-3" />
              <h4 className="font-display font-bold mb-1">Optimise Listing</h4>
              <p className="text-sm text-muted-foreground">AI-powered listing optimisation</p>
            </Card>
            <Card
              className="p-5 cursor-pointer hover:shadow-md transition-shadow border-primary/20 bg-primary/[0.02]"
              onClick={() => navigate("/arbitrage")}
            >
              <ArrowRightLeft className="w-5 h-5 text-primary mb-3" />
              <h4 className="font-display font-bold mb-1">Arbitrage Scanner</h4>
              <p className="text-sm text-muted-foreground">Find profitable flips on eBay &amp; Depop</p>
            </Card>
            <Card
              className="p-5 cursor-pointer hover:shadow-md transition-shadow border-border/50"
              onClick={() => navigate("/competitors")}
            >
              <Radar className="w-5 h-5 text-primary mb-3" />
              <h4 className="font-display font-bold mb-1">Competitor Tracker</h4>
              <p className="text-sm text-muted-foreground">Monitor rivals &amp; get price alerts</p>
            </Card>
            <Card
              className="p-5 cursor-pointer hover:shadow-md transition-shadow border-destructive/20 bg-destructive/[0.02]"
              onClick={() => navigate("/dead-stock")}
            >
              <AlertTriangle className="w-5 h-5 text-destructive mb-3" />
              <h4 className="font-display font-bold mb-1">Dead Stock</h4>
              <p className="text-sm text-muted-foreground">Liquidate stale inventory with AI</p>
            </Card>
            <Card
              className="p-5 cursor-pointer hover:shadow-md transition-shadow border-success/20 bg-success/[0.02]"
              onClick={() => navigate("/analytics")}
            >
              <PieChart className="w-5 h-5 text-success mb-3" />
              <h4 className="font-display font-bold mb-1">P&L Analytics</h4>
              <p className="text-sm text-muted-foreground">Revenue, margins &amp; ROI charts</p>
            </Card>
            <Card
              className="p-5 cursor-pointer hover:shadow-md transition-shadow border-primary/20 bg-primary/[0.02]"
              onClick={() => navigate("/relist")}
            >
              <Timer className="w-5 h-5 text-primary mb-3" />
              <h4 className="font-display font-bold mb-1">Relist Scheduler</h4>
              <p className="text-sm text-muted-foreground">Auto-schedule relists with smart pricing</p>
            </Card>
            <Card
              className="p-5 cursor-pointer hover:shadow-md transition-shadow border-success/20 bg-success/[0.02]"
              onClick={() => navigate("/portfolio")}
            >
              <Target className="w-5 h-5 text-success mb-3" />
              <h4 className="font-display font-bold mb-1">Portfolio Optimiser</h4>
              <p className="text-sm text-muted-foreground">Bulk-fix overpriced &amp; underpriced items</p>
            </Card>
            <Card
              className="p-5 cursor-pointer hover:shadow-md transition-shadow border-accent/20 bg-accent/[0.02]"
              onClick={() => navigate("/seasonal")}
            >
              <CalendarDays className="w-5 h-5 text-accent mb-3" />
              <h4 className="font-display font-bold mb-1">Seasonal Calendar</h4>
              <p className="text-sm text-muted-foreground">Know when demand peaks for each category</p>
            </Card>
            <Card
              className="p-5 cursor-pointer hover:shadow-md transition-shadow border-primary/20 bg-primary/[0.02]"
              onClick={() => navigate("/charity-briefing")}
            >
              <MapPin className="w-5 h-5 text-primary mb-3" />
              <h4 className="font-display font-bold mb-1">Charity Briefing</h4>
              <p className="text-sm text-muted-foreground">AI sourcing list for charity shop trips</p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
