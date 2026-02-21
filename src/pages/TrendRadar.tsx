import { useState, useEffect } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FeatureGate } from "@/components/FeatureGate";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Minus, Flame, Search,
  ArrowRight, Calendar, Zap, AlertTriangle, Sparkles,
} from "lucide-react";

type Trend = {
  id: string;
  brand_or_item: string;
  category: string;
  trend_direction: string;
  opportunity_score: number | null;
  search_volume_change_7d: number | null;
  search_volume_change_30d: number | null;
  avg_price: number | null;
  price_change_30d: number | null;
  supply_demand_ratio: number | null;
  estimated_peak_date: string | null;
  ai_summary: string | null;
  detected_at: string;
};

const CATEGORIES = ["All", "Womenswear", "Menswear", "Streetwear", "Vintage", "Designer", "Shoes", "Kids", "Accessories"];
const DIRECTIONS = ["All", "rising", "peaking", "declining"];

function getOpportunityStyle(score: number | null) {
  if (!score) return { bg: "bg-muted/40 border-border", text: "text-muted-foreground" };
  if (score >= 80) return { bg: "bg-success/15 border-success/30", text: "text-success" };
  if (score >= 50) return { bg: "bg-warning/15 border-warning/30", text: "text-warning" };
  return { bg: "bg-destructive/10 border-destructive/20", text: "text-destructive" };
}

function getSaturationLabel(ratio: number | null): { label: string; color: string } {
  if (ratio === null) return { label: "Unknown", color: "text-muted-foreground" };
  if (ratio < 0.5) return { label: "Scarce Opportunity", color: "text-success" };
  if (ratio < 1.5) return { label: "Balanced", color: "text-primary" };
  if (ratio < 3) return { label: "Competitive", color: "text-warning" };
  return { label: "Crowded", color: "text-destructive" };
}

