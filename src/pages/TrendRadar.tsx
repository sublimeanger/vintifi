import { useState, useEffect, useCallback } from "react";
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
  ArrowLeft, TrendingUp, TrendingDown, Minus, Loader2, RefreshCw,
  Zap, Calendar, Target, Clock, Flame, BarChart3, Satellite, Cpu,
} from "lucide-react";
import TrendCard from "@/components/trends/TrendCard";
import TrendStats from "@/components/trends/TrendStats";

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

export default function TrendRadar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cached, setCached] = useState(false);
  const [dataSource, setDataSource] = useState<string>("ai_generated");

  // Lobstr scan state
  const [scanning, setScanning] = useState(false);
  const [scanJobId, setScanJobId] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState<string | null>(null);

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
      setDataSource(data?.data_source || "ai_generated");
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

  // ==================== LOBSTR SCAN ====================
  const launchScan = async () => {
    setScanning(true);
    setScanStatus("launching");
    setScanProgress(0);

    try {
      const { data, error } = await supabase.functions.invoke("lobstr-sync", {
        body: { action: "launch" },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setScanJobId(data.job_id);
      setScanStatus("running");
      toast.success("Market scan launched! Scraping Vinted data...");
    } catch (e: any) {
      toast.error(e.message || "Failed to launch scan");
      setScanning(false);
      setScanStatus(null);
    }
  };

  // Poll for scan progress
  useEffect(() => {
    if (!scanJobId || scanStatus !== "running") return;

    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("lobstr-sync", {
          body: { action: "poll", job_id: scanJobId },
        });

        if (error) throw error;

        if (data?.status === "completed") {
          setScanStatus("processing");
          setScanProgress(80);

          // Process results through AI
          const { data: processData, error: processError } = await supabase.functions.invoke("lobstr-sync", {
            body: { action: "process", job_id: scanJobId },
          });

          if (processError) throw processError;

          setScanStatus("done");
          setScanProgress(100);
          setScanning(false);
          toast.success(`Market scan complete! ${processData?.trends_count || 0} trends extracted.`);

          // Refresh trends
          await fetchTrends(true);
          setScanJobId(null);
          setScanStatus(null);
        } else if (data?.status === "failed") {
          setScanStatus("failed");
          setScanning(false);
          toast.error("Market scan failed. Try again later.");
        } else if (data?.status === "running") {
          const total = data.total || 10;
          const progress = data.progress || 0;
          setScanProgress(Math.min(70, Math.round((progress / total) * 70)));
        }
      } catch (e: any) {
        console.error("Poll error:", e);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [scanJobId, scanStatus]);

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
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              {dataSource === "lobstr" ? (
                <><Satellite className="w-3 h-3 text-success" /> Real market data</>
              ) : (
                <><Cpu className="w-3 h-3 text-accent" /> AI-generated data</>
              )}
              {cached ? " · Cached" : " · Fresh"} · {trends.length} trends
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchTrends(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={launchScan}
              disabled={scanning}
              className="font-semibold"
            >
              {scanning ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Scanning...</>
              ) : (
                <><Satellite className="w-4 h-4 mr-1" /> Scan Market</>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Scan Progress */}
        {scanning && scanStatus && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-4 mb-6 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-3 mb-2">
                <Satellite className="w-5 h-5 text-primary animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    {scanStatus === "launching" && "Launching market scan..."}
                    {scanStatus === "running" && "Scraping Vinted marketplace data..."}
                    {scanStatus === "processing" && "AI analysing scraped data..."}
                    {scanStatus === "done" && "Scan complete!"}
                    {scanStatus === "failed" && "Scan failed"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {scanStatus === "running" && "Collecting search data from Google for Vinted trends"}
                    {scanStatus === "processing" && "Extracting trend insights from raw data"}
                  </p>
                </div>
              </div>
              <Progress value={scanProgress} className="h-2" />
            </Card>
          </motion.div>
        )}

        {/* Stats */}
        <TrendStats
          risingCount={risingCount}
          peakingCount={peakingCount}
          decliningCount={decliningCount}
          avgOpportunity={avgOpportunity}
        />

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
              Try selecting a different category or scan the market for fresh data.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => fetchTrends(true)} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" /> Generate AI Trends
              </Button>
              <Button onClick={launchScan} disabled={scanning} className="font-semibold">
                <Satellite className="w-4 h-4 mr-2" /> Scan Market
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <AnimatePresence>
              {trends.map((trend, i) => (
                <TrendCard key={trend.id} trend={trend} index={i} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
