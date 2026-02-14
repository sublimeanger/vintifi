import { useState, useEffect } from "react";
import { HealthScoreMini } from "@/components/HealthScoreGauge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  ArrowLeft, Plus, Search, Loader2, Package, Heart, Eye, Upload,
  TrendingUp, TrendingDown, Minus, ExternalLink, Trash2,
  RefreshCw, MoreVertical, Zap, Filter, AlertTriangle,
  PoundSterling, Calendar, Check, X, Pencil,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Listing = {
  id: string;
  title: string;
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

// Traffic light system
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

export default function Listings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Add listing form
  const [newTitle, setNewTitle] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newCondition, setNewCondition] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newPurchasePrice, setNewPurchasePrice] = useState("");
  const [newUrl, setNewUrl] = useState("");

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
      navigate(`/price-check`);
    }
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
        // When marking as sold, also set sale_price to current_price if not set
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

  const filteredListings = listings.filter((l) => {
    const matchesSearch =
      !searchQuery ||
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.brand?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Dead stock: active items listed 30+ days
  const deadStockListings = listings.filter(
    (l) => l.status === "active" && getDaysListed(l.created_at) >= 30
  );

  // P&L stats
  const totalPurchaseCost = listings
    .filter((l) => l.purchase_price != null)
    .reduce((sum, l) => sum + (l.purchase_price || 0), 0);

  const totalRevenue = listings
    .filter((l) => l.status === "sold" && l.sale_price != null)
    .reduce((sum, l) => sum + (l.sale_price || 0), 0);

  const totalProfit = totalRevenue - listings
    .filter((l) => l.status === "sold" && l.purchase_price != null)
    .reduce((sum, l) => sum + (l.purchase_price || 0), 0);

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

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <header className="border-b border-border glass sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display font-bold text-lg">My Listings</h1>
            <p className="text-xs text-muted-foreground">
              {stats.total} listings · £{stats.totalValue.toFixed(0)} portfolio value
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/bulk-optimize")} className="font-semibold hidden sm:flex">
            <Upload className="w-4 h-4 mr-1" /> Bulk Upload
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate("/bulk-optimize")} className="font-semibold sm:hidden h-10 w-10">
            <Upload className="w-4 h-4" />
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="font-semibold hidden sm:flex">
                <Plus className="w-4 h-4 mr-1" /> Add Listing
              </Button>
              <Button size="icon" className="font-semibold sm:hidden h-10 w-10">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">Add New Listing</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Title *</Label>
                  <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Nike Air Force 1 White" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Brand</Label>
                    <Input value={newBrand} onChange={(e) => setNewBrand(e.target.value)} placeholder="e.g. Nike" />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g. Trainers" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Condition</Label>
                    <Input value={newCondition} onChange={(e) => setNewCondition(e.target.value)} placeholder="e.g. Good" />
                  </div>
                  <div>
                    <Label>Listing Price (£)</Label>
                    <Input value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="0.00" type="number" step="0.01" />
                  </div>
                </div>
                <div>
                  <Label>Purchase Price (£)</Label>
                  <Input value={newPurchasePrice} onChange={(e) => setNewPurchasePrice(e.target.value)} placeholder="What you paid for it" type="number" step="0.01" />
                </div>
                <div>
                  <Label>Vinted URL (optional)</Label>
                  <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://www.vinted.co.uk/items/..." />
                </div>
                <Button onClick={handleAddListing} disabled={adding} className="w-full font-semibold">
                  {adding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Add Listing
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Listings", value: stats.total.toString(), icon: Package },
            { label: "Active", value: stats.active.toString(), icon: TrendingUp },
            { label: "Portfolio Value", value: `£${stats.totalValue.toFixed(0)}`, icon: Zap },
            { label: "Avg Health", value: stats.avgHealth !== null ? `${stats.avgHealth}%` : "—", icon: Heart },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
                </div>
                <p className="font-display text-xl font-bold">{s.value}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* P&L Summary */}
        {(totalPurchaseCost > 0 || totalRevenue > 0) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-4 mb-6 border-primary/20 bg-primary/[0.02]">
              <h3 className="font-display font-bold text-sm mb-3 flex items-center gap-2">
                <PoundSterling className="w-4 h-4 text-primary" />
                Profit & Loss
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total Invested</p>
                  <p className="font-display font-bold text-lg">£{totalPurchaseCost.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Revenue (Sold)</p>
                  <p className="font-display font-bold text-lg text-success">£{totalRevenue.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Net Profit</p>
                  <p className={`font-display font-bold text-lg ${totalProfit >= 0 ? "text-success" : "text-destructive"}`}>
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
            <Card className="p-4 mb-6 border-destructive/30 bg-destructive/[0.03]">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-display font-bold text-sm text-destructive">
                    {deadStockListings.length} Dead Stock Item{deadStockListings.length > 1 ? "s" : ""}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    These items have been listed for 30+ days without selling. Consider reducing prices, relisting, or bundling.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {deadStockListings.slice(0, 5).map((l) => (
                      <Badge key={l.id} variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                        {l.title.length > 25 ? l.title.slice(0, 25) + "…" : l.title} · {getDaysListed(l.created_at)}d
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
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search listings..." className="pl-10" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {["all", "active", "sold", "reserved", "inactive"].map((s) => (
                <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)}>
                  <span className="capitalize">{s}</span>
                  {statusFilter === s && <span className="ml-auto text-primary">✓</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="icon" onClick={fetchListings}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Listings */}
        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading listings...</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-display font-bold text-lg mb-2">
              {listings.length === 0 ? "No listings yet" : "No matching listings"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {listings.length === 0
                ? "Add your first listing to start tracking prices and performance"
                : "Try adjusting your search or filters"}
            </p>
            {listings.length === 0 && (
              <Button onClick={() => setAddDialogOpen(true)} className="font-semibold">
                <Plus className="w-4 h-4 mr-2" /> Add Your First Listing
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredListings.map((listing, i) => {
                const daysListed = getDaysListed(listing.created_at);
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
                    <Card className={`p-4 hover:shadow-md transition-shadow ${isDeadStock ? "border-destructive/30" : ""}`}>
                      <div className="flex items-start gap-4">
                        {/* Image */}
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0 relative">
                          {listing.image_url ? (
                            <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <Package className="w-6 h-6 text-muted-foreground/40" />
                          )}
                          {/* Traffic light dot */}
                          <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full ${health.color} ring-2 ${health.ring}`} />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-display font-bold text-sm truncate">{listing.title}</h3>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className={`text-[10px] capitalize ${statusColors[listing.status] || ""}`}>
                                  {editingId === listing.id && editField === "status" ? (
                                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                      <Select value={editValue} onValueChange={(v) => { setEditValue(v); }}>
                                        <SelectTrigger className="h-5 text-[10px] w-20 border-0 p-0 shadow-none">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
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
                                    <span className="cursor-pointer" onClick={() => startEdit(listing.id, "status", listing.status)} title="Click to change status">
                                      {listing.status}
                                    </span>
                                  )}
                                </Badge>
                                {listing.brand && <span className="text-xs text-muted-foreground">{listing.brand}</span>}
                                {listing.category && <span className="text-xs text-muted-foreground">· {listing.category}</span>}
                                {isDeadStock && (
                                  <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive gap-0.5">
                                    <AlertTriangle className="w-2.5 h-2.5" /> Dead Stock
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handlePriceCheck(listing)}>
                                  <Zap className="w-4 h-4 mr-2" /> Run Price Check
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

                          {/* Metrics Row */}
                          <div className="flex items-center gap-4 mt-3 flex-wrap">
                            {/* Price */}
                            {listing.current_price != null && (
                              <span className="font-display font-bold text-sm">
                                £{listing.current_price.toFixed(2)}
                              </span>
                            )}

                            {/* Purchase price - inline editable */}
                            {editingId === listing.id && editField === "purchase_price" ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">Cost:</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  className="h-6 w-20 text-xs px-1"
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
                                className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors group flex items-center gap-1"
                                onClick={() => startEdit(listing.id, "purchase_price", listing.purchase_price)}
                                title="Click to edit cost"
                              >
                                Cost: £{listing.purchase_price != null ? listing.purchase_price.toFixed(2) : "—"}
                                <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </span>
                            )}

                            {/* Sale price - inline editable */}
                            {editingId === listing.id && editField === "sale_price" ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">Sale:</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  className="h-6 w-20 text-xs px-1"
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
                                className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors group flex items-center gap-1"
                                onClick={() => startEdit(listing.id, "sale_price", listing.sale_price)}
                                title="Click to edit sale price"
                              >
                                Sale: £{listing.sale_price != null ? listing.sale_price.toFixed(2) : "—"}
                                <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </span>
                            )}

                            {profit !== null && (
                              <span className={`text-xs font-semibold ${profit >= 0 ? "text-success" : "text-destructive"}`}>
                                {profit >= 0 ? "+" : ""}£{profit.toFixed(2)} profit
                              </span>
                            )}

                            {/* Health Score Mini Gauge */}
                            <HealthScoreMini score={listing.health_score} />

                            {/* Days listed */}
                            <span className={`text-xs flex items-center gap-1 ${isDeadStock ? "text-destructive" : "text-muted-foreground"}`}>
                              <Calendar className="w-3 h-3" />
                              {daysListed}d
                            </span>

                            {/* Views & Favourites */}
                            {(listing.views_count || listing.favourites_count) ? (
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                {listing.views_count != null && listing.views_count > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Eye className="w-3 h-3" /> {listing.views_count}
                                  </span>
                                )}
                                {listing.favourites_count != null && listing.favourites_count > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Heart className="w-3 h-3" /> {listing.favourites_count}
                                  </span>
                                )}
                              </div>
                            ) : null}
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
      </div>
    </div>
  );
}
