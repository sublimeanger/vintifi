import { useState, useEffect, useMemo } from "react";
import { ProgressiveImage } from "@/components/ProgressiveImage";
import { usePageMeta } from "@/hooks/usePageMeta";
import { HealthScoreMini } from "@/components/HealthScoreGauge";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Loader2, Package, Heart, Eye, Upload, Download,
  TrendingUp, Trash2,
  RefreshCw, MoreVertical, Zap, AlertTriangle,
  PoundSterling, Calendar, Check, X, Pencil, Sparkles,
  Tag, Ruler, ShieldCheck, Camera, SlidersHorizontal,
  CheckCircle2,
} from "lucide-react";
import { ListingCardSkeleton } from "@/components/LoadingSkeletons";

import { ImportWardrobeModal } from "@/components/ImportWardrobeModal";
import { NewItemWizard } from "@/components/NewItemWizard";
import { MarkAsSoldSheet } from "@/components/MarkAsSoldSheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageShell } from "@/components/PageShell";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Crown } from "lucide-react";

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
  vinted_url: string | null;
  days_listed: number | null;
  created_at: string;
  updated_at: string;
  sold_at: string | null;
};

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  sold: "bg-primary/10 text-primary border-primary/20",
  reserved: "bg-accent/10 text-accent border-accent/20",
  inactive: "bg-muted text-muted-foreground border-border",
};

function getHealthIndicator(score: number | null) {
  if (score === null) return { color: "bg-muted-foreground/30", textColor: "text-muted-foreground", label: "Unknown", ring: "ring-muted-foreground/20" };
  if (score >= 80) return { color: "bg-success", textColor: "text-success", label: "Excellent", ring: "ring-success/20" };
  if (score >= 60) return { color: "bg-accent", textColor: "text-accent", label: "Good", ring: "ring-accent/20" };
  if (score >= 40) return { color: "bg-orange-500", textColor: "text-orange-500", label: "Fair", ring: "ring-orange-500/20" };
  return { color: "bg-destructive", textColor: "text-destructive", label: "Needs Work", ring: "ring-destructive/20" };
}

function getDaysListed(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
}

function formatAddedDate(dateStr: string): string {
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) +
    ", " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

function getDaysToSell(listing: Listing): number | null {
  const soldDate = listing.sold_at ?? listing.updated_at;
  if (!soldDate) return null;
  return Math.max(0, Math.floor(
    (new Date(soldDate).getTime() - new Date(listing.created_at).getTime()) / (1000 * 60 * 60 * 24)
  ));
}

function getProfit(listing: Listing): number | null {
  if (listing.sale_price != null && listing.purchase_price != null) {
    return listing.sale_price - listing.purchase_price;
  }
  if (listing.current_price != null && listing.purchase_price != null) {
    return listing.current_price - listing.purchase_price;
  }
  return null;
}

const LISTING_LIMITS: Record<string, number> = { free: 20, pro: 200, business: 1000, scale: 999999 };
const IMPORT_LIMITS: Record<string, number> = { free: 20, pro: 200, business: 9999, scale: 9999 };

