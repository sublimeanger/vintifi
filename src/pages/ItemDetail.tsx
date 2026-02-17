import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HealthScoreMini } from "@/components/HealthScoreGauge";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  ArrowLeft, Search, Sparkles, ImageIcon,
  Eye, Heart, Calendar, PoundSterling, TrendingUp,
  Package, MoreHorizontal, Clock, Zap, Tag, Ruler,
  ShieldCheck, Loader2, Copy, Check, ExternalLink,
  ArrowRight, Download,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PhotosTab } from "@/components/PhotosTab";
import { VintedReadyPack } from "@/components/VintedReadyPack";

type Listing = {
  id: string;
  title: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  size: string | null;
  condition: string | null;
  status: string;
  current_price: number | null;
  recommended_price: number | null;
  purchase_price: number | null;
  sale_price: number | null;
  health_score: number | null;
  views_count: number | null;
  favourites_count: number | null;
  image_url: string | null;
  images: unknown;
  vinted_url: string | null;
  days_listed: number | null;
  created_at: string;
  updated_at: string;
  last_price_check_at: string | null;
  last_optimised_at: string | null;
  last_photo_edit_at: string | null;
  source_type: string | null;
  colour: string | null;
  material: string | null;
  shipping_cost: number | null;
};

type PriceReport = {
  id: string;
  recommended_price: number | null;
  confidence_score: number | null;
  price_range_low: number | null;
  price_range_high: number | null;
  ai_insights: string | null;
  comparable_items: unknown;
  created_at: string;
  item_title: string | null;
  item_brand: string | null;
};

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Live", className: "bg-success/10 text-success border-success/20" },
  sold: { label: "Sold", className: "bg-primary/10 text-primary border-primary/20" },
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  watchlist: { label: "Watchlist", className: "bg-accent/10 text-accent border-accent/20" },
  inactive: { label: "Inactive", className: "bg-muted text-muted-foreground border-border" },
};

function getNextAction(item: Listing): { label: string; action: string; icon: typeof Search } | null {
  if (!item.last_price_check_at) return { label: "Run Price Check", action: "price", icon: Search };
  if (!item.last_optimised_at) return { label: "Improve Listing", action: "optimise", icon: Sparkles };
  if (!item.last_photo_edit_at) return { label: "Enhance Photos", action: "photos", icon: ImageIcon };
  if (item.status === "draft") return { label: "Go Live", action: "publish", icon: Zap };
  return null;
}

