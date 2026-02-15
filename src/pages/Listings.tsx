import { useState, useEffect } from "react";
import { HealthScoreMini } from "@/components/HealthScoreGauge";
import { PublishModal } from "@/components/PublishModal";
import { useNavigate } from "react-router-dom";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Loader2, Package, Heart, Eye, Upload, Download,
  TrendingUp, ExternalLink, Trash2,
  RefreshCw, MoreVertical, Zap, Filter, AlertTriangle,
  PoundSterling, Calendar, Check, X, Pencil, Sparkles, Send,
  ChevronDown, Tag, Ruler, ShieldCheck,
} from "lucide-react";
import { ListingCardSkeleton } from "@/components/LoadingSkeletons";
import { UseCaseSpotlight } from "@/components/UseCaseSpotlight";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageShell } from "@/components/PageShell";
import { MobileBottomNav } from "@/components/MobileBottomNav";
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
  const navigate = useNavigate();
  const { user, session, profile } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [publishListing, setPublishListing] = useState<Listing | null>(null);

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [deepImport, setDeepImport] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newCondition, setNewCondition] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newPurchasePrice, setNewPurchasePrice] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const [showUpgrade, setShowUpgrade] = useState(false);

  const tier = profile?.subscription_tier || "free";
  const listingLimit = LISTING_LIMITS[tier] || 20;
  const isUnlimited = listingLimit > 99999;
  const importLimit = IMPORT_LIMITS[tier] || 20;
  const isImportUnlimited = importLimit > 9000;

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

  useEffect(() => {
    fetchListings();
  }, [user]);

  const handleAddListing = async () => {
    // Check listing limit
    const activeCount = listings.filter(l => l.status === "active").length;
    if (activeCount >= listingLimit) {
      setShowUpgrade(true);
      return;
    }

    if (!newTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!user) return;

    setAdding(true);
    const { error } = await supabase.from("listings").insert({
      user_id: user.id,
      title: newTitle.trim(),
      brand: newBrand.trim() || null,
      category: newCategory.trim() || null,
      condition: newCondition.trim() || null,
      current_price: newPrice ? parseFloat(newPrice) : null,
      purchase_price: newPurchasePrice ? parseFloat(newPurchasePrice) : null,
      vinted_url: newUrl.trim() || null,
      status: "active",
    });

    if (error) {
      toast.error("Failed to add listing");
      console.error(error);
    } else {
      toast.success("Listing added!");
      setAddDialogOpen(false);
      resetForm();
      fetchListings();
    }
    setAdding(false);
  };

  const handleDeleteListing = async (id: string) => {
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete listing");
    } else {
      toast.success("Listing removed");
      setListings((prev) => prev.filter((l) => l.id !== id));
    }
  };

  const handlePriceCheck = (listing: Listing) => {
    if (listing.vinted_url) {
      navigate(`/price-check?url=${encodeURIComponent(listing.vinted_url)}`);
    } else {
      const params = new URLSearchParams();
      if (listing.brand) params.set("brand", listing.brand);
      if (listing.category) params.set("category", listing.category);
      if (listing.condition) params.set("condition", listing.condition);
      navigate(`/price-check?${params.toString()}`);
    }
  };

  const handleOptimiseListing = (listing: Listing) => {
    const params = new URLSearchParams();
    if (listing.title) params.set("title", listing.title);
    if (listing.description) params.set("description", listing.description);
    if (listing.brand) params.set("brand", listing.brand);
    if (listing.category) params.set("category", listing.category);
    if (listing.size) params.set("size", listing.size);
    if (listing.condition) params.set("condition", listing.condition);
    navigate(`/optimize?${params.toString()}`);
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
      if (editValue === "sold" && !listings.find(l => l.id === id)?.sale_price) {
        const listing = listings.find(l => l.id === id);
        if (listing?.current_price) update.sale_price = listing.current_price;
      }
    }

    const { error } = await supabase.from("listings").update(update).eq("id", id);
    if (error) {
      toast.error("Failed to update");
      console.error(error);
    } else {
      toast.success("Updated!");
      setListings(prev => prev.map(l => l.id === id ? { ...l, ...update } as Listing : l));
    }
    cancelEdit();
  };

  const resetForm = () => {
    setNewTitle("");
    setNewBrand("");
    setNewCategory("");
    setNewCondition("");
    setNewPrice("");
    setNewPurchasePrice("");
    setNewUrl("");
  };

  const handleImportWardrobe = async () => {
    if (!importUrl.trim()) {
      toast.error("Please enter your Vinted profile URL");
      return;
    }
    if (!session?.access_token) {
      toast.error("Please sign in to import listings");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-vinted-wardrobe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ profile_url: importUrl.trim(), deep_import: deepImport }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || "Import failed");
        return;
      }

      const parts: string[] = [];
      if (data.imported > 0) parts.push(`${data.imported} imported`);
      if (data.updated > 0) parts.push(`${data.updated} updated`);
      if (data.descriptions_fetched > 0) parts.push(`${data.descriptions_fetched} descriptions fetched`);
      toast.success(`${parts.join(", ")} from Vinted!`);
      setImportDialogOpen(false);
      setImportUrl("");
      setDeepImport(false);
      fetchListings();
    } catch (err) {
      console.error("Import error:", err);
      toast.error("Failed to import. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  const getVintedProfileUrl = (): string | null => {
    for (const l of listings) {
      if (l.vinted_url && l.vinted_url.includes("/member/")) {
        try {
          const url = new URL(l.vinted_url);
          const memberMatch = url.pathname.match(/\/member\/[^/]+/);
          if (memberMatch) {
            return `${url.origin}${memberMatch[0]}`;
          }
        } catch { /* ignore */ }
      }
    }
    return null;
  };

  const hasImportedListings = listings.some((l) => l.vinted_url?.includes("/member/"));

  const handleSyncListings = async () => {
    const profileUrl = getVintedProfileUrl();
    if (!profileUrl || !session?.access_token) return;

    setSyncing(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-vinted-wardrobe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ profile_url: profileUrl }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Sync failed");
        return;
      }

      const parts: string[] = [];
      if (data.imported > 0) parts.push(`${data.imported} new`);
      if (data.updated > 0) parts.push(`${data.updated} updated`);
      if (parts.length === 0) parts.push("Everything up to date");
      toast.success(`Sync complete: ${parts.join(", ")}`);
      fetchListings();
    } catch (err) {
      console.error("Sync error:", err);
      toast.error("Sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const filteredListings = listings.filter((l) => {
    const matchesSearch =
      !searchQuery ||
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.brand?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const importsThisMonth = listings.filter(l => new Date(l.created_at) >= monthStart).length;
  const importRemaining = Math.max(0, importLimit - importsThisMonth);

  const stats = {
    total: listings.length,
    active: listings.filter((l) => l.status === "active").length,
    totalValue: listings
      .filter((l) => l.status === "active" && l.current_price)
      .reduce((sum, l) => sum + (l.current_price || 0), 0),
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

  const headerActions = (
    <div className="flex items-center gap-2">
      {hasImportedListings && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncListings}
            disabled={syncing}
            className="font-semibold hidden sm:flex h-9"
          >
            {syncing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
            Sync
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleSyncListings}
            disabled={syncing}
            className="sm:hidden h-10 w-10"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </>
      )}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="font-semibold hidden sm:flex h-9">
            <Download className="w-3.5 h-3.5 mr-1.5" /> Import
          </Button>
        </DialogTrigger>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" className="sm:hidden h-10 w-10">
            <Download className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Import from Vinted</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Paste your Vinted profile URL to automatically import all your active listings.
            </p>
            <div className="space-y-1.5">
              <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Vinted Profile URL
              </Label>
              <Input
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="e.g. vinted.co.uk/member/12345678-username"
                className="h-11 sm:h-10 text-base sm:text-sm"
                disabled={importing}
              />
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <Checkbox
                id="deep-import"
                checked={deepImport}
                onCheckedChange={(checked) => setDeepImport(checked === true)}
                disabled={importing}
              />
              <div className="space-y-1">
                <label htmlFor="deep-import" className="text-sm font-medium leading-none cursor-pointer">
                  Import with descriptions
                </label>
                <p className="text-xs text-muted-foreground">
                  Scrapes each listing page individually to capture full descriptions, views, and favourites. Takes longer but gives you richer data.
                </p>
              </div>
            </div>
            {importing && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {deepImport
                    ? "Scraping wardrobe and individual listings… This may take 30-60 seconds."
                    : "Scraping your wardrobe and extracting listings… This may take 10-20 seconds."}
                </p>
              </div>
            )}
            <Button
              onClick={handleImportWardrobe}
              disabled={importing || !importUrl.trim()}
              className="w-full font-semibold h-12 sm:h-10 active:scale-95 transition-transform"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {importing ? "Importing…" : "Import Listings"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Button variant="outline" size="sm" onClick={() => navigate("/bulk-optimize")} className="font-semibold hidden sm:flex h-9">
        <Upload className="w-3.5 h-3.5 mr-1.5" /> Bulk
      </Button>
      <Button variant="outline" size="icon" onClick={() => navigate("/bulk-optimize")} className="sm:hidden h-10 w-10">
        <Upload className="w-4 h-4" />
      </Button>
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="font-semibold hidden sm:flex h-9">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add
          </Button>
        </DialogTrigger>
        <DialogTrigger asChild>
          <Button size="icon" className="sm:hidden h-10 w-10">
            <Plus className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Add New Listing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title *</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Nike Air Force 1 White" className="h-11 sm:h-10 text-base sm:text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Brand</Label>
                <Input value={newBrand} onChange={(e) => setNewBrand(e.target.value)} placeholder="e.g. Nike" className="h-11 sm:h-10 text-base sm:text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
                <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g. Trainers" className="h-11 sm:h-10 text-base sm:text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Condition</Label>
                <Input value={newCondition} onChange={(e) => setNewCondition(e.target.value)} placeholder="e.g. Good" className="h-11 sm:h-10 text-base sm:text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Listing Price (£)</Label>
                <Input value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="0.00" type="number" step="0.01" className="h-11 sm:h-10 text-base sm:text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Purchase Price (£)</Label>
              <Input value={newPurchasePrice} onChange={(e) => setNewPurchasePrice(e.target.value)} placeholder="What you paid for it" type="number" step="0.01" className="h-11 sm:h-10 text-base sm:text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vinted URL (optional)</Label>
              <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://www.vinted.co.uk/items/..." className="h-11 sm:h-10 text-base sm:text-sm" />
            </div>
            <Button onClick={handleAddListing} disabled={adding} className="w-full font-semibold h-12 sm:h-10 active:scale-95 transition-transform">
              {adding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Listing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
      <UseCaseSpotlight
        featureKey="listings"
        icon={Package}
        scenario="You have items scattered everywhere and can't remember what you paid for half of them..."
        description="Without a central inventory, you can't track margins, spot dead stock, or know your true portfolio value."
        outcome="My Listings gives you a single view of everything: purchase price, current price, days listed, and health score at a glance."
        tip="Add purchase prices when creating listings — it unlocks profit tracking across the whole app."
      />

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5 sm:mb-6">
        {[
          { label: "Total", value: stats.total.toString(), icon: Package, tint: "" },
          { label: "Active", value: stats.active.toString(), icon: TrendingUp, tint: "border-success/10 bg-success/[0.03]" },
          { label: "Portfolio", value: `£${stats.totalValue.toFixed(0)}`, icon: Zap, tint: "border-primary/10 bg-primary/[0.03]" },
          { label: "Avg Health", value: stats.avgHealth !== null ? `${stats.avgHealth}%` : "—", icon: Heart, tint: "border-accent/10 bg-accent/[0.03]" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className={`p-3 sm:p-4 ${s.tint}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <s.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
                <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider">{s.label}</span>
              </div>
              <p className="font-display text-xl sm:text-2xl font-bold">{s.value}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Listing Limit Indicator */}
      {!isUnlimited && (
        <Card className={`p-3 sm:p-4 mb-5 sm:mb-6 ${stats.active >= listingLimit ? "border-destructive/30 bg-destructive/[0.03]" : "border-border"}`}>
          <div className="flex items-center justify-between mb-2">
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
        <Card className={`p-3 sm:p-4 mb-5 sm:mb-6 ${importRemaining <= 0 ? "border-destructive/30 bg-destructive/[0.03]" : "border-border"}`}>
          <div className="flex items-center justify-between mb-2">
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

      {(totalPurchaseCost > 0 || totalRevenue > 0) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-4 mb-5 sm:mb-6 border-primary/20 bg-primary/[0.02]">
            <h3 className="font-display font-bold text-sm mb-3 flex items-center gap-2">
              <PoundSterling className="w-4 h-4 text-primary" />
              Profit & Loss
            </h3>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
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
        </motion.div>
      )}

      {/* Dead Stock Alert */}
      {deadStockListings.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-4 mb-5 sm:mb-6 border-destructive/30 bg-destructive/[0.03]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h3 className="font-display font-bold text-sm text-destructive">
                  {deadStockListings.length} Dead Stock Item{deadStockListings.length > 1 ? "s" : ""}
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
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Search & Filters */}
      <div className="flex gap-2 sm:gap-3 mb-5 sm:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search listings..."
            className="pl-10 h-11 sm:h-10 text-base sm:text-sm"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-11 w-11 sm:h-10 sm:w-10 shrink-0">
              <Filter className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            {["all", "active", "sold", "reserved", "inactive"].map((s) => (
              <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)}>
                <span className="capitalize">{s}</span>
                {statusFilter === s && <span className="ml-auto text-primary">✓</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="icon" onClick={fetchListings} className="h-11 w-11 sm:h-10 sm:w-10 shrink-0">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Status Chips */}
      {listings.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-4 -mx-1 px-1 pb-1">
          {["all", "active", "sold", "reserved", "inactive"].map(s => {
            const count = s === "all" ? listings.length : listings.filter(l => l.status === s).length;
            if (s !== "all" && count === 0) return null;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-medium border transition-all active:scale-95 shrink-0 capitalize ${
                  statusFilter === s
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-background text-muted-foreground border-border hover:border-primary/30"
                }`}
              >
                {s} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Listings */}
      {loading ? (
        <ListingCardSkeleton count={5} />
      ) : filteredListings.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 sm:py-16">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground/40" />
          </div>
          <h3 className="font-display font-bold text-base sm:text-lg mb-2">
            {listings.length === 0 ? "No listings yet" : "No matching listings"}
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            {listings.length === 0
              ? "Add your first listing to start tracking"
              : "Try adjusting your search or filters"}
          </p>
          {listings.length === 0 && (
            <Button onClick={() => setAddDialogOpen(true)} className="font-semibold h-12 sm:h-10 active:scale-95 transition-transform">
              <Plus className="w-4 h-4 mr-2" /> Add Your First Listing
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          <AnimatePresence>
            {filteredListings.map((listing, i) => {
              const daysListed = getDaysListed(listing.created_at);
              const isDeadStock = listing.status === "active" && daysListed >= 30;
              const health = getHealthIndicator(listing.health_score);
              const profit = getProfit(listing);
              const isExpanded = expandedId === listing.id;

              return (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className={`overflow-hidden transition-all ${isDeadStock ? "border-destructive/30 bg-destructive/[0.01]" : ""} ${isExpanded ? "ring-1 ring-primary/20 shadow-md" : "hover:shadow-md"}`}>
                    {/* Collapsed row — clickable */}
                    <div
                      className="p-3 sm:p-4 cursor-pointer active:bg-muted/30 transition-colors"
                      onClick={(e) => {
                        // Don't toggle if clicking interactive elements
                        const target = e.target as HTMLElement;
                        if (target.closest("button, input, select, [role='menuitem'], [data-radix-collection-item]")) return;
                        toggleExpand(listing.id);
                      }}
                    >
                      <div className="flex items-start gap-2.5 sm:gap-3">
                        {/* Image */}
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-muted flex items-center justify-center shrink-0 relative overflow-hidden">
                          {listing.image_url ? (
                            <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <Package className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground/40" />
                          )}
                          <div className={`absolute -top-1 -right-1 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full ${health.color} ring-2 ${health.ring}`} />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-display font-bold text-sm leading-snug line-clamp-1 sm:line-clamp-2">{listing.title}</h3>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <Badge variant="outline" className={`text-[10px] capitalize py-0 ${statusColors[listing.status] || ""}`}>
                                  {editingId === listing.id && editField === "status" ? (
                                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                      <Select value={editValue} onValueChange={(v) => { setEditValue(v); }}>
                                        <SelectTrigger className="h-5 text-[10px] w-20 border-0 p-0 shadow-none">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-popover">
                                          {["active", "sold", "reserved", "inactive"].map(s => (
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
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-8 sm:w-8 shrink-0">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-popover">
                                  <DropdownMenuItem onClick={() => handlePriceCheck(listing)}>
                                    <Zap className="w-4 h-4 mr-2" /> Run Price Check
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleOptimiseListing(listing)}>
                                    <Sparkles className="w-4 h-4 mr-2" /> Optimise Listing
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setPublishListing(listing)}>
                                    <Send className="w-4 h-4 mr-2" /> Publish to Platforms
                                  </DropdownMenuItem>
                                  {listing.vinted_url && (
                                    <DropdownMenuItem onClick={() => window.open(listing.vinted_url!, "_blank")}>
                                      <ExternalLink className="w-4 h-4 mr-2" /> View on Vinted
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
                          <div className="flex items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2.5 flex-wrap">
                            {listing.current_price != null && (
                              <span className="font-display font-bold text-sm">
                                £{listing.current_price.toFixed(2)}
                              </span>
                            )}

                            {editingId === listing.id && editField === "purchase_price" ? (
                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                <span className="text-[10px] text-muted-foreground">Cost:</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  className="h-7 w-20 text-xs px-1.5"
                                  autoFocus
                                  onKeyDown={e => { if (e.key === "Enter") saveEdit(listing.id); if (e.key === "Escape") cancelEdit(); }}
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
                                className="text-[10px] sm:text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors group flex items-center gap-1"
                                onClick={(e) => { e.stopPropagation(); startEdit(listing.id, "purchase_price", listing.purchase_price); }}
                                title="Tap to edit cost"
                              >
                                Cost: £{listing.purchase_price != null ? listing.purchase_price.toFixed(2) : "—"}
                                <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </span>
                            )}

                            {editingId === listing.id && editField === "sale_price" ? (
                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                <span className="text-[10px] text-muted-foreground">Sale:</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  className="h-7 w-20 text-xs px-1.5"
                                  autoFocus
                                  onKeyDown={e => { if (e.key === "Enter") saveEdit(listing.id); if (e.key === "Escape") cancelEdit(); }}
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
                                className="text-[10px] sm:text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors group flex items-center gap-1"
                                onClick={(e) => { e.stopPropagation(); startEdit(listing.id, "sale_price", listing.sale_price); }}
                                title="Tap to edit sale price"
                              >
                                Sale: £{listing.sale_price != null ? listing.sale_price.toFixed(2) : "—"}
                                <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </span>
                            )}

                            {profit !== null && (
                              <span className={`text-[10px] sm:text-xs font-semibold ${profit >= 0 ? "text-success" : "text-destructive"}`}>
                                {profit >= 0 ? "+" : ""}£{profit.toFixed(2)}
                              </span>
                            )}

                            <HealthScoreMini score={listing.health_score} />

                            <span className={`text-[10px] sm:text-xs flex items-center gap-0.5 ${isDeadStock ? "text-destructive" : "text-muted-foreground"}`}>
                              <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              {daysListed}d
                            </span>

                            {(listing.views_count || listing.favourites_count) ? (
                              <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
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

                    {/* Expanded Detail Panel */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-border px-3 sm:px-4 py-4 space-y-4 bg-muted/20">
                            {/* Image + Description row */}
                            <div className="flex flex-col sm:flex-row gap-4">
                              {listing.image_url && (
                                <div className="w-full sm:w-40 h-40 sm:h-40 rounded-xl overflow-hidden bg-muted shrink-0">
                                  <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Description</h4>
                                {listing.description ? (
                                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                                    {listing.description}
                                  </p>
                                ) : (
                                  <div className="p-3 rounded-lg border border-dashed border-border bg-muted/30 text-center">
                                    <p className="text-sm text-muted-foreground mb-2">No description yet</p>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs font-semibold"
                                      onClick={() => handleOptimiseListing(listing)}
                                    >
                                      <Sparkles className="w-3 h-3 mr-1.5" /> Generate with AI
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Metadata grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {listing.size && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Ruler className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-muted-foreground">Size:</span>
                                  <span className="font-medium">{listing.size}</span>
                                </div>
                              )}
                              {listing.condition && (
                                <div className="flex items-center gap-2 text-sm">
                                  <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-muted-foreground">Condition:</span>
                                  <span className="font-medium">{listing.condition}</span>
                                </div>
                              )}
                              {listing.brand && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-muted-foreground">Brand:</span>
                                  <span className="font-medium">{listing.brand}</span>
                                </div>
                              )}
                              {listing.category && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Package className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-muted-foreground">Category:</span>
                                  <span className="font-medium">{listing.category}</span>
                                </div>
                              )}
                            </div>

                            {/* Health Score bar */}
                            {listing.health_score != null && (
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Health Score</span>
                                  <span className={`text-sm font-bold ${health.textColor}`}>{listing.health_score}%</span>
                                </div>
                                <Progress value={listing.health_score} className="h-2" />
                              </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex flex-wrap gap-2 pt-1">
                              <Button size="sm" variant="outline" className="text-xs font-semibold h-9" onClick={() => handlePriceCheck(listing)}>
                                <Zap className="w-3 h-3 mr-1.5" /> Price Check
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs font-semibold h-9" onClick={() => handleOptimiseListing(listing)}>
                                <Sparkles className="w-3 h-3 mr-1.5" /> Optimise
                              </Button>
                              {listing.vinted_url && (
                                <Button size="sm" variant="outline" className="text-xs font-semibold h-9" onClick={() => window.open(listing.vinted_url!, "_blank")}>
                                  <ExternalLink className="w-3 h-3 mr-1.5" /> View on Vinted
                                </Button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <PublishModal
        open={!!publishListing}
        onOpenChange={(open) => !open && setPublishListing(null)}
        listing={publishListing}
      />

      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        reason={`You've reached your listing limit (${listingLimit}). Upgrade to track more listings.`}
        tierRequired="pro"
      />

      <MobileBottomNav />
    </PageShell>
  );
}
