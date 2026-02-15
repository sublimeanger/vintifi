import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  AlertTriangle, TrendingUp, Target, Package, ChevronRight, Flame, Clock,
} from "lucide-react";

type AttentionCard = {
  icon: typeof AlertTriangle;
  label: string;
  value: string;
  description: string;
  path: string;
  color: string;
  bg: string;
  border: string;
};

type TrendItem = {
  id: string;
  brand_or_item: string;
  category: string;
  trend_direction: string;
  search_volume_change_7d: number | null;
  opportunity_score: number | null;
  avg_price: number | null;
};

export function DashboardIntelligence() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [staleCount, setStaleCount] = useState(0);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [pendingRelists, setPendingRelists] = useState(0);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchIntelligence = async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [staleRes, watchlistRes, relistRes, trendsRes] = await Promise.all([
        // Stale items: active listings older than 30 days
        supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "active")
          .lte("created_at", thirtyDaysAgo.toISOString()),
        // Watchlist / sourcing items
        supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "watchlist"),
        // Pending relists
        supabase
          .from("relist_schedules")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "pending"),
        // Top rising trends
        supabase
          .from("trends")
          .select("id, brand_or_item, category, trend_direction, search_volume_change_7d, opportunity_score, avg_price")
          .eq("trend_direction", "rising")
          .order("opportunity_score", { ascending: false })
          .limit(8),
      ]);

      setStaleCount(staleRes.count || 0);
      setWatchlistCount(watchlistRes.count || 0);
      setPendingRelists(relistRes.count || 0);
      setTrends((trendsRes.data as TrendItem[]) || []);
      setLoading(false);
    };

    fetchIntelligence();
  }, [user]);

  if (loading) return null;

  const attentionCards: AttentionCard[] = [];

  if (staleCount > 0) {
    attentionCards.push({
      icon: AlertTriangle,
      label: "Stale Listings",
      value: `${staleCount}`,
      description: `${staleCount} item${staleCount > 1 ? "s" : ""} listed 30+ days — consider relisting or reducing price`,
      path: "/dead-stock",
      color: "text-destructive",
      bg: "bg-destructive/10",
      border: "border-destructive/20",
    });
  }

  if (pendingRelists > 0) {
    attentionCards.push({
      icon: Clock,
      label: "Pending Relists",
      value: `${pendingRelists}`,
      description: `${pendingRelists} relist${pendingRelists > 1 ? "s" : ""} scheduled — review and execute`,
      path: "/relist",
      color: "text-accent",
      bg: "bg-accent/10",
      border: "border-accent/20",
    });
  }

  if (watchlistCount > 0) {
    attentionCards.push({
      icon: Package,
      label: "Sourcing List",
      value: `${watchlistCount}`,
      description: `${watchlistCount} item${watchlistCount > 1 ? "s" : ""} saved to source — ready to buy and list`,
      path: "/listings?status=watchlist",
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/20",
    });
  }

  // Always show portfolio optimiser suggestion if there are any active listings
  attentionCards.push({
    icon: Target,
    label: "Portfolio Health",
    value: "Check",
    description: "Run the AI optimiser to find underpriced and overpriced listings",
    path: "/portfolio",
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/20",
  });

  const hasContent = attentionCards.length > 0 || trends.length > 0;
  if (!hasContent) return null;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Attention Needed */}
      {attentionCards.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 rounded-full bg-destructive" />
            <h3 className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Attention Needed
            </h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {attentionCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className={`p-3 sm:p-4 cursor-pointer hover:shadow-md active:scale-[0.97] transition-all border ${card.border}`}
                  onClick={() => navigate(card.path)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                      <card.icon className={`w-4 h-4 ${card.color}`} />
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                  </div>
                  <p className="font-display text-lg sm:text-xl font-bold">{card.value}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-0.5">{card.label}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Trending Brands Strip */}
      {trends.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-success" />
              <h3 className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Trending Now
              </h3>
            </div>
            <button
              onClick={() => navigate("/trends")}
              className="text-[10px] sm:text-xs text-primary font-semibold hover:underline flex items-center gap-0.5"
            >
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
            {trends.map((trend, i) => (
              <motion.div
                key={trend.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex-shrink-0"
              >
                <Card
                  className="w-[140px] sm:w-[160px] p-3 sm:p-4 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] transition-all border-border/50"
                  onClick={() => navigate(`/price-check?brand=${encodeURIComponent(trend.brand_or_item)}&category=${encodeURIComponent(trend.category)}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-[9px] sm:text-[10px] py-0 px-1.5 text-muted-foreground">
                      {trend.category}
                    </Badge>
                    {(trend.opportunity_score ?? 0) >= 70 && (
                      <Flame className="w-3.5 h-3.5 text-destructive" />
                    )}
                  </div>
                  <p className="font-display font-bold text-xs sm:text-sm truncate mb-1">
                    {trend.brand_or_item}
                  </p>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-success" />
                    <span className="text-[10px] sm:text-xs text-success font-semibold">
                      {trend.search_volume_change_7d != null
                        ? `+${Math.round(trend.search_volume_change_7d)}%`
                        : "Rising"}
                    </span>
                  </div>
                  {trend.avg_price != null && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      ~£{trend.avg_price.toFixed(0)} avg
                    </p>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
