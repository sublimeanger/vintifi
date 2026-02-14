import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/PageShell";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import {
  Loader2, RefreshCw, Zap, Flame, BarChart3, Satellite, Cpu,
} from "lucide-react";
import TrendCard from "@/components/trends/TrendCard";
import TrendStats from "@/components/trends/TrendStats";
import { TrendCardSkeleton } from "@/components/LoadingSkeletons";

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
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchTrends(); }, [user, selectedCategory]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const launchScan = async () => {
    setScanning(true);
    setScanStatus("Launching Vinted scrapers...");
    setScanProgress(5);

    try {
      // Step 1: Launch
      const { data, error } = await supabase.functions.invoke("lobstr-sync", {
        body: { action: "launch" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const jobId = data.job_id;
      const isFallback = !!data.fallback;

      if (isFallback || data.status === "completed") {
        // Firecrawl fallback completed synchronously
        setScanProgress(60);
        setScanStatus("AI analysing web search data...");

        const { data: processData, error: processError } = await supabase.functions.invoke("lobstr-sync", {
          body: { action: "process", job_id: jobId },
        });
        if (processError) throw processError;
        if (processData?.error) throw new Error(processData.error);

        setScanProgress(100);
        setScanStatus("Scan complete!");
        toast.success(`Market scan complete! ${processData?.trends_count || 0} trends extracted (web search fallback).`);
        await fetchTrends(true);
        finishScan();
        return;
      }

      // Lobstr.io async flow — poll until complete
      const totalRuns = data.runs_launched || 1;
      setScanProgress(10);
      setScanStatus(`Collecting marketplace data (0/${totalRuns} complete)...`);

      pollRef.current = setInterval(async () => {
        try {
          const { data: pollData, error: pollError } = await supabase.functions.invoke("lobstr-sync", {
            body: { action: "poll", job_id: jobId },
          });
          if (pollError) throw pollError;
          if (pollData?.error) throw new Error(pollData.error);

          const completed = pollData.completed || 0;
          const total = pollData.total || totalRuns;
          const progress = 10 + Math.round((completed / total) * 50);
          setScanProgress(progress);
          setScanStatus(`Collecting marketplace data (${completed}/${total} complete)...`);

          if (pollData.status === "completed" || pollData.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;

            if (pollData.status === "failed") {
              throw new Error("All scraping runs failed");
            }

            // Process results
            setScanProgress(65);
            setScanStatus("AI analysing real listing data...");

            const { data: processData, error: processError } = await supabase.functions.invoke("lobstr-sync", {
              body: { action: "process", job_id: jobId },
            });
            if (processError) throw processError;
            if (processData?.error) throw new Error(processData.error);

            const source = processData.data_source === "lobstr" ? "real Vinted data" : "web search";
            setScanProgress(100);
            setScanStatus("Scan complete!");
            toast.success(`Market scan complete! ${processData?.trends_count || 0} trends from ${source}.`);
            await fetchTrends(true);
            finishScan();
          }
        } catch (e: any) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          toast.error(e.message || "Polling failed");
          finishScan("failed");
        }
      }, 5000);
    } catch (e: any) {
      toast.error(e.message || "Failed to launch scan");
      finishScan("failed");
    }
  };

  const finishScan = (status?: string) => {
    if (status === "failed") {
      setScanStatus("Scan failed");
    }
    setTimeout(() => {
      setScanning(false);
      setScanStatus(null);
      setScanProgress(0);
    }, 2000);
  };

  const risingCount = trends.filter((t) => t.trend_direction === "rising").length;
  const peakingCount = trends.filter((t) => t.trend_direction === "peaking").length;
  const decliningCount = trends.filter((t) => t.trend_direction === "declining").length;
  const avgOpportunity = trends.length > 0
    ? Math.round(trends.reduce((sum, t) => sum + (t.opportunity_score || 0), 0) / trends.length)
    : 0;

  return (
    <PageShell
      title="Trend Radar"
      icon={<Flame className="w-5 h-5 text-primary" />}
      subtitle={`${dataSource === "lobstr" ? "Real market data" : "AI-generated data"} · ${trends.length} trends`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchTrends(true)} disabled={refreshing} className="hidden sm:flex">
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button variant="outline" size="icon" onClick={() => fetchTrends(true)} disabled={refreshing} className="sm:hidden h-10 w-10">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={launchScan} disabled={scanning} className="font-semibold">
            {scanning ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> <span className="hidden sm:inline">Scanning...</span></>
            ) : (
              <><Satellite className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Scan Market</span></>
            )}
          </Button>
        </div>
      }
    >
      {/* Scan Progress */}
      {scanning && scanStatus && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-4 mb-6 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-3 mb-2">
              <Satellite className="w-5 h-5 text-primary animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-semibold">{scanStatus}</p>
              </div>
            </div>
            <Progress value={scanProgress} className="h-2" />
          </Card>
        </motion.div>
      )}

      <TrendStats risingCount={risingCount} peakingCount={peakingCount} decliningCount={decliningCount} avgOpportunity={avgOpportunity} />

      {/* Category Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <Button key={cat} variant={selectedCategory === cat ? "default" : "outline"} size="sm" className="shrink-0 text-xs h-9" onClick={() => setSelectedCategory(cat)}>
            {cat}
          </Button>
        ))}
      </div>

      {/* Trend Cards */}
      {(loading || scanning) ? (
        <TrendCardSkeleton count={scanning ? 8 : 4} />
      ) : trends.length === 0 ? (
        <div className="text-center py-16">
          <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display font-bold text-lg mb-2">No trends found</h3>
          <p className="text-sm text-muted-foreground mb-4">Try selecting a different category or scan the market.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
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

      <MobileBottomNav />
    </PageShell>
  );
}
