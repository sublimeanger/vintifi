import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Loader2, AlertTriangle, TrendingDown, Package,
  Layers, ExternalLink, RefreshCw, Trash2, Calendar, PoundSterling,
  ArrowRightLeft, BarChart3, Lightbulb, Target,
} from "lucide-react";
import { UseCaseSpotlight } from "@/components/UseCaseSpotlight";

type Recommendation = {
  listing_index: number;
  listing_title: string;
  listing_id: string | null;
  action: string;
  priority: string;
  suggested_price: number | null;
  current_price: number | null;
  purchase_price: number | null;
  days_listed: number;
  price_reduction_schedule: { week: number; price: number; reason: string }[] | null;
  bundle_with_indices: number[] | null;
  bundle_discount_percent: number | null;
  crosslist_platforms: string[] | null;
  reasoning: string;
  estimated_days_to_sell: number;
  opportunity_cost_note: string;
};

type Summary = {
  total_dead_stock_value: number;
  estimated_recovery_value: number;
  top_action: string;
  overview: string;
};

const actionConfig: Record<string, { icon: typeof TrendingDown; color: string; label: string }> = {
  price_reduction: { icon: TrendingDown, color: "text-accent", label: "Reduce Price" },
  bundle: { icon: Layers, color: "text-primary", label: "Bundle" },
  crosslist: { icon: ArrowRightLeft, color: "text-success", label: "Crosslist" },
  relist: { icon: RefreshCw, color: "text-chart-5", label: "Relist" },
  donate: { icon: Trash2, color: "text-destructive", label: "Donate/Dispose" },
};

const priorityStyles: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-accent/10 text-accent border-accent/20",
  low: "bg-muted text-muted-foreground border-border",
};

