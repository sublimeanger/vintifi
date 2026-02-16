import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { PageShell } from "@/components/PageShell";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import {
  Search, Loader2, Zap, BarChart3, CheckCircle2, TrendingUp,
  ArrowRight, RotateCcw, Sparkles, ExternalLink, ShoppingBag, Eye,
  ArrowRightLeft, Camera, Clock, Flame, Calculator, PoundSterling, Tag,
} from "lucide-react";
import { JourneyBanner } from "@/components/JourneyBanner";
import { UseCaseSpotlight } from "@/components/UseCaseSpotlight";
import { PriceReportSkeleton } from "@/components/LoadingSkeletons";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { UpgradeModal } from "@/components/UpgradeModal";
import { SellSmartProgress } from "@/components/SellSmartProgress";

type PriceReport = {
  recommended_price: number;
  confidence_score: number;
  price_range_low: number;
  price_range_high: number;
  item_title: string;
  item_brand: string;
  condition_detected?: string;
  buy_price_good?: number;
  buy_price_max?: number;
  estimated_resale?: number;
  estimated_days_to_sell?: number;
  demand_level?: "high" | "medium" | "low";
  condition_price_breakdown?: Array<{ condition: string; avg_price: number; count: number }>;
  estimated_fees?: number;
  estimated_shipping?: number;
  net_profit_estimate?: number;
  comparable_items: Array<{
    title: string;
    price: number;
    sold: boolean;
    days_listed?: number;
    url?: string;
    condition?: string;
  }>;
  ai_insights: string;
  price_distribution: Array<{ range: string; count: number }>;
};

const CONDITION_OPTIONS = [
  { value: "new_with_tags", label: "New with tags" },
  { value: "new_without_tags", label: "New without tags" },
  { value: "very_good", label: "Very good" },
  { value: "good", label: "Good" },
  { value: "satisfactory", label: "Satisfactory" },
];

