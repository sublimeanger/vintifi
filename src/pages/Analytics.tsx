import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  PoundSterling, TrendingUp, TrendingDown,
  BarChart3, ShoppingBag, Package, Percent, Target,
} from "lucide-react";
import { KpiGridSkeleton, ChartSkeleton } from "@/components/LoadingSkeletons";
import { UseCaseSpotlight } from "@/components/UseCaseSpotlight";
import { PageShell } from "@/components/PageShell";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

type Listing = {
  id: string;
  title: string;
  brand: string | null;
  category: string | null;
  status: string;
  current_price: number | null;
  purchase_price: number | null;
  sale_price: number | null;
  created_at: string;
  sold_at: string | null;
};

const CHART_COLORS = [
  "hsl(350, 75%, 55%)",
  "hsl(152, 69%, 41%)",
  "hsl(37, 91%, 55%)",
  "hsl(233, 47%, 10%)",
  "hsl(220, 9%, 46%)",
  "hsl(200, 70%, 50%)",
  "hsl(280, 60%, 55%)",
];

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(key: string): string {
  const [y, m] = key.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m) - 1]} ${y.slice(2)}`;
}

const KPI_TINTS: Record<string, string> = {
  "Total Revenue": "border-success/10 bg-success/[0.03]",
  "Net Profit": "border-success/10 bg-success/[0.03]",
  "Avg Margin": "border-primary/10 bg-primary/[0.03]",
  "ROI": "border-primary/10 bg-primary/[0.03]",
  "Items Sold": "border-accent/10 bg-accent/[0.03]",
  "Sell-Through": "border-accent/10 bg-accent/[0.03]",
  "Active Stock": "",
  "Avg Sale": "border-accent/10 bg-accent/[0.03]",
};

export default function Analytics() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all");

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, brand, category, status, current_price, purchase_price, sale_price, created_at, sold_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (error) {
        toast.error("Failed to load listings");
        console.error(error);
      } else {
        setListings((data as Listing[]) || []);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const filteredListings = useMemo(() => {
    if (period === "all") return listings;
    const now = Date.now();
    const cutoff = period === "30d" ? 30 : period === "90d" ? 90 : 365;
    const threshold = now - cutoff * 24 * 60 * 60 * 1000;
    return listings.filter((l) => new Date(l.created_at).getTime() >= threshold);
  }, [listings, period]);

  const sold = filteredListings.filter((l) => l.status === "sold");
  const active = filteredListings.filter((l) => l.status === "active");

  const totalRevenue = sold.reduce((s, l) => s + (l.sale_price || 0), 0);
  const totalCost = sold.filter((l) => l.purchase_price != null).reduce((s, l) => s + (l.purchase_price || 0), 0);
  const totalProfit = totalRevenue - totalCost;
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const roi = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
  const sellThroughRate = filteredListings.length > 0 ? (sold.length / filteredListings.length) * 100 : 0;
  const avgSalePrice = sold.length > 0 ? totalRevenue / sold.length : 0;
  const totalInventoryValue = active.reduce((s, l) => s + (l.current_price || 0), 0);

  const revenueTrend = useMemo(() => {
    const map = new Map<string, { revenue: number; cost: number; profit: number; count: number }>();
    sold.forEach((l) => {
      const key = getMonthKey(l.sold_at || l.created_at);
      const existing = map.get(key) || { revenue: 0, cost: 0, profit: 0, count: 0 };
      const rev = l.sale_price || 0;
      const cost = l.purchase_price || 0;
      map.set(key, { revenue: existing.revenue + rev, cost: existing.cost + cost, profit: existing.profit + (rev - cost), count: existing.count + 1 });
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => ({ month: formatMonth(key), ...v }));
  }, [sold]);

  const categoryMargins = useMemo(() => {
    const map = new Map<string, { revenue: number; cost: number; count: number }>();
    sold.forEach((l) => {
      const cat = l.category || "Uncategorised";
      const existing = map.get(cat) || { revenue: 0, cost: 0, count: 0 };
      map.set(cat, { revenue: existing.revenue + (l.sale_price || 0), cost: existing.cost + (l.purchase_price || 0), count: existing.count + 1 });
    });
    return Array.from(map.entries()).map(([category, v]) => ({
      category, revenue: Math.round(v.revenue), profit: Math.round(v.revenue - v.cost),
      margin: v.revenue > 0 ? Math.round(((v.revenue - v.cost) / v.revenue) * 100) : 0, count: v.count,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [sold]);

  const sellThrough = useMemo(() => {
    const listedMap = new Map<string, number>();
    const soldMap = new Map<string, number>();
    filteredListings.forEach((l) => { const key = getMonthKey(l.created_at); listedMap.set(key, (listedMap.get(key) || 0) + 1); });
    sold.forEach((l) => { const key = getMonthKey(l.sold_at || l.created_at); soldMap.set(key, (soldMap.get(key) || 0) + 1); });
    const allKeys = new Set([...listedMap.keys(), ...soldMap.keys()]);
    return Array.from(allKeys).sort().map((key) => {
      const listed = listedMap.get(key) || 0;
      const soldCount = soldMap.get(key) || 0;
      return { month: formatMonth(key), listed, sold: soldCount, rate: listed > 0 ? Math.round((soldCount / listed) * 100) : 0 };
    });
  }, [filteredListings, sold]);

  const categoryRevenue = useMemo(() => {
    const map = new Map<string, number>();
    sold.forEach((l) => { const cat = l.category || "Other"; map.set(cat, (map.get(cat) || 0) + (l.sale_price || 0)); });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value);
  }, [sold]);

  const topItems = useMemo(() => {
    return sold
      .filter((l) => l.sale_price != null && l.purchase_price != null)
      .map((l) => ({
        title: l.title, brand: l.brand,
        profit: (l.sale_price || 0) - (l.purchase_price || 0),
        margin: l.sale_price! > 0 ? (((l.sale_price! - (l.purchase_price || 0)) / l.sale_price!) * 100) : 0,
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);
  }, [sold]);

  const kpis = [
    { icon: PoundSterling, label: "Total Revenue", value: `£${totalRevenue.toFixed(0)}`, color: "text-success" },
    { icon: TrendingUp, label: "Net Profit", value: `${totalProfit >= 0 ? "+" : ""}£${totalProfit.toFixed(0)}`, color: totalProfit >= 0 ? "text-success" : "text-destructive" },
    { icon: Percent, label: "Avg Margin", value: `${avgMargin.toFixed(1)}%`, color: "text-primary" },
    { icon: Target, label: "ROI", value: `${roi.toFixed(0)}%`, color: roi >= 0 ? "text-success" : "text-destructive" },
    { icon: ShoppingBag, label: "Items Sold", value: sold.length.toString(), color: "text-accent" },
    { icon: BarChart3, label: "Sell-Through", value: `${sellThroughRate.toFixed(0)}%`, color: "text-primary" },
    { icon: Package, label: "Active Stock", value: `£${totalInventoryValue.toFixed(0)}`, color: "text-muted-foreground" },
    { icon: PoundSterling, label: "Avg Sale", value: `£${avgSalePrice.toFixed(2)}`, color: "text-accent" },
  ];

  const tooltipStyle = {
    contentStyle: {
      background: "hsl(233, 40%, 12%)",
      border: "1px solid hsl(233, 35%, 18%)",
      borderRadius: "8px",
      fontSize: "12px",
      color: "hsl(220, 14%, 92%)",
    },
  };

  const periodSelector = (
    <Select value={period} onValueChange={setPeriod}>
      <SelectTrigger className="w-24 sm:w-28 h-8 text-[10px] sm:text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="30d">30 days</SelectItem>
        <SelectItem value="90d">90 days</SelectItem>
        <SelectItem value="365d">1 year</SelectItem>
        <SelectItem value="all">All time</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <PageShell
      title="P&L Analytics"
      icon={<BarChart3 className="w-5 h-5 text-primary" />}
      subtitle={`${sold.length} sold · ${active.length} active · £${totalRevenue.toFixed(0)} revenue`}
      actions={periodSelector}
      maxWidth="max-w-6xl"
    >
      <UseCaseSpotlight
        featureKey="analytics"
        icon={BarChart3}
        scenario="You feel busy but aren't sure if you're actually making money after costs..."
        description="Without tracking purchase prices, fees, and sell-through rates, you could be working hard for negative returns."
        outcome="P&L Analytics shows your true margin is 34%, trainers are your best category, and vintage dresses have negative ROI."
        tip="Make sure to enter purchase prices on your listings — that's what powers the profit calculations."
      />

      {loading ? (
        <div className="space-y-6">
          <KpiGridSkeleton count={8} />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="text-center py-16">
          <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display font-bold text-base sm:text-lg mb-2">No data yet</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">
            Add listings and mark items as sold to see your P&L analytics
          </p>
          <Button onClick={() => navigate("/listings")} className="font-semibold h-11 sm:h-10 active:scale-95 transition-transform">
            Go to Listings
          </Button>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5 sm:mb-6">
            {kpis.map((k, i) => (
              <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className={`p-3 sm:p-4 ${KPI_TINTS[k.label] || ""}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <k.icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${k.color}`} />
                    <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider">{k.label}</span>
                  </div>
                  <p className={`font-display text-lg sm:text-xl font-bold ${k.color}`}>{k.value}</p>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Revenue Trend Chart */}
          {revenueTrend.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="mb-5 sm:mb-6">
                <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="font-display text-sm sm:text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Revenue & Profit Trend
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-6 pb-4">
                  <div className="h-52 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueTrend}>
                        <defs>
                          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(152, 69%, 41%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(152, 69%, 41%)" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(350, 75%, 55%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(350, 75%, 55%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `£${v}`} width={45} />
                        <Tooltip {...tooltipStyle} formatter={(value: number) => [`£${value.toFixed(0)}`, ""]} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(152, 69%, 41%)" fill="url(#revGrad)" strokeWidth={2} />
                        <Area type="monotone" dataKey="profit" name="Profit" stroke="hsl(350, 75%, 55%)" fill="url(#profGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-5 sm:mb-6">
            {/* Margin by Category */}
            {categoryMargins.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="h-full">
                  <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
                    <CardTitle className="font-display text-sm sm:text-base flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-accent" />
                      Margin by Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-6 pb-4">
                    <div className="h-48 sm:h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryMargins} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                          <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={70} />
                          <Tooltip {...tooltipStyle} formatter={(value: number, name: string) => [name === "margin" ? `${value}%` : `£${value}`, ""]} />
                          <Bar dataKey="margin" name="Margin %" fill="hsl(350, 75%, 55%)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Revenue by Category Pie */}
            {categoryRevenue.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <Card className="h-full">
                  <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
                    <CardTitle className="font-display text-sm sm:text-base flex items-center gap-2">
                      <PoundSterling className="w-4 h-4 text-success" />
                      Revenue by Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-6 pb-4">
                    <div className="h-48 sm:h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryRevenue}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={3}
                            dataKey="value"
                            label={({ name, value }) => `${name.length > 8 ? name.slice(0, 8) + "…" : name}: £${value}`}
                            labelLine={{ strokeWidth: 1 }}
                          >
                            {categoryRevenue.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip {...tooltipStyle} formatter={(value: number) => [`£${value}`, "Revenue"]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Sell-Through Rate Over Time */}
          {sellThrough.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="mb-5 sm:mb-6">
                <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="font-display text-sm sm:text-base flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-accent" />
                    Sell-Through Rate
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-6 pb-4">
                  <div className="h-48 sm:h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sellThrough}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                        <Tooltip {...tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar yAxisId="left" dataKey="listed" name="Listed" fill="hsl(220, 9%, 46%)" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="left" dataKey="sold" name="Sold" fill="hsl(152, 69%, 41%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Top Performers */}
          {topItems.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
              <Card>
                <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="font-display text-sm sm:text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-success" />
                    Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-4">
                  <div className="space-y-2">
                    {topItems.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors active:bg-muted/70">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-success/10 text-success flex items-center justify-center text-[10px] font-bold shrink-0">
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium truncate">{item.title}</p>
                            {item.brand && <p className="text-[10px] sm:text-xs text-muted-foreground">{item.brand}</p>}
                          </div>
                        </div>
                        <div className="text-right ml-3 shrink-0">
                          <p className="font-display font-bold text-xs sm:text-sm text-success">
                            +£{item.profit.toFixed(2)}
                          </p>
                          <Badge variant="outline" className="text-[9px] sm:text-[10px] text-primary border-primary/20 py-0">
                            {item.margin.toFixed(0)}% margin
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </>
      )}

      <MobileBottomNav />
    </PageShell>
  );
}
