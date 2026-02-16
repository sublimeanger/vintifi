import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Sparkles, TrendingUp, MapPin, Search, Zap, ChevronRight,
} from "lucide-react";

type Suggestion = {
  icon: typeof Sparkles;
  title: string;
  description: string;
  path: string;
  color: string;
  bg: string;
};

export function DashboardForYou() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    if (!user || !profile) return;

    const buildSuggestions = async () => {
      const result: Suggestion[] = [];
      const categories = profile.selling_categories || [];

      // Check if user has done any price checks
      const { count: checkCount } = await supabase
        .from("price_reports")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Check listing count
      const { count: listingCount } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Check if matching trends exist for their categories
      if (categories.length > 0) {
        const { data: matchingTrends } = await supabase
          .from("trends")
          .select("brand_or_item, category, search_volume_change_7d")
          .eq("trend_direction", "rising")
          .in("category", categories)
          .order("opportunity_score", { ascending: false })
          .limit(1);

        if (matchingTrends && matchingTrends.length > 0) {
          const t = matchingTrends[0];
          result.push({
            icon: TrendingUp,
            title: `${t.brand_or_item} is trending in ${t.category}`,
            description: `Up ${t.search_volume_change_7d ? Math.round(t.search_volume_change_7d) + "%" : ""} this week — matches your selling categories.`,
            path: `/price-check?brand=${encodeURIComponent(t.brand_or_item)}&category=${encodeURIComponent(t.category)}`,
            color: "text-success",
            bg: "bg-success/10",
          });
        }
      }

      // Goal-based suggestions
      const goal = profile.primary_goal;
      if (goal === "find_stock" && (checkCount || 0) >= 1) {
        result.push({
          icon: MapPin,
          title: "Generate a sourcing briefing",
          description: "Get an AI-curated list of what to look for at charity shops.",
          path: "/charity-briefing",
          color: "text-primary",
          bg: "bg-primary/10",
        });
      }

      if (goal === "better_prices" && (listingCount || 0) >= 3) {
        result.push({
          icon: Zap,
          title: "Optimise your listing descriptions",
          description: "AI can improve your titles and descriptions to boost visibility.",
          path: "/optimize",
          color: "text-accent",
          bg: "bg-accent/10",
        });
      }

      if ((listingCount || 0) === 0) {
        result.push({
          icon: Search,
          title: "Run your first price check",
          description: "Paste a Vinted URL to discover what your items are really worth.",
          path: "/price-check",
          color: "text-primary",
          bg: "bg-primary/10",
        });
      }

      if (goal === "sell_faster" && (listingCount || 0) >= 5) {
        result.push({
          icon: Sparkles,
          title: "Check your inventory health",
          description: "Find overpriced and stale listings that need attention.",
          path: "/dead-stock",
          color: "text-success",
          bg: "bg-success/10",
        });
      }

      setSuggestions(result.slice(0, 3));
    };

    buildSuggestions();
  }, [user, profile]);

  if (suggestions.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 rounded-full bg-primary" />
        <h3 className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          For You
        </h3>
        <Badge variant="outline" className="text-[9px] py-0 px-1.5 text-primary border-primary/30">
          Personalised
        </Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        {suggestions.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card
              className="p-3.5 sm:p-4 cursor-pointer hover:shadow-md active:scale-[0.97] transition-all"
              onClick={() => navigate(s.path)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 mt-2" />
              </div>
              <h4 className="font-display font-bold text-xs sm:text-sm mt-2.5 line-clamp-2">{s.title}</h4>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
