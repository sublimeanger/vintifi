import { ReactNode, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { STRIPE_TIERS } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Package, Search, Sparkles, ImageIcon,
  LogOut, Menu, Zap, Settings, TrendingUp, Plus, Rocket,
  MoreHorizontal, X, ChevronRight,
} from "lucide-react";

type NavItem = {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
};

const TOUR_STEPS = [
  {
    step: 1,
    emoji: "📊",
    title: "Your Dashboard",
    body: "This is your selling command centre — see active listings, performance stats, and trending brands at a glance.",
  },
  {
    step: 2,
    emoji: "📸",
    title: "Photo Studio",
    body: "Transform any phone photo into a professional listing image. Remove backgrounds, add flat-lay styling, or get AI model shots.",
    navHint: "Tap 'Photos' in the bottom nav (or 'Photo Studio' in the sidebar).",
  },
  {
    step: 3,
    emoji: "🚀",
    title: "Sell Wizard",
    body: "List a new item in under 2 minutes. Add details → enhance photos → AI listing → pricing → ready to post.",
    navHint: "Tap the '+' Sell button in the centre of the bottom nav.",
  },
  {
    step: 4,
    emoji: "🎁",
    title: "Your first item is free",
    body: "Every new account gets a complete first-item pass — professional photos, AI listing, and market pricing — completely free.",
  },
];

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard",    path: "/dashboard" },
  { icon: ImageIcon,       label: "Photo Studio", path: "/vintography" },
  { icon: Rocket,          label: "Sell",         path: "/sell" },
  { icon: Package,         label: "My Items",     path: "/listings" },
];

