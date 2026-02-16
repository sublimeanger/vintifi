import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { AppShellV2 } from "@/components/AppShellV2";
import { PipelineSnapshot } from "@/components/PipelineSnapshot";
import { NextActionsInbox } from "@/components/NextActionsInbox";
import { GuidedTour } from "@/components/GuidedTour";
import { EbayStatusCard } from "@/components/EbayStatusCard";
import { useFeatureUnlocks } from "@/hooks/useFeatureUnlocks";
import {
  Search, Loader2, Zap, Package, DollarSign, ShoppingBag,
  TrendingUp, ChevronRight, Clock, Sparkles,
} from "lucide-react";
import { STRIPE_TIERS } from "@/lib/constants";

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
  const { user, profile, credits } = useAuth();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  useFeatureUnlocks();

  const [activeCount, setActiveCount] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [soldThisWeek, setSoldThisWeek] = useState(0);
  const [monthlyProfit, setMonthlyProfit] = useState(0);
  const [recentReports, setRecentReports] = useState<PriceReport[]>([]);
  const [trendsPreview, setTrendsPreview] = useState<{ brand_or_item: string; category: string; search_volume_change_7d: number | null }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [activeRes, soldWeekRes, soldMonthRes, reportsRes, trendsRes] = await Promise.all([
        supabase.from("listings").select("id, current_price").eq("user_id", user.id).eq("status", "active"),
        supabase.from("listings").select("id").eq("user_id", user.id).eq("status", "sold").gte("sold_at", weekAgo.toISOString()),
        supabase.from("listings").select("sale_price, purchase_price").eq("user_id", user.id).eq("status", "sold").gte("sold_at", monthStart.toISOString()),
        supabase.from("price_reports").select("id, item_title, item_brand, recommended_price, confidence_score, created_at, vinted_url").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("trends").select("brand_or_item, category, search_volume_change_7d").eq("trend_direction", "rising").order("opportunity_score", { ascending: false }).limit(3),
      ]);

      if (activeRes.data) {
        setActiveCount(activeRes.data.length);
        setPortfolioValue(activeRes.data.reduce((s, l) => s + (Number(l.current_price) || 0), 0));
      }
      setSoldThisWeek(soldWeekRes.data?.length || 0);
      if (soldMonthRes.data) {
        setMonthlyProfit(soldMonthRes.data.reduce((s, l) => s + ((Number(l.sale_price) || 0) - (Number(l.purchase_price) || 0)), 0));
      }
      setRecentReports((reportsRes.data as PriceReport[]) || []);
      setTrendsPreview(trendsRes.data || []);
      setLoaded(true);
    };
    fetchAll();
  }, [user]);

  const handleAnalyze = () => {
    if (!url.trim()) { toast.error("Paste a Vinted URL or enter item details"); return; }
    navigate(`/price-check?url=${encodeURIComponent(url.trim())}`);
  };

  const metrics = [
    { icon: Package, label: "Active Items", value: `${activeCount}`, color: "text-primary", bg: "bg-primary/[0.06]", border: "border-l-primary" },
    { icon: DollarSign, label: "Portfolio Value", value: `£${portfolioValue.toFixed(0)}`, color: "text-success", bg: "bg-success/[0.06]", border: "border-l-success" },
    { icon: ShoppingBag, label: "Sold (7d)", value: `${soldThisWeek}`, color: "text-accent", bg: "bg-accent/[0.06]", border: "border-l-accent" },
    { icon: Zap, label: "Profit (MTD)", value: `£${monthlyProfit.toFixed(0)}`, color: "text-primary", bg: "bg-primary/[0.06]", border: "border-l-primary" },
  ];

  return (
    <AppShellV2>
      <div className="space-y-5 sm:space-y-8">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold mb-0.5">
            Welcome back, {profile?.display_name?.split(" ")[0] || "there"} 👋
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm">Your command centre for today</p>
        </motion.div>

        {/* A) New Item / Price Check CTA */}
        <Card id="tour-price-check" className="gradient-border p-4 sm:p-6 border-primary/20">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <h3 className="font-display font-bold text-sm sm:text-base lg:text-lg">New Item</h3>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mb-3 hidden sm:block">
            Paste a Vinted URL to price check, or start listing a new item
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

        {/* E) Performance Quick */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {metrics.map((m, i) => (
            <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className={`p-3 sm:p-4 border-l-[3px] ${m.border} ${m.bg} cursor-pointer hover:shadow-md active:scale-[0.97] transition-all`} onClick={() => navigate("/analytics")}>
                <div className="flex items-center gap-1.5 mb-1">
                  <m.icon className={`w-3 h-3 sm:w-4 sm:h-4 ${m.color}`} />
                  <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider truncate">{m.label}</span>
                </div>
                <p className="font-display text-xl sm:text-2xl lg:text-3xl font-bold">{m.value}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* C) Pipeline Snapshot */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-primary" /> Pipeline
          </h3>
          <PipelineSnapshot />
        </div>

        {/* eBay Status */}
        <EbayStatusCard />

        {/* B) Next Actions */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-accent" /> Your Next Actions
          </h3>
          <NextActionsInbox />
        </div>

        {/* D) Opportunities For You */}
        {trendsPreview.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-success" /> Opportunities
              </h3>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/trends")}>
                See all <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
              {trendsPreview.map((t, i) => (
                <Card
                  key={i}
                  className="min-w-[160px] p-3 cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] transition-all flex-shrink-0"
                  onClick={() => navigate("/trends")}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-success" />
                    <Badge variant="outline" className="text-[9px] text-success border-success/30">Rising</Badge>
                  </div>
                  <p className="text-sm font-bold truncate">{t.brand_or_item}</p>
                  <p className="text-[10px] text-muted-foreground">{t.category}</p>
                  {t.search_volume_change_7d !== null && (
                    <p className="text-[10px] text-success font-semibold mt-1">+{t.search_volume_change_7d}% this week</p>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

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
          {!loaded ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : recentReports.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <p className="text-xs sm:text-sm font-medium mb-1">No price checks yet</p>
              <p className="text-[10px] text-muted-foreground mb-4">Discover what your items are really worth</p>
              <Button size="sm" onClick={() => document.getElementById("tour-price-check")?.scrollIntoView({ behavior: "smooth" })}>
                <Search className="w-3.5 h-3.5 mr-1.5" /> Run Your First Price Check
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentReports.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 cursor-pointer transition-colors"
                  onClick={() => r.vinted_url ? navigate(`/price-check?url=${encodeURIComponent(r.vinted_url)}`) : navigate("/price-check")}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">{r.item_title || "Untitled Item"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {r.item_brand && <span className="text-[10px] text-muted-foreground">{r.item_brand}</span>}
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    {r.recommended_price !== null && (
                      <p className="font-display font-bold text-xs sm:text-sm">£{r.recommended_price.toFixed(2)}</p>
                    )}
                    {r.confidence_score !== null && (
                      <Badge variant="outline" className={`text-[9px] py-0 ${
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
      </div>

      {loaded && <GuidedTour />}
    </AppShellV2>
  );
}
