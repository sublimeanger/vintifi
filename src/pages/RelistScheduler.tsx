import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, RefreshCw, Loader2, Calendar, Clock, TrendingDown,
  Package, Zap, CheckCircle2, XCircle, ArrowRightLeft, Layers,
  Timer, Trash2,
} from "lucide-react";

type Schedule = {
  id: string;
  listing_id: string;
  scheduled_at: string;
  new_price: number | null;
  price_adjustment_percent: number | null;
  status: string;
  strategy: string;
  ai_reason: string | null;
  executed_at: string | null;
  created_at: string;
  listing_title?: string;
  listing_brand?: string;
  listing_current_price?: number | null;
  listing_category?: string | null;
};

const strategyConfig: Record<string, { icon: typeof Clock; label: string; color: string }> = {
  optimal_timing: { icon: Timer, label: "Optimal Timing", color: "text-primary border-primary/30 bg-primary/5" },
  price_reduction: { icon: TrendingDown, label: "Price Reduction", color: "text-accent border-accent/30 bg-accent/5" },
  bundle_suggestion: { icon: Layers, label: "Bundle", color: "text-success border-success/30 bg-success/5" },
  crosslist: { icon: ArrowRightLeft, label: "Crosslist", color: "text-chart-5 border-chart-5/30 bg-chart-5/5" },
};

export default function RelistScheduler() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeCount, setActiveCount] = useState(0);

  const fetchSchedules = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch schedules
    const { data: schData, error } = await supabase
      .from("relist_schedules" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("scheduled_at", { ascending: true });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    // Fetch listing details for each schedule
    const listingIds = [...new Set((schData as any[])?.map((s: any) => s.listing_id) || [])];
    let listingsMap: Record<string, any> = {};
    if (listingIds.length) {
      const { data: listings } = await supabase
        .from("listings")
        .select("id, title, brand, current_price, category")
        .in("id", listingIds);
      if (listings) {
        listings.forEach((l: any) => { listingsMap[l.id] = l; });
      }
    }

    const enriched = ((schData as any[]) || []).map((s: any) => ({
      ...s,
      listing_title: listingsMap[s.listing_id]?.title || "Unknown",
      listing_brand: listingsMap[s.listing_id]?.brand,
      listing_current_price: listingsMap[s.listing_id]?.current_price,
      listing_category: listingsMap[s.listing_id]?.category,
    }));

    setSchedules(enriched);

    // Count active listings
    const { count } = await supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "active");
    setActiveCount(count || 0);

    setLoading(false);
  };

  useEffect(() => { fetchSchedules(); }, [user]);

  const handleGenerate = async () => {
    if (!session) return;
    setGenerating(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/relist-scheduler`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: "generate" }),
      });

      if (res.status === 429) {
        toast.error("Rate limited — please try again in a moment");
        setGenerating(false);
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      toast.success(data.message || "Schedules generated!");
      fetchSchedules();
    } catch (e: any) {
      toast.error(e.message || "Failed to generate schedules");
    }
    setGenerating(false);
  };

  const handleCancel = async (id: string) => {
    const { error } = await supabase
      .from("relist_schedules" as any)
      .update({ status: "cancelled" } as any)
      .eq("id", id);
    if (error) {
      toast.error("Failed to cancel");
    } else {
      toast.success("Schedule cancelled");
      setSchedules(prev => prev.map(s => s.id === id ? { ...s, status: "cancelled" } : s));
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("relist_schedules" as any)
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      setSchedules(prev => prev.filter(s => s.id !== id));
    }
  };

  const pendingSchedules = schedules.filter(s => s.status === "pending");
  const completedSchedules = schedules.filter(s => s.status !== "pending");

  const nextRelist = pendingSchedules.length > 0 ? pendingSchedules[0] : null;
  const totalSavings = pendingSchedules.reduce((sum, s) => {
    if (s.new_price && s.listing_current_price) {
      return sum + (s.listing_current_price - s.new_price);
    }
    return sum;
  }, 0);

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <header className="border-b border-border glass sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display font-bold text-lg">Relist Scheduler</h1>
            <p className="text-xs text-muted-foreground">
              {pendingSchedules.length} scheduled · {activeCount} active listings
            </p>
          </div>
          <Button onClick={handleGenerate} disabled={generating} className="font-semibold" size="sm">
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
            {generating ? "Analysing..." : <><span className="hidden sm:inline">Generate Schedule</span><span className="sm:hidden">Generate</span></>}
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Calendar, label: "Pending Relists", value: pendingSchedules.length.toString(), color: "text-primary" },
            { icon: Package, label: "Active Listings", value: activeCount.toString(), color: "text-success" },
            { icon: TrendingDown, label: "Price Adjustments", value: pendingSchedules.filter(s => s.new_price).length.toString(), color: "text-accent" },
            { icon: Clock, label: "Next Relist", value: nextRelist ? new Date(nextRelist.scheduled_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—", color: "text-muted-foreground" },
          ].map((m, i) => (
            <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <m.icon className={`w-3.5 h-3.5 ${m.color}`} />
                  <span className="text-xs text-muted-foreground font-medium">{m.label}</span>
                </div>
                <p className="font-display text-xl font-bold">{m.value}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Pending Schedules */}
        <h3 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
          <Timer className="w-5 h-5 text-primary" />
          Upcoming Relists
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : pendingSchedules.length === 0 ? (
          <Card className="p-8 text-center mb-8">
            <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <h4 className="font-display font-bold mb-1">No schedules yet</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Click "Generate Schedule" to let AI analyse your listings and create optimal relist timing
            </p>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
              Generate Schedule
            </Button>
          </Card>
        ) : (
          <div className="space-y-3 mb-8">
            <AnimatePresence>
              {pendingSchedules.map((s, i) => {
                const config = strategyConfig[s.strategy] || strategyConfig.optimal_timing;
                const StratIcon = config.icon;
                const scheduledDate = new Date(s.scheduled_at);
                const isOverdue = scheduledDate < new Date();

                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card className={`p-4 ${isOverdue ? "border-accent/40" : ""}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}>
                          <StratIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold truncate">{s.listing_title}</p>
                            {s.listing_brand && (
                              <Badge variant="outline" className="text-[10px] shrink-0">{s.listing_brand}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{s.ai_reason}</p>
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge variant="outline" className={`text-[10px] ${config.color}`}>
                              {config.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {scheduledDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                              {" "}
                              {scheduledDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {isOverdue && (
                              <Badge className="text-[10px] bg-accent/10 text-accent border-accent/30">Overdue</Badge>
                            )}
                            {s.new_price != null && s.listing_current_price != null && (
                              <span className="text-xs font-medium">
                                £{s.listing_current_price.toFixed(0)} → <span className="text-primary font-bold">£{s.new_price.toFixed(0)}</span>
                                {s.price_adjustment_percent != null && (
                                  <span className="text-muted-foreground ml-1">({s.price_adjustment_percent > 0 ? "+" : ""}{s.price_adjustment_percent.toFixed(0)}%)</span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleCancel(s.id)}>
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Completed / Cancelled */}
        {completedSchedules.length > 0 && (
          <>
            <h3 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
              History
            </h3>
            <div className="space-y-2">
              {completedSchedules.slice(0, 10).map((s) => (
                <Card key={s.id} className="p-3 opacity-60">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.listing_title}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.status === "cancelled" ? "Cancelled" : "Executed"} ·{" "}
                        {new Date(s.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
