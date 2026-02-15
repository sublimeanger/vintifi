import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/PageShell";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Flame, BarChart3, Clock, Crown } from "lucide-react";
import TrendCard from "@/components/trends/TrendCard";
import TrendStats from "@/components/trends/TrendStats";
import { UseCaseSpotlight } from "@/components/UseCaseSpotlight";
import { TrendCardSkeleton } from "@/components/LoadingSkeletons";
import { UpgradeModal } from "@/components/UpgradeModal";

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
  data_source?: string;
};

const categories = [
  "All", "Womenswear", "Menswear", "Streetwear", "Vintage",
  "Designer", "Shoes", "Accessories", "Kids",
];

const FREE_TREND_LIMIT = 5;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours === 1) return "1h ago";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

export default function TrendRadar() {
  const { user, profile } = useAuth();
  const [allTrends, setAllTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<string>("none");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showUpgrade, setShowUpgrade] = useState(false);

  const tier = profile?.subscription_tier || "free";
  const isFree = tier === "free";

  const fetchTrends = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-trends", {
        body: { category: "all" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAllTrends((data?.trends as Trend[]) || []);
      setDataSource(data?.data_source || "none");
      setLastUpdated(data?.last_updated || null);
    } catch (e: any) {
      toast.error(e.message || "Failed to load trends");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrends(); }, [user]);

  const filteredTrends = selectedCategory === "All"
    ? allTrends
    : allTrends.filter((t) => t.category === selectedCategory);

  // Stats use full data so free users can see the value
  const risingCount = filteredTrends.filter((t) => t.trend_direction === "rising").length;
  const peakingCount = filteredTrends.filter((t) => t.trend_direction === "peaking").length;
  const decliningCount = filteredTrends.filter((t) => t.trend_direction === "declining").length;
  const avgOpportunity = filteredTrends.length > 0
    ? Math.round(filteredTrends.reduce((sum, t) => sum + (t.opportunity_score || 0), 0) / filteredTrends.length)
    : 0;

  // Limit displayed trends for free users
  const displayTrends = isFree ? filteredTrends.slice(0, FREE_TREND_LIMIT) : filteredTrends;
  const hiddenCount = isFree ? Math.max(0, filteredTrends.length - FREE_TREND_LIMIT) : 0;

  const subtitleParts = [
    dataSource === "lobstr" ? "Real market data" : dataSource === "firecrawl" ? "Web search data" : "No data yet",
    `${allTrends.length} trends`,
  ];

  return (
    <PageShell
      title="Trend Radar"
      icon={<Flame className="w-5 h-5 text-primary" />}
      subtitle={subtitleParts.join(" · ")}
      actions={
        lastUpdated ? (
          <Badge variant="outline" className="text-[10px] sm:text-xs gap-1 font-normal py-0.5">
            <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            {timeAgo(lastUpdated)}
          </Badge>
        ) : null
      }
    >
      <UseCaseSpotlight
        featureKey="trend-radar"
        icon={Flame}
        scenario="You keep seeing Carhartt WIP jackets selling fast but you're not sure if the trend has peaked..."
        description="Without data, you might source stock right as demand falls — leaving you with unsold inventory."
        outcome="Trend Radar shows demand is up 280% and hasn't peaked yet. You source 5 jackets and sell them all within a week."
        tip="Check the 'Rising' tab for early opportunities before everyone else catches on."
      />

      <TrendStats risingCount={risingCount} peakingCount={peakingCount} decliningCount={decliningCount} avgOpportunity={avgOpportunity} />

      {/* Category Chips — scrollable on mobile */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-5 sm:mb-6 -mx-1 px-1 pb-1">
        {categories.map((cat) => {
          const count = cat === "All"
            ? allTrends.length
            : allTrends.filter((t) => t.category === cat).length;
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 px-3 py-2 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium border transition-all active:scale-95 flex items-center gap-1.5 ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/30"
              }`}
            >
              {cat}
              {count > 0 && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                  active ? "bg-primary-foreground/20" : "bg-muted"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Trend Grid */}
      {loading ? (
        <TrendCardSkeleton count={4} />
      ) : filteredTrends.length === 0 ? (
        <div className="text-center py-12 sm:py-16">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground/40" />
          </div>
          <h3 className="font-display font-bold text-sm sm:text-lg mb-1.5">No trends found</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {allTrends.length === 0
              ? "Trends update daily at 6am UK time. Check back soon!"
              : `No trends in ${selectedCategory} right now. Try another category.`}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
            <AnimatePresence>
              {displayTrends.map((trend, i) => (
                <TrendCard key={trend.id} trend={trend} index={i} />
              ))}
            </AnimatePresence>
          </div>

          {/* Free user upgrade banner */}
          {isFree && hiddenCount > 0 && (
            <div className="mt-6 p-4 sm:p-5 rounded-xl border border-primary/20 bg-primary/[0.03] text-center">
              <Crown className="w-6 h-6 text-primary mx-auto mb-2" />
              <h3 className="font-display font-bold text-sm sm:text-base mb-1">
                See all {filteredTrends.length} trends with a Pro plan
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                You're seeing the top {FREE_TREND_LIMIT} trends. Unlock full access to every trend, personalised recommendations, and more.
              </p>
              <Button size="sm" onClick={() => setShowUpgrade(true)} className="active:scale-95 transition-transform">
                Upgrade Now
              </Button>
            </div>
          )}
        </>
      )}

      <MobileBottomNav />

      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        reason="Upgrade to Pro to see all trends, get personalised insights, and unlock the full Trend Radar."
        tierRequired="pro"
      />
    </PageShell>
  );
}