const BOTTOM_TABS: NavItem[] = [
  { icon: LayoutDashboard, label: "Home",   path: "/dashboard" },
  { icon: ImageIcon,       label: "Photos", path: "/vintography" },
  { icon: Package,         label: "Items",  path: "/listings" },
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
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [tourStep, setTourStep] = useState<number | null>(null);

  // Show tour for new users (tour_completed === false) only on dashboard
  useEffect(() => {
    if (!profile) return;
    const alreadyDone = localStorage.getItem("vintifi_tour_completed") === "1";
    if (!alreadyDone && profile.tour_completed === false && location.pathname === "/dashboard") {
      // Small delay so page renders first
      const t = setTimeout(() => setTourStep(1), 800);
      return () => clearTimeout(t);
    }
  }, [profile?.tour_completed, location.pathname]);

  const completeTour = async () => {
    setTourStep(null);
    localStorage.setItem("vintifi_tour_completed", "1");
    if (user) {
      await supabase.from("profiles").update({ tour_completed: true } as any).eq("user_id", user.id);
    }
  };

  const advanceTour = () => {
    if (tourStep === null) return;
    if (tourStep >= TOUR_STEPS.length) {
      completeTour();
    } else {
      setTourStep(tourStep + 1);
    }
  };

  const tier = (profile?.subscription_tier || "free") as keyof typeof STRIPE_TIERS;
  const tierInfo = STRIPE_TIERS[tier] || STRIPE_TIERS.free;
  const isUnlimited = (credits?.credits_limit ?? 0) >= 999999;
  const isFirstItemFree = profile?.first_item_pass_used === false;
  const totalUsed = credits ? credits.price_checks_used + credits.optimizations_used + credits.vintography_used : 0;
  const checksRemaining = isUnlimited ? Infinity : (credits ? credits.credits_limit - totalUsed : 0);
  const creditsLow = !isUnlimited && !isFirstItemFree && checksRemaining <= 2;

  const isActive = (path: string) => location.pathname === path;

  /* ── Desktop sidebar ── */
  const sidebar = (
    <aside className="hidden lg:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen sticky top-0 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="p-6 pb-5">
        <h1 className="font-display text-xl font-extrabold">
          <span className="text-gradient">Vintifi</span>
        </h1>
        <p className="text-[10px] text-sidebar-foreground/40 font-medium tracking-wide mt-0.5">SELL SMARTER</p>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-hide">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
              isActive(item.path)
                ? "bg-gradient-to-r from-primary/15 to-primary/5 text-sidebar-foreground font-semibold border-l-2 border-primary -ml-[2px]"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
            {isActive(item.path) && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
          </button>
        ))}

        {/* Secondary tools */}
        <div className="pt-3 mt-2 border-t border-sidebar-border/50">
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">More tools</p>
          {[
            { icon: TrendingUp, label: "Trends",      path: "/trends" },
            { icon: Search,     label: "Price Check",  path: "/price-check" },
            { icon: Sparkles,   label: "Optimise",     path: "/optimize" },
          ].map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                isActive(item.path)
                   ? "bg-gradient-to-r from-primary/15 to-primary/5 text-sidebar-foreground font-semibold border-l-2 border-primary -ml-[2px]"
                  : "text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
              {isActive(item.path) && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
            </button>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-sidebar-border bg-gradient-to-t from-sidebar-accent/30 to-transparent space-y-3">
        <button
          onClick={() => navigate(isFirstItemFree ? "/sell" : "/settings")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 transition-all w-full",
            isFirstItemFree ? "bg-primary/15 hover:bg-primary/25 border border-primary/25" : creditsLow ? "bg-warning/20 hover:bg-warning/30" : "bg-sidebar-accent/60 hover:bg-sidebar-accent",
          )}
        >
          <span className="text-base leading-none shrink-0">{isFirstItemFree ? "🎁" : ""}</span>
          {!isFirstItemFree && <Zap className={cn("w-3.5 h-3.5 shrink-0", creditsLow ? "text-warning" : "text-primary")} />}
          <span className={cn("text-xs font-medium leading-tight", isFirstItemFree ? "text-primary" : creditsLow ? "text-warning" : "text-sidebar-foreground/80")}>
            {isFirstItemFree ? "First Item Free" : isUnlimited ? "Unlimited" : `${checksRemaining} AI credits`}
          </span>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 ring-2 ring-primary/10 flex items-center justify-center text-sm font-bold shrink-0 text-primary">
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
    <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-2xl border-b border-border/40 flex items-center justify-between px-4 h-[52px]">
      <h1 className="font-display text-base font-extrabold">
        <span className="text-gradient">Vintifi</span>
      </h1>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => navigate(isFirstItemFree ? "/sell" : "/settings")}
          className={cn(
            "flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors active:scale-95",
            isFirstItemFree ? "bg-primary/15 border border-primary/25" : creditsLow ? "bg-warning/15" : "bg-muted/60",
          )}
        >
          {isFirstItemFree ? (
            <span className="text-[11px] font-bold text-primary">🎁 Free</span>
          ) : (
            <>
              <Zap className={cn("w-3 h-3", creditsLow ? "text-warning" : "text-primary")} />
              <span className={cn("text-[11px] font-bold tabular-nums", creditsLow && "text-warning")}>{isUnlimited ? "∞" : checksRemaining}</span>
            </>
          )}
        </button>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 -mr-1">
              <Menu className="w-[18px] h-[18px]" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-sidebar text-sidebar-foreground flex flex-col h-full !duration-300">
            <SheetHeader className="p-5 border-b border-sidebar-border shrink-0">
              <SheetTitle className="font-display text-xl font-extrabold text-sidebar-foreground">
                <span className="text-gradient">Vintifi</span>
              </SheetTitle>
            </SheetHeader>
            <nav className="flex-1 min-h-0 px-3 py-4 space-y-1 overflow-y-auto">
              {/* Primary nav items */}
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

              {/* Secondary "More tools" section */}
              <div className="pt-3 mt-2 border-t border-sidebar-border/50">
                <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">More tools</p>
                {[
                  { icon: TrendingUp, label: "Trends",      path: "/trends" },
                  { icon: Search,     label: "Price Check",  path: "/price-check" },
                  { icon: Sparkles,   label: "Optimise",     path: "/optimize" },
                ].map((item) => (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setSheetOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors active:scale-[0.98]",
                      isActive(item.path)
                        ? "bg-sidebar-accent text-sidebar-foreground font-semibold"
                        : "text-sidebar-foreground/50 hover:bg-sidebar-accent",
                    )}
                  >
                    <item.icon className="w-4 h-4 shrink-0" /> {item.label}
                  </button>
                ))}
              </div>
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
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-2xl shadow-[0_-1px_3px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {/* Left 2 tabs: Home, Photos */}
        {BOTTOM_TABS.slice(0, 2).map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => { try { navigator?.vibrate?.(6); } catch {} navigate(tab.path); }}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0 flex-1 h-full transition-all min-w-0 active:scale-90",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {active && (
                <motion.div
                  layoutId="bottom-nav-pill-v2"
                  className="absolute inset-x-2 inset-y-1.5 bg-primary/12 rounded-xl"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <tab.icon className={cn("w-5 h-5 relative z-10 transition-all", active && "w-[22px] h-[22px]")} />
              <span className={cn("text-[10px] font-medium relative z-10 mt-0.5", active && "font-bold text-[11px]")}>
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* Centre Sell CTA */}
        <button
          onClick={() => { try { navigator?.vibrate?.(6); } catch {} navigate("/sell"); }}
          className="relative flex flex-col items-center justify-center flex-1 h-full active:scale-90 transition-transform"
        >
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all",
            isActive("/sell") ? "bg-primary shadow-coral scale-110" : "bg-primary shadow-coral"
          )}>
            <Plus className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className={cn("text-[10px] font-bold mt-0.5", isActive("/sell") ? "text-primary" : "text-muted-foreground")}>
            Sell
          </span>
        </button>

        {/* Items tab */}
        {(() => {
          const tab = BOTTOM_TABS[2];
          const active = isActive(tab.path);
          return (
            <button
              onClick={() => { try { navigator?.vibrate?.(6); } catch {} navigate(tab.path); }}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0 flex-1 h-full transition-all min-w-0 active:scale-90",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {active && (
                <motion.div
                  layoutId="bottom-nav-pill-v2"
                  className="absolute inset-x-2 inset-y-1.5 bg-primary/12 rounded-xl"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <tab.icon className={cn("w-5 h-5 relative z-10 transition-all", active && "w-[22px] h-[22px]")} />
              <span className={cn("text-[10px] font-medium relative z-10 mt-0.5", active && "font-bold text-[11px]")}>
                {tab.label}
              </span>
            </button>
          );
        })()}

        {/* More tab */}
        <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
          <SheetTrigger asChild>
            <button
              onClick={() => { try { navigator?.vibrate?.(6); } catch {} }}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0 flex-1 h-full transition-all min-w-0 active:scale-90",
                moreSheetOpen ? "text-primary" : "text-muted-foreground",
              )}
            >
              <MoreHorizontal className="w-5 h-5 relative z-10" />
              <span className="text-[10px] font-medium relative z-10 mt-0.5">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="p-0 bg-background rounded-t-2xl">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <SheetHeader className="px-5 pb-3">
              <SheetTitle className="text-sm font-semibold text-muted-foreground">More</SheetTitle>
            </SheetHeader>
            <div className="px-3 pb-6 space-y-1">
              {[
                { icon: TrendingUp, label: "Trends",      path: "/trends" },
                { icon: Search,     label: "Price Check",  path: "/price-check" },
                { icon: Sparkles,   label: "Optimise",     path: "/optimize" },
                { icon: Settings,   label: "Settings",     path: "/settings" },
              ].map((item) => (
                <button
                  key={item.path}
                  onClick={() => { try { navigator?.vibrate?.(6); } catch {} navigate(item.path); setMoreSheetOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-colors active:scale-[0.98]",
                    isActive(item.path)
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" /> {item.label}
                </button>
              ))}
              <div className="pt-1 border-t border-border/60 mt-1">
                <button
                  onClick={() => { signOut(); setMoreSheetOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors active:scale-[0.98]"
                >
                  <LogOut className="w-4 h-4 shrink-0" /> Sign Out
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );

  const currentTourStep = tourStep !== null ? TOUR_STEPS[tourStep - 1] : null;

  return (
    <div className="flex min-h-screen bg-background">
      {sidebar}
      <div className="flex-1 flex flex-col min-w-0">
        {mobileHeader}
        <main className="flex-1 pt-[52px] lg:pt-0 pb-20 lg:pb-0">
          <div className={cn("container mx-auto px-3 sm:px-4 py-4 sm:py-8", maxWidth)}>
            {children}
          </div>
        </main>
        {bottomNav}
      </div>

      {/* Onboarding Tour Overlay */}
      <AnimatePresence>
        {currentTourStep && (
          <>
            {/* Backdrop */}
            <motion.div
              key="tour-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm"
              onClick={completeTour}
            />
            {/* Tour card */}
            <motion.div
              key={`tour-step-${tourStep}`}
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-[61] w-[calc(100vw-2rem)] max-w-sm"
            >
              <div className="bg-card border border-border rounded-2xl shadow-2xl p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{currentTourStep.emoji}</span>
                    <div>
                      <p className="font-display font-bold text-sm">{currentTourStep.title}</p>
                      <p className="text-[10px] text-muted-foreground">Step {currentTourStep.step} of {TOUR_STEPS.length}</p>
                    </div>
                  </div>
                  <button
                    onClick={completeTour}
                    className="shrink-0 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    aria-label="Close tour"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{currentTourStep.body}</p>
                {currentTourStep.navHint && (
                  <p className="text-[10px] text-primary/70 font-medium mt-1">{currentTourStep.navHint}</p>
                )}
                {/* Progress dots */}
                <div className="flex items-center gap-1 mt-3 mb-3">
                  {TOUR_STEPS.map((s) => (
                    <div
                      key={s.step}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        s.step === tourStep ? "w-5 bg-primary" : s.step < (tourStep ?? 0) ? "w-3 bg-primary/40" : "w-3 bg-muted"
                      )}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={completeTour}
                  >
                    Skip
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 text-xs font-semibold"
                    onClick={advanceTour}
                  >
                    {tourStep === TOUR_STEPS.length ? "Done 🎉" : "Next"}
                    {tourStep !== TOUR_STEPS.length && <ChevronRight className="w-3.5 h-3.5 ml-1" />}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
