import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, FileEdit, Radio, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type PipelineCounts = {
  watchlist: number;
  draft: number;
  active: number;
  stale: number;
  sold: number;
};

export function PipelineSnapshot() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [counts, setCounts] = useState<PipelineCounts>({ watchlist: 0, draft: 0, active: 0, stale: 0, sold: 0 });

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [watchRes, draftRes, activeRes, staleRes, soldRes] = await Promise.all([
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "watchlist"),
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "draft"),
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "active").gt("created_at", thirtyDaysAgo.toISOString()),
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "active").lte("created_at", thirtyDaysAgo.toISOString()),
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "sold"),
      ]);
      setCounts({
        watchlist: watchRes.count || 0,
        draft: draftRes.count || 0,
        active: activeRes.count || 0,
        stale: staleRes.count || 0,
        sold: soldRes.count || 0,
      });
    };
    fetch();
  }, [user]);

  const stages = [
    { key: "watchlist", label: "Watchlist", icon: Eye, color: "text-muted-foreground", bg: "bg-muted/60", filter: "?status=watchlist" },
    { key: "draft", label: "Drafts", icon: FileEdit, color: "text-accent", bg: "bg-accent/10", filter: "?status=draft" },
    { key: "active", label: "Live", icon: Radio, color: "text-success", bg: "bg-success/10", filter: "?status=active" },
    { key: "stale", label: "Stale", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", filter: "" },
    { key: "sold", label: "Sold", icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10", filter: "?status=sold" },
  ] as const;

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
      {stages.map((s) => (
        <button
          key={s.key}
          onClick={() => navigate(`/listings${s.filter}`)}
          className={cn(
            "flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/50 min-w-[100px] transition-all hover:shadow-sm active:scale-[0.97]",
            s.bg,
          )}
        >
          <s.icon className={cn("w-4 h-4 shrink-0", s.color)} />
          <div className="text-left">
            <p className="text-sm font-bold leading-none">{counts[s.key]}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
