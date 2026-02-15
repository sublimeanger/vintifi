import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Zap, Loader2, TrendingUp, TrendingDown, RefreshCw,
  AlertTriangle, CheckCircle2, DollarSign, Target, ArrowUpRight,
  ArrowDownRight, Layers, BarChart3, Filter,
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
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <header className="border-b border-border glass sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display font-bold text-lg">Portfolio Optimiser</h1>
            <p className="text-xs text-muted-foreground">
              Bulk-analyse pricing across all active listings
            </p>
          </div>
          <Button onClick={handleAnalyze} disabled={analyzing} className="font-semibold" size="sm">
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
            {analyzing ? "Analysing..." : "Analyse Portfolio"}
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <UseCaseSpotlight
          featureKey="portfolio-optimizer"
          icon={Target}
          scenario="You have 200 active listings and suspect many are mispriced, but checking each one takes hours..."
          description="Mispriced listings cost you money in two ways: overpriced items don't sell, underpriced items leave profit on the table."
          outcome="Portfolio Optimiser scans everything in one click: 12 items overpriced, 3 underpriced, 8 need relisting. One-tap fixes."
          tip="Run this weekly to keep your portfolio in top shape."
        />
        {/* Summary Cards */}
        {summary ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Health Score */}
            <Card className="p-6 mb-6 border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display font-bold text-lg flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Portfolio Health Score
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {actionableCount} of {summary.total_items} listings need attention
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-display text-4xl font-extrabold ${
                    summary.portfolio_health_score >= 80 ? "text-success" :
                    summary.portfolio_health_score >= 60 ? "text-accent" :
                    "text-destructive"
                  }`}>
                    {summary.portfolio_health_score}
                  </p>
                  <p className="text-xs text-muted-foreground">/ 100</p>
                </div>
              </div>
              <Progress value={summary.portfolio_health_score} className="h-2" />
            </Card>

            {/* Metric Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Overpriced", value: summary.overpriced_count, icon: ArrowDownRight, color: "text-destructive" },
                { label: "Underpriced", value: summary.underpriced_count, icon: ArrowUpRight, color: "text-success" },
                { label: "Stale", value: summary.stale_count, icon: RefreshCw, color: "text-accent" },
                { label: "Est. Revenue Gain", value: `£${summary.estimated_revenue_gain.toFixed(0)}`, icon: DollarSign, color: "text-primary" },
              ].map((m, i) => (
                <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <m.icon className={`w-3.5 h-3.5 ${m.color}`} />
                      <span className="text-xs text-muted-foreground font-medium">{m.label}</span>
                    </div>
                    <p className="font-display text-xl font-bold">{m.value}</p>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
              <Filter className="w-4 h-4 text-muted-foreground" />
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
                  className="text-xs"
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                  {f.key !== "all" && (
                    <span className="ml-1 opacity-70">
                      ({recommendations.filter(r => f.key === "all" || r.classification === f.key).length})
                    </span>
                  )}
                </Button>
              ))}
            </div>

            {/* Recommendations */}
            <div className="space-y-3">
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
                      <Card className={`p-4 ${config.bgColor}`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${config.color} bg-background/50`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <p className="text-sm font-semibold truncate">{r.listing?.title || "Unknown"}</p>
                              {r.listing?.brand && (
                                <Badge variant="outline" className="text-[10px] shrink-0">{r.listing.brand}</Badge>
                              )}
                              <Badge variant="outline" className={`text-[10px] ${config.color}`}>
                                {config.label}
                              </Badge>
                              {r.priority === "high" && (
                                <Badge className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">
                                  High Priority
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{r.reason}</p>
                            <div className="flex items-center gap-3 flex-wrap">
                              {r.listing?.current_price != null && (
                                <span className="text-xs font-medium">
                                  Current: £{r.listing.current_price.toFixed(0)}
                                </span>
                              )}
                              {r.suggested_price != null && priceDiff !== null && (
                                <span className="text-xs font-medium">
                                  → <span className={`font-bold ${priceDiff > 0 ? "text-success" : "text-primary"}`}>
                                    £{r.suggested_price.toFixed(0)}
                                  </span>
                                  <span className="text-muted-foreground ml-1">
                                    ({priceDiff > 0 ? "+" : ""}{priceDiff.toFixed(0)})
                                  </span>
                                </span>
                              )}
                              <Badge variant="outline" className="text-[10px]">
                                {actionLabels[r.action] || r.action}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {r.confidence}% confidence
                              </span>
                            </div>
                          </div>
                          {r.suggested_price != null && r.action !== "keep" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 text-xs font-semibold"
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
          <Card className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-display font-bold text-lg mb-2">Analyse Your Portfolio</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              AI will scan all your active listings and identify overpriced, underpriced, and stale items with one-click fixes
            </p>
            <Button onClick={handleAnalyze} disabled={analyzing} size="lg">
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
              {analyzing ? "Analysing..." : "Analyse Portfolio"}
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