function DirectionIcon({ direction }: { direction: string }) {
  if (direction === "rising") return <TrendingUp className="w-4 h-4 text-success" />;
  if (direction === "peaking") return <Flame className="w-4 h-4 text-warning" />;
  if (direction === "declining") return <TrendingDown className="w-4 h-4 text-destructive" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

function TrendCard({ trend, expanded, onToggle }: { trend: Trend; expanded: boolean; onToggle: () => void }) {
  const navigate = useNavigate();
  const oppStyle = getOpportunityStyle(trend.opportunity_score);
  const saturation = getSaturationLabel(trend.supply_demand_ratio);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <Card className="overflow-hidden">
        <div className="p-4">
          {/* Top row */}
          <div className="flex items-start gap-3 mb-3">
            {/* Opportunity score badge */}
            <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 font-display font-extrabold text-sm ${oppStyle.bg} ${oppStyle.text}`}>
              {trend.opportunity_score ?? "–"}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                <h3 className="font-display font-bold text-sm sm:text-base leading-tight">{trend.brand_or_item}</h3>
                <DirectionIcon direction={trend.trend_direction} />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className="text-[10px] py-0 h-4">{trend.category}</Badge>
                <span className={`text-[10px] font-semibold ${saturation.color}`}>{saturation.label}</span>
              </div>
            </div>

            {/* Direction label */}
            <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg shrink-0 ${
              trend.trend_direction === "rising" ? "bg-success/10 text-success" :
              trend.trend_direction === "peaking" ? "bg-warning/10 text-warning" :
              trend.trend_direction === "declining" ? "bg-destructive/10 text-destructive" :
              "bg-muted text-muted-foreground"
            }`}>
              {trend.trend_direction === "peaking" ? "At Peak" : trend.trend_direction}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">7d change</p>
              <p className={`font-display font-bold text-sm ${(trend.search_volume_change_7d ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>
                {trend.search_volume_change_7d != null ? `${trend.search_volume_change_7d > 0 ? "+" : ""}${trend.search_volume_change_7d.toFixed(0)}%` : "—"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Avg Price</p>
              <p className="font-display font-bold text-sm text-foreground">
                {trend.avg_price != null ? `£${trend.avg_price.toFixed(0)}` : "—"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">30d change</p>
              <p className={`font-display font-bold text-sm ${(trend.search_volume_change_30d ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>
                {trend.search_volume_change_30d != null ? `${trend.search_volume_change_30d > 0 ? "+" : ""}${trend.search_volume_change_30d.toFixed(0)}%` : "—"}
              </p>
            </div>
          </div>

          {/* Peak date */}
          {trend.estimated_peak_date && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-2">
              <Calendar className="w-3 h-3" />
              <span>Peaks ~{new Date(trend.estimated_peak_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</span>
            </div>
          )}

          {/* AI Summary (truncated/expandable) */}
          {trend.ai_summary && (
            <div className="mb-3">
              <p className={`text-xs text-muted-foreground leading-relaxed ${!expanded ? "line-clamp-2" : ""}`}>
                {trend.ai_summary}
              </p>
              {trend.ai_summary.length > 100 && (
                <button onClick={onToggle} className="text-[10px] text-primary font-semibold hover:underline mt-0.5">
                  {expanded ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-9 text-xs font-semibold active:scale-95 transition-transform"
              onClick={() => {
                const params = new URLSearchParams({ brand: trend.brand_or_item, category: trend.category });
                navigate(`/price-check?${params.toString()}`);
              }}
            >
              <Search className="w-3.5 h-3.5 mr-1.5" />
              I have this
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-9 text-xs active:scale-95 transition-transform px-3"
              onClick={() => {
                const params = new URLSearchParams({ brand: trend.brand_or_item, category: trend.category });
                navigate(`/optimize?${params.toString()}`);
              }}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Optimise
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function HotStripCard({ trend }: { trend: Trend }) {
  const navigate = useNavigate();
  const oppStyle = getOpportunityStyle(trend.opportunity_score);
  return (
    <button
      onClick={() => navigate(`/price-check?brand=${encodeURIComponent(trend.brand_or_item)}&category=${encodeURIComponent(trend.category)}`)}
      className="shrink-0 w-40 rounded-xl border bg-card p-3 text-left active:scale-95 transition-transform hover:border-primary/30"
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-display font-extrabold text-xs ${oppStyle.bg} ${oppStyle.text}`}>
          {trend.opportunity_score ?? "–"}
        </div>
        <DirectionIcon direction={trend.trend_direction} />
      </div>
      <p className="font-display font-bold text-xs leading-tight truncate">{trend.brand_or_item}</p>
      <p className="text-[9px] text-muted-foreground mt-0.5">{trend.category}</p>
      {trend.search_volume_change_7d != null && (
        <p className={`text-[10px] font-bold mt-1 ${trend.search_volume_change_7d >= 0 ? "text-success" : "text-destructive"}`}>
          {trend.search_volume_change_7d > 0 ? "+" : ""}{trend.search_volume_change_7d.toFixed(0)}% this week
        </p>
      )}
    </button>
  );
}

export default function TrendRadar() {
  usePageMeta("Trend Radar — Vintifi", "Real-time market intelligence for resellers");
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [direction, setDirection] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("trends")
      .select("*")
      .order("opportunity_score", { ascending: false })
      .then(({ data }) => {
        setTrends((data ?? []) as Trend[]);
        setLoading(false);
      });
  }, []);

  const filtered = trends.filter((t) => {
    if (category !== "All" && t.category !== category) return false;
    if (direction !== "All" && t.trend_direction !== direction) return false;
    return true;
  });

  const hotTrends = trends.slice(0, 6);
  const freeTrends = filtered.slice(0, 5);
  const lockedTrends = filtered.slice(5);

  // Category heat map
  const categoryHeat = CATEGORIES.filter((c) => c !== "All").map((cat) => {
    const catTrends = trends.filter((t) => t.category === cat);
    const rising = catTrends.filter((t) => t.trend_direction === "rising").length;
    const declining = catTrends.filter((t) => t.trend_direction === "declining").length;
    const topScore = catTrends[0]?.opportunity_score ?? 0;
    return { cat, rising, declining, total: catTrends.length, topScore };
  });

  return (
    <PageShell title="Trend Radar" subtitle="Real-time market intelligence" maxWidth="max-w-4xl">
      {/* ── Empty state ── */}
      {trends.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="w-7 h-7 text-primary/60" />
          </div>
          <p className="text-sm font-semibold text-foreground">No trends yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            Trends update daily based on real Vinted search data. Check back tomorrow for fresh insights.
          </p>
        </div>
      )}

      {/* ── Hot Right Now Strip ── */}
      {!loading && hotTrends.length > 0 && (
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-2 mb-2.5">
            <Flame className="w-4 h-4 text-primary" />
            <h2 className="font-display font-bold text-sm">Hot Right Now</h2>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3">
            {hotTrends.map((t) => <HotStripCard key={t.id} trend={t} />)}
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="space-y-2 mb-4">
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all active:scale-95 border ${
                category === cat ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {DIRECTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all active:scale-95 border capitalize ${
                direction === d ? "bg-foreground text-background border-foreground" : "bg-background border-border text-muted-foreground hover:border-foreground/40"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* ── Trend Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-48 animate-pulse bg-muted/30" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No trends match your filters.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Free tier: first 5 visible */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {freeTrends.map((t) => (
              <TrendCard
                key={t.id}
                trend={t}
                expanded={expandedId === t.id}
                onToggle={() => setExpandedId(expandedId === t.id ? null : t.id)}
              />
            ))}
          </div>

          {/* Pro+ gated rest */}
          {lockedTrends.length > 0 && (
            <FeatureGate feature="trend_radar_full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lockedTrends.map((t) => (
                  <TrendCard
                    key={t.id}
                    trend={t}
                    expanded={expandedId === t.id}
                    onToggle={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  />
                ))}
              </div>
            </FeatureGate>
          )}
        </div>
      )}

      {/* ── Category Heat Map ── */}
      {!loading && categoryHeat.some((c) => c.total > 0) && (
        <div className="mt-6">
          <h2 className="font-display font-bold text-sm mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Category Heat Map
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {categoryHeat.filter((c) => c.total > 0).map(({ cat, rising, declining, total, topScore }) => {
              const heat = rising / Math.max(total, 1);
              const style = heat > 0.6 ? "border-success/30 bg-success/5" : heat > 0.3 ? "border-warning/30 bg-warning/5" : "border-border bg-muted/20";
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`rounded-xl border p-3 text-left active:scale-95 transition-all hover:border-primary/30 ${style} ${category === cat ? "ring-2 ring-primary/30" : ""}`}
                >
                  <p className="font-display font-bold text-xs mb-1 truncate">{cat}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {rising > 0 && (
                      <span className="text-[9px] text-success font-semibold">↑{rising} rising</span>
                    )}
                    {declining > 0 && (
                      <span className="text-[9px] text-destructive font-semibold">↓{declining} falling</span>
                    )}
                  </div>
                  {topScore > 0 && (
                    <p className="text-[9px] text-muted-foreground mt-1">Top score: {topScore}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </PageShell>
  );
}
