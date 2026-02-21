import { useState, useEffect, useCallback } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
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
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, Sparkles, ImageIcon,
  Eye, Heart, Calendar, PoundSterling, TrendingUp,
  Package, MoreHorizontal, Clock, Zap, Tag, Ruler,
  ShieldCheck, Loader2, Copy, Check, ExternalLink,
  ArrowRight, Download, Hash, Flame, Rocket, CheckCircle2,
} from "lucide-react";
import { MarkAsSoldSheet } from "@/components/MarkAsSoldSheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PhotosTab } from "@/components/PhotosTab";
import { VintedReadyPack } from "@/components/VintedReadyPack";
import { ListingWizard } from "@/components/ListingWizard";

import type { Listing } from "@/types/listing";

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
  if (!item.last_photo_edit_at) return { label: (item.image_url || (Array.isArray(item.images) && (item.images as string[]).length > 0)) ? "Enhance Photos" : "Add Photos", action: "photos", icon: ImageIcon };
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
  usePageMeta(
    item ? `${item.title} — Vintifi` : "Loading — Vintifi",
    item ? `${[item.brand, item.category].filter(Boolean).join(" · ")}` : ""
  );
  const [priceReports, setPriceReports] = useState<PriceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const [editingShipping, setEditingShipping] = useState(false);
  const [shippingInput, setShippingInput] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [soldSheetOpen, setSoldSheetOpen] = useState(false);

  // Quick Hashtags state
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagsLoading, setHashtagsLoading] = useState(false);
  const [hashtagsCopied, setHashtagsCopied] = useState<string | null>(null);

  // Trending match state
  const [trendingMatch, setTrendingMatch] = useState<{ brand_or_item: string; opportunity_score: number } | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    fetchItem();
  }, [user, id]);

  // Fetch trending match when item loads
  useEffect(() => {
    if (!item?.brand) return;
    supabase
      .from("trends")
      .select("brand_or_item, opportunity_score")
      .ilike("brand_or_item", `%${item.brand}%`)
      .gte("opportunity_score", 70)
      .order("opportunity_score", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setTrendingMatch(data[0]);
        else setTrendingMatch(null);
      });
  }, [item?.brand]);

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

  const handleGenerateHashtags = useCallback(async () => {
    if (!item) return;
    setHashtagsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-hashtags", {
        body: {
          brand: item.brand,
          category: item.category,
          condition: item.condition,
          title: item.optimised_title || item.title,
        },
      });
      if (error) throw error;
      if (data?.hashtags) setHashtags(data.hashtags);
    } catch (e) {
      toast.error("Couldn't generate hashtags right now");
    } finally {
      setHashtagsLoading(false);
    }
  }, [item]);

  const handleCopyHashtag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setHashtagsCopied(tag);
    toast.success(`${tag} copied`);
    setTimeout(() => setHashtagsCopied(null), 1500);
  };

  const handleCopyAllHashtags = () => {
    const text = hashtags.join(" ");
    navigator.clipboard.writeText(text);
    toast.success("All hashtags copied!");
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
    if (item.title) params.set("title", item.title);
    if (item.size) params.set("size", item.size);
    if (item.purchase_price != null) params.set("purchasePrice", String(item.purchase_price));
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
    if (item.colour) params.set("colour", item.colour);
    if (item.material) params.set("material", item.material);
    navigate(`/optimize?${params.toString()}`);
  };

  const handlePhotoStudio = () => {
    if (!item) return;
    navigate(`/vintography?itemId=${item.id}`);
  };

  const handleCopyDescription = () => {
    const text = item?.optimised_description || item?.description;
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Description copied");
    }
  };

  const profit = item
    ? item.status === "sold" && item.sale_price != null && item.purchase_price != null
      ? item.sale_price - item.purchase_price
      : item.current_price != null && item.purchase_price != null
        ? item.current_price - item.purchase_price
        : null
    : null;

  const soldDateStr = item?.sold_at ?? (item?.status === "sold" ? item?.updated_at : null);
  const isEstimatedSoldDate = item?.status === "sold" && !item?.sold_at;

  const handleSoldConfirmed = (id: string, salePrice: number, soldAt: string) => {
    if (item) setItem({ ...item, status: "sold", sale_price: salePrice, sold_at: soldAt });
  };

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
      <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-6 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
        <Badge variant="outline" className={`${status.className} shrink-0 text-[10px]`}>{status.label}</Badge>
        {/* Trending Now chip */}
        <AnimatePresence>
          {trendingMatch && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: -8 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className="shrink-0"
            >
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground shadow-sm">
                <motion.span
                  animate={{ scale: [1, 1.25, 1] }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                  className="inline-flex"
                >
                  <Flame className="w-3 h-3" />
                </motion.span>
                Trending Now
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        {item.brand && <Badge variant="secondary" className="shrink-0 text-[10px]"><Tag className="w-3 h-3 mr-1" />{item.brand}</Badge>}
        {item.size && <Badge variant="secondary" className="shrink-0 text-[10px]"><Ruler className="w-3 h-3 mr-1" />{item.size}</Badge>}
        {item.condition && <Badge variant="secondary" className="shrink-0 text-[10px]"><ShieldCheck className="w-3 h-3 mr-1" />{item.condition.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</Badge>}
        {item.colour && <Badge variant="secondary" className="shrink-0 text-[10px]">{item.colour}</Badge>}
        {item.material && <Badge variant="secondary" className="shrink-0 text-[10px]">{item.material}</Badge>}

        {nextAction && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="ml-auto shrink-0">
            <Button
              size="sm"
              className="font-semibold h-9 sm:h-8 text-xs active:scale-95 transition-transform"
              onClick={() => {
                if (nextAction.action === "price") handlePriceCheck();
                else if (nextAction.action === "optimise") handleOptimise();
                else if (nextAction.action === "photos") setActiveTab("photos");
              }}
            >
              <nextAction.icon className="w-3.5 h-3.5 mr-1" />
              {nextAction.label}
            </Button>
          </motion.div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 sm:space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap gap-0.5 scrollbar-hide h-10 sm:h-9">
          <TabsTrigger value="overview" className="min-w-fit text-xs h-9 sm:h-8">Overview</TabsTrigger>
          <TabsTrigger value="price" className="min-w-fit text-xs h-9 sm:h-8">Price</TabsTrigger>
          <TabsTrigger value="listing" className="min-w-fit text-xs h-9 sm:h-8">Listing</TabsTrigger>
          <TabsTrigger value="photos" className="min-w-fit text-xs h-9 sm:h-8">
            Photos
            {(() => {
              const rawImgs = Array.isArray(item.images) ? (item.images as string[]) : [];
              const count = [
                ...(item.image_url ? [item.image_url] : []),
                ...rawImgs.filter((u) => u && u !== item.image_url),
              ].length;
              return count > 0 ? (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary/15 text-primary text-[9px] font-bold w-4 h-4 leading-none">
                  {count}
                </span>
              ) : null;
            })()}
          </TabsTrigger>
        </TabsList>

        {/* ═══ OVERVIEW TAB ═══ */}
        <TabsContent value="overview" className="space-y-2.5 sm:space-y-6">
          {/* Wizard launch card — shown when not yet listed */}
          {!item.vinted_url && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setWizardOpen(true)}
              className="w-full text-left gradient-border rounded-xl group active:scale-[0.99] transition-transform"
            >
              <div className="rounded-xl bg-card px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Rocket className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-display font-bold leading-tight">Get ready to list — guided walkthrough</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Price → Optimise → Photos → Vinted-Ready Pack in one flow</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </div>
            </motion.button>
          )}

          {/* Vinted-Ready Pack — top of Overview when ready */}
          <VintedReadyPack item={item} onOptimise={handleOptimise} onPhotoStudio={handlePhotoStudio} />

          <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
            <Card
              className="p-2 sm:p-4 cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all touch-card"
              onClick={() => {
                if (!editingPrice) {
                  setPriceInput(item.current_price != null ? item.current_price.toFixed(2) : "");
                  setEditingPrice(true);
                }
              }}
            >
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Price</p>
              {editingPrice ? (
                <div className="flex items-center gap-0.5">
                  <span className="text-base sm:text-xl font-display font-bold">£</span>
                  <input
                    autoFocus
                    type="number"
                    step="0.01"
                    min="0"
                    className="text-base sm:text-xl font-display font-bold bg-transparent border-b border-primary outline-none w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                <p className="text-base sm:text-xl font-display font-bold truncate">
                  {item.current_price != null ? `£${item.current_price.toFixed(0)}` : "—"}
                </p>
              )}
            </Card>
            <Card className="p-2 sm:p-4">
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Target</p>
              <p className={`text-sm sm:text-xl font-display font-bold truncate ${item.recommended_price != null ? "text-success" : "text-muted-foreground"}`}>
                {item.recommended_price != null ? `£${item.recommended_price.toFixed(0)}` : "—"}
              </p>
            </Card>
            <Card className="p-2 sm:p-4">
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Profit</p>
              <p className={`text-sm sm:text-xl font-display font-bold truncate ${profit != null && profit >= 0 ? "text-success" : "text-destructive"}`}>
                {profit != null ? `£${profit.toFixed(0)}` : "—"}
              </p>
            </Card>
            <Card className="p-2 sm:p-4">
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Health</p>
              <div className="flex items-center gap-1">
                <HealthScoreMini score={item.health_score} />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-3">
            <Card className="p-2 sm:p-3 flex items-center gap-1.5 sm:gap-2 touch-card">
              <Eye className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-bold">{item.views_count ?? 0}</p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground">Views</p>
              </div>
            </Card>
            <Card className="p-2 sm:p-3 flex items-center gap-1.5 sm:gap-2 touch-card">
              <Heart className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-bold">{item.favourites_count ?? 0}</p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground">Favs</p>
              </div>
            </Card>
            <Card className="p-2 sm:p-3 flex items-center gap-1.5 sm:gap-2 touch-card">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-bold">{daysListed}d</p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground">Listed</p>
              </div>
            </Card>
            <Card className="p-2 sm:p-3 flex items-center gap-1.5 sm:gap-2 touch-card">
              <PoundSterling className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-bold">{item.purchase_price != null ? `£${item.purchase_price.toFixed(0)}` : "—"}</p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground">Cost</p>
              </div>
            </Card>
            <Card
              className="p-2 sm:p-3 flex items-center gap-1.5 sm:gap-2 cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all touch-card"
              onClick={() => {
                if (!editingShipping) {
                  setShippingInput(item.shipping_cost != null ? item.shipping_cost.toFixed(2) : "");
                  setEditingShipping(true);
                }
              }}
            >
              <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                {editingShipping ? (
                  <div className="flex items-center gap-0.5">
                    <span className="text-xs sm:text-sm font-bold">£</span>
                    <input
                      autoFocus
                      type="number"
                      step="0.01"
                      min="0"
                      className="text-xs sm:text-sm font-bold bg-transparent border-b border-primary outline-none w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                  <p className={`text-xs sm:text-sm font-bold truncate ${item.shipping_cost == null ? "text-muted-foreground italic" : ""}`}>{item.shipping_cost != null ? `£${item.shipping_cost.toFixed(0)}` : "Set"}</p>
                )}
                <p className="text-[9px] sm:text-[10px] text-muted-foreground">Ship</p>
              </div>
            </Card>
          </div>

          {/* Sold confirmation card */}
          {item.status === "sold" && (
            <Card className="p-3 sm:p-5 border-primary/30 bg-primary/[0.03]">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-xs sm:text-sm font-bold text-primary">Sold!</span>
                {soldDateStr && (
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {isEstimatedSoldDate ? "~" : ""}{format(new Date(soldDateStr), "d MMM yyyy")}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Sold for</p>
                  <p className="font-display font-bold text-base">{item.sale_price != null ? `£${item.sale_price.toFixed(2)}` : "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Profit</p>
                  <p className={`font-display font-bold text-base ${profit != null && profit >= 0 ? "text-success" : "text-destructive"}`}>
                    {profit != null ? `${profit >= 0 ? "+" : ""}£${profit.toFixed(2)}` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Days to sell</p>
                  <p className="font-display font-bold text-base">
                    {soldDateStr
                      ? Math.max(0, Math.floor((new Date(soldDateStr).getTime() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24)))
                      : "—"}d
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Workflow Progress */}
          <Card className="p-2.5 sm:p-5">
            <h3 className="text-[11px] sm:text-sm font-semibold mb-1.5 sm:mb-4">Workflow</h3>
            {(() => {
              const steps = [
                { label: "Priced", done: !!item.last_price_check_at, icon: Search },
                { label: "Optimised", done: !!item.last_optimised_at, icon: Sparkles },
                { label: "Photos", done: !!item.last_photo_edit_at || !!item.image_url, icon: ImageIcon },
                { label: "Listed", done: !!item.vinted_url || item.status === "sold", icon: Package },
                { label: "Sold ✓", done: item.status === "sold", icon: CheckCircle2, isPrimary: true },
              ];
              const doneCount = steps.filter(s => s.done).length;
              return (
                <>
                  <div className="sm:hidden flex items-center gap-2">
                    <p className="text-xs font-bold">{doneCount}/{steps.length}</p>
                    <div className="flex-1 flex gap-1">
                      {steps.map((step) => (
                        <div key={step.label} className={`flex-1 h-1.5 rounded-full ${step.done ? (step.isPrimary ? "bg-primary" : "bg-success") : "bg-muted"}`} />
                      ))}
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    {steps.map((step, i) => (
                      <div key={step.label} className="flex items-center gap-2 flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          step.done
                            ? step.isPrimary ? "bg-primary/10 text-primary" : "bg-success/10 text-success"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {step.done ? <Check className="w-4 h-4" /> : <step.icon className="w-3.5 h-3.5" />}
                        </div>
                        <span className={`text-xs font-medium ${step.done ? "text-foreground" : "text-muted-foreground"}`}>
                          {step.label}
                        </span>
                        {i < steps.length - 1 && <div className={`flex-1 h-px ${step.done ? "bg-success/40" : "bg-border"}`} />}
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </Card>

          {/* Quick Actions */}
          <div className={`grid gap-1.5 sm:gap-3 ${item.status !== "sold" ? "grid-cols-4" : "grid-cols-3"}`}>
            <Button
              variant={!item.last_price_check_at ? "default" : "outline"}
              className="justify-center h-auto py-3 sm:py-3 px-2 sm:px-4 flex-col sm:flex-row active:scale-95 transition-transform touch-card"
              onClick={handlePriceCheck}
            >
              <Search className="w-4 h-4 sm:mr-2 shrink-0" />
              <div className="text-center sm:text-left">
                <p className="text-[11px] sm:text-sm font-semibold">Price</p>
              </div>
            </Button>
            <Button
              variant={item.last_price_check_at && !item.last_optimised_at ? "default" : "outline"}
              className="justify-center h-auto py-3 sm:py-3 px-2 sm:px-4 flex-col sm:flex-row active:scale-95 transition-transform touch-card"
              onClick={handleOptimise}
            >
              <Sparkles className="w-4 h-4 sm:mr-2 shrink-0" />
              <div className="text-center sm:text-left">
                <p className="text-[11px] sm:text-sm font-semibold">Improve</p>
              </div>
            </Button>
            <Button
              variant={item.last_optimised_at && !item.last_photo_edit_at ? "default" : "outline"}
              className="justify-center h-auto py-3 sm:py-3 px-2 sm:px-4 flex-col sm:flex-row active:scale-95 transition-transform touch-card"
              onClick={handlePhotoStudio}
            >
              <ImageIcon className="w-4 h-4 sm:mr-2 shrink-0" />
              <div className="text-center sm:text-left">
                <p className="text-[11px] sm:text-sm font-semibold">Photos</p>
              </div>
            </Button>
            {item.status !== "sold" && (
              <Button
                variant="outline"
                className="justify-center h-auto py-3 px-2 sm:px-4 flex-col sm:flex-row active:scale-95 transition-transform touch-card border-success/40 text-success hover:bg-success/10"
                onClick={() => setSoldSheetOpen(true)}
              >
                <CheckCircle2 className="w-4 h-4 sm:mr-2 shrink-0" />
                <div className="text-center sm:text-left">
                  <p className="text-[11px] sm:text-sm font-semibold">Sold</p>
                </div>
              </Button>
            )}
          </div>

          {/* ── Quick Hashtags — only shown when listing hasn't been optimised yet ── */}
          {!item.last_optimised_at && <Card className="p-2.5 sm:p-4">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-muted-foreground">Generate Hashtags</span>
              </div>
              <div className="flex items-center gap-1.5">
                {hashtags.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={handleCopyAllHashtags}>
                    <Copy className="w-3 h-3" /> Copy All
                  </Button>
                )}
                <Button
                  variant={hashtags.length > 0 ? "outline" : "default"}
                  size="sm"
                  className="h-7 text-[10px] gap-1 active:scale-95 transition-transform"
                  onClick={handleGenerateHashtags}
                  disabled={hashtagsLoading}
                >
                  {hashtagsLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  {hashtags.length > 0 ? "Refresh" : "Generate"}
                </Button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {hashtags.length > 0 ? (
                <motion.div
                  key="hashtags"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="flex flex-wrap gap-1.5"
                >
                  {hashtags.map((tag) => (
                    <motion.button
                      key={tag}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleCopyHashtag(tag)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
                        hashtagsCopied === tag
                          ? "bg-success/10 border-success/30 text-success"
                          : "bg-muted/60 border-border text-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary"
                      }`}
                    >
                      {hashtagsCopied === tag ? <Check className="w-3 h-3" /> : <Hash className="w-3 h-3 opacity-50" />}
                      {tag.startsWith("#") ? tag.slice(1) : tag}
                    </motion.button>
                  ))}
                </motion.div>
              ) : (
                <motion.p
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-muted-foreground"
                >
                  {hashtagsLoading ? "Generating 5 Vinted hashtags…" : "Tap Generate to get 5 AI hashtags for this item — no full optimisation needed."}
                </motion.p>
              )}
            </AnimatePresence>
          </Card>}
        </TabsContent>

        {/* ═══ PRICE TAB ═══ */}
        <TabsContent value="price" className="space-y-3 sm:space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-semibold">Price Intelligence</h3>
            <Button size="sm" onClick={handlePriceCheck} className="h-9 sm:h-8 active:scale-95 transition-transform">
              <Search className="w-3.5 h-3.5 mr-1.5" />
              {latestReport ? "Recheck Price" : "Run Price Check"}
            </Button>
          </div>

          {latestReport ? (
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
                <Card className="p-2 sm:p-4">
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Target</p>
                  <p className="text-sm sm:text-xl font-display font-bold text-success truncate">
                    £{latestReport.recommended_price?.toFixed(0) ?? "—"}
                  </p>
                </Card>
                <Card className="p-2 sm:p-4">
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Conf.</p>
                  <p className="text-sm sm:text-xl font-display font-bold">{latestReport.confidence_score ?? "—"}%</p>
                </Card>
                <Card className="p-2 sm:p-4">
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Low</p>
                  <p className="text-sm sm:text-xl font-display font-bold truncate">£{latestReport.price_range_low?.toFixed(0) ?? "—"}</p>
                </Card>
                <Card className="p-2 sm:p-4">
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">High</p>
                  <p className="text-sm sm:text-xl font-display font-bold truncate">£{latestReport.price_range_high?.toFixed(0) ?? "—"}</p>
                </Card>
              </div>

              {latestReport.ai_insights && (
                <Card className="p-2.5 sm:p-5">
                  <h4 className="text-xs sm:text-sm font-semibold mb-1.5 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" /> AI Insights
                  </h4>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{latestReport.ai_insights}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-2">
                    Checked {format(new Date(latestReport.created_at), "dd MMM yyyy")}
                  </p>
                </Card>
              )}

              {priceReports.length > 1 && (
                <div>
                  <h4 className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 sm:mb-3">Price History</h4>
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
              <Card className="p-2.5 sm:p-3 border-primary/20 bg-primary/5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold">Next: Improve Your Listing</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">AI-generated title & description</p>
                  </div>
                  <Button size="sm" onClick={handleOptimise} className="shrink-0 h-9 sm:h-8 active:scale-95 touch-card">
                    <Sparkles className="w-3.5 h-3.5 mr-1" /> Improve
                  </Button>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="p-5 sm:p-10 text-center">
              <Search className="w-6 h-6 sm:w-7 sm:h-7 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs sm:text-sm font-medium mb-1">No price data yet</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground mb-3">Run a price check to see market intelligence.</p>
              <Button onClick={handlePriceCheck} className="h-11 sm:h-10 active:scale-95 touch-card">
                <Search className="w-3.5 h-3.5 mr-1.5" /> Run Price Check
              </Button>
            </Card>
          )}
        </TabsContent>

        {/* ═══ LISTING TAB ═══ */}
        <TabsContent value="listing" className="space-y-2.5 sm:space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-semibold">Listing Copy</h3>
            <Button size="sm" onClick={handleOptimise} className="h-9 sm:h-8 active:scale-95 touch-card">
              <Sparkles className="w-3.5 h-3.5 mr-1" /> Improve
            </Button>
          </div>

          <Card className="p-2.5 sm:p-5 space-y-2.5 sm:space-y-3">
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Title</p>
                {(item.optimised_title || item.title) && (
                  <Button variant="ghost" size="sm" className="h-7 sm:h-6 text-[10px] active:scale-95" onClick={() => {
                    navigator.clipboard.writeText(item.optimised_title || item.title);
                    toast.success("Title copied");
                  }}>
                    <Copy className="w-3 h-3 mr-1" /> Copy
                  </Button>
                )}
              </div>
              <p className="text-xs sm:text-sm font-medium">{item.optimised_title || item.title}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Description</p>
                {(item.optimised_description || item.description) && (
                  <Button variant="ghost" size="sm" className="h-7 sm:h-6 text-[10px] active:scale-95" onClick={handleCopyDescription}>
                    {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                )}
              </div>
              {(item.optimised_description || item.description) ? (
                <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{item.optimised_description || item.description}</p>
              ) : (
                <p className="text-xs sm:text-sm text-muted-foreground italic">No description yet. Tap "Improve" to generate one.</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
              {[
                { label: "Brand", value: item.brand },
                { label: "Category", value: item.category },
                { label: "Size", value: item.size },
                { label: "Condition", value: item.condition?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) },
                { label: "Colour", value: item.colour },
                { label: "Material", value: item.material },
              ].map((field) => (
                <div key={field.label}>
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">{field.label}</p>
                  <p className="text-xs sm:text-sm font-medium">{field.value || "—"}</p>
                </div>
              ))}
            </div>
          </Card>

          {item.last_optimised_at && (
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">
              Optimised {format(new Date(item.last_optimised_at), "dd MMM yyyy")}
            </p>
          )}

          <Card className="p-2.5 sm:p-3 border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold">Next: Enhance Photos</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Backgrounds, models & more</p>
              </div>
              <Button size="sm" onClick={handlePhotoStudio} className="shrink-0 h-9 sm:h-8 active:scale-95 touch-card">
                <ImageIcon className="w-3.5 h-3.5 mr-1" /> Photos
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* ═══ PHOTOS TAB ═══ */}
        <TabsContent value="photos" className="space-y-2.5 sm:space-y-6">
          <PhotosTab item={item} onEditPhotos={handlePhotoStudio} onItemUpdate={setItem} />

          {/* Next step CTA */}
          {!item.last_optimised_at ? (
            <Card className="p-2.5 sm:p-3 border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold">Next: Vinted-Ready Pack</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Optimised title, description & hashtags</p>
                </div>
                <Button size="sm" onClick={handleOptimise} className="shrink-0 h-9 sm:h-8 active:scale-95 touch-card">
                  <Sparkles className="w-3.5 h-3.5 mr-1" /> Improve
                </Button>
              </div>
            </Card>
          ) : (
          (item.image_url || (Array.isArray(item.images) && (item.images as any[]).length > 0)) && (
              <VintedReadyPack item={item} onOptimise={handleOptimise} onPhotoStudio={handlePhotoStudio} />
            )
          )}
        </TabsContent>
      </Tabs>

      {/* Listing Wizard overlay */}
      <ListingWizard
        item={item}
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onItemUpdate={(updated) => setItem(updated as Listing)}
      />
    </PageShell>
  );
}
