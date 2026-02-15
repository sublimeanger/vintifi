import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, ShoppingBag, TrendingUp, Star,
  PoundSterling, Lightbulb, MapPin, ChevronDown, ChevronUp, Search,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { BriefingCardSkeleton } from "@/components/LoadingSkeletons";
import { UseCaseSpotlight } from "@/components/UseCaseSpotlight";

type BriefingItem = {
  brand: string;
  item_type: string;
  category: string;
  max_buy_price: number;
  estimated_sell_price: number;
  demand_signal: "rising" | "peaking" | "stable";
  tip: string;
};

type Briefing = {
  generated_at: string;
  summary: string;
  items: BriefingItem[];
  general_tips: string[];
};

const signalConfig = {
  rising: { label: "Rising", className: "bg-success/15 text-success border-success/30" },
  peaking: { label: "Hot", className: "bg-primary/15 text-primary border-primary/30" },
  stable: { label: "Stable", className: "bg-muted text-muted-foreground border-border" },
};

export default function CharityBriefing() {
  const navigate = useNavigate();
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  const generateBriefing = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("charity-briefing");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setBriefing(data);
      toast.success("Briefing ready — happy hunting! 🛍️");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate briefing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Charity Shop Briefing"
      subtitle="What to look for today"
      icon={<MapPin className="w-5 h-5 text-primary" />}
      maxWidth="max-w-lg"
      actions={
        briefing ? (
          <Button variant="outline" size="sm" onClick={generateBriefing} disabled={loading} className="shrink-0 active:scale-95 transition-transform">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        ) : undefined
      }
    >
      <UseCaseSpotlight
        featureKey="charity-briefing"
        icon={MapPin}
        scenario="You're heading to the charity shop on Saturday but always end up buying random stuff that doesn't sell..."
        description="Without a game plan, you waste time and money on items with no resale demand."
        outcome="Open your Charity Briefing on your phone: a curated list of exactly what's trending, what to pay, and what you'll sell it for."
        tip="Generate a fresh briefing each time you go — trends change weekly."
      />

      {!briefing && !loading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-10 sm:py-12">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5 sm:mb-6">
            <MapPin className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
          </div>
          <h2 className="font-display text-lg sm:text-xl font-bold mb-2">Ready for a sourcing trip?</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mb-6 sm:mb-8 max-w-xs mx-auto">
            Get an AI-powered list of high-demand items to look for at charity shops, based on real Vinted trends.
          </p>
          <Button onClick={generateBriefing} size="lg" className="font-semibold px-8 h-12 active:scale-95 transition-transform">
            <ShoppingBag className="w-5 h-5 mr-2" />
            Generate Today's Briefing
          </Button>
        </motion.div>
      )}

      {loading && !briefing && (
        <BriefingCardSkeleton count={6} />
      )}

      {briefing && (
        <AnimatePresence mode="wait">
          <motion.div key="briefing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 sm:space-y-4">
            {/* Summary card */}
            <Card className="p-3.5 sm:p-4 border-primary/20 bg-primary/[0.03]">
              <div className="flex items-start gap-3">
                <Star className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs sm:text-sm font-medium leading-snug">{briefing.summary}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                    {new Date(briefing.generated_at).toLocaleString("en-GB", {
                      weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </Card>

            {/* Items list */}
            <div className="space-y-2">
              <h3 className="font-display font-bold text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider px-1">
                Items to look for ({briefing.items.length})
              </h3>
              {briefing.items.map((item, i) => {
                const profit = item.estimated_sell_price - item.max_buy_price;
                const margin = Math.round((profit / item.estimated_sell_price) * 100);
                const signal = signalConfig[item.demand_signal] || signalConfig.stable;
                const isExpanded = expandedItem === i;

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Card
                      className="p-3.5 sm:p-4 cursor-pointer active:scale-[0.99] transition-transform"
                      onClick={() => setExpandedItem(isExpanded ? null : i)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-display font-bold text-sm">{item.brand}</span>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${signal.className}`}>
                              {signal.label}
                            </Badge>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground">{item.item_type}</p>
                          <p className="text-[10px] text-muted-foreground/60">{item.category}</p>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1">
                            <PoundSterling className="w-3 h-3 text-success" />
                            <span className="font-display font-bold text-success text-sm">+{profit.toFixed(0)}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{margin}% margin</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 pt-3 border-t border-border space-y-2">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Buy for max</span>
                                <span className="font-semibold">£{item.max_buy_price.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Sell on Vinted for</span>
                                <span className="font-semibold text-success">£{item.estimated_sell_price.toFixed(2)}</span>
                              </div>
                              <div className="flex items-start gap-2 mt-2 p-2 rounded-md bg-accent/10">
                                <Lightbulb className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                                <p className="text-xs text-foreground/80">{item.tip}</p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-[10px] sm:text-xs mt-2 w-full h-10 sm:h-9 active:scale-95 transition-transform"
                                onClick={(e) => { e.stopPropagation(); navigate(`/price-check?brand=${encodeURIComponent(item.brand)}&category=${encodeURIComponent(item.category)}`); }}
                              >
                                <Search className="w-3 h-3 mr-1" /> Price Check {item.brand}
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* General tips */}
            {briefing.general_tips?.length > 0 && (
              <Card className="p-3.5 sm:p-4">
                <h3 className="font-display font-bold text-sm mb-2.5 sm:mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-accent" />
                  Pro Tips
                </h3>
                <ul className="space-y-2">
                  {briefing.general_tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                      <span className="text-accent font-bold mt-px">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </PageShell>
  );
}
