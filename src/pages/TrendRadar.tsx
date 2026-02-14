import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus, Loader2, RefreshCw,
  Zap, Calendar, Target, ArrowUpRight, Clock, Flame, BarChart3,
} from "lucide-react";

type Trend = {
  id: string;
  brand_or_item: string;
  category: string;
  trend_direction: string;
  search_volume_change_7d: number | null;
  search_volume_change_30d: number | null;
  avg_price: number | null;
  price_change_30d: number | null;
  supply_demand_ratio: number | null;
  opportunity_score: number | null;
  ai_summary: string | null;
  estimated_peak_date: string | null;
  detected_at: string;
  updated_at: string;
};

const categories = [
  "All", "Womenswear", "Menswear", "Streetwear", "Vintage",
  "Designer", "Shoes", "Accessories", "Kids",
];

function getDirectionIcon(direction: string) {
  if (direction === "rising") return <TrendingUp className="w-4 h-4" />;
  if (direction === "declining") return <TrendingDown className="w-4 h-4" />;
  return <Minus className="w-4 h-4" />;
}

function getDirectionColor(direction: string) {
  if (direction === "rising") return "text-success";
  if (direction === "declining") return "text-destructive";
  return "text-accent";
}

function getDirectionBg(direction: string) {
  if (direction === "rising") return "bg-success/10 border-success/20";
  if (direction === "declining") return "bg-destructive/10 border-destructive/20";
  return "bg-accent/10 border-accent/20";
}

function getOpportunityColor(score: number | null) {
  if (!score) return "text-muted-foreground";
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-accent";
  if (score >= 40) return "text-orange-500";
  return "text-destructive";
}

function getOpportunityBg(score: number | null) {
  if (!score) return "bg-muted";
  if (score >= 80) return "bg-success/10";
  if (score >= 60) return "bg-accent/10";
  if (score >= 40) return "bg-orange-500/10";
  return "bg-destructive/10";
}

export default function TrendRadar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cached, setCached] = useState(false);

  const fetchTrends = async (forceRefresh = false) => {
    if (!user) return;
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("fetch-trends", {
        body: { category: selectedCategory === "All" ? "all" : selectedCategory },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setTrends((data?.trends as Trend[]) || []);
      setCached(data?.cached || false);
    } catch (e: any) {
      toast.error(e.message || "Failed to load trends");
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, [user, selectedCategory]);

  const risingCount = trends.filter((t) => t.trend_direction === "rising").length;
  const peakingCount = trends.filter((t) => t.trend_direction === "peaking").length;
  const decliningCount = trends.filter((t) => t.trend_direction === "declining").length;
  const avgOpportunity = trends.length > 0
    ? Math.round(trends.reduce((sum, t) => sum + (t.opportunity_score || 0), 0) / trends.length)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border glass sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display font-bold text-lg flex items-center gap-2">
              <Flame className="w-5 h-5 text-primary" />
              Trend Radar
            </h1>
            <p className="text-xs text-muted-foreground">
              {cached ? "Cached data" : "Fresh data"} · {trends.length} trends tracked
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTrends(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Rising", value: risingCount.toString(), icon: TrendingUp, color: "text-success" },
            { label: "Peaking", value: peakingCount.toString(), icon: Flame, color: "text-accent" },
            { label: "Declining", value: decliningCount.toString(), icon: TrendingDown, color: "text-destructive" },
            { label: "Avg Opportunity", value: `${avgOpportunity}`, icon: Target, color: getOpportunityColor(avgOpportunity) },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                  <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
                </div>
                <p className="font-display text-xl font-bold">{s.value}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              className="shrink-0 text-xs"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Trend Cards */}
        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Analysing market trends...</p>
          </div>
        ) : trends.length === 0 ? (
          <div className="text-center py-16">
            <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-display font-bold text-lg mb-2">No trends found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Try selecting a different category or refresh to generate fresh data.
            </p>
            <Button onClick={() => fetchTrends(true)} className="font-semibold">
              <RefreshCw className="w-4 h-4 mr-2" /> Generate Trends
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <AnimatePresence>
              {trends.map((trend, i) => (
                <motion.div
                  key={trend.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className="p-5 hover:shadow-md transition-shadow h-full flex flex-col">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display font-bold text-sm">
                          {trend.brand_or_item}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px]">
                            {trend.category}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-[10px] capitalize ${getDirectionBg(trend.trend_direction)}`}
                          >
                            {getDirectionIcon(trend.trend_direction)}
                            <span className="ml-1">{trend.trend_direction}</span>
                          </Badge>
                        </div>
                      </div>

                      {/* Opportunity Score */}
                      <div className={`w-12 h-12 rounded-xl ${getOpportunityBg(trend.opportunity_score)} flex flex-col items-center justify-center shrink-0`}>
                        <span className={`font-display text-lg font-extrabold leading-none ${getOpportunityColor(trend.opportunity_score)}`}>
                          {trend.opportunity_score}
                        </span>
                        <span className="text-[8px] text-muted-foreground leading-none mt-0.5">score</span>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground">7d Volume</p>
                        <p className={`text-sm font-bold ${(trend.search_volume_change_7d || 0) >= 0 ? "text-success" : "text-destructive"}`}>
                          {(trend.search_volume_change_7d || 0) >= 0 ? "+" : ""}
                          {trend.search_volume_change_7d?.toFixed(0)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Avg Price</p>
                        <p className="text-sm font-bold">
                          £{trend.avg_price?.toFixed(0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Price Δ 30d</p>
                        <p className={`text-sm font-bold ${(trend.price_change_30d || 0) >= 0 ? "text-success" : "text-destructive"}`}>
                          {(trend.price_change_30d || 0) >= 0 ? "+" : ""}
                          {trend.price_change_30d?.toFixed(0)}%
                        </p>
                      </div>
                    </div>

                    {/* AI Summary */}
                    {trend.ai_summary && (
                      <p className="text-xs text-muted-foreground mb-3 flex-1 leading-relaxed">
                        {trend.ai_summary}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border mt-auto">
                      {trend.estimated_peak_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Peak: {new Date(trend.estimated_peak_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      )}
                      {trend.supply_demand_ratio != null && (
                        <span className="flex items-center gap-1">
                          <BarChart3 className="w-3 h-3" />
                          S/D: {trend.supply_demand_ratio.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
