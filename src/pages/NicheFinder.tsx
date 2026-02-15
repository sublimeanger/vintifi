import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, Loader2, Zap, TrendingUp, TrendingDown,
  BarChart3, ShoppingBag, Users, Lightbulb,
} from "lucide-react";
import { ArbitrageCardSkeleton } from "@/components/LoadingSkeletons";

const CATEGORIES = [
  "Womenswear", "Menswear", "Streetwear", "Vintage",
  "Designer", "Shoes", "Accessories", "Kids", "Home",
];

const PRICE_RANGES = [
  { value: "under £10", label: "Under £10" },
  { value: "£10-£25", label: "£10 – £25" },
  { value: "£25-£50", label: "£25 – £50" },
  { value: "£50-£100", label: "£50 – £100" },
  { value: "over £100", label: "£100+" },
];

type Niche = {
  niche_name: string;
  category: string;
  demand_level: "high" | "medium" | "low";
  supply_level: "high" | "medium" | "low";
  opportunity_score: number;
  avg_price: number;
  estimated_monthly_sales: number;
  competition_count: number;
  sourcing_tips: string;
  ai_reasoning: string;
};

function scoreColor(score: number) {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-accent";
  return "text-primary";
}

function scoreBg(score: number) {
  if (score >= 80) return "bg-success/10 border-success/20";
  if (score >= 60) return "bg-accent/10 border-accent/20";
  return "bg-primary/10 border-primary/20";
}

function levelBar(level: "high" | "medium" | "low") {
  if (level === "high") return "w-full";
  if (level === "medium") return "w-2/3";
  return "w-1/3";
}

export default function NicheFinder() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [niches, setNiches] = useState<Niche[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleScan = async () => {
    if (selectedCategories.length === 0) {
      toast.error("Select at least one category");
      return;
    }
    setLoading(true);
    setNiches([]);
    setHasSearched(false);

    try {
      const { data, error } = await supabase.functions.invoke("niche-finder", {
        body: {
          categories: selectedCategories,
          price_range: priceRange || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setNiches(data?.niches || []);
      setHasSearched(true);

      if (data?.niches?.length > 0) {
        toast.success(`Found ${data.niches.length} niche opportunities!`);
      } else {
        toast.info("No strong niches found. Try different categories.");
      }
    } catch (e: any) {
      toast.error(e.message || "Scan failed");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const topScore = niches.length > 0 ? Math.max(...niches.map((n) => n.opportunity_score)) : 0;

  return (
    <PageShell
      title="Niche Opportunity Finder"
      subtitle="Find underserved Vinted niches with high demand and low supply"
      icon={<Target className="w-5 h-5 text-primary" />}
    >
      {/* Filters */}
      <Card className="p-6 mb-8">
        <h2 className="font-display font-bold text-base mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Select Categories to Analyse
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          {CATEGORIES.map((cat) => (
            <label
              key={cat}
              className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedCategories.includes(cat)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <Checkbox
                checked={selectedCategories.includes(cat)}
                onCheckedChange={() => toggleCategory(cat)}
              />
              <span className="text-sm font-medium">{cat}</span>
            </label>
          ))}
        </div>

        <div className="mb-5">
          <Label className="text-xs mb-1.5 block">Price Range (optional)</Label>
          <Select value={priceRange} onValueChange={setPriceRange}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="All price ranges" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All price ranges</SelectItem>
              {PRICE_RANGES.map((pr) => (
                <SelectItem key={pr.value} value={pr.value}>
                  {pr.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleScan} disabled={loading || selectedCategories.length === 0} className="w-full font-semibold">
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Analysing niches...</>
          ) : (
            <><Zap className="w-4 h-4 mr-2" /> Find Niches</>
          )}
        </Button>
      </Card>

      {/* Loading */}
      {loading && <ArbitrageCardSkeleton count={4} />}

      {/* Results */}
      {hasSearched && !loading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {niches.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 sm:p-4">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Niches Found</p>
                <p className="font-display text-2xl font-bold">{niches.length}</p>
              </Card>
              <Card className="p-3 sm:p-4">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Top Score</p>
                <p className={`font-display text-2xl font-bold ${scoreColor(topScore)}`}>{topScore}</p>
              </Card>
              <Card className="p-3 sm:p-4">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Categories</p>
                <p className="font-display text-2xl font-bold">{selectedCategories.length}</p>
              </Card>
            </div>
          )}

          {niches.length === 0 ? (
            <Card className="p-8 text-center">
              <Target className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-display font-bold text-lg mb-2">No strong niches found</h3>
              <p className="text-sm text-muted-foreground">
                Try selecting different categories or adjusting the price range.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              <h3 className="font-display font-bold text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                {niches.length} Niche Opportunities
              </h3>

              <AnimatePresence>
                {niches.map((niche, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <Card className="p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-display font-bold text-sm">{niche.niche_name}</h4>
                          <Badge variant="outline" className="text-[10px] mt-1">{niche.category}</Badge>
                        </div>
                        <div className={`rounded-xl px-3 py-2 text-center shrink-0 border ${scoreBg(niche.opportunity_score)}`}>
                          <p className={`font-display text-lg font-extrabold leading-none ${scoreColor(niche.opportunity_score)}`}>
                            {niche.opportunity_score}
                          </p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">score</p>
                        </div>
                      </div>

                      {/* Supply vs Demand bars */}
                      <div className="grid grid-cols-2 gap-3 mb-3 p-3 rounded-lg bg-muted/50">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <TrendingUp className="w-3 h-3 text-success" />
                            <span className="text-[10px] font-medium text-muted-foreground">Demand</span>
                            <span className="text-[10px] font-semibold capitalize">{niche.demand_level}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full bg-success rounded-full ${levelBar(niche.demand_level)}`} />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <TrendingDown className="w-3 h-3 text-destructive" />
                            <span className="text-[10px] font-medium text-muted-foreground">Supply</span>
                            <span className="text-[10px] font-semibold capitalize">{niche.supply_level}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full bg-destructive/60 rounded-full ${levelBar(niche.supply_level)}`} />
                          </div>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Avg Price</p>
                          <p className="font-display font-bold text-sm">£{niche.avg_price}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                            <ShoppingBag className="w-2.5 h-2.5" /> Monthly Sales
                          </p>
                          <p className="font-display font-bold text-sm">{niche.estimated_monthly_sales}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                            <Users className="w-2.5 h-2.5" /> Competitors
                          </p>
                          <p className="font-display font-bold text-sm">{niche.competition_count}</p>
                        </div>
                      </div>

                      {/* Sourcing tips */}
                      {niche.sourcing_tips && (
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 mb-2">
                          <p className="text-xs flex items-start gap-1.5">
                            <Lightbulb className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                            <span>{niche.sourcing_tips}</span>
                          </p>
                        </div>
                      )}

                      {niche.ai_reasoning && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{niche.ai_reasoning}</p>
                      )}
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          <div className="flex justify-center pt-4">
            <Button onClick={() => { setHasSearched(false); setNiches([]); }} variant="outline">
              New Search
            </Button>
          </div>
        </motion.div>
      )}
    </PageShell>
  );
}
