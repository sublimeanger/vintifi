import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Loader2, TrendingDown, RefreshCw,
  CheckCircle2, DollarSign, Target, ArrowUpRight,
  ArrowDownRight, BarChart3, Filter,
} from "lucide-react";
import { UseCaseSpotlight } from "@/components/UseCaseSpotlight";

type ListingInfo = {
  title: string;
  brand: string | null;
  category: string | null;
  current_price: number | null;
  purchase_price: number | null;
  days_listed: number;
  views_count: number | null;
  favourites_count: number | null;
};

type Recommendation = {
  listing_id: string;
  classification: "OVERPRICED" | "UNDERPRICED" | "STALE" | "WELL_PRICED";
  suggested_price: number | null;
  confidence: number;
  reason: string;
  action: string;
  priority: string;
  listing: ListingInfo | null;
};

type Summary = {
  total_items: number;
  overpriced_count: number;
  underpriced_count: number;
  stale_count: number;
  well_priced_count: number;
  estimated_revenue_gain: number;
  portfolio_health_score: number;
};

const classificationConfig: Record<string, { icon: typeof TrendingDown; label: string; color: string; bgColor: string }> = {
  OVERPRICED: { icon: ArrowDownRight, label: "Overpriced", color: "text-destructive", bgColor: "bg-destructive/10 border-destructive/20" },
  UNDERPRICED: { icon: ArrowUpRight, label: "Underpriced", color: "text-success", bgColor: "bg-success/10 border-success/20" },
  STALE: { icon: RefreshCw, label: "Stale", color: "text-accent", bgColor: "bg-accent/10 border-accent/20" },
  WELL_PRICED: { icon: CheckCircle2, label: "Well Priced", color: "text-muted-foreground", bgColor: "bg-muted border-border" },
};

const actionLabels: Record<string, string> = {
  reduce_price: "Reduce Price",
  increase_price: "Increase Price",
  relist: "Relist",
  bundle: "Bundle",
  keep: "Keep As-Is",
};

