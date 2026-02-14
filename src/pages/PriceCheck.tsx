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
import {
  ArrowLeft, Search, Loader2, TrendingUp, TrendingDown,
  Minus, Zap, BarChart3, CheckCircle2, AlertCircle,
} from "lucide-react";
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

  const [url, setUrl] = useState(searchParams.get("url") || "");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<PriceReport | null>(null);
  const [inputMode, setInputMode] = useState<"url" | "manual">("url");

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border glass sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display font-bold text-lg">Price Intelligence Engine</h1>
            <p className="text-xs text-muted-foreground">
              {credits ? `${credits.credits_limit - credits.price_checks_used} checks remaining` : ""}
            </p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Input Section */}
        <Card className="p-6 mb-8">
          <div className="flex gap-2 mb-4">
            <Button
              variant={inputMode === "url" ? "default" : "outline"}
              size="sm"
              onClick={() => setInputMode("url")}
            >
              Vinted URL
            </Button>
            <Button
              variant={inputMode === "manual" ? "default" : "outline"}
              size="sm"
              onClick={() => setInputMode("manual")}
            >
              Manual Entry
            </Button>
          </div>

          {inputMode === "url" ? (
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.vinted.co.uk/items/..."
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              />
              <Button onClick={() => handleAnalyze()} disabled={loading} className="font-semibold">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Analyse
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Brand</Label>
                  <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Nike, Zara" />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. T-shirt, Jacket" />
                </div>
              </div>
              <div>
                <Label>Condition</Label>
                <Input value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="e.g. Good, Very Good, New with tags" />
              </div>
              <Button onClick={() => handleAnalyze()} disabled={loading} className="font-semibold">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                Get Price Analysis
              </Button>
            </div>
          )}
        </Card>

        {/* Loading State */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
            <h3 className="font-display font-bold text-lg mb-2">Analysing market data...</h3>
            <p className="text-sm text-muted-foreground">Scraping comparables and running AI analysis</p>
          </motion.div>
        )}

        {/* Report */}
        {report && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Hero Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6 border-primary/20 bg-primary/[0.02]">
                <p className="text-sm text-muted-foreground mb-1 font-medium">Recommended Price</p>
                <p className="font-display text-4xl font-extrabold text-foreground">
                  £{report.recommended_price.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Range: £{report.price_range_low.toFixed(2)} – £{report.price_range_high.toFixed(2)}
                </p>
              </Card>
              <Card className="p-6">
                <p className="text-sm text-muted-foreground mb-1 font-medium">Confidence</p>
                <div className="flex items-baseline gap-2">
                  <p className={`font-display text-4xl font-extrabold ${getConfidenceColor(report.confidence_score)}`}>
                    {report.confidence_score}%
                  </p>
                  <Badge variant="outline" className={getConfidenceColor(report.confidence_score)}>
                    {getConfidenceLabel(report.confidence_score)}
                  </Badge>
                </div>
              </Card>
              <Card className="p-6">
                <p className="text-sm text-muted-foreground mb-1 font-medium">Comparables Found</p>
                <p className="font-display text-4xl font-extrabold">
                  {report.comparable_items?.length || 0}
                </p>
              </Card>
            </div>

            {/* Price Distribution Chart */}
            {report.price_distribution && report.price_distribution.length > 0 && (
              <Card className="p-6">
                <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Price Distribution
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={report.price_distribution}>
                    <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {report.price_distribution.map((_, i) => (
                        <Cell
                          key={i}
                          fill={`hsl(350, 75%, ${55 + i * 5}%)`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Comparable Items */}
            {report.comparable_items && report.comparable_items.length > 0 && (
              <Card className="p-6">
                <h3 className="font-display font-bold text-lg mb-4">Comparable Items</h3>
                <div className="space-y-3">
                  {report.comparable_items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {item.sold ? (
                            <Badge variant="outline" className="text-success border-success/30 text-[10px]">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Sold
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-[10px]">
                              Active
                            </Badge>
                          )}
                          {item.days_listed && (
                            <span className="text-xs text-muted-foreground">{item.days_listed}d listed</span>
                          )}
                        </div>
                      </div>
                      <p className="font-display font-bold text-lg ml-4">£{item.price.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* AI Insights */}
            {report.ai_insights && (
              <Card className="p-6">
                <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  AI Insights
                </h3>
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  <p className="leading-relaxed whitespace-pre-wrap">{report.ai_insights}</p>
                </div>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-center">
              <Button onClick={() => { setReport(null); setUrl(""); }} variant="outline">
                New Analysis
              </Button>
              <Button onClick={() => navigate("/dashboard")}>
                Back to Dashboard
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
