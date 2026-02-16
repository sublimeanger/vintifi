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
      <div className="space-y-5 sm:space-y-8">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold mb-0.5">
            Welcome back, {profile?.display_name?.split(" ")[0] || "there"} 👋
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm">Your selling command centre</p>
        </motion.div>

        {/* Quick Price Check */}
        <Card className="gradient-border p-4 sm:p-6 border-primary/20">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <h3 className="font-display font-bold text-sm sm:text-base lg:text-lg">Quick Price Check</h3>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mb-3 hidden sm:block">
            Paste a Vinted URL to instantly see what your item is worth
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste Vinted URL or item details..."
              className="flex-1 h-11 sm:h-10 text-base sm:text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            />
            <Button onClick={handleAnalyze} className="font-semibold shrink-0 h-12 sm:h-10 active:scale-95 transition-transform">
              <Search className="w-4 h-4 mr-2" />
              Analyse
            </Button>
          </div>
        </Card>

        {/* 2 Metric Cards */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card
              className="p-3 sm:p-4 border-l-[3px] border-l-primary bg-primary/[0.03] cursor-pointer hover:shadow-md active:scale-[0.97] transition-all"
              onClick={() => navigate("/listings?status=active")}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Package className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider">Active Items</span>
              </div>
              <p className="font-display text-xl sm:text-2xl lg:text-3xl font-bold">{loaded ? activeCount : "—"}</p>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card
              className="p-3 sm:p-4 border-l-[3px] border-l-warning bg-warning/[0.03] cursor-pointer hover:shadow-md active:scale-[0.97] transition-all"
              onClick={() => navigate("/listings")}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-warning" />
                <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider">Needs Attention</span>
              </div>
              <p className="font-display text-xl sm:text-2xl lg:text-3xl font-bold">{loaded ? needsAttentionCount : "—"}</p>
            </Card>
          </motion.div>
        </div>

        {/* Recent Items */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="font-display font-bold text-sm sm:text-base flex items-center gap-2">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Recent Items
            </h3>
            <Button variant="ghost" size="sm" onClick={() => navigate("/listings")} className="text-[10px] sm:text-xs h-8">
              View all <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          {!loaded ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : recentItems.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <p className="text-xs sm:text-sm font-medium mb-1">No items yet</p>
              <p className="text-[10px] text-muted-foreground mb-4">Add your first item to get started</p>
              <Button size="sm" onClick={() => navigate("/listings")}>
                <Package className="w-3.5 h-3.5 mr-1.5" /> Add Item
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 cursor-pointer transition-colors"
                  onClick={() => navigate(`/items/${item.id}`)}
                >
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.brand && <span className="text-[10px] text-muted-foreground">{item.brand}</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShellV2>
  );
}
