import { useState } from "react";
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
} from "lucide-react";
import { STRIPE_TIERS } from "@/lib/constants";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Search, label: "Price Check", path: "/price-check" },
  { icon: Tag, label: "My Listings", path: "/dashboard", badge: "Soon" },
  { icon: TrendingUp, label: "Trends", path: "/dashboard", badge: "Soon" },
  { icon: CreditCard, label: "Billing", path: "/settings" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export default function Dashboard() {
  const { user, profile, credits, signOut } = useAuth();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const tier = (profile?.subscription_tier || "free") as keyof typeof STRIPE_TIERS;
  const tierInfo = STRIPE_TIERS[tier] || STRIPE_TIERS.free;
  const checksRemaining = credits ? credits.credits_limit - credits.price_checks_used : 0;

  const handleAnalyze = async () => {
    if (!url.trim()) { toast.error("Paste a Vinted URL or enter item details"); return; }
    navigate(`/price-check?url=${encodeURIComponent(url.trim())}`);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="p-6">
          <h1 className="font-display text-xl font-extrabold">
            <span className="text-gradient">Raqkt</span>
          </h1>
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
              {item.badge && <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">{item.badge}</Badge>}
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
        <h1 className="font-display text-lg font-extrabold"><span className="text-gradient">Raqkt</span></h1>
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

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card
              className="p-5 cursor-pointer hover:shadow-md transition-shadow border-border/50"
              onClick={() => navigate("/price-check")}
            >
              <Search className="w-5 h-5 text-primary mb-3" />
              <h4 className="font-display font-bold mb-1">Price Check</h4>
              <p className="text-sm text-muted-foreground">Get instant pricing for any item</p>
            </Card>
            <Card className="p-5 opacity-60 cursor-not-allowed">
              <BarChart3 className="w-5 h-5 text-muted-foreground mb-3" />
              <h4 className="font-display font-bold mb-1">Optimise Listing</h4>
              <p className="text-sm text-muted-foreground">Coming in Phase 2</p>
            </Card>
            <Card className="p-5 opacity-60 cursor-not-allowed">
              <TrendingUp className="w-5 h-5 text-muted-foreground mb-3" />
              <h4 className="font-display font-bold mb-1">View Trends</h4>
              <p className="text-sm text-muted-foreground">Coming in Phase 2</p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
