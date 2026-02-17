import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { AppShellV2 } from "@/components/AppShellV2";
import {
  Search, Loader2, Zap, Package, AlertTriangle,
  ChevronRight, Sparkles, ImageIcon,
} from "lucide-react";

type RecentItem = {
  id: string;
  title: string;
  brand: string | null;
  image_url: string | null;
  status: string;
  updated_at: string;
  health_score: number | null;
  last_price_check_at: string | null;
  last_optimised_at: string | null;
};

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [activeCount, setActiveCount] = useState(0);
  const [needsAttentionCount, setNeedsAttentionCount] = useState(0);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const [activeRes, needsAttRes, recentRes] = await Promise.all([
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "active"),
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "active").or("description.is.null,health_score.is.null,image_url.is.null"),
        supabase.from("listings").select("id, title, brand, image_url, status, updated_at, health_score, last_price_check_at, last_optimised_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(5),
      ]);

      setActiveCount(activeRes.count || 0);
      setNeedsAttentionCount(needsAttRes.count || 0);
      setRecentItems((recentRes.data || []) as RecentItem[]);
      setLoaded(true);
    };
    fetchAll();
  }, [user]);

  const handleAnalyze = () => {
    if (!url.trim()) { toast.error("Paste a Vinted URL or enter item details"); return; }
    navigate(`/price-check?url=${encodeURIComponent(url.trim())}`);
  };

  return (
    <AppShellV2>
      <div className="space-y-4 sm:space-y-8">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="font-display text-lg sm:text-2xl lg:text-3xl font-bold mb-0.5 leading-tight">
            Welcome back, {profile?.display_name?.split(" ")[0] || "there"} 👋
          </h2>
          <p className="text-muted-foreground text-[11px] sm:text-sm">Your selling command centre</p>
        </motion.div>

        {/* Quick Price Check */}
        <Card className="gradient-border p-3 sm:p-6 border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-primary" />
            <h3 className="font-display font-bold text-sm sm:text-base lg:text-lg">Quick Price Check</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-2.5 hidden sm:block">
            Paste a Vinted URL to instantly see what your item is worth
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste Vinted URL..."
              className="flex-1 h-11 sm:h-10 text-base sm:text-sm rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            />
            <Button onClick={handleAnalyze} className="font-semibold shrink-0 h-11 sm:h-10 rounded-xl active:scale-95 transition-transform">
              <Search className="w-4 h-4 mr-2" />
              Analyse
            </Button>
          </div>
        </Card>

        {/* Quick Actions — horizontal scroll on mobile */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-11 sm:h-10 font-semibold active:scale-95 transition-transform rounded-xl text-xs sm:text-sm"
            onClick={() => navigate("/listings?action=add")}
          >
            <Package className="w-4 h-4 mr-1.5" />
            Add Item
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-11 sm:h-10 font-semibold active:scale-95 transition-transform rounded-xl text-xs sm:text-sm"
            onClick={() => navigate("/optimize")}
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            Optimise
          </Button>
        </div>

        {/* 2 Metric Cards */}
        <div className="grid grid-cols-2 gap-2">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card
              className="p-3 border-l-[3px] border-l-primary bg-primary/[0.03] cursor-pointer active:scale-[0.97] transition-all rounded-xl"
              onClick={() => navigate("/listings?status=active")}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <Package className="w-3 h-3 text-primary" />
                <span className="text-[9px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider">Active</span>
              </div>
              <p className="font-display text-2xl sm:text-3xl font-bold">{loaded ? activeCount : "—"}</p>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card
              className="p-3 border-l-[3px] border-l-warning bg-warning/[0.03] cursor-pointer active:scale-[0.97] transition-all rounded-xl"
              onClick={() => navigate("/listings?filter=needs_attention")}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <AlertTriangle className="w-3 h-3 text-warning" />
                <span className="text-[9px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider">Attention</span>
              </div>
              <p className="font-display text-2xl sm:text-3xl font-bold">{loaded ? needsAttentionCount : "—"}</p>
            </Card>
          </motion.div>
        </div>

        {/* Recent Items */}
        <Card className="p-3 sm:p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2.5 sm:mb-4">
            <h3 className="font-display font-bold text-sm sm:text-base flex items-center gap-1.5">
              <Package className="w-4 h-4 text-primary" />
              Recent Items
            </h3>
            <Button variant="ghost" size="sm" onClick={() => navigate("/listings")} className="text-[10px] sm:text-xs h-7 px-2">
              View all <ChevronRight className="w-3 h-3 ml-0.5" />
            </Button>
          </div>
          {!loaded ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : recentItems.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2.5">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs font-medium mb-0.5">No items yet</p>
              <p className="text-[10px] text-muted-foreground mb-3">Add your first item to get started</p>
              <Button size="sm" onClick={() => navigate("/listings")} className="h-9 rounded-xl text-xs">
                <Package className="w-3.5 h-3.5 mr-1.5" /> Add Item
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {recentItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/30 active:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/items/${item.id}`)}
                >
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate leading-snug">{item.title}</p>
                    {item.brand && <span className="text-[10px] text-muted-foreground leading-none">{item.brand}</span>}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShellV2>
  );
}
