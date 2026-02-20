import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { AppShellV2 } from "@/components/AppShellV2";
import {
  Search, Loader2, Zap, Package, AlertTriangle,
  ChevronRight, Sparkles, ImageIcon, ArrowDown, Rocket, X,
  TrendingUp, TrendingDown, Minus, Eraser, User, Camera,
} from "lucide-react";

type RecentItem = {
  id: string;
  title: string;
  brand: string | null;
  image_url: string | null;
  status: string;
  updated_at: string;
  health_score: number | null;
  last_price_check_at: string | null;
  last_optimised_at: string | null;
};

type TrendItem = {
  id: string;
  brand_or_item: string;
  trend_direction: string;
  opportunity_score: number | null;
  category: string;
};

export default function Dashboard() {
  const { user, profile, credits } = useAuth();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [activeCount, setActiveCount] = useState(0);
  const [needsAttentionCount, setNeedsAttentionCount] = useState(0);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  // ─── Milestone banners ───
  const [activeBanners, setActiveBanners] = useState<string[]>([]);
  const bannersReadRef = useRef(false);

  // All milestone config
  const MILESTONES: Record<string, {
    emoji: string; title: string; body: string; action?: { label: string; route: string };
  }> = {
    vintifi_first_listing_complete: {
      emoji: "🎉",
      title: "First listing complete!",
      body: "You're officially a data-driven seller. AI pricing & optimisation done — you're ahead of the pack.",
      action: { label: "View my listing", route: "/listings" },
    },
    vintifi_five_listings_complete: {
      emoji: "🔥",
      title: "5 listings — you're on a roll!",
      body: "Five items live and counting. Check your Trend Radar to see what's rising this week.",
      action: { label: "Open Trend Radar", route: "/trends" },
    },
    vintifi_first_price_check: {
      emoji: "📊",
      title: "First price check done!",
      body: "You just unlocked data-driven pricing. Run a check on every item for maximum profit.",
      action: { label: "Check another item", route: "/price-check" },
    },
    vintifi_first_optimisation: {
      emoji: "✨",
      title: "First AI optimisation complete!",
      body: "Your listing is now Vinted algorithm-ready. AI titles get up to 3× more views.",
      action: { label: "Optimise another", route: "/optimize" },
    },
  };

  useEffect(() => {
    if (!user || bannersReadRef.current) return;
    const fetchAll = async () => {
      const [activeRes, needsAttRes, recentRes, trendsRes] = await Promise.all([
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "active"),
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "active").or("description.is.null,health_score.is.null,image_url.is.null"),
        supabase.from("listings").select("id, title, brand, image_url, status, updated_at, health_score, last_price_check_at, last_optimised_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(5),
        supabase.from("trends").select("id, brand_or_item, trend_direction, opportunity_score, category").order("opportunity_score", { ascending: false }).limit(3),
      ]);

      const count = activeRes.count || 0;
      setActiveCount(count);
      setNeedsAttentionCount(needsAttRes.count || 0);
      setRecentItems((recentRes.data || []) as RecentItem[]);
      setTrends((trendsRes.data || []) as TrendItem[]);
      setLoaded(true);

      // Collect all pending milestone flags
      bannersReadRef.current = true;
      const pending: string[] = [];
      for (const key of Object.keys(MILESTONES)) {
        if (localStorage.getItem(key) === "1") {
          localStorage.removeItem(key);
          pending.push(key);
        }
      }
      if (pending.length > 0) {
        setTimeout(() => setActiveBanners(pending), 400);
      }
    };
    fetchAll();
  }, [user]);

  const dismissBanner = (key: string) =>
    setActiveBanners((prev) => prev.filter((k) => k !== key));

  const handleAnalyze = () => {
    if (!url.trim()) { toast.error("Paste a Vinted URL or enter item details"); return; }
    navigate(`/price-check?url=${encodeURIComponent(url.trim())}`);
  };

  return (
    <AppShellV2>
      <div className="space-y-3 sm:space-y-8">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="font-display text-lg sm:text-2xl lg:text-3xl font-bold mb-0 leading-tight">
            Welcome back, {profile?.display_name?.split(" ")[0] || "there"} 👋
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm">Your selling command centre</p>
        </motion.div>

        {/* First-item-free banner */}
        {profile?.first_item_pass_used === false && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 28, delay: 0.2 }}
            className="relative rounded-2xl overflow-hidden border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 p-4 sm:p-5"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-start gap-3">
              <div className="text-2xl sm:text-3xl leading-none select-none shrink-0">🎁</div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-sm sm:text-base text-foreground leading-tight">
                  Your first item is free
                </p>
                <p className="text-[11px] sm:text-sm text-muted-foreground mt-1 leading-snug">
                  Go through the Sell Wizard to get professional photos, an AI listing, and pricing — on us.
                </p>
                <Button
                  size="sm"
                  className="mt-3 h-8 px-4 text-xs font-semibold rounded-xl active:scale-95 transition-transform"
                  onClick={() => navigate("/sell")}
                >
                  <Rocket className="w-3.5 h-3.5 mr-1.5" />
                  Start the Sell Wizard
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Milestone banners */}
        <AnimatePresence mode="sync">
          {activeBanners.map((key) => {
            const m = MILESTONES[key];
            if (!m) return null;
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: -12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className="relative rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-success/10 border border-primary/20 p-3.5 sm:p-4 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent pointer-events-none" />
                <div className="flex items-start gap-3 relative z-10">
                  <div className="text-2xl sm:text-3xl leading-none select-none">{m.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm sm:text-base text-foreground leading-tight">{m.title}</p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">{m.body}</p>
                    {m.action && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-2 h-7 px-2.5 text-[11px] text-primary hover:bg-primary/10 -ml-1"
                        onClick={() => { dismissBanner(key); navigate(m.action!.route); }}
                      >
                        {m.action.label} <ChevronRight className="w-3 h-3 ml-0.5" />
                      </Button>
                    )}
                  </div>
                  <button
                    onClick={() => dismissBanner(key)}
                    className="shrink-0 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors active:scale-90"
                    aria-label="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Quick Price Check */}
        <Card className="gradient-border p-2.5 sm:p-6 border-primary/20">
          <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <h3 className="font-display font-bold text-xs sm:text-base lg:text-lg">Quick Price Check</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-2.5 hidden sm:block">
            Paste a Vinted URL to instantly see what your item is worth
          </p>
          <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste Vinted URL..."
              className="flex-1 h-11 sm:h-10 text-base sm:text-sm rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            />
            <Button onClick={handleAnalyze} className="font-semibold shrink-0 h-11 sm:h-10 rounded-xl active:scale-95 transition-transform touch-card">
              <Search className="w-4 h-4 mr-1.5" />
              Analyse
            </Button>
          </div>
        </Card>

        {/* Quick Actions — or first-listing nudge for new users */}
        {loaded && activeCount === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <button
              onClick={() => navigate("/sell")}
              className="w-full rounded-2xl border-2 border-dashed border-primary/40 bg-primary/[0.04] hover:bg-primary/[0.08] active:scale-[0.98] transition-all p-4 sm:p-5 text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-md group-hover:shadow-primary/30 transition-shadow">
                    <Rocket className="w-5 h-5 text-primary-foreground" />
                  </div>
                  {/* Ping ring */}
                  <span className="absolute inset-0 rounded-xl bg-primary/40 animate-ping" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-sm text-foreground">List your first item</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    The Sell Wizard takes &lt;2 min — AI pricing &amp; optimisation included
                  </p>
                </div>
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                >
                  <ChevronRight className="w-5 h-5 text-primary shrink-0" />
                </motion.div>
              </div>
              {/* Animated downward arrow hint */}
              <div className="flex items-center justify-center gap-1.5 mt-3 pt-3 border-t border-primary/15">
                <p className="text-[10px] text-primary/70 font-medium">Tap to start the wizard</p>
                <motion.div
                  animate={{ y: [0, 3, 0] }}
                  transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                >
                  <ArrowDown className="w-3 h-3 text-primary/60" />
                </motion.div>
              </div>
            </button>
          </motion.div>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
              <Button
                variant="outline"
                className="shrink-0 w-[calc(25%-6px)] min-w-[80px] h-12 sm:h-11 font-semibold active:scale-95 transition-all touch-card rounded-xl text-xs sm:text-sm flex flex-col items-center justify-center gap-1 border-border/60 hover:border-primary/40 hover:bg-primary/[0.04]"
                onClick={() => navigate("/sell")}
              >
                <Package className="w-4 h-4" />
                <span className="text-[10px] sm:text-xs font-semibold leading-tight">Add Item</span>
              </Button>
              <Button
                variant="outline"
                className="shrink-0 w-[calc(25%-6px)] min-w-[80px] h-12 sm:h-11 font-semibold active:scale-95 transition-all touch-card rounded-xl text-xs sm:text-sm flex flex-col items-center justify-center gap-1 border-border/60 hover:border-primary/40 hover:bg-primary/[0.04]"
                onClick={() => navigate("/vintography?op=remove_bg")}
              >
                <Eraser className="w-4 h-4" />
                <span className="text-[10px] sm:text-xs font-semibold leading-tight">Remove BG</span>
              </Button>
              <Button
                variant="outline"
                className="shrink-0 w-[calc(25%-6px)] min-w-[80px] h-12 sm:h-11 font-semibold active:scale-95 transition-all touch-card rounded-xl text-xs sm:text-sm flex flex-col items-center justify-center gap-1 border-border/60 hover:border-primary/40 hover:bg-primary/[0.04]"
                onClick={() => navigate("/vintography?op=put_on_model")}
              >
                <User className="w-4 h-4" />
                <span className="text-[10px] sm:text-xs font-semibold leading-tight">On Model</span>
              </Button>
              <Button
                variant="outline"
                className="shrink-0 w-[calc(25%-6px)] min-w-[80px] h-12 sm:h-11 font-semibold active:scale-95 transition-all touch-card rounded-xl text-xs sm:text-sm flex flex-col items-center justify-center gap-1 border-border/60 hover:border-primary/40 hover:bg-primary/[0.04]"
                onClick={() => navigate("/vintography?op=virtual_tryon")}
              >
                <Camera className="w-4 h-4" />
                <span className="text-[10px] sm:text-xs font-semibold leading-tight">Try It On</span>
              </Button>
            </div>
            {credits && (
              <div className="flex items-center gap-1.5 px-0.5">
                <Sparkles className={`w-3.5 h-3.5 shrink-0 ${
                  (credits.credits_limit - credits.price_checks_used - credits.optimizations_used - credits.vintography_used) <= 0
                    ? "text-destructive"
                    : (credits.credits_limit - credits.price_checks_used - credits.optimizations_used - credits.vintography_used) <= 5
                      ? "text-warning"
                      : "text-primary"
                }`} />
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                  {credits.credits_limit >= 999999
                    ? "Unlimited credits"
                    : `${Math.max(0, credits.credits_limit - credits.price_checks_used - credits.optimizations_used - credits.vintography_used)} of ${credits.credits_limit} credits remaining`}
                </span>
              </div>
            )}
          </>
        )}

        {/* 2 Metric Cards */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card
              className="p-2.5 sm:p-3 border-l-[3px] border-l-primary bg-primary/[0.03] cursor-pointer active:scale-[0.97] transition-all touch-card rounded-xl inner-glow"
              onClick={() => navigate("/listings?status=active")}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <Package className="w-3 h-3 text-primary" />
                <span className="text-[9px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider">Active</span>
              </div>
              <p className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight">{loaded ? activeCount : "—"}</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">listings</p>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card
              className="p-2.5 sm:p-3 border-l-[3px] border-l-warning bg-warning/[0.03] cursor-pointer active:scale-[0.97] transition-all touch-card rounded-xl inner-glow"
              onClick={() => navigate("/listings?filter=needs_attention")}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <AlertTriangle className="w-3 h-3 text-warning" />
                <span className="text-[9px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider">Attention</span>
              </div>
              <p className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight">{loaded ? needsAttentionCount : "—"}</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">items</p>
            </Card>
          </motion.div>
        </div>

        {/* Recent Items */}
        <Card className="p-2.5 sm:p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <h3 className="font-display font-bold text-xs sm:text-base flex items-center gap-1.5">
              <Package className="w-4 h-4 text-primary" />
              Recent Items
            </h3>
            <Button variant="ghost" size="sm" onClick={() => navigate("/listings")} className="text-[10px] sm:text-xs h-7 px-2">
              View all <ChevronRight className="w-3 h-3 ml-0.5" />
            </Button>
          </div>
          {!loaded ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : recentItems.length === 0 ? (
            <button
              onClick={() => navigate("/sell")}
              className="w-full rounded-xl border-2 border-dashed border-primary/30 bg-primary/[0.03] hover:bg-primary/[0.07] active:scale-[0.98] transition-all p-3.5 text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                    <Rocket className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span className="absolute inset-0 rounded-xl bg-primary/40 animate-ping" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs text-foreground">List your first item</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">AI pricing &amp; optimisation in under 2 min</p>
                </div>
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                >
                  <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                </motion.div>
              </div>
            </button>
          ) : (
            <div className="space-y-1">
              {recentItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/20 hover:bg-muted/40 border border-transparent hover:border-border/40 active:bg-muted/50 cursor-pointer transition-colors touch-card"
                  onClick={() => navigate(`/items/${item.id}`)}
                >
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate leading-snug">{item.title}</p>
                    {item.brand && <span className="text-[10px] text-muted-foreground leading-none">{item.brand}</span>}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Trending Now strip */}
        {trends.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-bold text-xs sm:text-base flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-primary" />
                Trending Now
              </h3>
              {profile?.subscription_tier && profile.subscription_tier !== "free" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/trends")}
                  className="text-[10px] sm:text-xs h-7 px-2"
                >
                  See all <ChevronRight className="w-3 h-3 ml-0.5" />
                </Button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-0.5 px-0.5">
              {trends.map((trend) => {
                const isRising = trend.trend_direction === "rising";
                const isFalling = trend.trend_direction === "falling";
                const DirectionIcon = isRising ? TrendingUp : isFalling ? TrendingDown : Minus;
                return (
                  <motion.div
                    key={trend.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileTap={{ scale: 0.97 }}
                    className="shrink-0 w-36 sm:w-44"
                    onClick={() => navigate(`/trends?brand=${encodeURIComponent(trend.brand_or_item)}`)}
                  >
                    <Card className="p-3 cursor-pointer hover:border-primary/30 transition-all active:scale-[0.97] overflow-hidden relative">
                      <div className={`absolute top-0 left-0 right-0 h-0.5 ${isRising ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : isFalling ? "bg-gradient-to-r from-red-400 to-red-500" : "bg-muted"}`} />
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                          isRising ? "bg-emerald-500/10" : isFalling ? "bg-destructive/10" : "bg-muted"
                        }`}>
                          <DirectionIcon className={`w-3 h-3 ${
                            isRising ? "text-emerald-500" : isFalling ? "text-destructive" : "text-muted-foreground"
                          }`} />
                        </div>
                        {trend.opportunity_score != null && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-bold">
                            {trend.opportunity_score}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs font-semibold leading-tight truncate">{trend.brand_or_item}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{trend.category}</p>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShellV2>
  );
}
