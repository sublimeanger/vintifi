import { ReactNode, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebarBadges } from "@/hooks/useSidebarBadges";
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
  LayoutDashboard, Package, Compass, Bot, BarChart3,
  LogOut, Menu, Zap, Settings, Plus, MoreHorizontal,
  Search, TrendingUp, ArrowRightLeft, MapPin, ShoppingBag,
  Timer, Layers, Link2, Radar, ImageIcon, AlertTriangle,
  PieChart, Sparkles,
} from "lucide-react";

/* ── Workspace definitions ── */

type NavItem = {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  tier?: string; // minimum tier
};

type Workspace = {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  items?: NavItem[];
};

const WORKSPACES: Workspace[] = [
  { icon: LayoutDashboard, label: "Today", path: "/dashboard" },
  { icon: Package, label: "Items", path: "/listings" },
  {
    icon: Compass, label: "Opportunities", path: "/trends",
    items: [
      { icon: TrendingUp, label: "Trends", path: "/trends" },
      { icon: ArrowRightLeft, label: "Deals", path: "/arbitrage", tier: "business" },
      { icon: Radar, label: "Competitors", path: "/competitors" },
      { icon: MapPin, label: "In-Store List", path: "/charity-briefing" },
      { icon: ShoppingBag, label: "Clearance Radar", path: "/clearance-radar", tier: "business" },
    ],
  },
  {
    icon: BarChart3, label: "Analytics", path: "/analytics",
    items: [
      { icon: PieChart, label: "P&L Analytics", path: "/analytics" },
      { icon: AlertTriangle, label: "Inventory Health", path: "/dead-stock" },
    ],
  },
];

const TOOL_ITEMS: NavItem[] = [
  { icon: Search, label: "Price Check", path: "/price-check" },
  { icon: Sparkles, label: "Improve Listing", path: "/optimize" },
  { icon: ImageIcon, label: "Photo Studio", path: "/vintography" },
  { icon: ShoppingBag, label: "eBay", path: "/platforms" },
];

/* ── Mobile bottom nav items ── */

const BOTTOM_TABS = [
  { icon: LayoutDashboard, label: "Today", path: "/dashboard" },
  { icon: Package, label: "Items", path: "/listings" },
  { icon: Plus, label: "New", path: "__new__" }, // centre FAB
  { icon: Compass, label: "Opps", path: "/trends" },
  { icon: MoreHorizontal, label: "More", path: "__more__" },
];

/* ── Component ── */

interface AppShellV2Props {
  children: ReactNode;
  maxWidth?: string;
}

