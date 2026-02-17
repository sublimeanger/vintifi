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
import { ItemPickerDialog } from "@/components/ItemPickerDialog";

import {
  Search, Loader2, Zap, BarChart3, CheckCircle2, TrendingUp,
  ArrowRight, RotateCcw, Sparkles, ExternalLink, ShoppingBag,
  Camera, Clock, Flame, Calculator, PoundSterling, Tag, ChevronDown,
} from "lucide-react";
import { PriceReportSkeleton } from "@/components/LoadingSkeletons";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { UpgradeModal } from "@/components/UpgradeModal";

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
  const { user, profile, credits, refreshCredits } = useAuth();
  const gate = useFeatureGate("price_check");

  const paramBrand = searchParams.get("brand") || "";
  const paramCategory = searchParams.get("category") || "";
  const paramCondition = searchParams.get("condition") || "";
  const paramTitle = searchParams.get("title") || "";
  const paramSize = searchParams.get("size") || "";
  const paramPurchasePrice = searchParams.get("purchasePrice") || "";
  const itemId = searchParams.get("itemId") || "";
  const hasManualParams = !!(paramBrand || paramCategory || paramCondition);

  const [url, setUrl] = useState(searchParams.get("url") || "");
  const [brand, setBrand] = useState(paramBrand);
  const [category, setCategory] = useState(paramCategory);
  const [condition, setCondition] = useState(paramCondition);
  const [title, setTitle] = useState(paramTitle);
  const [size, setSize] = useState(paramSize);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<PriceReport | null>(null);
  const [inputMode, setInputMode] = useState<"url" | "manual">(hasManualParams ? "manual" : "url");
  const [yourCost, setYourCost] = useState(paramPurchasePrice);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [checkingCache, setCheckingCache] = useState(false);

  // Check for cached report instead of auto-running
  useEffect(() => {
    const urlParam = searchParams.get("url");
    if (urlParam) {
      setUrl(urlParam);
      checkForCachedReport(urlParam);
    }
  }, []);

  const checkForCachedReport = async (vintedUrl: string) => {
    if (!user) return;
    setCheckingCache(true);
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("price_reports")
        .select("*")
        .eq("user_id", user.id)
        .eq("vinted_url", vintedUrl)
        .gte("created_at", twentyFourHoursAgo)
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const cached = data[0];
        setReport({
          recommended_price: cached.recommended_price ?? 0,
          confidence_score: cached.confidence_score ?? 0,
          price_range_low: cached.price_range_low ?? 0,
          price_range_high: cached.price_range_high ?? 0,
          item_title: cached.item_title ?? "",
          item_brand: cached.item_brand ?? "",
          comparable_items: (cached.comparable_items as any) ?? [],
          ai_insights: cached.ai_insights ?? "",
          price_distribution: (cached.price_distribution as any) ?? [],
        });
        setCachedAt(cached.created_at);
      }
    } catch (e) {
      console.error("Cache check failed:", e);
    } finally {
      setCheckingCache(false);
    }
  };

  const handleAnalyze = async (overrideUrl?: string) => {
    const targetUrl = overrideUrl || url;
    if (!targetUrl.trim() && inputMode === "url") {
      toast.error("Enter a Vinted URL"); return;
    }
    if (inputMode === "manual" && !brand && !category) {
      toast.error("Enter at least a brand or category"); return;
    }

    const isUnlimited = (profile as any)?.subscription_tier === "scale" || (credits?.credits_limit ?? 0) >= 999;
    if (!isUnlimited && credits) {
      const totalUsed = credits.price_checks_used + credits.optimizations_used + credits.vintography_used;
      if (totalUsed >= credits.credits_limit) {
        gate.showUpgrade();
        return;
      }
    }

    setLoading(true);
    setReport(null);
    setCachedAt(null);

    try {
      const { data, error } = await supabase.functions.invoke("price-check", {
        body: {
          url: inputMode === "url" ? targetUrl : undefined,
          brand: inputMode === "manual" ? brand : undefined,
          category: inputMode === "manual" ? category : undefined,
          condition: inputMode === "manual" ? condition : undefined,
          size: size || undefined,
          title: title || undefined,
          itemId: itemId || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setReport(data);
      await refreshCredits();

      // If opened from an item, update the listing and log activity
      if (itemId && user) {
        // Build update: always set recommended_price + last_price_check_at
        // Also set current_price if it's currently null
        const listingUpdate: Record<string, any> = {
          recommended_price: data.recommended_price,
          last_price_check_at: new Date().toISOString(),
        };
        // Fetch current_price to check if null
        const { data: currentListing } = await supabase.from("listings").select("current_price").eq("id", itemId).maybeSingle();
        if (currentListing && currentListing.current_price == null) {
          listingUpdate.current_price = data.recommended_price;
        }
        const updatePromises = [
          supabase.from("listings").update(listingUpdate).eq("id", itemId).eq("user_id", user.id),
          supabase.from("item_activity").insert({
            user_id: user.id,
            listing_id: itemId,
            type: "price_checked",
            payload: {
              recommended_price: data.recommended_price,
              confidence: data.confidence_score,
              price_range_low: data.price_range_low,
              price_range_high: data.price_range_high,
            },
          }),
        ];
        await Promise.all(updatePromises);
      }

      toast.success("Price analysis complete!");
      const isUnlimitedAfter = profile?.subscription_tier === "scale" || (credits?.credits_limit ?? 0) >= 999;
      if (!isUnlimitedAfter) toast("−1 credit used", { duration: 2000 });
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
      subtitle={credits ? (((profile as any)?.subscription_tier === "scale" || credits.credits_limit >= 999) ? "Unlimited checks" : `${credits.credits_limit - (credits.price_checks_used + credits.optimizations_used + credits.vintography_used)} credits remaining`) : ""}
      maxWidth="max-w-4xl"
    >

      {/* Input Section */}
      <Card className="p-3 sm:p-6 mb-3 sm:mb-8 border-border/50">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Size</Label>
                <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. M, L, UK 10" className="h-12 sm:h-11 text-base sm:text-sm" />
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
            </div>
            <Button onClick={() => handleAnalyze()} disabled={loading} className="w-full sm:w-auto font-semibold h-12 sm:h-11 px-6 active:scale-95 transition-transform">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
              Get Price Analysis
            </Button>
          </div>
        )}

        {/* Sprint 6: Pick from my items */}
        {!itemId && (
          <div className="text-center -mt-3 mb-3">
            <ItemPickerDialog onSelect={(picked) => {
              const params = new URLSearchParams({ itemId: picked.id });
              if (picked.vinted_url) params.set("url", picked.vinted_url);
              else {
                if (picked.brand) params.set("brand", picked.brand);
                if (picked.category) params.set("category", picked.category);
                if (picked.condition) params.set("condition", picked.condition);
              }
              navigate(`/price-check?${params.toString()}`, { replace: true });
              // Reset local state so the component re-initialises with new params
              setReport(null);
              setCachedAt(null);
              setUrl(picked.vinted_url || "");
              setBrand(picked.brand || "");
              setCategory(picked.category || "");
              setCondition(picked.condition || "");
              setTitle(picked.title || "");
              setSize(picked.size || "");
              if (picked.vinted_url) {
                setInputMode("url");
                checkForCachedReport(picked.vinted_url);
              } else {
                setInputMode("manual");
              }
            }}>
              <button className="text-xs text-primary hover:underline font-medium">
                or pick from your items
              </button>
            </ItemPickerDialog>
          </div>
        )}
      </Card>

      {/* Cache banner */}
      {cachedAt && report && !loading && (
        <Card className="p-3 sm:p-4 mb-3 sm:mb-5 border-accent/30 bg-accent/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-accent shrink-0" />
            <span className="text-muted-foreground">
              Showing cached report from{" "}
              <span className="font-medium text-foreground">
                {new Date(cachedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
              . No credit used.
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={() => handleAnalyze()} disabled={loading} className="shrink-0">
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Re-run (1 credit)
          </Button>
        </Card>
      )}

      {/* Loading State */}
      {checkingCache && !report && !loading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Checking for cached report…</span>
        </div>
      )}
      {loading && <PriceReportSkeleton />}

      {/* Report */}
      {report && !loading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2.5 sm:space-y-5">
          {/* Hero Price Card */}
          <Card className="p-4 sm:p-8 border-primary/20 bg-gradient-to-br from-primary/[0.04] to-transparent relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
            <p className="text-[9px] sm:text-sm text-muted-foreground mb-0.5 sm:mb-1 font-medium flex items-center gap-1.5 uppercase tracking-wider">
              <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
              Sell At Price
            </p>
            <p className="font-display text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight">
              £{report.recommended_price.toFixed(0)}
            </p>
            <p className="text-[10px] sm:text-sm text-muted-foreground mt-1 sm:mt-2">
              Range: <span className="font-semibold text-foreground">£{report.price_range_low.toFixed(0)}</span> – <span className="font-semibold text-foreground">£{report.price_range_high.toFixed(0)}</span>
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
            <Card className="p-3 sm:p-6">
              <h3 className="font-display font-bold text-[11px] sm:text-lg mb-2 sm:mb-4 flex items-center gap-1.5">
                <PoundSterling className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary" />
                Reseller Guide
              </h3>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
                <div className="text-center p-2 sm:p-3 rounded-xl bg-success/10 border border-success/20">
                  <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-success mb-1">Good Buy</p>
                  <p className="font-display text-xl sm:text-2xl font-extrabold text-success">
                    £{(report.buy_price_good ?? 0).toFixed(0)}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Great deal</p>
                </div>
                <div className="text-center p-2 sm:p-3 rounded-xl bg-accent/10 border border-accent/20">
                  <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-accent mb-1">Max Buy</p>
                  <p className="font-display text-xl sm:text-2xl font-extrabold text-accent">
                    £{(report.buy_price_max ?? 0).toFixed(0)}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Still profitable</p>
                </div>
                <div className="text-center p-2 sm:p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">Resale</p>
                  <p className="font-display text-xl sm:text-2xl font-extrabold text-primary">
                    £{(report.estimated_resale ?? report.recommended_price).toFixed(0)}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Sell price</p>
                </div>
              </div>
            </Card>
          )}

          {/* Confidence + Demand + Days */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
            <Card className={`p-2.5 sm:p-4 border ${getConfidenceBg(report.confidence_score)}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle2 className={`w-3.5 h-3.5 ${getConfidenceColor(report.confidence_score)}`} />
                <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Confidence</span>
              </div>
              <p className={`font-display text-xl sm:text-2xl font-extrabold ${getConfidenceColor(report.confidence_score)}`}>
                {Math.round(report.confidence_score)}%
              </p>
              <p className={`text-[10px] font-medium ${getConfidenceColor(report.confidence_score)}`}>
                {getConfidenceLabel(report.confidence_score)}
              </p>
            </Card>
            {report.demand_level && (
              <Card className={`p-2.5 sm:p-4 border ${getDemandColor(report.demand_level)}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  {getDemandIcon(report.demand_level)}
                  <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Demand</span>
                </div>
                <p className="font-display text-xl sm:text-2xl font-extrabold capitalize">
                  {report.demand_level}
                </p>
              </Card>
            )}
            {report.estimated_days_to_sell != null && (
              <Card className="p-2.5 sm:p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Avg. Sell Time</span>
                </div>
                <p className="font-display text-xl sm:text-2xl font-extrabold">
                  {report.estimated_days_to_sell}
                </p>
                <p className="text-[10px] text-muted-foreground">days</p>
              </Card>
            )}
          </div>

          {/* Your Cost Calculator */}
          <Card className="p-3 sm:p-5">
            <h3 className="font-display font-bold text-[11px] sm:text-lg mb-2 sm:mb-3 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary" />
              Profit Calculator
            </h3>
            <div className="flex items-end gap-3">
              <div className="space-y-1.5 flex-1">
                <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Cost (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={yourCost}
                  onChange={(e) => setYourCost(e.target.value)}
                  placeholder="What you paid"
                  className="h-12 sm:h-11 text-base sm:text-sm"
                />
              </div>
              {calcProfit() !== null && (
                <div className={`px-4 py-3 rounded-lg border font-display font-bold text-base sm:text-lg ${
                  calcProfit()! >= 0 ? "bg-success/10 border-success/20 text-success" : "bg-destructive/10 border-destructive/20 text-destructive"
                }`}>
                  {calcProfit()! >= 0 ? "+" : ""}£{calcProfit()!.toFixed(2)}
                </div>
              )}
            </div>
            {calcProfit() !== null && (
              <p className="text-[10px] text-muted-foreground mt-2">
                After ~{((report!.estimated_fees || report!.recommended_price * 0.05)).toFixed(2)} fees + ~£{(report!.estimated_shipping || 3.5).toFixed(2)} shipping
              </p>
            )}
          </Card>

          {/* Price Distribution */}
          {report.price_distribution && report.price_distribution.length > 0 && (
            <Card className="p-3 sm:p-6">
              <h3 className="font-display font-bold text-[11px] sm:text-lg mb-2 sm:mb-4 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary" />
                Price Distribution
              </h3>
              <div className="h-36 sm:h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.price_distribution}>
                    <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip formatter={(value: number) => [`${value} listings`, "Count"]} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {report.price_distribution.map((entry, index) => (
                        <Cell key={index} fill={`hsl(var(--primary) / ${0.3 + (index / report.price_distribution.length) * 0.7})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Condition Price Breakdown */}
          {report.condition_price_breakdown && report.condition_price_breakdown.length > 0 && (
            <Card className="p-3 sm:p-6">
              <h3 className="font-display font-bold text-[11px] sm:text-lg mb-2 sm:mb-4 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary" />
                Price by Condition
              </h3>
              <div className="space-y-2">
              {report.condition_price_breakdown.filter(item => item.avg_price != null && item.count > 0).map((item) => (
                  <div key={item.condition} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] capitalize">{item.condition}</Badge>
                      <span className="text-[10px] text-muted-foreground">({item.count} listings)</span>
                    </div>
                    <span className="font-display font-bold text-sm">£{(item.avg_price ?? 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Comparables */}
          {report.comparable_items && report.comparable_items.length > 0 && (
            <Card className="p-3 sm:p-6">
              <h3 className="font-display font-bold text-[11px] sm:text-lg mb-2 sm:mb-4 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary" />
                Comparables ({report.comparable_items.length})
              </h3>
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px] sm:text-xs">Item</TableHead>
                      <TableHead className="text-[10px] sm:text-xs text-right">Price</TableHead>
                      <TableHead className="text-[10px] sm:text-xs text-center">Status</TableHead>
                      <TableHead className="text-[10px] sm:text-xs text-right hidden sm:table-cell">Days</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.comparable_items.slice(0, 8).map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs max-w-[180px] sm:max-w-xs truncate">
                          {item.url ? (
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-1">
                              {item.title}
                              <ExternalLink className="w-3 h-3 shrink-0 text-muted-foreground" />
                            </a>
                          ) : item.title}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-xs">£{item.price.toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`text-[9px] py-0 ${item.sold ? "text-success border-success/30" : "text-muted-foreground"}`}>
                            {item.sold ? "Sold" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground hidden sm:table-cell">
                          {item.days_listed != null ? `${item.days_listed}d` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          {/* AI Insights */}
          {report.ai_insights && (
            <Card className="p-3 sm:p-6">
              <h3 className="font-display font-bold text-[11px] sm:text-lg mb-1.5 sm:mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary" />
                AI Insights
              </h3>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {report.ai_insights}
              </div>
            </Card>
          )}

          {/* Primary Actions */}
          <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-3 sm:justify-center pt-1 pb-1">
            {itemId ? (
              <Button
                onClick={() => navigate(`/items/${itemId}`)}
                variant="outline"
                className="w-full sm:w-auto h-12 sm:h-10 active:scale-95 transition-transform"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Back to Item
              </Button>
            ) : (
              <Button
                onClick={async () => {
                  if (!user) { toast.error("Sign in to save"); return; }
                  const { data: newItem, error } = await supabase.from("listings").insert({
                    user_id: user.id,
                    title: report.item_title || `${brand} ${category}`.trim() || url || "Untitled",
                    brand: report.item_brand || brand || null,
                    category: category || null,
                    condition: report.condition_detected || condition || null,
                    purchase_price: report.buy_price_max || null,
                    current_price: report.recommended_price,
                    recommended_price: report.recommended_price,
                    last_price_check_at: new Date().toISOString(),
                    vinted_url: url || null,
                    status: "draft",
                  }).select("id").single();
                  if (error || !newItem) { toast.error("Failed to save"); return; }
                  // Link price report to new listing
                  await supabase.from("price_reports")
                    .update({ listing_id: newItem.id })
                    .eq("user_id", user.id)
                    .is("listing_id", null)
                    .order("created_at", { ascending: false })
                    .limit(1);
                  toast.success("Saved! Taking you to your item…");
                  navigate(`/items/${newItem.id}`);
                }}
                variant="outline"
                className="w-full sm:w-auto h-12 sm:h-10 active:scale-95 transition-transform"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Save to Inventory
              </Button>
            )}
            <Button
              onClick={() => {
                const params = new URLSearchParams();
                if (brand) params.set("brand", brand);
                if (category) params.set("category", category);
                if (report.item_title) params.set("title", report.item_title);
                if (condition) params.set("condition", condition);
                if (url) params.set("vintedUrl", url);
                if (itemId) params.set("itemId", itemId);
                navigate(`/optimize?${params.toString()}`);
              }}
              className="w-full sm:w-auto h-12 sm:h-10 active:scale-95 transition-transform"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Next: Optimise Listing
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button
              onClick={() => { setReport(null); setUrl(""); setBrand(""); setCategory(""); setCondition(""); setSize(""); setTitle(""); setYourCost(""); }}
              variant="outline"
              className="w-full sm:w-auto h-12 sm:h-10 active:scale-95 transition-transform"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              New Analysis
            </Button>
          </div>

        </motion.div>
      )}

      
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
