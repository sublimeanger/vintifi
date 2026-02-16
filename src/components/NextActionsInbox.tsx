import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, ImageIcon, Timer, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type ActionItem = {
  id: string;
  title: string;
  brand: string | null;
  image_url: string | null;
  action: string;
  actionLabel: string;
  actionPath: string;
  icon: typeof Search;
  priority: number;
};

export function NextActionsInbox() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const actions: ActionItem[] = [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Items without price checks (no recommended_price)
      const { data: noPriceItems } = await supabase
        .from("listings")
        .select("id, title, brand, image_url")
        .eq("user_id", user.id)
        .eq("status", "active")
        .is("recommended_price", null)
        .limit(3);
      (noPriceItems || []).forEach((item) => {
        actions.push({
          id: item.id,
          title: item.title,
          brand: item.brand,
          image_url: item.image_url,
          action: "needs_price",
          actionLabel: "Price Check",
          actionPath: `/price-check?title=${encodeURIComponent(item.title)}&itemId=${item.id}`,
          icon: Search,
          priority: 1,
        });
      });

      // Stale items (active > 30 days)
      const { data: staleItems } = await supabase
        .from("listings")
        .select("id, title, brand, image_url")
        .eq("user_id", user.id)
        .eq("status", "active")
        .lte("created_at", thirtyDaysAgo.toISOString())
        .limit(3);
      (staleItems || []).forEach((item) => {
        if (!actions.find((a) => a.id === item.id)) {
          actions.push({
            id: item.id,
            title: item.title,
            brand: item.brand,
            image_url: item.image_url,
            action: "stale",
            actionLabel: "Review",
            actionPath: `/items/${item.id}`,
            icon: Timer,
            priority: 2,
          });
        }
      });

      // Items without descriptions
      const { data: noDescItems } = await supabase
        .from("listings")
        .select("id, title, brand, image_url, description, size")
        .eq("user_id", user.id)
        .eq("status", "active")
        .is("description", null)
        .limit(2);
      (noDescItems || []).forEach((item) => {
        if (!actions.find((a) => a.id === item.id)) {
          actions.push({
            id: item.id,
            title: item.title,
            brand: item.brand,
            image_url: item.image_url,
            action: "needs_optimise",
            actionLabel: "Improve",
            actionPath: `/optimize?title=${encodeURIComponent(item.title)}&itemId=${item.id}`,
            icon: Sparkles,
            priority: 3,
          });
        }
      });

      actions.sort((a, b) => a.priority - b.priority);
      setItems(actions.slice(0, 5));
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl skeleton-shimmer" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-muted-foreground">🎉 You're all caught up — no actions needed right now.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div
          key={item.id + item.action}
          className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer active:bg-muted/70"
          onClick={() => navigate(item.actionPath)}
        >
          {/* Thumbnail */}
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {item.image_url ? (
              <img src={item.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.title}</p>
            {item.brand && <p className="text-[10px] text-muted-foreground">{item.brand}</p>}
          </div>

          {/* Action CTA */}
          <Button size="sm" variant="outline" className="shrink-0 h-8 text-xs gap-1.5">
            <item.icon className="w-3 h-3" />
            {item.actionLabel}
          </Button>
        </div>
      ))}
    </div>
  );
}
