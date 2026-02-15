import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, Loader2, Zap, ExternalLink,
  TrendingUp, ShoppingBag, BarChart3, ShoppingCart,
} from "lucide-react";
import { ArbitrageCardSkeleton } from "@/components/LoadingSkeletons";
import { UseCaseSpotlight } from "@/components/UseCaseSpotlight";

const RETAILERS = [
  { id: "ASOS Outlet", label: "ASOS Outlet", color: "bg-[hsl(200,70%,50%)]/10 text-[hsl(200,70%,50%)] border-[hsl(200,70%,50%)]/20" },
  { id: "End Clothing", label: "End Clothing", color: "bg-[hsl(0,0%,20%)]/10 text-[hsl(0,0%,40%)] border-[hsl(0,0%,20%)]/20" },
  { id: "TK Maxx", label: "TK Maxx", color: "bg-[hsl(0,70%,50%)]/10 text-[hsl(0,70%,50%)] border-[hsl(0,70%,50%)]/20" },
  { id: "Nike Clearance", label: "Nike", color: "bg-[hsl(25,90%,55%)]/10 text-[hsl(25,90%,55%)] border-[hsl(25,90%,55%)]/20" },
  { id: "Adidas Outlet", label: "Adidas", color: "bg-[hsl(210,10%,30%)]/10 text-[hsl(210,10%,30%)] border-[hsl(210,10%,30%)]/20" },
  { id: "ZARA Sale", label: "ZARA", color: "bg-[hsl(0,0%,10%)]/10 text-[hsl(0,0%,10%)] border-[hsl(0,0%,10%)]/20" },
];

type Opportunity = {
  retailer: string;
  item_title: string;
  item_url: string | null;
  sale_price: number;
  vinted_resale_price: number;
  estimated_profit: number;
  profit_margin: number;
  brand: string;
  category: string;
  ai_notes: string;
};

function getRetailerColor(retailer: string) {
  return RETAILERS.find((r) => r.id === retailer)?.color || "bg-muted text-muted-foreground";
}

function getMarginColor(margin: number) {
  if (margin >= 60) return "text-success";
  if (margin >= 40) return "text-accent";
  return "text-primary";
}

