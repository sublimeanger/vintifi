import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { PageShell } from "@/components/PageShell";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import {
  Search, Loader2, Zap, BarChart3, CheckCircle2, TrendingUp,
  ArrowRight, RotateCcw, Sparkles, ExternalLink,
} from "lucide-react";
import { UseCaseSpotlight } from "@/components/UseCaseSpotlight";
import { PriceReportSkeleton } from "@/components/LoadingSkeletons";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

type PriceReport = {
  recommended_price: number;
  confidence_score: number;
  price_range_low: number;
  price_range_high: number;
  comparable_items: Array<{
    title: string;
    price: number;
    sold: boolean;
    days_listed?: number;
    url?: string;
  }>;
  ai_insights: string;
  price_distribution: Array<{ range: string; count: number }>;
  item_title: string;
  item_brand: string;
};

export default function PriceCheck() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, credits, refreshCredits } = useAuth();

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
      toast.error("You've used all your price checks this month. Upgrade to get more!");
      return;
    }

    setLoading(true);
    setReport(null);

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

  return (
    <PageShell
      title="Price Intelligence"
      subtitle={credits ? `${credits.credits_limit - credits.price_checks_used} checks remaining` : ""}
      maxWidth="max-w-4xl"
    >
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
              <Input value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="e.g. Good, Very Good, New with tags" className="h-12 sm:h-11 text-base sm:text-sm" />
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
              Recommended Price
            </p>
            <p className="font-display text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight">
              £{report.recommended_price.toFixed(2)}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Market range: <span className="font-semibold text-foreground">£{report.price_range_low.toFixed(2)}</span> – <span className="font-semibold text-foreground">£{report.price_range_high.toFixed(2)}</span>
            </p>
            {report.item_title && (
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-3 truncate">{report.item_brand && `${report.item_brand} · `}{report.item_title}</p>
            )}
          </Card>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
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
          </div>

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
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 active:bg-muted/70 transition-colors group"
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
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-center pt-2 pb-4">
            <Button
              onClick={() => { setReport(null); setUrl(""); setBrand(""); setCategory(""); setCondition(""); }}
              variant="outline"
              className="w-full sm:w-auto h-12 sm:h-10 active:scale-95 transition-transform"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              New Analysis
            </Button>
            <Button
              onClick={() => navigate(`/optimize?brand=${encodeURIComponent(report.item_brand || brand)}&title=${encodeURIComponent(report.item_title || "")}`)}
              className="w-full sm:w-auto h-12 sm:h-10 active:scale-95 transition-transform"
            >
              <Zap className="w-4 h-4 mr-2" />
              Optimise This Listing
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </motion.div>
      )}

      <MobileBottomNav />
    </PageShell>
  );
}
