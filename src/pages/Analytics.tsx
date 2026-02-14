import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2, PoundSterling, TrendingUp, TrendingDown,
  BarChart3, ShoppingBag, Package, Percent, Target, RefreshCw,
} from "lucide-react";
import { KpiGridSkeleton, ChartSkeleton } from "@/components/LoadingSkeletons";
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
  "hsl(350, 75%, 55%)",  // primary
  "hsl(152, 69%, 41%)",  // success
  "hsl(37, 91%, 55%)",   // accent
  "hsl(233, 47%, 10%)",  // secondary
  "hsl(220, 9%, 46%)",   // muted
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

  // Filter by period
  const filteredListings = useMemo(() => {
    if (period === "all") return listings;
    const now = Date.now();
    const cutoff = period === "30d" ? 30 : period === "90d" ? 90 : 365;
    const threshold = now - cutoff * 24 * 60 * 60 * 1000;
    return listings.filter((l) => new Date(l.created_at).getTime() >= threshold);
  }, [listings, period]);

  const sold = filteredListings.filter((l) => l.status === "sold");
  const active = filteredListings.filter((l) => l.status === "active");

  // === KPIs ===
  const totalRevenue = sold.reduce((s, l) => s + (l.sale_price || 0), 0);
  const totalCost = sold.filter((l) => l.purchase_price != null).reduce((s, l) => s + (l.purchase_price || 0), 0);
  const totalProfit = totalRevenue - totalCost;
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const roi = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
  const sellThroughRate = filteredListings.length > 0 ? (sold.length / filteredListings.length) * 100 : 0;
  const avgSalePrice = sold.length > 0 ? totalRevenue / sold.length : 0;
  const totalInventoryValue = active.reduce((s, l) => s + (l.current_price || 0), 0);

  // === Revenue Trend (monthly) ===
  const revenueTrend = useMemo(() => {
    const map = new Map<string, { revenue: number; cost: number; profit: number; count: number }>();
    sold.forEach((l) => {
      const key = getMonthKey(l.sold_at || l.created_at);
      const existing = map.get(key) || { revenue: 0, cost: 0, profit: 0, count: 0 };
      const rev = l.sale_price || 0;
      const cost = l.purchase_price || 0;
      map.set(key, {
        revenue: existing.revenue + rev,
        cost: existing.cost + cost,
        profit: existing.profit + (rev - cost),
        count: existing.count + 1,
      });
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({ month: formatMonth(key), ...v }));
  }, [sold]);

  // === Margin by Category ===
  const categoryMargins = useMemo(() => {
    const map = new Map<string, { revenue: number; cost: number; count: number }>();
    sold.forEach((l) => {
      const cat = l.category || "Uncategorised";
      const existing = map.get(cat) || { revenue: 0, cost: 0, count: 0 };
      map.set(cat, {
        revenue: existing.revenue + (l.sale_price || 0),
        cost: existing.cost + (l.purchase_price || 0),
        count: existing.count + 1,
      });
    });
    return Array.from(map.entries()).map(([category, v]) => ({
      category,
      revenue: Math.round(v.revenue),
      profit: Math.round(v.revenue - v.cost),
      margin: v.revenue > 0 ? Math.round(((v.revenue - v.cost) / v.revenue) * 100) : 0,
      count: v.count,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [sold]);

  // === Sell-through by Month ===
  const sellThrough = useMemo(() => {
    const listedMap = new Map<string, number>();
    const soldMap = new Map<string, number>();
    filteredListings.forEach((l) => {
      const key = getMonthKey(l.created_at);
      listedMap.set(key, (listedMap.get(key) || 0) + 1);
    });
    sold.forEach((l) => {
      const key = getMonthKey(l.sold_at || l.created_at);
      soldMap.set(key, (soldMap.get(key) || 0) + 1);
    });
    const allKeys = new Set([...listedMap.keys(), ...soldMap.keys()]);
    return Array.from(allKeys)
      .sort()
      .map((key) => {
        const listed = listedMap.get(key) || 0;
        const soldCount = soldMap.get(key) || 0;
        return {
          month: formatMonth(key),
          listed,
          sold: soldCount,
          rate: listed > 0 ? Math.round((soldCount / listed) * 100) : 0,
        };
      });
  }, [filteredListings, sold]);

  // === Revenue by Category (Pie) ===
  const categoryRevenue = useMemo(() => {
    const map = new Map<string, number>();
    sold.forEach((l) => {
      const cat = l.category || "Other";
      map.set(cat, (map.get(cat) || 0) + (l.sale_price || 0));
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [sold]);

  // === Top Performers ===
  const topItems = useMemo(() => {
    return sold
      .filter((l) => l.sale_price != null && l.purchase_price != null)
      .map((l) => ({
        title: l.title,
        brand: l.brand,
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

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <header className="border-b border-border glass sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display font-bold text-lg">Profit & Loss Analytics</h1>
            <p className="text-xs text-muted-foreground">
              {sold.length} sold · {active.length} active · £{totalRevenue.toFixed(0)} revenue
            </p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">30 days</SelectItem>
              <SelectItem value="90d">90 days</SelectItem>
              <SelectItem value="365d">1 year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {loading ? (
          <div className="space-y-6">
            <KpiGridSkeleton count={8} />
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-16">
            <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-display font-bold text-lg mb-2">No data yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add listings and mark items as sold to see your P&L analytics
            </p>
            <Button onClick={() => navigate("/listings")} className="font-semibold">
              Go to Listings
            </Button>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {kpis.map((k, i) => (
                <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <k.icon className={`w-3.5 h-3.5 ${k.color}`} />
                      <span className="text-xs text-muted-foreground font-medium">{k.label}</span>
                    </div>
                    <p className={`font-display text-xl font-bold ${k.color}`}>{k.value}</p>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Revenue Trend Chart */}
            {revenueTrend.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className="mb-6">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Revenue & Profit Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
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
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `£${v}`} />
                          <Tooltip {...tooltipStyle} formatter={(value: number) => [`£${value.toFixed(0)}`, ""]} />
                          <Legend />
                          <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(152, 69%, 41%)" fill="url(#revGrad)" strokeWidth={2} />
                          <Area type="monotone" dataKey="profit" name="Profit" stroke="hsl(350, 75%, 55%)" fill="url(#profGrad)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Margin by Category */}
              {categoryMargins.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-base flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-accent" />
                        Margin by Category
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={categoryMargins} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                            <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={90} />
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
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-base flex items-center gap-2">
                        <PoundSterling className="w-4 h-4 text-success" />
                        Revenue by Category
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryRevenue}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={3}
                              dataKey="value"
                              label={({ name, value }) => `${name.length > 10 ? name.slice(0, 10) + "…" : name}: £${value}`}
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
                <Card className="mb-6">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-base flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-accent" />
                      Sell-Through Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sellThrough}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                          <Tooltip {...tooltipStyle} />
                          <Legend />
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
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-success" />
                      Top Performers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {topItems.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.title}</p>
                            {item.brand && <p className="text-xs text-muted-foreground">{item.brand}</p>}
                          </div>
                          <div className="text-right ml-4 shrink-0">
                            <p className="font-display font-bold text-sm text-success">
                              +£{item.profit.toFixed(2)}
                            </p>
                            <Badge variant="outline" className="text-[10px] text-primary border-primary/20">
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
      </div>
    </div>
  );
}