export default function ClearanceRadar() {
  const navigate = useNavigate();

  const [selectedRetailers, setSelectedRetailers] = useState<string[]>([]);
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [minMargin, setMinMargin] = useState(40);
  const [loading, setLoading] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const toggleRetailer = (id: string) => {
    setSelectedRetailers((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const handleScan = async () => {
    if (selectedRetailers.length === 0) {
      toast.error("Select at least one retailer to scan");
      return;
    }

    setLoading(true);
    setOpportunities([]);
    setHasSearched(false);

    try {
      const { data, error } = await supabase.functions.invoke("clearance-radar", {
        body: { retailers: selectedRetailers, brand, category, min_margin: minMargin },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setOpportunities(data?.opportunities || []);
      setHasSearched(true);

      if (data?.opportunities?.length > 0) {
        toast.success(`Found ${data.opportunities.length} clearance opportunities!`);
      } else {
        toast.info("No profitable opportunities found. Try different filters or lower your margin.");
      }
    } catch (e: any) {
      toast.error(e.message || "Scan failed");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const totalPotentialProfit = opportunities.reduce((sum, o) => sum + (o.estimated_profit || 0), 0);
  const avgMargin = opportunities.length > 0
    ? Math.round(opportunities.reduce((sum, o) => sum + (o.profit_margin || 0), 0) / opportunities.length)
    : 0;

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <header className="border-b border-border glass sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display font-bold text-lg flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Retail Clearance Radar
            </h1>
            <p className="text-xs text-muted-foreground">
              Find clearance items to flip on Vinted for profit
            </p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <UseCaseSpotlight
          featureKey="clearance-radar"
          icon={ShoppingCart}
          scenario="ASOS Outlet has a flash sale but you don't know which items actually resell well on Vinted..."
          description="Buying clearance blindly means half your stock never sells. You need data to pick winners."
          outcome="Clearance Radar cross-references sale prices vs Vinted resale and highlights 8 items with 50%+ margins."
          tip="Check multiple retailers at once to find the best cross-platform opportunities."
        />
        {/* Search Form */}
        <Card className="p-6 mb-8">
          <h2 className="font-display font-bold text-base mb-4 flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            Select Retailers to Scan
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
            {RETAILERS.map((retailer) => (
              <label
                key={retailer.id}
                className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedRetailers.includes(retailer.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <Checkbox
                  checked={selectedRetailers.includes(retailer.id)}
                  onCheckedChange={() => toggleRetailer(retailer.id)}
                />
                <span className="text-sm font-medium">{retailer.label}</span>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="text-xs">Brand (optional)</Label>
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Nike, Carhartt, Levi's"
              />
            </div>
            <div>
              <Label className="text-xs">Category (optional)</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Jacket, Trainers, Bag"
              />
            </div>
          </div>

          <div className="mb-5">
            <Label className="text-xs">Minimum Profit Margin: {minMargin}%</Label>
            <Slider
              value={[minMargin]}
              onValueChange={(v) => setMinMargin(v[0])}
              min={10}
              max={80}
              step={5}
              className="mt-2"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>10% (more results)</span>
              <span>80% (high margin only)</span>
            </div>
          </div>

          <Button onClick={handleScan} disabled={loading || selectedRetailers.length === 0} className="w-full font-semibold">
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Scanning clearance pages...</>
            ) : (
              <><Zap className="w-4 h-4 mr-2" /> Scan Clearance</>
            )}
          </Button>
        </Card>

        {/* Loading */}
        {loading && <ArbitrageCardSkeleton count={4} />}

        {/* Results */}
        {hasSearched && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {opportunities.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-3 sm:p-4">
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Opportunities</p>
                  <p className="font-display text-2xl font-bold">{opportunities.length}</p>
                </Card>
                <Card className="p-3 sm:p-4">
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Total Potential</p>
                  <p className="font-display text-2xl font-bold text-success">£{totalPotentialProfit.toFixed(0)}</p>
                </Card>
                <Card className="p-3 sm:p-4">
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Avg Margin</p>
                  <p className={`font-display text-2xl font-bold ${getMarginColor(avgMargin)}`}>{avgMargin}%</p>
                </Card>
              </div>
            )}

            {opportunities.length === 0 ? (
              <Card className="p-8 text-center">
                <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-display font-bold text-lg mb-2">No opportunities found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  No clearance items matched with ≥{minMargin}% margin on Vinted. Try more retailers, different filters, or a lower margin.
                </p>
                <Button onClick={() => setMinMargin(Math.max(10, minMargin - 10))} variant="outline" size="sm">
                  Lower margin to {Math.max(10, minMargin - 10)}%
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                <h3 className="font-display font-bold text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  {opportunities.length} Clearance Flip Opportunities
                </h3>

                <AnimatePresence>
                  {opportunities.map((opp, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <Card className="p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-display font-bold text-sm truncate">{opp.item_title}</h4>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className={`text-[10px] ${getRetailerColor(opp.retailer)}`}>
                                {opp.retailer}
                              </Badge>
                              {opp.brand && <Badge variant="outline" className="text-[10px]">{opp.brand}</Badge>}
                              {opp.category && <Badge variant="outline" className="text-[10px] text-muted-foreground">{opp.category}</Badge>}
                            </div>
                          </div>
                          <div className="bg-success/10 rounded-xl px-3 py-2 text-center shrink-0">
                            <p className="font-display text-lg font-extrabold text-success leading-none">+£{opp.estimated_profit?.toFixed(0)}</p>
                            <p className="text-[9px] text-success/80 mt-0.5">{opp.profit_margin?.toFixed(0)}% margin</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mb-3 p-3 rounded-lg bg-muted/50">
                          <div className="flex-1 text-center">
                            <p className="text-[10px] text-muted-foreground">Buy at {opp.retailer}</p>
                            <p className="font-display font-bold text-base">£{opp.sale_price?.toFixed(2)}</p>
                          </div>
                          <TrendingUp className="w-5 h-5 text-success shrink-0" />
                          <div className="flex-1 text-center">
                            <p className="text-[10px] text-muted-foreground">Sell on Vinted</p>
                            <p className="font-display font-bold text-base text-success">£{opp.vinted_resale_price?.toFixed(2)}</p>
                          </div>
                        </div>

                        {opp.ai_notes && (
                          <p className="text-xs text-muted-foreground leading-relaxed mb-3">{opp.ai_notes}</p>
                        )}

                        {opp.item_url && (
                          <a href={opp.item_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="text-xs">
                              <ExternalLink className="w-3 h-3 mr-1" /> Buy Now
                            </Button>
                          </a>
                        )}
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            <div className="flex justify-center pt-4">
              <Button onClick={() => { setHasSearched(false); setOpportunities([]); }} variant="outline">
                New Search
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
