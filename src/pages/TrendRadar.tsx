import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/PageShell";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Flame, BarChart3, Clock } from "lucide-react";
import TrendCard from "@/components/trends/TrendCard";
import TrendStats from "@/components/trends/TrendStats";
import { TrendCardSkeleton } from "@/components/LoadingSkeletons";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "less than an hour ago";
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export default function TrendRadar() {
  const { user } = useAuth();
  const [allTrends, setAllTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<string>("none");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");

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

  // Client-side category filtering
  const filteredTrends = selectedCategory === "All"
    ? allTrends
    : allTrends.filter((t) => t.category === selectedCategory);

  const risingCount = filteredTrends.filter((t) => t.trend_direction === "rising").length;
  const peakingCount = filteredTrends.filter((t) => t.trend_direction === "peaking").length;
  const decliningCount = filteredTrends.filter((t) => t.trend_direction === "declining").length;
  const avgOpportunity = filteredTrends.length > 0
    ? Math.round(filteredTrends.reduce((sum, t) => sum + (t.opportunity_score || 0), 0) / filteredTrends.length)
    : 0;

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
          <Badge variant="outline" className="text-xs gap-1.5 font-normal">
            <Clock className="w-3 h-3" />
            Updated {timeAgo(lastUpdated)}
          </Badge>
        ) : null
      }
    >
      <TrendStats risingCount={risingCount} peakingCount={peakingCount} decliningCount={decliningCount} avgOpportunity={avgOpportunity} />

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
        <TabsList className="w-full justify-start overflow-x-auto h-auto flex-wrap gap-1 bg-transparent p-0">
          {categories.map((cat) => {
            const count = cat === "All"
              ? allTrends.length
              : allTrends.filter((t) => t.category === cat).length;
            return (
              <TabsTrigger
                key={cat}
                value={cat}
                className="text-xs shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-1.5 border border-border data-[state=active]:border-primary gap-1.5"
              >
                {cat}
                {count > 0 && (
                  <span className="bg-muted data-[state=active]:bg-primary-foreground/20 text-[10px] px-1.5 py-0.5 rounded-full">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {categories.map((cat) => (
          <TabsContent key={cat} value={cat} className="mt-4">
            {loading ? (
              <TrendCardSkeleton count={4} />
            ) : filteredTrends.length === 0 ? (
              <div className="text-center py-16">
                <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-display font-bold text-lg mb-2">No trends found</h3>
                <p className="text-sm text-muted-foreground">
                  {allTrends.length === 0
                    ? "Trends update daily at 6am UK time. Check back soon!"
                    : `No trends in ${cat} right now. Try another category.`}
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                <AnimatePresence>
                  {filteredTrends.map((trend, i) => (
                    <TrendCard key={trend.id} trend={trend} index={i} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <MobileBottomNav />
    </PageShell>
  );
}
