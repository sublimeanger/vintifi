import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HealthScoreGauge, HealthScoreMini } from "@/components/HealthScoreGauge";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  ArrowLeft, Search, Sparkles, ImageIcon, ExternalLink,
  Eye, Heart, Calendar, PoundSterling, TrendingUp,
  Package, MoreHorizontal, Clock, Zap, Tag, Ruler,
  ShieldCheck, Loader2, Copy, Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PhotosTab } from "@/components/PhotosTab";

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

type Activity = {
  id: string;
  type: string;
  payload: unknown;
  created_at: string;
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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    fetchItem();
  }, [user, id]);

  const fetchItem = async () => {
    if (!id || !user) return;
    setLoading(true);

    const [itemRes, reportsRes, activityRes] = await Promise.all([
      supabase.from("listings").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
      supabase.from("price_reports").select("*").eq("listing_id", id).order("created_at", { ascending: false }).limit(5),
      supabase.from("item_activity").select("*").eq("listing_id", id).order("created_at", { ascending: false }).limit(20),
    ]);

    if (itemRes.error || !itemRes.data) {
      toast.error("Item not found");
      navigate("/listings");
      return;
    }

    setItem(itemRes.data as Listing);
    setPriceReports((reportsRes.data || []) as PriceReport[]);
    setActivities((activityRes.data || []) as Activity[]);
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

  const handlePhotos = () => {
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
          <Button variant="outline" size="sm" onClick={handlePriceCheck}>
            <Search className="w-3.5 h-3.5 mr-1.5" /> Price
          </Button>
          <Button variant="outline" size="sm" onClick={handleOptimise}>
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Improve
          </Button>
          <Button variant="outline" size="sm" onClick={handlePhotos} className="hidden sm:flex">
            <ImageIcon className="w-3.5 h-3.5 mr-1.5" /> Photos
          </Button>
          {item.vinted_url && (
            <Button variant="outline" size="icon" asChild className="hidden sm:flex">
              <a href={item.vinted_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handlePhotos} className="sm:hidden">
                <ImageIcon className="w-3.5 h-3.5 mr-2" /> Edit Photos
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
      {/* Status + Next Action Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Badge variant="outline" className={status.className}>{status.label}</Badge>
        {item.brand && <Badge variant="secondary"><Tag className="w-3 h-3 mr-1" />{item.brand}</Badge>}
        {item.size && <Badge variant="secondary"><Ruler className="w-3 h-3 mr-1" />{item.size}</Badge>}
        {item.condition && <Badge variant="secondary"><ShieldCheck className="w-3 h-3 mr-1" />{item.condition}</Badge>}

        {nextAction && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="ml-auto">
            <Button
              size="sm"
              className="font-semibold"
              onClick={() => {
                if (nextAction.action === "price") handlePriceCheck();
                else if (nextAction.action === "optimise") handleOptimise();
                else if (nextAction.action === "photos") handlePhotos();
              }}
            >
              <nextAction.icon className="w-3.5 h-3.5 mr-1.5" />
              {nextAction.label}
            </Button>
          </motion.div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="price">Price</TabsTrigger>
          <TabsTrigger value="listing">Listing</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* ═══ OVERVIEW TAB ═══ */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Current Price</p>
              <p className="text-xl font-display font-bold">
                {item.current_price != null ? `£${item.current_price.toFixed(2)}` : "—"}
              </p>
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
          </div>

          {/* Workflow Progress */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">Item Workflow</h3>
            <div className="flex items-center gap-2">
              {[
                { label: "Priced", done: !!item.last_price_check_at, icon: Search },
                { label: "Optimised", done: !!item.last_optimised_at, icon: Sparkles },
                { label: "Photos", done: !!item.last_photo_edit_at, icon: ImageIcon },
                { label: "Listed", done: item.status === "active" || item.status === "sold", icon: Package },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center gap-2 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    step.done ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                  }`}>
                    {step.done ? <Check className="w-4 h-4" /> : <step.icon className="w-3.5 h-3.5" />}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${step.done ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.label}
                  </span>
                  {i < 3 && <div className={`flex-1 h-px ${step.done ? "bg-success/40" : "bg-border"}`} />}
                </div>
              ))}
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

              {/* Previous reports */}
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border">
              {[
                { label: "Brand", value: item.brand },
                { label: "Category", value: item.category },
                { label: "Size", value: item.size },
                { label: "Condition", value: item.condition },
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
        </TabsContent>

        {/* ═══ PHOTOS TAB ═══ */}
        <TabsContent value="photos" className="space-y-6">
          <PhotosTab item={item} onEditPhotos={handlePhotos} onItemUpdate={setItem} />
        </TabsContent>

        {/* ═══ ACTIVITY TAB ═══ */}
        <TabsContent value="activity" className="space-y-4">
          <h3 className="text-sm font-semibold">Activity Timeline</h3>

          {activities.length > 0 ? (
            <div className="space-y-1">
              {activities.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="p-3 flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      a.type === "price_check" ? "bg-primary/10 text-primary" :
                      a.type === "optimise" ? "bg-accent/10 text-accent" :
                      a.type === "photo_edit" ? "bg-secondary/50 text-secondary-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {a.type === "price_check" ? <Search className="w-3.5 h-3.5" /> :
                       a.type === "optimise" ? <Sparkles className="w-3.5 h-3.5" /> :
                       a.type === "photo_edit" ? <ImageIcon className="w-3.5 h-3.5" /> :
                       a.type === "status_change" ? <Package className="w-3.5 h-3.5" /> :
                       <Clock className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium capitalize">{a.type.replace(/_/g, " ")}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(a.created_at), "dd MMM yyyy 'at' HH:mm")}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="p-10 text-center">
              <Clock className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium mb-1">No activity yet</p>
              <p className="text-xs text-muted-foreground">Actions you take on this item will appear here.</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
