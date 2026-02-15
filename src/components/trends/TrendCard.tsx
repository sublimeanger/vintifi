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
  if (direction === "rising") return <TrendingUp className="w-4 h-4" />;
  if (direction === "declining") return <TrendingDown className="w-4 h-4" />;
  return <Minus className="w-4 h-4" />;
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

export default function TrendCard({ trend, index }: { trend: Trend; index: number }) {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Card className="p-5 hover:shadow-md transition-shadow h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-display font-bold text-sm">{trend.brand_or_item}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px]">{trend.category}</Badge>
              <Badge
                variant="outline"
                className={`text-[10px] capitalize ${getDirectionBg(trend.trend_direction)}`}
              >
                {getDirectionIcon(trend.trend_direction)}
                <span className="ml-1">{trend.trend_direction}</span>
              </Badge>
            </div>
          </div>
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
            <p className="text-sm font-bold">£{trend.avg_price?.toFixed(0)}</p>
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

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-border mt-auto">
          <Button
            variant="outline"
            size="sm"
            className="text-xs flex-1"
            onClick={() => navigate(`/price-check?brand=${encodeURIComponent(trend.brand_or_item)}&category=${encodeURIComponent(trend.category)}`)}
          >
            <Search className="w-3 h-3 mr-1" /> Price Check
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs flex-1"
            onClick={() => navigate(`/arbitrage?brand=${encodeURIComponent(trend.brand_or_item)}`)}
          >
            <ArrowRightLeft className="w-3 h-3 mr-1" /> Find Deals
          </Button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 mt-1">
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
  );
}