export function AppShellV2({ children, maxWidth = "max-w-5xl" }: AppShellV2Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, credits, signOut } = useAuth();
  const badges = useSidebarBadges();
  const [sheetOpen, setSheetOpen] = useState(false);

  const tier = (profile?.subscription_tier || "free") as keyof typeof STRIPE_TIERS;
  const tierInfo = STRIPE_TIERS[tier] || STRIPE_TIERS.free;
  const checksRemaining = credits ? credits.credits_limit - credits.price_checks_used : 0;
  const creditsLow = checksRemaining <= 2;

  const isActive = (path: string) => location.pathname === path;
  const isWorkspaceActive = (ws: Workspace) => {
    if (isActive(ws.path)) return true;
    return ws.items?.some((i) => isActive(i.path)) ?? false;
  };

  /* ── Desktop sidebar ── */
  const sidebar = (
    <aside className="hidden lg:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 pb-4">
        <h1 className="font-display text-xl font-extrabold">
          <span className="text-gradient">Vintifi</span>
        </h1>
      </div>

      {/* Workspaces */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-hide">
        {/* Primary workspaces */}
        {WORKSPACES.map((ws) => (
          <div key={ws.label}>
            <button
              onClick={() => navigate(ws.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isWorkspaceActive(ws)
                  ? "bg-sidebar-accent text-sidebar-foreground font-semibold"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
              )}
            >
              <ws.icon className="w-4 h-4 shrink-0" />
              {ws.label}
              {badges[ws.path] ? (
                <span className="ml-auto text-[10px] font-bold bg-destructive/15 text-destructive px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {badges[ws.path]}
                </span>
              ) : isWorkspaceActive(ws) ? (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              ) : null}
            </button>
            {/* Sub-items when workspace active */}
            {ws.items && isWorkspaceActive(ws) && (
              <div className="ml-5 pl-3 border-l border-sidebar-border/50 mt-0.5 mb-1 space-y-0.5">
                {ws.items.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors",
                      isActive(item.path)
                        ? "text-sidebar-foreground bg-sidebar-accent/60"
                        : "text-sidebar-foreground/55 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/40",
                    )}
                  >
                    <item.icon className="w-3.5 h-3.5 shrink-0" />
                    {item.label}
                    {badges[item.path] ? (
                      <span className="ml-auto text-[9px] font-bold bg-destructive/15 text-destructive px-1 py-0.5 rounded-full min-w-[16px] text-center">
                        {badges[item.path]}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Divider */}
        <div className="!my-3 h-px bg-sidebar-border/50" />

        {/* Tools */}
        <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">Tools</p>
        {TOOL_ITEMS.map((item) => (
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
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border bg-gradient-to-t from-sidebar-accent/30 to-transparent space-y-3">
        {/* Credits */}
        <button
          onClick={() => navigate("/settings")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 transition-all w-full",
            creditsLow ? "bg-warning/20 hover:bg-warning/30" : "bg-sidebar-accent/60 hover:bg-sidebar-accent",
          )}
        >
          <Zap className={cn("w-3.5 h-3.5 shrink-0", creditsLow ? "text-warning" : "text-primary")} />
          <span className={cn("text-xs font-medium", creditsLow ? "text-warning" : "text-sidebar-foreground/80")}>
            {checksRemaining} AI credits
          </span>
        </button>

        {/* User */}
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
    <header className="lg:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-border shadow-sm flex items-center justify-between px-4 h-14">
      <h1 className="font-display text-lg font-extrabold">
        <span className="text-gradient">Vintifi</span>
      </h1>
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/settings")}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors active:scale-95",
            creditsLow ? "bg-warning/20 hover:bg-warning/30" : "bg-muted hover:bg-muted/80",
          )}
        >
          <Zap className={cn("w-3.5 h-3.5", creditsLow ? "text-warning" : "text-primary")} />
          <span className={cn("text-xs font-semibold", creditsLow && "text-warning")}>{checksRemaining}</span>
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
            <nav className="flex-1 min-h-0 px-3 py-4 space-y-1 overflow-y-auto">
              {WORKSPACES.map((ws) => (
                <div key={ws.label}>
                  <button
                    onClick={() => { navigate(ws.path); setSheetOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors active:scale-[0.98]",
                      isWorkspaceActive(ws)
                        ? "bg-sidebar-accent text-sidebar-foreground font-semibold"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent",
                    )}
                  >
                    <ws.icon className="w-4 h-4 shrink-0" /> {ws.label}
                  </button>
                  {ws.items && (
                    <div className="ml-7 space-y-0.5 mt-0.5 mb-1">
                      {ws.items.map((item) => (
                        <button
                          key={item.path}
                          onClick={() => { navigate(item.path); setSheetOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors",
                            isActive(item.path)
                              ? "text-sidebar-foreground bg-sidebar-accent/60"
                              : "text-sidebar-foreground/55 hover:text-sidebar-foreground/80",
                          )}
                        >
                          <item.icon className="w-3.5 h-3.5 shrink-0" /> {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="!my-3 h-px bg-sidebar-border/50" />
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">Tools</p>
              {TOOL_ITEMS.map((item) => (
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
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {BOTTOM_TABS.map((tab) => {
          if (tab.path === "__new__") {
            return (
              <button
                key="new"
                onClick={() => navigate("/price-check")}
                className="relative flex items-center justify-center -mt-4"
              >
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 active:scale-90 transition-transform">
                  <Plus className="w-6 h-6" />
                </div>
              </button>
            );
          }
          if (tab.path === "__more__") {
            return (
              <button
                key="more"
                onClick={() => setSheetOpen(true)}
                className="relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all min-w-0 active:scale-95 text-muted-foreground"
              >
                <tab.icon className="w-[22px] h-[22px]" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          }
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all min-w-0 active:scale-95",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {active && (
                <motion.div
                  layoutId="bottom-nav-pill-v2"
                  className="absolute inset-x-2 inset-y-1.5 bg-primary/10 rounded-xl"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <tab.icon className="w-[22px] h-[22px] relative z-10" />
              <span className={cn("text-[10px] font-medium relative z-10", active && "font-semibold")}>
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
        <main className="flex-1 pt-14 lg:pt-0 pb-24 lg:pb-0">
          <div className={cn("container mx-auto px-4 py-6 sm:py-8", maxWidth)}>
            {children}
          </div>
        </main>
        {bottomNav}
      </div>
    </div>
  );
}
