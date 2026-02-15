import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SidebarBadges = Record<string, number>;

export function useSidebarBadges() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<SidebarBadges>({});

  useEffect(() => {
    if (!user) return;

    const fetchBadges = async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [staleRes, watchlistRes, relistRes, needsOptRes] = await Promise.all([
        supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "active")
          .lte("created_at", thirtyDaysAgo.toISOString()),
        supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "watchlist"),
        supabase
          .from("relist_schedules")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "pending"),
        supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "active")
          .is("description", null)
          .is("health_score", null),
      ]);

      const newBadges: SidebarBadges = {};
      if (staleRes.count && staleRes.count > 0) newBadges["/dead-stock"] = staleRes.count;
      const listingsBadge = (watchlistRes.count || 0) + (needsOptRes.count || 0);
      if (listingsBadge > 0) newBadges["/listings"] = listingsBadge;
      if (relistRes.count && relistRes.count > 0) newBadges["/relist"] = relistRes.count;
      setBadges(newBadges);
    };

    fetchBadges();
  }, [user]);

  return badges;
}