export default function DeadStock() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [thresholdDays, setThresholdDays] = useState(30);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  const handleAnalyze = async () => {
    if (!user) return;
    setLoading(true);
    setRecommendations([]);
    setSummary(null);

    try {
      const { data, error } = await supabase.functions.invoke("dead-stock-analyze", {
        body: { threshold_days: thresholdDays },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setRecommendations(data.recommendations || []);
      setSummary(data.summary || null);
      setHasAnalyzed(true);

      if ((data.recommendations || []).length === 0) {
        toast.success("No dead stock found! Your inventory is healthy 🎉");
      } else {
        toast.success(`Found ${data.recommendations.length} items needing attention`);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to analyse dead stock");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPrice = async (listingId: string, newPrice: number) => {
    const { error } = await supabase
      .from("listings")
      .update({ current_price: newPrice })
      .eq("id", listingId);

    if (error) {
      toast.error("Failed to update price");
    } else {
      toast.success(`Price updated to £${newPrice.toFixed(2)}`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <header className="border-b border-border glass sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display font-bold text-lg">Dead Stock Liquidation</h1>
            <p className="text-xs text-muted-foreground">
              AI-powered recommendations to move stale inventory
            </p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <UseCaseSpotlight
          featureKey="dead-stock"
          icon={AlertTriangle}
          scenario="You have 40 items that haven't sold in over a month, tying up £600 in capital..."
          description="Dead stock silently eats your profits. Without a plan, those items just sit there depreciating."
          outcome="Dead Stock Engine suggests a price reduction schedule, 5 bundle pairings, and 3 items to crosslist to Depop."
          tip="Run this monthly — even profitable sellers accumulate dead stock over time."
        />
        {/* Config & Run */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-bold mb-1">Analyse Stale Inventory</h3>
                  <p className="text-sm text-muted-foreground">
                    Scan your active listings and get AI recommendations for items that haven't sold. 
                    Includes price reduction schedules, bundle pairings, and crosslisting suggestions.
                  </p>
                </div>
              </div>

              <div className="mb-5">
                <label className="text-sm font-medium mb-2 block">
                  Stale threshold: <span className="text-primary font-bold">{thresholdDays} days</span>
                </label>
                <Slider
                  value={[thresholdDays]}
                  onValueChange={([v]) => setThresholdDays(v)}
                  min={7}
                  max={90}
                  step={1}
                  className="w-full max-w-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Items listed longer than this will be analysed
                </p>
              </div>

              <Button onClick={handleAnalyze} disabled={loading} className="font-semibold">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Analysing inventory...
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Analyse Dead Stock
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Summary */}
        {summary && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="mb-6 border-primary/20 bg-primary/[0.02]">
              <CardContent className="p-6">
                <h3 className="font-display font-bold mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  Liquidation Summary
                </h3>
                <p className="text-sm text-muted-foreground mb-4">{summary.overview}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Dead Stock Value</p>
                    <p className="font-display font-bold text-lg text-destructive">
                      £{(summary.total_dead_stock_value || 0).toFixed(0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Est. Recovery</p>
                    <p className="font-display font-bold text-lg text-success">
                      £{(summary.estimated_recovery_value || 0).toFixed(0)}
                    </p>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <p className="text-xs text-muted-foreground">Top Action</p>
                    <p className="font-display font-bold text-sm">{summary.top_action}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recommendations */}
        {hasAnalyzed && recommendations.length === 0 && !loading && (
          <Card className="p-8 text-center">
            <Package className="w-10 h-10 text-success mx-auto mb-3" />
            <h3 className="font-display font-bold mb-1">No Dead Stock Found</h3>
            <p className="text-sm text-muted-foreground">
              All your active listings are within the {thresholdDays}-day threshold. Great job!
            </p>
          </Card>
        )}

        <AnimatePresence>
          {recommendations.map((rec, i) => {
            const config = actionConfig[rec.action] || actionConfig.relist;
            const ActionIcon = config.icon;
            const isExpanded = expandedCard === i;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="mb-4"
              >
                <Card
                  className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setExpandedCard(isExpanded ? null : i)}
                >
                  <CardContent className="p-5">
                    {/* Header */}
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0`}>
                        <ActionIcon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-display font-bold text-sm truncate">{rec.listing_title}</h4>
                          <Badge variant="outline" className={`text-[10px] ${priorityStyles[rec.priority]}`}>
                            {rec.priority}
                          </Badge>
                          <Badge variant="outline" className={`text-[10px] ${config.color}`}>
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{rec.reasoning}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {rec.days_listed}d
                        </div>
                        {rec.current_price != null && (
                          <p className="text-sm font-display font-bold">£{rec.current_price.toFixed(2)}</p>
                        )}
                        {rec.suggested_price != null && rec.suggested_price !== rec.current_price && (
                          <p className="text-xs text-success font-medium">→ £{rec.suggested_price.toFixed(2)}</p>
                        )}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="mt-4 pt-4 border-t border-border space-y-4"
                      >
                        {/* Price Reduction Schedule */}
                        {rec.price_reduction_schedule && rec.price_reduction_schedule.length > 0 && (
                          <div>
                            <h5 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                              <TrendingDown className="w-3 h-3" /> Price Reduction Schedule
                            </h5>
                            <div className="space-y-2">
                              {rec.price_reduction_schedule.map((step, si) => (
                                <div key={si} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                                  <span className="text-xs font-bold text-muted-foreground w-16">Week {step.week}</span>
                                  <span className="font-display font-bold text-sm">£{step.price.toFixed(2)}</span>
                                  <span className="text-xs text-muted-foreground flex-1">{step.reason}</span>
                                  {rec.listing_id && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-7"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleApplyPrice(rec.listing_id!, step.price);
                                      }}
                                    >
                                      Apply
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Bundle Suggestions */}
                        {rec.bundle_with_indices && rec.bundle_with_indices.length > 0 && (
                          <div>
                            <h5 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                              <Layers className="w-3 h-3" /> Bundle Pairing
                            </h5>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-sm mb-1">
                                Bundle with:{" "}
                                {rec.bundle_with_indices.map((idx) => {
                                  const other = recommendations.find((r) => r.listing_index === idx);
                                  return other?.listing_title || `Item #${idx}`;
                                }).join(", ")}
                              </p>
                              {rec.bundle_discount_percent != null && (
                                <Badge variant="outline" className="text-[10px] text-success border-success/20">
                                  {rec.bundle_discount_percent}% bundle discount suggested
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Crosslist Platforms */}
                        {rec.crosslist_platforms && rec.crosslist_platforms.length > 0 && (
                          <div>
                            <h5 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                              <ExternalLink className="w-3 h-3" /> Crosslist To
                            </h5>
                            <div className="flex gap-2 flex-wrap">
                              {rec.crosslist_platforms.map((p) => (
                                <Badge key={p} variant="secondary" className="text-xs">
                                  {p}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Opportunity Cost */}
                        {rec.opportunity_cost_note && (
                          <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/5 border border-accent/10">
                            <Lightbulb className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium">Opportunity Cost</p>
                              <p className="text-xs text-muted-foreground">{rec.opportunity_cost_note}</p>
                            </div>
                          </div>
                        )}

                        {/* Est. days to sell */}
                        {rec.estimated_days_to_sell > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Estimated ~{rec.estimated_days_to_sell} days to sell after taking action
                          </p>
                        )}

                        {/* Action Links */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {rec.listing_id && rec.action === "price_reduction" && rec.suggested_price != null && (
                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); handleApplyPrice(rec.listing_id!, rec.suggested_price!); }}>
                              Apply £{rec.suggested_price.toFixed(0)}
                            </Button>
                          )}
                          {rec.action === "relist" && (
                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); navigate("/relist"); }}>
                              <RefreshCw className="w-3 h-3 mr-1" /> Relist Scheduler
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); navigate(`/price-check?brand=${encodeURIComponent(rec.listing_title.split(" ")[0])}`); }}>
                            Price Check
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <MobileBottomNav />
    </div>
  );
}