export default function PortfolioOptimizer() {
  const { session } = useAuth();
  const [analyzing, setAnalyzing] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [filter, setFilter] = useState<string>("all");

  const handleAnalyze = async () => {
    if (!session) return;
    setAnalyzing(true);
    setSummary(null);
    setRecommendations([]);

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portfolio-optimizer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });

      if (res.status === 429) {
        toast.error("Rate limited — try again shortly");
        setAnalyzing(false);
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      setSummary(data.summary);
      setRecommendations(data.recommendations || []);
      toast.success(`Analysed ${data.summary.total_items} listings`);
    } catch (e: any) {
      toast.error(e.message || "Failed to analyse portfolio");
    }
    setAnalyzing(false);
  };

  const handleApplyPrice = async (listingId: string, newPrice: number) => {
    const { error } = await supabase
      .from("listings")
      .update({ current_price: newPrice })
      .eq("id", listingId);

    if (error) {
      toast.error("Failed to update price");
    } else {
      toast.success("Price updated!");
      setRecommendations(prev =>
        prev.map(r =>
          r.listing_id === listingId
            ? { ...r, listing: r.listing ? { ...r.listing, current_price: newPrice } : null, classification: "WELL_PRICED" as const, action: "keep" }
            : r
        )
      );
    }
  };

  const filtered = filter === "all"
    ? recommendations
    : recommendations.filter(r => r.classification === filter);

  const actionableCount = recommendations.filter(r => r.classification !== "WELL_PRICED").length;

  return (
    <PageShell
      title="Portfolio Optimiser"
      subtitle="Bulk-analyse pricing across all active listings"
      icon={<Target className="w-5 h-5 text-primary" />}
      maxWidth="max-w-4xl"
      actions={
        <Button onClick={handleAnalyze} disabled={analyzing} className="font-semibold active:scale-95 transition-transform" size="sm">
          {analyzing ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Zap className="w-4 h-4 mr-1.5" />}
          <span className="hidden sm:inline">{analyzing ? "Analysing..." : "Analyse Portfolio"}</span>
          <span className="sm:hidden">{analyzing ? "..." : "Analyse"}</span>
        </Button>
      }
    >
      <UseCaseSpotlight
        featureKey="portfolio-optimizer"
        icon={Target}
        scenario="You have 200 active listings and suspect many are mispriced, but checking each one takes hours..."
        description="Mispriced listings cost you money in two ways: overpriced items don't sell, underpriced items leave profit on the table."
        outcome="Portfolio Optimiser scans everything in one click: 12 items overpriced, 3 underpriced, 8 need relisting. One-tap fixes."
        tip="Run this weekly to keep your portfolio in top shape."
      />

      {summary ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Health Score */}
          <Card className="p-4 sm:p-6 mb-4 sm:mb-6 border-primary/20">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div>
                <h3 className="font-display font-bold text-sm sm:text-lg flex items-center gap-2">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  Portfolio Health
                </h3>
                <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                  {actionableCount} of {summary.total_items} need attention
                </p>
              </div>
              <div className="text-right">
                <p className={`font-display text-3xl sm:text-4xl font-extrabold ${
                  summary.portfolio_health_score >= 80 ? "text-success" :
                  summary.portfolio_health_score >= 60 ? "text-accent" :
                  "text-destructive"
                }`}>
                  {summary.portfolio_health_score}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">/ 100</p>
              </div>
            </div>
            <Progress value={summary.portfolio_health_score} className="h-1.5 sm:h-2" />
          </Card>

          {/* Metric Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
            {[
              { label: "Overpriced", value: summary.overpriced_count, icon: ArrowDownRight, color: "text-destructive" },
              { label: "Underpriced", value: summary.underpriced_count, icon: ArrowUpRight, color: "text-success" },
              { label: "Stale", value: summary.stale_count, icon: RefreshCw, color: "text-accent" },
              { label: "Est. Gain", value: `£${summary.estimated_revenue_gain.toFixed(0)}`, icon: DollarSign, color: "text-primary" },
            ].map((m, i) => (
              <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="p-3 sm:p-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                    <m.icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${m.color}`} />
                    <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">{m.label}</span>
                  </div>
                  <p className="font-display text-lg sm:text-xl font-bold">{m.value}</p>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 overflow-x-auto pb-2 scrollbar-hide">
            <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
            {[
              { key: "all", label: "All" },
              { key: "OVERPRICED", label: "Overpriced" },
              { key: "UNDERPRICED", label: "Underpriced" },
              { key: "STALE", label: "Stale" },
              { key: "WELL_PRICED", label: "Well Priced" },
            ].map(f => (
              <Button
                key={f.key}
                variant={filter === f.key ? "default" : "outline"}
                size="sm"
                className="text-[10px] sm:text-xs h-7 sm:h-8 px-2.5 sm:px-3 shrink-0 active:scale-95 transition-transform"
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                {f.key !== "all" && (
                  <span className="ml-1 opacity-70">
                    ({recommendations.filter(r => r.classification === f.key).length})
                  </span>
                )}
              </Button>
            ))}
          </div>

          {/* Recommendations */}
          <div className="space-y-2 sm:space-y-3">
            <AnimatePresence>
              {filtered.map((r, i) => {
                const config = classificationConfig[r.classification] || classificationConfig.WELL_PRICED;
                const Icon = config.icon;
                const priceDiff = r.suggested_price && r.listing?.current_price
                  ? r.suggested_price - r.listing.current_price
                  : null;

                return (
                  <motion.div
                    key={r.listing_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card className={`p-3 sm:p-4 active:scale-[0.99] transition-all ${config.bgColor}`}>
                      <div className="flex items-start gap-2.5 sm:gap-3">
                        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 ${config.color} bg-background/50`}>
                          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 flex-wrap">
                            <p className="text-xs sm:text-sm font-semibold truncate">{r.listing?.title || "Unknown"}</p>
                            {r.listing?.brand && (
                              <Badge variant="outline" className="text-[10px] shrink-0 px-1.5 py-0">{r.listing.brand}</Badge>
                            )}
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.color}`}>
                              {config.label}
                            </Badge>
                            {r.priority === "high" && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-destructive/10 text-destructive border-destructive/30">
                                High
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2 line-clamp-2">{r.reason}</p>
                          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            {r.listing?.current_price != null && (
                              <span className="text-[10px] sm:text-xs font-medium">
                                Current: £{r.listing.current_price.toFixed(0)}
                              </span>
                            )}
                            {r.suggested_price != null && priceDiff !== null && (
                              <span className="text-[10px] sm:text-xs font-medium">
                                → <span className={`font-bold ${priceDiff > 0 ? "text-success" : "text-primary"}`}>
                                  £{r.suggested_price.toFixed(0)}
                                </span>
                                <span className="text-muted-foreground ml-1">
                                  ({priceDiff > 0 ? "+" : ""}{priceDiff.toFixed(0)})
                                </span>
                              </span>
                            )}
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {actionLabels[r.action] || r.action}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {r.confidence}%
                            </span>
                          </div>
                        </div>
                        {r.suggested_price != null && r.action !== "keep" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0 text-[10px] sm:text-xs font-semibold h-7 sm:h-8 px-2.5 sm:px-3 active:scale-95 transition-transform"
                            onClick={() => handleApplyPrice(r.listing_id, r.suggested_price!)}
                          >
                            Apply
                          </Button>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      ) : (
        <Card className="p-8 sm:p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-7 h-7 text-muted-foreground/40" />
          </div>
          <h3 className="font-display font-bold text-base sm:text-lg mb-1.5 sm:mb-2">Analyse Your Portfolio</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mb-5 sm:mb-6 max-w-md mx-auto">
            AI will scan all active listings and identify overpriced, underpriced, and stale items with one-click fixes
          </p>
          <Button onClick={handleAnalyze} disabled={analyzing} size="lg" className="h-11 sm:h-10 active:scale-95 transition-transform">
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
            {analyzing ? "Analysing..." : "Analyse Portfolio"}
          </Button>
        </Card>
      )}
    </PageShell>
  );
}
