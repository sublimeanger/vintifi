import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MILESTONES = [
  { key: "unlock_arbitrage", check: "price_checks", threshold: 5, message: "🎉 You've unlocked the Arbitrage Scanner! Find profitable cross-platform deals.", path: "/arbitrage" },
  { key: "unlock_deadstock", check: "listings", threshold: 10, message: "📦 Dead Stock Liquidation unlocked! Keep your inventory healthy.", path: "/dead-stock" },
  { key: "unlock_portfolio", check: "listings", threshold: 15, message: "📊 Inventory Health unlocked! Bulk-fix pricing across your inventory.", path: "/dead-stock" },
  { key: "unlock_competitor", check: "price_checks", threshold: 10, message: "🔍 Competitor Tracker unlocked! Monitor your rivals' pricing.", path: "/competitors" },
] as const;

export function useFeatureUnlocks() {
  const { user, profile, refreshProfile } = useAuth();

  useEffect(() => {
    if (!user || !profile) return;

    const shownMilestones = profile.milestones_shown || [];

    const checkMilestones = async () => {
      const [checksRes, listingsRes] = await Promise.all([
        supabase
          .from("price_reports")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      const counts = {
        price_checks: checksRes.count || 0,
        listings: listingsRes.count || 0,
      };

      for (const milestone of MILESTONES) {
        if (shownMilestones.includes(milestone.key)) continue;

        if (counts[milestone.check] >= milestone.threshold) {
          // Update DB
          const updatedMilestones = [...shownMilestones, milestone.key];
          await supabase
            .from("profiles")
            .update({ milestones_shown: updatedMilestones } as any)
            .eq("user_id", user.id);
          refreshProfile();

          setTimeout(() => {
            toast.success(milestone.message, { duration: 6000 });
          }, 2000);
          break; // Only show one unlock per session
        }
      }
    };

    checkMilestones();
  }, [user, profile]);
}