export default function Listings() {
  usePageMeta("My Items — Vintifi", "Manage your wardrobe inventory");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, session, profile } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || searchParams.get("filter") || "all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Filter/sort state
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterCondition, setFilterCondition] = useState<string>("all");
  const [filterMinPrice, setFilterMinPrice] = useState<string>("");
  const [filterMaxPrice, setFilterMaxPrice] = useState<string>("");
  const [filterHealthBand, setFilterHealthBand] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  // Mark as Sold state
  const [soldSheetOpen, setSoldSheetOpen] = useState(false);
  const [soldSheetListing, setSoldSheetListing] = useState<Listing | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const [showUpgrade, setShowUpgrade] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const tier = profile?.subscription_tier || "free";
  const listingLimit = LISTING_LIMITS[tier] || 20;
  const isUnlimited = listingLimit > 99999;
  const importLimit = IMPORT_LIMITS[tier] || 20;
  const isImportUnlimited = importLimit > 9000;

  // Derived filter options
  const availableCategories = useMemo(
    () => [...new Set(listings.map((l) => l.category).filter(Boolean))].sort() as string[],
    [listings]
  );
  const availableConditions = useMemo(
    () => [...new Set(listings.map((l) => l.condition).filter(Boolean))].sort() as string[],
    [listings]
  );

  const activeFilterCount = useMemo(
    () =>
      [
        filterCategory !== "all",
        filterCondition !== "all",
        filterMinPrice !== "",
        filterMaxPrice !== "",
        filterHealthBand !== "all",
        sortBy !== "newest",
      ].filter(Boolean).length,
    [filterCategory, filterCondition, filterMinPrice, filterMaxPrice, filterHealthBand, sortBy]
  );

  const fetchListings = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load listings");
      console.error(error);
    } else {
      setListings(data as Listing[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchListings(); }, [user]);

  const handleDeleteListing = async (id: string) => {
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete listing");
    } else {
      toast.success("Listing removed");
      setListings((prev) => prev.filter((l) => l.id !== id));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredListings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredListings.map((l) => l.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("listings").delete().in("id", ids);
    if (error) {
      toast.error("Failed to delete listings");
    } else {
      toast.success(`${ids.length} listing${ids.length > 1 ? "s" : ""} deleted`);
      setListings((prev) => prev.filter((l) => !selectedIds.has(l.id)));
      setSelectedIds(new Set());
    }
    setBulkDeleting(false);
  };

  const handlePriceCheck = (listing: Listing) => {
    const params = new URLSearchParams();
    params.set("itemId", listing.id);
    if (listing.vinted_url) {
      params.set("url", listing.vinted_url);
    } else {
      if (listing.brand) params.set("brand", listing.brand);
      if (listing.category) params.set("category", listing.category);
      if (listing.condition) params.set("condition", listing.condition);
    }
    if (listing.title) params.set("title", listing.title);
    if (listing.size) params.set("size", listing.size);
    if (listing.purchase_price != null) params.set("purchasePrice", String(listing.purchase_price));
    navigate(`/price-check?${params.toString()}`);
  };

  const handleOptimiseListing = (listing: Listing) => {
    const params = new URLSearchParams();
    params.set("itemId", listing.id);
    if (listing.title) params.set("title", listing.title);
    if (listing.description) params.set("description", listing.description);
    if (listing.brand) params.set("brand", listing.brand);
    if (listing.category) params.set("category", listing.category);
    if (listing.size) params.set("size", listing.size);
    if (listing.condition) params.set("condition", listing.condition);
    navigate(`/optimize?${params.toString()}`);
  };

  const openMarkAsSold = (listing: Listing) => {
    setSoldSheetListing(listing);
    setSoldSheetOpen(true);
  };

  const handleSoldConfirmed = (id: string, salePrice: number, soldAt: string) => {
    setListings((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, status: "sold", sale_price: salePrice, sold_at: soldAt } : l
      )
    );
  };

  const startEdit = (id: string, field: string, currentValue: string | number | null) => {
    setEditingId(id);
    setEditField(field);
    setEditValue(currentValue != null ? String(currentValue) : "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditField(null);
    setEditValue("");
  };

  const saveEdit = async (id: string) => {
    const update: Record<string, unknown> = {};
    if (editField === "purchase_price" || editField === "sale_price") {
      update[editField] = editValue ? parseFloat(editValue) : null;
    } else if (editField === "status") {
      update.status = editValue;
      if (editValue === "sold") {
        update.sold_at = new Date().toISOString();
        const listing = listings.find((l) => l.id === id);
        if (listing && !listing.sale_price && listing.current_price) {
          update.sale_price = listing.current_price;
        }
      }
    }

    const { error } = await supabase.from("listings").update(update).eq("id", id);
    if (error) {
      toast.error("Failed to update");
      console.error(error);
    } else {
      toast.success("Updated!");
      setListings((prev) => prev.map((l) => l.id === id ? { ...l, ...update } as Listing : l));
    }
    cancelEdit();
  };

  const clearFilters = () => {
    setFilterCategory("all");
    setFilterCondition("all");
    setFilterMinPrice("");
    setFilterMaxPrice("");
    setFilterHealthBand("all");
    setSortBy("newest");
  };

  const needsOptimisingFilter = statusFilter === "needs_optimising";

  const filteredListings = useMemo(() => {
    let result = listings.filter((l) => {
      const matchesSearch =
        !searchQuery ||
        l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.brand?.toLowerCase().includes(searchQuery.toLowerCase());

      if (needsOptimisingFilter) {
        return matchesSearch && l.status === "active" && !l.description && l.health_score == null;
      }

      const matchesStatus = statusFilter === "all" || l.status === statusFilter;
      const matchesCategory = filterCategory === "all" || l.category === filterCategory;
      const matchesCondition = filterCondition === "all" || l.condition === filterCondition;
      const price = l.current_price ?? l.recommended_price;
      const matchesMinPrice = filterMinPrice === "" || (price != null && price >= parseFloat(filterMinPrice));
      const matchesMaxPrice = filterMaxPrice === "" || (price != null && price <= parseFloat(filterMaxPrice));
      const matchesHealth =
        filterHealthBand === "all" ||
        (filterHealthBand === "good" && (l.health_score ?? 0) >= 80) ||
        (filterHealthBand === "fair" && (l.health_score ?? 0) >= 60 && (l.health_score ?? 0) < 80) ||
        (filterHealthBand === "poor" && (l.health_score ?? 0) < 60 && l.health_score != null);

      return matchesSearch && matchesStatus && matchesCategory && matchesCondition && matchesMinPrice && matchesMaxPrice && matchesHealth;
    });

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "price_high":
          return (b.current_price ?? b.recommended_price ?? 0) - (a.current_price ?? a.recommended_price ?? 0);
        case "price_low":
          return (a.current_price ?? a.recommended_price ?? 0) - (b.current_price ?? b.recommended_price ?? 0);
        case "health":
          return (b.health_score ?? -1) - (a.health_score ?? -1);
        case "days":
          return getDaysListed(b.created_at) - getDaysListed(a.created_at);
        case "profit": {
          const profitA = a.sale_price != null && a.purchase_price != null ? a.sale_price - a.purchase_price : -Infinity;
          const profitB = b.sale_price != null && b.purchase_price != null ? b.sale_price - b.purchase_price : -Infinity;
          return profitB - profitA;
        }
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [listings, searchQuery, statusFilter, needsOptimisingFilter, filterCategory, filterCondition, filterMinPrice, filterMaxPrice, filterHealthBand, sortBy]);

  const deadStockListings = listings.filter(
    (l) => l.status === "active" && getDaysListed(l.created_at) >= 30
  );

  const totalPurchaseCost = listings
    .filter((l) => l.purchase_price != null)
    .reduce((sum, l) => sum + (l.purchase_price || 0), 0);

  const totalRevenue = listings
    .filter((l) => l.status === "sold" && l.sale_price != null)
    .reduce((sum, l) => sum + (l.sale_price || 0), 0);

  const totalProfit = totalRevenue - listings
    .filter((l) => l.status === "sold" && l.purchase_price != null)
    .reduce((sum, l) => sum + (l.purchase_price || 0), 0);

  // Sold filter revenue/profit summary
  const soldRevenueSummary = useMemo(() => {
    if (statusFilter !== "sold") return null;
    const rev = filteredListings
      .filter((l) => l.sale_price != null)
      .reduce((s, l) => s + (l.sale_price ?? 0), 0);
    const profit = filteredListings
      .filter((l) => l.sale_price != null && l.purchase_price != null)
      .reduce((s, l) => s + ((l.sale_price ?? 0) - (l.purchase_price ?? 0)), 0);
    const hasCosts = filteredListings.some((l) => l.purchase_price != null);
    return { rev, profit, hasCosts };
  }, [filteredListings, statusFilter]);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const importsThisMonth = listings.filter((l) => new Date(l.created_at) >= monthStart).length;
  const importRemaining = Math.max(0, importLimit - importsThisMonth);

  const stats = {
    total: listings.length,
    active: listings.filter((l) => l.status === "active").length,
    totalValue: listings
      .filter((l) => l.status === "active" && (l.current_price || l.recommended_price))
      .reduce((sum, l) => sum + (l.current_price ?? l.recommended_price ?? 0), 0),
    avgHealth:
      listings.filter((l) => l.health_score).length > 0
        ? Math.round(
            listings
              .filter((l) => l.health_score)
              .reduce((sum, l) => sum + (l.health_score || 0), 0) /
              listings.filter((l) => l.health_score).length
          )
        : null,
    sold: listings.filter((l) => l.status === "sold").length,
    deadStock: deadStockListings.length,
  };

  const handleImportClick = () => {
    if (tier === "free") {
      setShowUpgrade(true);
      return;
    }
    setImportModalOpen(true);
  };

  const headerActions = (
    <div className="flex items-center gap-1.5">
      <Button variant="outline" size="sm" onClick={handleImportClick} className="font-semibold hidden sm:flex h-9">
        <Download className="w-3.5 h-3.5 mr-1.5" /> Import
      </Button>
      <Button variant="outline" size="icon" onClick={handleImportClick} className="sm:hidden h-9 w-9 rounded-xl" title="Import CSV">
        <Download className="w-4 h-4" />
      </Button>
      <Button size="sm" className="font-semibold hidden sm:flex h-9" onClick={() => navigate("/sell")}>
        <Plus className="w-3.5 h-3.5 mr-1.5" /> Add
      </Button>
      <Button size="icon" className="sm:hidden h-9 w-9 rounded-xl" onClick={() => navigate("/sell")}>
        <Plus className="w-4 h-4" />
      </Button>
      <NewItemWizard
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onCreated={fetchListings}
        listingCount={stats.active}
        listingLimit={listingLimit}
      />
    </div>
  );

  return (
    <PageShell
      title="My Listings"
      subtitle={`${stats.total} listings · £${stats.totalValue.toFixed(0)} portfolio`}
      icon={<Package className="w-5 h-5 text-primary" />}
      actions={headerActions}
      maxWidth="max-w-5xl"
    >

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-1 sm:gap-3 mb-3 sm:mb-6">
        {[
          { label: "Total", value: stats.total.toString(), icon: Package, tint: "" },
          { label: "Active", value: stats.active.toString(), icon: TrendingUp, tint: "border-success/10 bg-success/[0.03]" },
          { label: "Value", value: `£${stats.totalValue.toFixed(0)}`, icon: Zap, tint: "border-primary/10 bg-primary/[0.03]" },
          { label: "Health", value: stats.avgHealth !== null ? `${stats.avgHealth}%` : "—", icon: Heart, tint: "border-accent/10 bg-accent/[0.03]" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className={`p-1.5 sm:p-4 rounded-xl ${s.tint}`}>
              <div className="flex items-center gap-0.5 sm:gap-1 mb-0.5">
                <s.icon className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
                <span className="text-[7px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider">{s.label}</span>
              </div>
              <p className="font-display text-base sm:text-2xl font-bold leading-tight">{s.value}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Listing Limit Indicator */}
      {!isUnlimited && (
        <Card className={`p-2.5 sm:p-4 mb-3 sm:mb-6 ${stats.active >= listingLimit ? "border-destructive/30 bg-destructive/[0.03]" : "border-border"}`}>
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Listings: {stats.active} of {listingLimit}
            </span>
            {stats.active >= listingLimit && (
              <Button size="sm" variant="outline" onClick={() => setShowUpgrade(true)} className="h-7 text-xs gap-1.5">
                <Crown className="w-3 h-3" /> Upgrade
              </Button>
            )}
          </div>
          <Progress value={Math.min((stats.active / listingLimit) * 100, 100)} className="h-1.5" />
        </Card>
      )}

      {/* Monthly Import Allowance */}
      {!isImportUnlimited && (
        <Card className={`p-2.5 sm:p-4 mb-3 sm:mb-6 ${importRemaining <= 0 ? "border-destructive/30 bg-destructive/[0.03]" : "border-border"}`}>
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Monthly Imports: {importsThisMonth} of {importLimit}
            </span>
            {importRemaining <= 0 && (
              <Button size="sm" variant="outline" onClick={() => setShowUpgrade(true)} className="h-7 text-xs gap-1.5">
                <Crown className="w-3 h-3" /> Upgrade
              </Button>
            )}
          </div>
          <Progress value={Math.min((importsThisMonth / importLimit) * 100, 100)} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {importRemaining > 0 ? `${importRemaining} imports remaining this month` : "Limit reached — upgrade for more"}
          </p>
        </Card>
      )}

      {/* P&L Summary — collapsible */}
      {(totalPurchaseCost > 0 || totalRevenue > 0) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <details className="mb-3 sm:mb-6">
            <summary className="cursor-pointer">
              <Card className="p-2.5 sm:p-4 border-primary/20 bg-primary/[0.02] inline-flex items-center gap-1.5 sm:gap-2 w-full">
                <PoundSterling className="w-3.5 h-3.5 text-primary" />
                <span className="font-display font-bold text-xs sm:text-sm">P&L</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {totalProfit >= 0 ? "+" : ""}£{totalProfit.toFixed(0)} profit
                </span>
              </Card>
            </summary>
            <Card className="p-2.5 sm:p-4 mt-1 border-primary/20 bg-primary/[0.02]">
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider">Invested</p>
                  <p className="font-display font-bold text-base sm:text-lg">£{totalPurchaseCost.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider">Revenue</p>
                  <p className="font-display font-bold text-base sm:text-lg text-success">£{totalRevenue.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider">Profit</p>
                  <p className={`font-display font-bold text-base sm:text-lg ${totalProfit >= 0 ? "text-success" : "text-destructive"}`}>
                    {totalProfit >= 0 ? "+" : ""}£{totalProfit.toFixed(0)}
                  </p>
                </div>
              </div>
            </Card>
          </details>
        </motion.div>
      )}

      {/* Dead Stock Alert — with actions */}
      {deadStockListings.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-2.5 sm:p-4 mb-3 sm:mb-6 border-destructive/30 bg-destructive/[0.03]">
            <div className="flex items-start gap-2 sm:gap-3">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <h3 className="font-display font-bold text-xs sm:text-sm text-destructive">
                  {deadStockListings.length} Dead Stock
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Listed for 30+ days. Consider reducing prices, relisting, or bundling.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {deadStockListings.slice(0, 5).map((l) => (
                    <Badge key={l.id} variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                      {l.title.length > 20 ? l.title.slice(0, 20) + "…" : l.title} · {getDaysListed(l.created_at)}d
                    </Badge>
                  ))}
                  {deadStockListings.length > 5 && (
                    <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                      +{deadStockListings.length - 5} more
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => setStatusFilter("active")}
                  >
                    View Dead Stock
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Search & Filter Bar */}
      <div className="sticky top-[52px] lg:top-0 z-20 bg-background/95 backdrop-blur-xl -mx-3 sm:-mx-4 lg:-mx-6 px-3 sm:px-4 lg:px-6 py-2 mb-3 border-b border-border/40">
        <div className="flex gap-1.5 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-8 h-10 text-sm rounded-xl"
            />
          </div>
          <Button
            variant={showFilters || activeFilterCount > 0 ? "default" : "outline"}
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl relative"
            onClick={() => setShowFilters((v) => !v)}
            title="Filter and sort"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={fetchListings} className="h-10 w-10 shrink-0 rounded-xl">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 overflow-hidden"
          >
            <Card className="p-3 sm:p-4 border-border/60 bg-muted/20">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                {/* Sort By */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Sort</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-9 text-xs rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest first</SelectItem>
                      <SelectItem value="oldest">Oldest first</SelectItem>
                      <SelectItem value="price_high">Price: High → Low</SelectItem>
                      <SelectItem value="price_low">Price: Low → High</SelectItem>
                      <SelectItem value="health">Best health score</SelectItem>
                      <SelectItem value="days">Listed longest</SelectItem>
                      <SelectItem value="profit">Highest profit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Category */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Category</label>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="h-9 text-xs rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {availableCategories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Condition */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Condition</label>
                  <Select value={filterCondition} onValueChange={setFilterCondition}>
                    <SelectTrigger className="h-9 text-xs rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {availableConditions.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Min Price */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Min (£)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filterMinPrice}
                    onChange={(e) => setFilterMinPrice(e.target.value)}
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
                {/* Max Price */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Max (£)</label>
                  <Input
                    type="number"
                    placeholder="Any"
                    value={filterMaxPrice}
                    onChange={(e) => setFilterMaxPrice(e.target.value)}
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
                {/* Health Band */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Health</label>
                  <Select value={filterHealthBand} onValueChange={setFilterHealthBand}>
                    <SelectTrigger className="h-9 text-xs rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any</SelectItem>
                      <SelectItem value="good">Excellent (80+)</SelectItem>
                      <SelectItem value="fair">Good (60–79)</SelectItem>
                      <SelectItem value="poor">Needs work (&lt;60)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {activeFilterCount > 0 && (
                <div className="flex justify-end mt-2 pt-2 border-t border-border/40">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground gap-1.5"
                    onClick={clearFilters}
                  >
                    <X className="w-3 h-3" /> Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Chips */}
      {listings.length > 0 && (
        <div className="flex gap-1 sm:gap-1.5 overflow-x-auto scrollbar-hide mb-2 -mx-1 px-1 pb-1">
          {["all", "active", "needs_optimising", "sold", "reserved", "inactive"].map((s) => {
            const count = s === "all"
              ? listings.length
              : s === "needs_optimising"
                ? listings.filter((l) => l.status === "active" && !l.description && l.health_score == null).length
                : listings.filter((l) => l.status === s).length;
            if (s !== "all" && count === 0) return null;
            const label = s === "needs_optimising" ? "Needs optimising" : s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium border transition-all active:scale-95 shrink-0 ${s !== "needs_optimising" ? "capitalize" : ""} ${
                  statusFilter === s
                    ? s === "needs_optimising"
                      ? "bg-accent/10 text-accent border-accent/30"
                      : "bg-primary/10 text-primary border-primary/30"
                    : "bg-background text-muted-foreground border-border hover:border-primary/30"
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Sold revenue summary line */}
      {soldRevenueSummary && !loading && filteredListings.length > 0 && (
        <p className="text-xs text-muted-foreground mb-2">
          {filteredListings.length} sold · £{soldRevenueSummary.rev.toFixed(0)} revenue
          {soldRevenueSummary.hasCosts && ` · ${soldRevenueSummary.profit >= 0 ? "+" : ""}£${soldRevenueSummary.profit.toFixed(0)} profit`}
        </p>
      )}

      {/* Filter result count */}
      {activeFilterCount > 0 && !soldRevenueSummary && !loading && (
        <p className="text-xs text-muted-foreground mb-2">
          Showing {filteredListings.length} of {listings.length} listings
        </p>
      )}

      {/* Listings */}
      {loading ? (
        <ListingCardSkeleton count={5} />
      ) : filteredListings.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 sm:py-20">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-primary/10 via-accent/5 to-muted/30 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground/40" />
          </div>
          <h3 className="font-display font-bold text-xl sm:text-2xl mb-1.5">
            {listings.length === 0 ? "No listings yet" : "No matching listings"}
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
            {listings.length === 0
              ? "Start selling in under 2 minutes"
              : "Try adjusting your search or filters"}
          </p>
          {listings.length === 0 && (
            <Button onClick={() => setAddDialogOpen(true)} className="font-bold h-12 rounded-xl shadow-coral active:scale-[0.97] transition-transform">
              <Plus className="w-4 h-4 mr-2" /> Add Your First Listing
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-1.5 sm:space-y-3">
          {/* Bulk Action Bar */}
          {filteredListings.length > 0 && (
            <div className="flex items-center gap-2 sm:gap-3 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border border-border bg-muted/30">
              <Checkbox
                checked={selectedIds.size === filteredListings.length && filteredListings.length > 0}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
              />
              <span className="text-xs text-muted-foreground font-medium">
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
              </span>
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="ml-auto h-7 text-xs font-semibold gap-1.5"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                >
                  {bulkDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Delete {selectedIds.size}
                </Button>
              )}
            </div>
          )}
          <AnimatePresence>
            {filteredListings.map((listing, i) => {
              const isSold = listing.status === "sold";
              const soldDateStr = listing.sold_at ?? (isSold ? listing.updated_at : null);
              const isEstimatedDate = isSold && !listing.sold_at;
              const daysListed = getDaysListed(listing.created_at);
              const daysToSell = isSold ? getDaysToSell(listing) : null;
              const isDeadStock = listing.status === "active" && daysListed >= 30;
              const health = getHealthIndicator(listing.health_score);
              const profit = getProfit(listing);
              return (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className={`overflow-hidden transition-all duration-200 rounded-xl ${
                    isSold ? "border-primary/20 bg-primary/[0.01]" : isDeadStock ? "border-destructive/30 bg-destructive/[0.01]" : ""
                  } hover:shadow-md hover:scale-[1.005]`}>
                    <div
                      className="p-2 sm:p-4 cursor-pointer active:bg-muted/20 transition-colors touch-card"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest("button, input, select, [role='menuitem'], [data-radix-collection-item]")) return;
                        navigate(`/items/${listing.id}`);
                      }}
                    >
                      <div className="flex items-start gap-1.5 sm:gap-3">
                        {/* Selection checkbox */}
                        <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(listing.id)}
                            onCheckedChange={() => toggleSelect(listing.id)}
                            aria-label={`Select ${listing.title}`}
                          />
                        </div>
                        {/* Image */}
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-muted flex items-center justify-center shrink-0 relative overflow-hidden">
                          {listing.image_url ? (
                            <ProgressiveImage src={listing.image_url} alt={listing.title} className="rounded-xl" />
                          ) : (
                            <Package className="w-4 h-4 sm:w-6 sm:h-6 text-muted-foreground/40" />
                          )}
                          <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full ${health.color} ring-2 ${health.ring}`} />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-display font-bold text-xs sm:text-sm leading-snug line-clamp-1">{listing.title}</h3>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <Badge variant="outline" className={`text-[10px] capitalize py-0 ${statusColors[listing.status] || ""}`}>
                                  {editingId === listing.id && editField === "status" ? (
                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                      <Select value={editValue} onValueChange={(v) => { setEditValue(v); }}>
                                        <SelectTrigger className="h-5 text-[10px] w-20 border-0 p-0 shadow-none">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-popover">
                                          {["active", "sold", "reserved", "inactive"].map((s) => (
                                            <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => saveEdit(listing.id)}>
                                        <Check className="w-3 h-3 text-success" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-4 w-4" onClick={cancelEdit}>
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <span className="cursor-pointer" onClick={() => startEdit(listing.id, "status", listing.status)} title="Tap to change status">
                                      {listing.status}
                                    </span>
                                  )}
                                </Badge>
                                {listing.brand && <span className="text-[10px] sm:text-xs text-muted-foreground">{listing.brand}</span>}
                                {listing.category && <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">· {listing.category}</span>}
                                {isDeadStock && (
                                  <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive gap-0.5 py-0">
                                    <AlertTriangle className="w-2.5 h-2.5" /> Dead
                                  </Badge>
                                )}
                                {!listing.description && listing.health_score == null && listing.status === "active" && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] border-accent/40 text-accent gap-0.5 py-0 cursor-pointer hover:bg-accent/10 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); handleOptimiseListing(listing); }}
                                  >
                                    <Sparkles className="w-2.5 h-2.5" /> Needs optimising
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-0.5 shrink-0">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-lg">
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-popover">
                                  {listing.status !== "sold" && (
                                    <DropdownMenuItem
                                      className="text-success font-semibold"
                                      onClick={() => openMarkAsSold(listing)}
                                    >
                                      <CheckCircle2 className="w-4 h-4 mr-2" /> Mark as Sold
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => handlePriceCheck(listing)}>
                                    <Zap className="w-4 h-4 mr-2" /> Run Price Check
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleOptimiseListing(listing)}>
                                    <Sparkles className="w-4 h-4 mr-2" /> Optimise Listing
                                  </DropdownMenuItem>
                                  {listing.image_url ? (
                                    <DropdownMenuItem onClick={() => navigate(`/vintography?itemId=${listing.id}&image_url=${encodeURIComponent(listing.image_url!)}`)}>
                                      <Camera className="w-4 h-4 mr-2" /> Enhance Photos
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => navigate(`/vintography?itemId=${listing.id}`)}>
                                      <Camera className="w-4 h-4 mr-2 text-muted-foreground" /> Add & Enhance Photo
                                    </DropdownMenuItem>
                                  )}
                                  {listing.vinted_url && (
                                    <DropdownMenuItem onClick={() => window.open(listing.vinted_url!, "_blank")}>
                                      <TrendingUp className="w-4 h-4 mr-2" /> View on Vinted
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteListing(listing.id)}>
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* Metrics Row */}
                          <div className="flex items-center gap-1.5 sm:gap-3 mt-1 sm:mt-2.5 flex-wrap">
                            {/* Price — show sale price for sold items */}
                            {isSold ? (
                              listing.sale_price != null && (
                                <span className="font-display font-bold text-xs sm:text-sm text-primary">
                                  £{listing.sale_price.toFixed(0)} sold
                                </span>
                              )
                            ) : (
                              listing.current_price != null && (
                                <span className="font-display font-bold text-xs sm:text-sm">
                                  £{listing.current_price.toFixed(0)}
                                </span>
                              )
                            )}

                            {/* Cost — hidden on mobile */}
                            {editingId === listing.id && editField === "purchase_price" ? (
                              <div className="hidden sm:flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <span className="text-[10px] text-muted-foreground">Cost:</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="h-7 w-20 text-xs px-1.5"
                                  autoFocus
                                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(listing.id); if (e.key === "Escape") cancelEdit(); }}
                                />
                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => saveEdit(listing.id)}>
                                  <Check className="w-3 h-3 text-success" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={cancelEdit}>
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <span
                                className="hidden sm:flex text-[10px] sm:text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors group items-center gap-1"
                                onClick={(e) => { e.stopPropagation(); startEdit(listing.id, "purchase_price", listing.purchase_price); }}
                                title="Tap to edit cost"
                              >
                                Cost: £{listing.purchase_price != null ? listing.purchase_price.toFixed(2) : "—"}
                                <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </span>
                            )}

                            {/* Profit — shown for all (sale vs. listed) */}
                            {profit !== null && (
                              <span className={`hidden sm:inline text-[10px] sm:text-xs font-semibold ${profit >= 0 ? "text-success" : "text-destructive"}`}>
                                {profit >= 0 ? "+" : ""}£{profit.toFixed(2)}
                              </span>
                            )}

                            {/* Days to sell for sold items */}
                            {isSold && daysToSell != null && (
                              <span className="text-[10px] sm:text-xs text-success flex items-center gap-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                {daysToSell === 0 ? "Same day" : `${daysToSell}d to sell`}
                              </span>
                            )}

                            <HealthScoreMini score={listing.health_score} />

                            {/* Date display */}
                            {isSold && soldDateStr ? (
                              <span
                                className="text-[10px] sm:text-xs flex items-center gap-0.5 text-primary/70"
                                title={soldDateStr}
                              >
                                <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                {isEstimatedDate ? "~" : ""}{formatAddedDate(soldDateStr)}
                              </span>
                            ) : (
                              <span
                                className={`text-[10px] sm:text-xs flex items-center gap-0.5 ${isDeadStock ? "text-destructive" : "text-muted-foreground"}`}
                                title={new Date(listing.created_at).toLocaleString()}
                              >
                                <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                {daysListed}d
                                <span className="hidden sm:inline text-muted-foreground/70">
                                  · {formatAddedDate(listing.created_at)}
                                </span>
                              </span>
                            )}

                            {/* Views/Favourites — hidden on mobile */}
                            {(listing.views_count || listing.favourites_count) ? (
                              <div className="hidden sm:flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
                                {listing.views_count != null && listing.views_count > 0 && (
                                  <span className="flex items-center gap-0.5">
                                    <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {listing.views_count}
                                  </span>
                                )}
                                {listing.favourites_count != null && listing.favourites_count > 0 && (
                                  <span className="flex items-center gap-0.5">
                                    <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {listing.favourites_count}
                                  </span>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        reason={`You've reached your listing limit (${listingLimit}). Upgrade to track more listings.`}
        tierRequired="pro"
      />

      <ImportWardrobeModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={fetchListings}
      />

      {/* Mark as Sold Sheet */}
      {soldSheetListing && (
        <MarkAsSoldSheet
          open={soldSheetOpen}
          onOpenChange={setSoldSheetOpen}
          listing={soldSheetListing}
          onSold={handleSoldConfirmed}
        />
      )}
    </PageShell>
  );
}