function getDaysListed(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
}

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [item, setItem] = useState<Listing | null>(null);
  const [priceReports, setPriceReports] = useState<PriceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const [editingShipping, setEditingShipping] = useState(false);
  const [shippingInput, setShippingInput] = useState("");

  useEffect(() => {
    if (!user || !id) return;
    fetchItem();
  }, [user, id]);

  const fetchItem = async () => {
    if (!id || !user) return;
    setLoading(true);

    const [itemRes, reportsRes] = await Promise.all([
      supabase.from("listings").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
      supabase.from("price_reports").select("*").eq("listing_id", id).order("created_at", { ascending: false }).limit(5),
    ]);

    if (itemRes.error || !itemRes.data) {
      toast.error("Item not found");
      navigate("/listings");
      return;
    }

    setItem(itemRes.data as Listing);
    setPriceReports((reportsRes.data || []) as PriceReport[]);
    setLoading(false);
  };

  const handlePriceCheck = () => {
    if (!item) return;
    const params = new URLSearchParams({ itemId: item.id });
    if (item.vinted_url) params.set("url", item.vinted_url);
    else {
      if (item.brand) params.set("brand", item.brand);
      if (item.category) params.set("category", item.category);
      if (item.condition) params.set("condition", item.condition);
    }
    navigate(`/price-check?${params.toString()}`);
  };

  const handleOptimise = () => {
    if (!item) return;
    const params = new URLSearchParams({ itemId: item.id });
    if (item.title) params.set("title", item.title);
    if (item.description) params.set("description", item.description);
    if (item.brand) params.set("brand", item.brand);
    if (item.category) params.set("category", item.category);
    if (item.size) params.set("size", item.size);
    if (item.condition) params.set("condition", item.condition);
    navigate(`/optimize?${params.toString()}`);
  };

  const handlePhotoStudio = () => {
    if (!item) return;
    navigate(`/vintography?itemId=${item.id}`);
  };

  const handleCopyDescription = () => {
    if (item?.description) {
      navigator.clipboard.writeText(item.description);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Description copied");
    }
  };

  const profit = item && item.current_price != null && item.purchase_price != null
    ? item.current_price - item.purchase_price
    : null;

  if (loading) {
    return (
      <PageShell title="Loading..." icon={<Package className="w-5 h-5" />} subtitle="">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (!item) return null;

  const status = statusConfig[item.status] || statusConfig.inactive;
  const nextAction = getNextAction(item);
  const daysListed = getDaysListed(item.created_at);
  const latestReport = priceReports[0] || null;

  return (
    <PageShell
      title={item.title}
      icon={<Package className="w-5 h-5" />}
      subtitle={[item.brand, item.category, item.size].filter(Boolean).join(" · ")}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePriceCheck} className="hidden sm:flex">
            <Search className="w-3.5 h-3.5 mr-1.5" /> Price
          </Button>
          <Button variant="outline" size="sm" onClick={handleOptimise} className="hidden sm:flex">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Improve
          </Button>
          <Button variant="outline" size="sm" onClick={() => setActiveTab("photos")} className="hidden sm:flex">
            <ImageIcon className="w-3.5 h-3.5 mr-1.5" /> Photos
          </Button>
          {item.vinted_url && (
            <Button variant="outline" size="icon" asChild className="hidden sm:flex">
              <a href={item.vinted_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={handlePriceCheck} className="sm:hidden h-10 w-10">
            <Search className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleOptimise} className="sm:hidden h-10 w-10">
            <Sparkles className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10"><MoreHorizontal className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem onClick={() => setActiveTab("photos")} className="sm:hidden">
                <ImageIcon className="w-3.5 h-3.5 mr-2" /> Photos
              </DropdownMenuItem>
              {item.vinted_url && (
                <DropdownMenuItem asChild className="sm:hidden">
                  <a href={item.vinted_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 mr-2" /> Open on Vinted
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => navigate("/listings")} className="text-muted-foreground">
                <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Back to Items
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      {/* Badge row */}
      <div className="flex items-center gap-3 mb-6 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
        <Badge variant="outline" className={`${status.className} shrink-0`}>{status.label}</Badge>
        {item.brand && <Badge variant="secondary" className="shrink-0"><Tag className="w-3 h-3 mr-1" />{item.brand}</Badge>}
        {item.size && <Badge variant="secondary" className="shrink-0"><Ruler className="w-3 h-3 mr-1" />{item.size}</Badge>}
        {item.condition && <Badge variant="secondary" className="shrink-0"><ShieldCheck className="w-3 h-3 mr-1" />{item.condition}</Badge>}
        {item.colour && <Badge variant="secondary" className="shrink-0">{item.colour}</Badge>}
        {item.material && <Badge variant="secondary" className="shrink-0">{item.material}</Badge>}

        {nextAction && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="ml-auto shrink-0">
            <Button
              size="sm"
              className="font-semibold"
              onClick={() => {
                if (nextAction.action === "price") handlePriceCheck();
                else if (nextAction.action === "optimise") handleOptimise();
                else if (nextAction.action === "photos") setActiveTab("photos");
              }}
            >
              <nextAction.icon className="w-3.5 h-3.5 mr-1.5" />
              {nextAction.label}
            </Button>
          </motion.div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap gap-1 scrollbar-hide">
          <TabsTrigger value="overview" className="min-w-fit">Overview</TabsTrigger>
          <TabsTrigger value="price" className="min-w-fit">Price</TabsTrigger>
          <TabsTrigger value="listing" className="min-w-fit">Listing</TabsTrigger>
          <TabsTrigger value="photos" className="min-w-fit">Photos</TabsTrigger>
        </TabsList>

        {/* ═══ OVERVIEW TAB ═══ */}
        <TabsContent value="overview" className="space-y-6">
          {/* Vinted-Ready Pack — top of Overview when ready */}
          {item.last_optimised_at && (item.image_url || (Array.isArray(item.images) && (item.images as any[]).length > 0)) && (
            <div className="mb-6">
              <VintedReadyPack item={item} onOptimise={handleOptimise} onPhotoStudio={handlePhotoStudio} />
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card
              className="p-4 cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
              onClick={() => {
                if (!editingPrice) {
                  setPriceInput(item.current_price != null ? item.current_price.toFixed(2) : "");
                  setEditingPrice(true);
                }
              }}
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Current Price</p>
              {editingPrice ? (
                <div className="flex items-center gap-1">
                  <span className="text-xl font-display font-bold">£</span>
                  <input
                    autoFocus
                    type="number"
                    step="0.01"
                    min="0"
                    className="text-xl font-display font-bold bg-transparent border-b border-primary outline-none w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    onBlur={async () => {
                      const val = parseFloat(priceInput);
                      if (!isNaN(val) && val >= 0) {
                        const { error } = await supabase.from("listings").update({ current_price: val }).eq("id", item.id);
                        if (error) { toast.error("Failed to update price"); }
                        else { setItem({ ...item, current_price: val }); toast.success("Price updated"); }
                      }
                      setEditingPrice(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      if (e.key === "Escape") setEditingPrice(false);
                    }}
                  />
                </div>
              ) : (
                <p className="text-xl font-display font-bold">
                  {item.current_price != null ? `£${item.current_price.toFixed(2)}` : "—"}
                </p>
              )}
            </Card>
            <Card className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Recommended</p>
              <p className="text-xl font-display font-bold text-success">
                {item.recommended_price != null ? `£${item.recommended_price.toFixed(2)}` : "—"}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Profit</p>
              <p className={`text-xl font-display font-bold ${profit != null && profit >= 0 ? "text-success" : "text-destructive"}`}>
                {profit != null ? `£${profit.toFixed(2)}` : "—"}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Health</p>
              <div className="flex items-center gap-2">
                <HealthScoreMini score={item.health_score} />
                <span className="text-sm font-medium text-muted-foreground">/100</span>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3 flex items-center gap-3">
              <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-bold">{item.views_count ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">Views</p>
              </div>
            </Card>
            <Card className="p-3 flex items-center gap-3">
              <Heart className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-bold">{item.favourites_count ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">Favourites</p>
              </div>
            </Card>
            <Card className="p-3 flex items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-bold">{daysListed}d</p>
                <p className="text-[10px] text-muted-foreground">Listed</p>
              </div>
            </Card>
            <Card className="p-3 flex items-center gap-3">
              <PoundSterling className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-bold">{item.purchase_price != null ? `£${item.purchase_price.toFixed(2)}` : "—"}</p>
                <p className="text-[10px] text-muted-foreground">Cost</p>
              </div>
            </Card>
            <Card
              className="p-3 flex items-center gap-3 cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
              onClick={() => {
                if (!editingShipping) {
                  setShippingInput(item.shipping_cost != null ? item.shipping_cost.toFixed(2) : "");
                  setEditingShipping(true);
                }
              }}
            >
              <Package className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1">
                {editingShipping ? (
                  <div className="flex items-center gap-0.5">
                    <span className="text-sm font-bold">£</span>
                    <input
                      autoFocus
                      type="number"
                      step="0.01"
                      min="0"
                      className="text-sm font-bold bg-transparent border-b border-primary outline-none w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={shippingInput}
                      onChange={(e) => setShippingInput(e.target.value)}
                      onBlur={async () => {
                        const val = parseFloat(shippingInput);
                        if (!isNaN(val) && val >= 0) {
                          const { error } = await supabase.from("listings").update({ shipping_cost: val } as any).eq("id", item.id);
                          if (error) { toast.error("Failed to update shipping"); }
                          else { setItem({ ...item, shipping_cost: val }); toast.success("Shipping cost updated"); }
                        }
                        setEditingShipping(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") setEditingShipping(false);
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-sm font-bold">{item.shipping_cost != null ? `£${item.shipping_cost.toFixed(2)}` : "—"}</p>
                )}
                <p className="text-[10px] text-muted-foreground">Shipping</p>
              </div>
            </Card>
          </div>

          {/* Workflow Progress */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">Item Workflow</h3>
            {(() => {
              const steps = [
                { label: "Priced", done: !!item.last_price_check_at, icon: Search },
                { label: "Optimised", done: !!item.last_optimised_at, icon: Sparkles },
                { label: "Photos", done: !!item.last_photo_edit_at || !!item.image_url, icon: ImageIcon },
                { label: "Listed", done: item.status === "active" || item.status === "sold", icon: Package },
              ];
              const doneCount = steps.filter(s => s.done).length;
              return (
                <>
                  <div className="sm:hidden flex items-center gap-3">
                    <p className="text-sm font-bold">{doneCount} of {steps.length}</p>
                    <div className="flex-1 flex gap-1">
                      {steps.map((step) => (
                        <div key={step.label} className={`flex-1 h-2 rounded-full ${step.done ? "bg-success" : "bg-muted"}`} />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">complete</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    {steps.map((step, i) => (
                      <div key={step.label} className="flex items-center gap-2 flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          step.done ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                        }`}>
                          {step.done ? <Check className="w-4 h-4" /> : <step.icon className="w-3.5 h-3.5" />}
                        </div>
                        <span className={`text-xs font-medium ${step.done ? "text-foreground" : "text-muted-foreground"}`}>
                          {step.label}
                        </span>
                        {i < 3 && <div className={`flex-1 h-px ${step.done ? "bg-success/40" : "bg-border"}`} />}
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </Card>

          {/* Quick Actions */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                variant={!item.last_price_check_at ? "default" : "outline"}
                className="justify-start h-auto py-3 px-4"
                onClick={handlePriceCheck}
              >
                <Search className="w-4 h-4 mr-2 shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-semibold">Run Price Check</p>
                  <p className="text-[10px] opacity-70">
                    {item.last_price_check_at
                      ? `Last: ${format(new Date(item.last_price_check_at), "dd MMM")}`
                      : "Not checked yet"}
                  </p>
                </div>
              </Button>
              <Button
                variant={item.last_price_check_at && !item.last_optimised_at ? "default" : "outline"}
                className="justify-start h-auto py-3 px-4"
                onClick={handleOptimise}
              >
                <Sparkles className="w-4 h-4 mr-2 shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-semibold">Improve Listing</p>
                  <p className="text-[10px] opacity-70">
                    {item.last_optimised_at
                      ? `Last: ${format(new Date(item.last_optimised_at), "dd MMM")}`
                      : "Not optimised yet"}
                  </p>
                </div>
              </Button>
              <Button
                variant={item.last_optimised_at && !item.last_photo_edit_at ? "default" : "outline"}
                className="justify-start h-auto py-3 px-4"
                onClick={handlePhotoStudio}
              >
                <ImageIcon className="w-4 h-4 mr-2 shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-semibold">Photo Studio</p>
                  <p className="text-[10px] opacity-70">
                    {item.last_photo_edit_at
                      ? `Last: ${format(new Date(item.last_photo_edit_at), "dd MMM")}`
                      : "No edits yet"}
                  </p>
                </div>
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* ═══ PRICE TAB ═══ */}
        <TabsContent value="price" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Price Intelligence</h3>
            <Button size="sm" onClick={handlePriceCheck}>
              <Search className="w-3.5 h-3.5 mr-1.5" />
              {latestReport ? "Recheck Price" : "Run Price Check"}
            </Button>
          </div>

          {latestReport ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Recommended</p>
                  <p className="text-xl font-display font-bold text-success">
                    £{latestReport.recommended_price?.toFixed(2) ?? "—"}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Confidence</p>
                  <p className="text-xl font-display font-bold">{latestReport.confidence_score ?? "—"}%</p>
                </Card>
                <Card className="p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Range Low</p>
                  <p className="text-xl font-display font-bold">£{latestReport.price_range_low?.toFixed(2) ?? "—"}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Range High</p>
                  <p className="text-xl font-display font-bold">£{latestReport.price_range_high?.toFixed(2) ?? "—"}</p>
                </Card>
              </div>

              {latestReport.ai_insights && (
                <Card className="p-5">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" /> AI Insights
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{latestReport.ai_insights}</p>
                  <p className="text-[10px] text-muted-foreground mt-3">
                    Last checked {format(new Date(latestReport.created_at), "dd MMM yyyy 'at' HH:mm")}
                  </p>
                </Card>
              )}

              {priceReports.length > 1 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Price History</h4>
                  <div className="space-y-2">
                    {priceReports.slice(1).map((r) => (
                      <Card key={r.id} className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm">{format(new Date(r.created_at), "dd MMM yyyy")}</span>
                        </div>
                        <span className="text-sm font-bold">£{r.recommended_price?.toFixed(2) ?? "—"}</span>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Next step CTA */}
              <Card className="p-4 border-primary/20 bg-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Next: Improve Your Listing</p>
                    <p className="text-xs text-muted-foreground">Use AI to generate a Vinted-ready title and description.</p>
                  </div>
                  <Button size="sm" onClick={handleOptimise}>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Improve
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="p-10 text-center">
              <Search className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium mb-1">No price data yet</p>
              <p className="text-xs text-muted-foreground mb-4">Run a price check to see market intelligence for this item.</p>
              <Button onClick={handlePriceCheck}>
                <Search className="w-3.5 h-3.5 mr-1.5" /> Run Price Check
              </Button>
            </Card>
          )}
        </TabsContent>

        {/* ═══ LISTING TAB ═══ */}
        <TabsContent value="listing" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Listing Copy</h3>
            <Button size="sm" onClick={handleOptimise}>
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Improve Listing
            </Button>
          </div>

          <Card className="p-5 space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Title</p>
              <p className="text-sm font-medium">{item.title}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Description</p>
                {item.description && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleCopyDescription}>
                    {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                )}
              </div>
              {item.description ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{item.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No description yet. Use "Improve Listing" to generate one.</p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-border">
              {[
                { label: "Brand", value: item.brand },
                { label: "Category", value: item.category },
                { label: "Size", value: item.size },
                { label: "Condition", value: item.condition },
                { label: "Colour", value: item.colour },
                { label: "Material", value: item.material },
              ].map((field) => (
                <div key={field.label}>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">{field.label}</p>
                  <p className="text-sm font-medium">{field.value || "—"}</p>
                </div>
              ))}
            </div>
          </Card>

          {item.last_optimised_at && (
            <p className="text-[10px] text-muted-foreground">
              Last optimised {format(new Date(item.last_optimised_at), "dd MMM yyyy 'at' HH:mm")}
            </p>
          )}

          {/* Next step CTA */}
          <Card className="p-4 border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Next: Enhance Your Photos</p>
                <p className="text-xs text-muted-foreground">Clean backgrounds, add lifestyle scenes, or try virtual models.</p>
              </div>
              <Button size="sm" onClick={handlePhotoStudio}>
                <ImageIcon className="w-3.5 h-3.5 mr-1.5" /> Photos
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* ═══ PHOTOS TAB ═══ */}
        <TabsContent value="photos" className="space-y-6">
          <PhotosTab item={item} onEditPhotos={handlePhotoStudio} onItemUpdate={setItem} />

          {/* Next step CTA */}
          {!item.last_optimised_at ? (
            <Card className="p-4 border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Next: Get Your Vinted-Ready Pack</p>
                  <p className="text-xs text-muted-foreground">Generate an optimised title, description and hashtags.</p>
                </div>
                <Button size="sm" onClick={handleOptimise}>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Improve
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </Card>
          ) : (
            <VintedReadyPack item={item} onOptimise={handleOptimise} onPhotoStudio={handlePhotoStudio} />
          )}
        </TabsContent>
      </Tabs>

    </PageShell>
  );
}
