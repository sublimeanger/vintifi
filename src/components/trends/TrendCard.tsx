import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus, Calendar, BarChart3, Search, ArrowRightLeft } from "lucide-react";

type Trend = {
  id: string;
  brand_or_item: string;
  category: string;
  trend_direction: string;
  search_volume_change_7d: number | null;
  avg_price: number | null;
  price_change_30d: number | null;
  supply_demand_ratio: number | null;
  opportunity_score: number | null;
  ai_summary: string | null;
  estimated_peak_date: string | null;
};

function getDirectionIcon(direction: string) {
  if (direction === "rising") return <TrendingUp className="w-3.5 h-3.5" />;
  if (direction === "declining") return <TrendingDown className="w-3.5 h-3.5" />;
  return <Minus className="w-3.5 h-3.5" />;
}

function getDirectionBadgeClass(direction: string) {
  if (direction === "rising") return "bg-success/10 text-success border-success/20";
  if (direction === "declining") return "bg-destructive/10 text-destructive border-destructive/20";
  return "bg-accent/10 text-accent border-accent/20";
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

export default function TrendCard({ trend, index }: { trend: Trend; index: number }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Card className="p-3.5 sm:p-5 hover:shadow-md active:scale-[0.99] transition-all h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-display font-bold text-sm leading-snug">{trend.brand_or_item}</h3>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] py-0">{trend.category}</Badge>
              <Badge
                variant="outline"
                className={`text-[10px] py-0 capitalize gap-0.5 ${getDirectionBadgeClass(trend.trend_direction)}`}
              >
                {getDirectionIcon(trend.trend_direction)}
                {trend.trend_direction}
              </Badge>
            </div>
          </div>
          <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl ${getOpportunityBg(trend.opportunity_score)} flex flex-col items-center justify-center shrink-0`}>
            <span className={`font-display text-base sm:text-lg font-extrabold leading-none ${getOpportunityColor(trend.opportunity_score)}`}>
              {trend.opportunity_score}
            </span>
            <span className="text-[7px] sm:text-[8px] text-muted-foreground leading-none mt-0.5">score</span>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3">
          <div className="p-2 rounded-lg bg-muted/40">
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">7d Volume</p>
            <p className={`text-xs sm:text-sm font-bold ${(trend.search_volume_change_7d || 0) >= 0 ? "text-success" : "text-destructive"}`}>
              {(trend.search_volume_change_7d || 0) >= 0 ? "+" : ""}
              {trend.search_volume_change_7d?.toFixed(0)}%
            </p>
          </div>
          <div className="p-2 rounded-lg bg-muted/40">
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">Avg Price</p>
            <p className="text-xs sm:text-sm font-bold">£{trend.avg_price?.toFixed(0)}</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/40">
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">Price Δ 30d</p>
            <p className={`text-xs sm:text-sm font-bold ${(trend.price_change_30d || 0) >= 0 ? "text-success" : "text-destructive"}`}>
              {(trend.price_change_30d || 0) >= 0 ? "+" : ""}
              {trend.price_change_30d?.toFixed(0)}%
            </p>
          </div>
        </div>

        {/* AI Summary */}
        {trend.ai_summary && (
          <p className="text-[11px] sm:text-xs text-muted-foreground mb-3 flex-1 leading-relaxed line-clamp-3">
            {trend.ai_summary}
          </p>
        )}

        {/* Footer meta */}
        <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-muted-foreground mb-2">
          {trend.estimated_peak_date && (
            <span className="flex items-center gap-0.5">
              <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              Peak: {new Date(trend.estimated_peak_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
          )}
          {trend.supply_demand_ratio != null && (
            <span className="flex items-center gap-0.5">
              <BarChart3 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              S/D: {trend.supply_demand_ratio.toFixed(1)}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 sm:gap-2 pt-2 border-t border-border mt-auto">
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] sm:text-xs flex-1 h-9 active:scale-95 transition-transform"
            onClick={() => navigate(`/price-check?brand=${encodeURIComponent(trend.brand_or_item)}&category=${encodeURIComponent(trend.category)}`)}
          >
            <Search className="w-3 h-3 mr-1" /> Price Check
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] sm:text-xs flex-1 h-9 active:scale-95 transition-transform"
            onClick={() => navigate(`/arbitrage?brand=${encodeURIComponent(trend.brand_or_item)}`)}
          >
            <ArrowRightLeft className="w-3 h-3 mr-1" /> Find Deals
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
