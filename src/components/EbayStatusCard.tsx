import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, ChevronRight, Link2 } from "lucide-react";

export function EbayStatusCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [connected, setConnected] = useState(false);
  const [crossListedCount, setCrossListedCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [connRes, countRes] = await Promise.all([
        supabase
          .from("platform_connections")
          .select("id")
          .eq("user_id", user.id)
          .eq("platform", "ebay")
          .eq("status", "active")
          .maybeSingle(),
        supabase
          .from("cross_listings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("platform", "ebay"),
      ]);
      setConnected(!!connRes.data);
      setCrossListedCount(countRes.count ?? 0);
      setLoaded(true);
    };
    fetch();
  }, [user]);

  if (!loaded) return null;

  if (!connected) {
    return (
      <Card className="p-4 flex items-center gap-3 border-dashed border-muted-foreground/20">
        <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
          <ShoppingBag className="w-4 h-4 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Connect eBay</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Publish listings to eBay with one click</p>
        </div>
        <Button size="sm" variant="outline" className="shrink-0 text-xs h-8" onClick={() => navigate("/platforms")}>
          <Link2 className="w-3 h-3 mr-1" /> Connect
        </Button>
      </Card>
    );
  }

  return (
    <Card
      className="p-4 flex items-center gap-3 cursor-pointer hover:shadow-md active:scale-[0.98] transition-all"
      onClick={() => navigate("/platforms")}
    >
      <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
        <ShoppingBag className="w-4 h-4 text-blue-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">eBay</p>
          <Badge variant="outline" className="text-[9px] text-success border-success/30 py-0">Connected</Badge>
        </div>
        <p className="text-[10px] sm:text-xs text-muted-foreground">
          {crossListedCount} {crossListedCount === 1 ? "item" : "items"} listed
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </Card>
  );
}
