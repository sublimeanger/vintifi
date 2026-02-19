import { ReactNode, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { STRIPE_TIERS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Package, Search, Sparkles, ImageIcon,
  LogOut, Menu, Zap, Settings, TrendingUp, Plus, Rocket,
} from "lucide-react";

type NavItem = {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
};

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Package, label: "Items", path: "/listings" },
  { icon: Rocket, label: "Sell", path: "/sell" },
  { icon: Search, label: "Price Check", path: "/price-check" },
  { icon: Sparkles, label: "Optimise", path: "/optimize" },
  { icon: TrendingUp, label: "Trends", path: "/trends" },
  { icon: ImageIcon, label: "Photo Studio", path: "/vintography" },
];

const BOTTOM_TABS: NavItem[] = [
  { icon: LayoutDashboard, label: "Home", path: "/dashboard" },
  { icon: Package, label: "Items", path: "/listings" },
  { icon: TrendingUp, label: "Trends", path: "/trends" },
  { icon: Sparkles, label: "Optimise", path: "/optimize" },
];

interface AppShellV2Props {
  children: ReactNode;
  maxWidth?: string;
}

export function AppShellV2({ children, maxWidth = "max-w-5xl" }: AppShellV2Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, credits, signOut } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);

  const tier = (profile?.subscription_tier || "free") as keyof typeof STRIPE_TIERS;
  const tierInfo = STRIPE_TIERS[tier] || STRIPE_TIERS.free;
  const isUnlimited = (credits?.credits_limit ?? 0) >= 999999;
  const totalUsed = credits ? credits.price_checks_used + credits.optimizations_used + credits.vintography_used : 0;
  const checksRemaining = isUnlimited ? Infinity : (credits ? credits.credits_limit - totalUsed : 0);
  const creditsLow = !isUnlimited && checksRemaining <= 2;

  const isActive = (path: string) => location.pathname === path;

  /* ── Desktop sidebar ── */
  const sidebar = (
    <aside className="hidden lg:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen sticky top-0">
      <div className="p-6 pb-4">
        <h1 className="font-display text-xl font-extrabold">
          <span className="text-gradient">Vintifi</span>
        </h1>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-hide">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
              isActive(item.path)
                ? "bg-sidebar-accent text-sidebar-foreground font-semibold"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
            {isActive(item.path) && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border bg-gradient-to-t from-sidebar-accent/30 to-transparent space-y-3">
        <button
          onClick={() => navigate("/settings")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 transition-all w-full",
            creditsLow ? "bg-warning/20 hover:bg-warning/30" : "bg-sidebar-accent/60 hover:bg-sidebar-accent",
          )}
        >
          <Zap className={cn("w-3.5 h-3.5 shrink-0", creditsLow ? "text-warning" : "text-primary")} />
          <span className={cn("text-xs font-medium", creditsLow ? "text-warning" : "text-sidebar-foreground/80")}>
            {isUnlimited ? "Unlimited" : checksRemaining} AI credits
          </span>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold shrink-0 text-primary">
            {profile?.display_name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.display_name || user?.email}</p>
            <p className="text-xs text-sidebar-foreground/50 capitalize">{tierInfo.name} Plan</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="flex-1 justify-start text-sidebar-foreground/60 text-xs" onClick={() => navigate("/settings")}>
            <Settings className="w-3.5 h-3.5 mr-1.5" /> Settings
          </Button>
          <Button variant="ghost" size="sm" className="text-sidebar-foreground/60 text-xs" onClick={signOut}>
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );

  /* ── Mobile header ── */
  const mobileHeader = (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-2xl border-b border-border/60 flex items-center justify-between px-4 h-12">
      <h1 className="font-display text-base font-extrabold">
        <span className="text-gradient">Vintifi</span>
      </h1>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => navigate("/settings")}
          className={cn(
            "flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors active:scale-95",
            creditsLow ? "bg-warning/15" : "bg-muted/60",
          )}
        >
          <Zap className={cn("w-3 h-3", creditsLow ? "text-warning" : "text-primary")} />
          <span className={cn("text-[11px] font-bold tabular-nums", creditsLow && "text-warning")}>{isUnlimited ? "∞" : checksRemaining}</span>
        </button>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 -mr-1">
              <Menu className="w-[18px] h-[18px]" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-sidebar text-sidebar-foreground flex flex-col h-full">
            <SheetHeader className="p-5 border-b border-sidebar-border shrink-0">
              <SheetTitle className="font-display text-xl font-extrabold text-sidebar-foreground">
                <span className="text-gradient">Vintifi</span>
              </SheetTitle>
            </SheetHeader>
            <nav className="flex-1 min-h-0 px-3 py-4 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setSheetOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors active:scale-[0.98]",
                    isActive(item.path)
                      ? "bg-sidebar-accent text-sidebar-foreground font-semibold"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent",
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" /> {item.label}
                </button>
              ))}
            </nav>
            <div className="p-4 border-t border-sidebar-border shrink-0 space-y-2">
              <button
                onClick={() => { navigate("/settings"); setSheetOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-sidebar-foreground/70 active:scale-[0.98]"
              >
                <Settings className="w-4 h-4" /> Settings
              </button>
              <button
                onClick={() => { signOut(); setSheetOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-destructive active:scale-[0.98]"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );

  /* ── Mobile bottom nav ── */
  const bottomNav = (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/90 backdrop-blur-2xl pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14">
        {/* First 2 tabs */}
        {BOTTOM_TABS.slice(0, 2).map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0 flex-1 h-full transition-all min-w-0 active:scale-90",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {active && (
                <motion.div
                  layoutId="bottom-nav-pill-v2"
                  className="absolute inset-x-3 inset-y-2 bg-primary/8 rounded-xl"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <tab.icon className={cn("w-5 h-5 relative z-10 transition-all", active && "w-[22px] h-[22px]")} />
              <span className={cn("text-[9px] font-medium relative z-10 mt-0.5", active && "font-bold text-[10px]")}>
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* Centre Sell CTA */}
        <button
          onClick={() => navigate("/sell")}
          className="relative flex flex-col items-center justify-center flex-1 h-full active:scale-90 transition-transform"
        >
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all",
            isActive("/sell") ? "bg-primary scale-110" : "bg-primary"
          )}>
            <Plus className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className={cn("text-[9px] font-bold mt-0.5", isActive("/sell") ? "text-primary" : "text-muted-foreground")}>
            Sell
          </span>
        </button>

        {/* Last 2 tabs */}
        {BOTTOM_TABS.slice(2).map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0 flex-1 h-full transition-all min-w-0 active:scale-90",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {active && (
                <motion.div
                  layoutId="bottom-nav-pill-v2"
                  className="absolute inset-x-3 inset-y-2 bg-primary/8 rounded-xl"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <tab.icon className={cn("w-5 h-5 relative z-10 transition-all", active && "w-[22px] h-[22px]")} />
              <span className={cn("text-[9px] font-medium relative z-10 mt-0.5", active && "font-bold text-[10px]")}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {sidebar}
      <div className="flex-1 flex flex-col min-w-0">
        {mobileHeader}
        <main className="flex-1 pt-12 lg:pt-0 pb-20 lg:pb-0">
          <div className={cn("container mx-auto px-3 sm:px-4 py-4 sm:py-8", maxWidth)}>
            {children}
          </div>
        </main>
        {bottomNav}
      </div>
    </div>
  );
}