export default function PriceCheck() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, credits, refreshCredits } = useAuth();
  const gate = useFeatureGate("price_check");

  const paramBrand = searchParams.get("brand") || "";
  const paramCategory = searchParams.get("category") || "";
  const paramCondition = searchParams.get("condition") || "";
  const hasManualParams = !!(paramBrand || paramCategory || paramCondition);

  const [url, setUrl] = useState(searchParams.get("url") || "");
  const [brand, setBrand] = useState(paramBrand);
  const [category, setCategory] = useState(paramCategory);
  const [condition, setCondition] = useState(paramCondition);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<PriceReport | null>(null);
  const [inputMode, setInputMode] = useState<"url" | "manual">(hasManualParams ? "manual" : "url");
  const [yourCost, setYourCost] = useState("");

  useEffect(() => {
    const urlParam = searchParams.get("url");
    if (urlParam) {
      setUrl(urlParam);
      handleAnalyze(urlParam);
    }
  }, []);

  const handleAnalyze = async (overrideUrl?: string) => {
    const targetUrl = overrideUrl || url;
    if (!targetUrl.trim() && inputMode === "url") {
      toast.error("Enter a Vinted URL"); return;
    }
    if (inputMode === "manual" && !brand && !category) {
      toast.error("Enter at least a brand or category"); return;
    }

    if (credits && credits.price_checks_used >= credits.credits_limit) {
      gate.showUpgrade();
      return;
    }

    setLoading(true);
    setReport(null);
    setYourCost("");

    try {
      const { data, error } = await supabase.functions.invoke("price-check", {
        body: {
          url: inputMode === "url" ? targetUrl : undefined,
          brand: inputMode === "manual" ? brand : undefined,
          category: inputMode === "manual" ? category : undefined,
          condition: inputMode === "manual" ? condition : undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setReport(data);
      await refreshCredits();
      toast.success("Price analysis complete!");
    } catch (err: any) {
      toast.error(err.message || "Analysis failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-accent";
    return "text-destructive";
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 80) return "High";
    if (score >= 60) return "Medium";
    return "Low";
  };

  const getConfidenceBg = (score: number) => {
    if (score >= 80) return "bg-success/10 border-success/20";
    if (score >= 60) return "bg-accent/10 border-accent/20";
    return "bg-destructive/10 border-destructive/20";
  };

  const getDemandColor = (level?: string) => {
    if (level === "high") return "text-success bg-success/10 border-success/30";
    if (level === "medium") return "text-accent bg-accent/10 border-accent/30";
    return "text-destructive bg-destructive/10 border-destructive/30";
  };

  const getDemandIcon = (level?: string) => {
    if (level === "high") return <Flame className="w-3 h-3" />;
    if (level === "medium") return <TrendingUp className="w-3 h-3" />;
    return <Clock className="w-3 h-3" />;
  };

  const calcProfit = () => {
    if (!report) return null;
    const cost = parseFloat(yourCost);
    if (isNaN(cost) || cost <= 0) return null;
    const resale = report.estimated_resale || report.recommended_price;
    const fees = report.estimated_fees || resale * 0.05;
    const shipping = report.estimated_shipping || 3.5;
    return resale - fees - shipping - cost;
  };

  return (
    <PageShell
      title="Price Intelligence"
      subtitle={credits ? `${credits.credits_limit - credits.price_checks_used} checks remaining` : ""}
      maxWidth="max-w-4xl"
    >
      <SellSmartProgress currentStep="price-check" className="mb-5" />

      <UseCaseSpotlight
        featureKey="price-check"
        icon={Search}
        scenario="You found a pair of Dr. Martens 1460s at a car boot sale for £8..."
        description="But you have no idea what they're actually worth on Vinted. Price too high and it'll sit for weeks. Too low and you're leaving money on the table."
        outcome="Price Check reveals they sell for £45–55 on Vinted. You list at £49 and sell within 3 days."
        tip="Check sold items, not just active listings — sold prices show what buyers actually pay."
      />

      {/* Input Section */}
      <Card className="p-4 sm:p-6 mb-5 sm:mb-8 border-border/50">
        {/* Mode Toggle */}
        <div className="flex gap-1 mb-4 sm:mb-5 bg-muted/60 p-1 rounded-lg w-fit">
          {(["url", "manual"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setInputMode(mode)}
              className={`px-4 py-2.5 sm:py-2 rounded-md text-sm font-medium transition-all active:scale-95 ${
                inputMode === mode
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode === "url" ? "Vinted URL" : "Manual Entry"}
            </button>
          ))}
        </div>

        {inputMode === "url" ? (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.vinted.co.uk/items/..."
              className="flex-1 h-12 sm:h-11 text-base sm:text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            />
            <Button onClick={() => handleAnalyze()} disabled={loading} className="font-semibold h-12 sm:h-11 px-6 sm:w-auto w-full active:scale-95 transition-transform">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
              Analyse
            </Button>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Brand</Label>
                <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Nike, Zara" className="h-12 sm:h-11 text-base sm:text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. T-shirt, Jacket" className="h-12 sm:h-11 text-base sm:text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Condition</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger className="h-12 sm:h-11 text-base sm:text-sm">
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => handleAnalyze()} disabled={loading} className="w-full sm:w-auto font-semibold h-12 sm:h-11 px-6 active:scale-95 transition-transform">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
              Get Price Analysis
            </Button>
          </div>
        )}
      </Card>

      {/* Loading State */}
      {loading && <PriceReportSkeleton />}

      {/* Report */}
      {report && !loading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 sm:space-y-5">
          {/* Hero Price Card */}
          <Card className="p-5 sm:p-8 border-primary/20 bg-gradient-to-br from-primary/[0.04] to-transparent relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
            <p className="text-[10px] sm:text-sm text-muted-foreground mb-1 font-medium flex items-center gap-1.5 uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              Sell At Price
            </p>
            <p className="font-display text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight">
              £{report.recommended_price.toFixed(2)}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Market range: <span className="font-semibold text-foreground">£{report.price_range_low.toFixed(2)}</span> – <span className="font-semibold text-foreground">£{report.price_range_high.toFixed(2)}</span>
            </p>
            {report.net_profit_estimate != null && (
              <p className="text-xs text-success font-semibold mt-1.5">
                Est. net profit: £{report.net_profit_estimate.toFixed(2)} after fees & shipping
              </p>
            )}
            {report.item_title && (
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-3 truncate">{report.item_brand && `${report.item_brand} · `}{report.item_title}</p>
            )}
          </Card>

          {/* Reseller Guide */}
          {(report.buy_price_good != null || report.buy_price_max != null || report.estimated_resale != null) && (
            <Card className="p-4 sm:p-6">
              <h3 className="font-display font-bold text-xs sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
                <PoundSterling className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Reseller Guide
              </h3>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="text-center p-3 rounded-xl bg-success/10 border border-success/20">
                  <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-success mb-1">Good Buy</p>
                  <p className="font-display text-xl sm:text-2xl font-extrabold text-success">
                    £{(report.buy_price_good ?? 0).toFixed(0)}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Great deal</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-accent/10 border border-accent/20">
                  <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-accent mb-1">Max Buy</p>
                  <p className="font-display text-xl sm:text-2xl font-extrabold text-accent">
                    £{(report.buy_price_max ?? 0).toFixed(0)}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Still profitable</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">Resale</p>
                  <p className="font-display text-xl sm:text-2xl font-extrabold text-primary">
                    £{(report.estimated_resale ?? report.recommended_price).toFixed(0)}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Sell price</p>
                </div>
              </div>
            </Card>
          )}

          {/* Stats Row: Confidence + Demand + Sell Speed */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <Card className={`p-3 sm:p-4 ${getConfidenceBg(report.confidence_score)}`}>
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">Confidence</p>
              <div className="flex items-baseline gap-2">
                <p className={`font-display text-2xl sm:text-3xl font-extrabold ${getConfidenceColor(report.confidence_score)}`}>
                  {report.confidence_score}%
                </p>
                <Badge variant="outline" className={`${getConfidenceColor(report.confidence_score)} text-[9px] sm:text-[10px] py-0`}>
                  {getConfidenceLabel(report.confidence_score)}
                </Badge>
              </div>
            </Card>
            <Card className="p-3 sm:p-4 bg-muted/30">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">Comparables</p>
              <p className="font-display text-2xl sm:text-3xl font-extrabold">
                {report.comparable_items?.length || 0}
              </p>
              <p className="text-[10px] text-muted-foreground">items analysed</p>
            </Card>
            {report.demand_level && (
              <Card className={`p-3 sm:p-4 ${getDemandColor(report.demand_level)}`}>
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">Demand</p>
                <div className="flex items-center gap-1.5">
                  {getDemandIcon(report.demand_level)}
                  <p className="font-display text-lg sm:text-xl font-extrabold capitalize">{report.demand_level}</p>
                </div>
              </Card>
            )}
            {report.estimated_days_to_sell != null && (
              <Card className="p-3 sm:p-4 bg-muted/30">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">Sell Speed</p>
                <p className="font-display text-2xl sm:text-3xl font-extrabold">{report.estimated_days_to_sell}</p>
                <p className="text-[10px] text-muted-foreground">days to sell</p>
              </Card>
            )}
          </div>

          {/* Condition Price Breakdown */}
          {report.condition_price_breakdown && report.condition_price_breakdown.length > 0 && (
            <Card className="p-3 sm:p-6">
              <h3 className="font-display font-bold text-xs sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
                <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Price by Condition
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] sm:text-xs">Condition</TableHead>
                    <TableHead className="text-[10px] sm:text-xs text-right">Avg Price</TableHead>
                    <TableHead className="text-[10px] sm:text-xs text-right">Listings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.condition_price_breakdown.map((row) => (
                    <TableRow key={row.condition}>
                      <TableCell className="text-xs sm:text-sm font-medium">{row.condition}</TableCell>
                      <TableCell className="text-xs sm:text-sm text-right font-semibold">£{row.avg_price.toFixed(2)}</TableCell>
                      <TableCell className="text-xs sm:text-sm text-right text-muted-foreground">{row.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Profit Calculator */}
          <Card className="p-4 sm:p-6">
            <h3 className="font-display font-bold text-xs sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
              <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Profit Calculator
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs sm:text-sm mb-4">
              <div>
                <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">Resale</p>
                <p className="font-semibold">£{(report.estimated_resale ?? report.recommended_price).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">Fees (~5%)</p>
                <p className="font-semibold text-destructive">-£{(report.estimated_fees ?? (report.recommended_price * 0.05)).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">Shipping</p>
                <p className="font-semibold text-destructive">-£{(report.estimated_shipping ?? 3.50).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">Net Profit</p>
                <p className="font-semibold text-success">£{(report.net_profit_estimate ?? (report.recommended_price * 0.95 - 3.5)).toFixed(2)}</p>
              </div>
            </div>
            <div className="border-t border-border/50 pt-3 flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0">Your cost £</Label>
              <Input
                value={yourCost}
                onChange={(e) => setYourCost(e.target.value)}
                placeholder="What did you pay?"
                className="h-10 sm:h-9 text-sm w-full sm:w-32"
                type="number"
                min="0"
                step="0.50"
              />
              {calcProfit() !== null && (
                <p className={`text-sm font-bold ${calcProfit()! >= 0 ? "text-success" : "text-destructive"}`}>
                  {calcProfit()! >= 0 ? "+" : ""}£{calcProfit()!.toFixed(2)} profit
                </p>
              )}
            </div>
          </Card>

          {/* Price Distribution Chart */}
          {report.price_distribution && report.price_distribution.length > 0 && (
            <Card className="p-3 sm:p-6">
              <h3 className="font-display font-bold text-xs sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Price Distribution
              </h3>
              <ResponsiveContainer width="100%" height={180} className="sm:!h-[200px]">
                <BarChart data={report.price_distribution}>
                  <XAxis dataKey="range" tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={45} />
                  <YAxis tick={{ fontSize: 9 }} width={26} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--background))",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {report.price_distribution.map((_, i) => (
                      <Cell key={i} fill={`hsl(350, 75%, ${55 + i * 5}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Comparable Items */}
          {report.comparable_items && report.comparable_items.length > 0 && (
            <Card className="p-3 sm:p-6">
              <h3 className="font-display font-bold text-xs sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Comparable Items
              </h3>
              <div className="space-y-1.5 sm:space-y-2">
                {report.comparable_items.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`flex items-center justify-between p-3 rounded-xl transition-colors group ${
                      item.sold
                        ? "bg-success/5 hover:bg-success/10 border border-success/10"
                        : "bg-muted/40 hover:bg-muted/60 border border-transparent"
                    }`}
                    onClick={() => item.url && window.open(item.url, "_blank")}
                    role={item.url ? "link" : undefined}
                    style={item.url ? { cursor: "pointer" } : undefined}
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-xs sm:text-sm font-medium truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {item.sold ? (
                          <Badge variant="outline" className="text-success border-success/30 text-[9px] sm:text-[10px] py-0">
                            <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5" /> Sold
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-[9px] sm:text-[10px] py-0">Active</Badge>
                        )}
                        {item.condition && (
                          <Badge variant="secondary" className="text-[9px] sm:text-[10px] py-0">{item.condition}</Badge>
                        )}
                        {item.days_listed != null && (
                          <span className="text-[10px] text-muted-foreground">{item.days_listed}d</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <p className="font-display font-bold text-sm sm:text-lg">£{item.price.toFixed(2)}</p>
                      {item.url && (
                        <ExternalLink className="w-3 h-3 text-muted-foreground/50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          )}

          {/* AI Insights */}
          {report.ai_insights && (
            <Card className="p-4 sm:p-6 border-primary/10 bg-gradient-to-br from-primary/[0.02] to-transparent">
              <h3 className="font-display font-bold text-xs sm:text-lg mb-2 sm:mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                AI Insights
              </h3>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {report.ai_insights}
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-center pt-2 pb-4 flex-wrap">
            <Button
              onClick={() => { setReport(null); setUrl(""); setBrand(""); setCategory(""); setCondition(""); setYourCost(""); }}
              variant="outline"
              className="w-full sm:w-auto h-12 sm:h-10 active:scale-95 transition-transform"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              New Analysis
            </Button>
            {/* Save preview */}
            <p className="text-[10px] sm:text-xs text-muted-foreground text-center sm:text-left">
              Adding to inventory: <span className="font-semibold text-foreground">"{`${brand} ${category}`.trim() || url || "Untitled"}"</span>
              {report.recommended_price != null && <> at guideline price <span className="font-semibold text-foreground">£{report.recommended_price.toFixed(0)}</span></>}
            </p>
            <Button
              onClick={async () => {
                if (!user) { toast.error("Sign in to save"); return; }
                const { error } = await supabase.from("listings").insert({
                  user_id: user.id,
                  title: `${brand} ${category}`.trim() || url || "Untitled",
                  brand: brand || null,
                  category: category || null,
                  condition: condition || null,
                  purchase_price: report.buy_price_max || null,
                  current_price: report.recommended_price,
                  recommended_price: report.recommended_price,
                  vinted_url: url || null,
                  status: "active",
                });
                if (error) toast.error("Failed to save");
                else toast.success("Saved to your inventory!");
              }}
              variant="outline"
              className="w-full sm:w-auto h-12 sm:h-10 active:scale-95 transition-transform"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Save to Inventory
            </Button>
            <Button
              onClick={() => navigate(`/arbitrage?brand=${encodeURIComponent(brand)}&category=${encodeURIComponent(category)}`)}
              variant="outline"
              className="w-full sm:w-auto h-12 sm:h-10 active:scale-95 transition-transform"
            >
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Find Arbitrage Deals
            </Button>
            <Button
              onClick={() => navigate(`/competitors?brand=${encodeURIComponent(brand)}`)}
              variant="outline"
              className="w-full sm:w-auto h-12 sm:h-10 active:scale-95 transition-transform"
            >
              <Eye className="w-4 h-4 mr-2" />
              Track This Brand
            </Button>
            <Button
              onClick={() => navigate(`/optimize?brand=${encodeURIComponent(brand)}&title=${encodeURIComponent(`${brand} ${category}`.trim())}${url ? `&vintedUrl=${encodeURIComponent(url)}` : ""}`)}
              className="w-full sm:w-auto h-12 sm:h-10 active:scale-95 transition-transform"
            >
              <Zap className="w-4 h-4 mr-2" />
              Optimise This Listing
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Journey Banner */}
          <JourneyBanner
            title="Listing Lifecycle"
            steps={[
              { label: "Price Check", path: "/price-check", icon: Search, completed: true },
              { label: "Optimise", path: `/optimize?brand=${encodeURIComponent(brand)}&title=${encodeURIComponent(`${brand} ${category}`.trim())}${url ? `&vintedUrl=${encodeURIComponent(url)}` : ""}`, icon: Sparkles },
              { label: "Enhance Photos", path: "/vintography", icon: Camera },
              { label: "Inventory", path: "/listings", icon: ShoppingBag },
            ]}
            nextLabel="Optimise This Listing"
            nextPath={`/optimize?brand=${encodeURIComponent(brand)}&title=${encodeURIComponent(`${brand} ${category}`.trim())}${url ? `&vintedUrl=${encodeURIComponent(url)}` : ""}`}
            nextIcon={Sparkles}
          />
        </motion.div>
      )}

      <MobileBottomNav />
      <UpgradeModal
        open={gate.upgradeOpen}
        onClose={gate.hideUpgrade}
        reason={gate.reason}
        tierRequired={gate.tierRequired}
        showCredits
      />
    </PageShell>
  );
}
