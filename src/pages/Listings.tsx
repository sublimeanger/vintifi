import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  ArrowLeft, Plus, Search, Loader2, Package, Heart, Eye,
  TrendingUp, TrendingDown, Minus, ExternalLink, Trash2,
  RefreshCw, MoreVertical, Zap, Filter,
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
  health_score: number | null;
  views_count: number | null;
  favourites_count: number | null;
  image_url: string | null;
  vinted_url: string | null;
  created_at: string;
  updated_at: string;
};

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  sold: "bg-primary/10 text-primary border-primary/20",
  reserved: "bg-accent/10 text-accent border-accent/20",
  inactive: "bg-muted text-muted-foreground border-border",
};

function getHealthColor(score: number | null) {
  if (!score) return "text-muted-foreground";
  if (score >= 80) return "text-success";
  if (score >= 50) return "text-accent";
  return "text-destructive";
}

function getHealthLabel(score: number | null) {
  if (!score) return "Unknown";
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Work";
}

function getPriceDiff(current: number | null, recommended: number | null) {
  if (!current || !recommended) return null;
  return ((current - recommended) / recommended) * 100;
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

  // Add listing form
  const [newTitle, setNewTitle] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newCondition, setNewCondition] = useState("");
  const [newPrice, setNewPrice] = useState("");
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

  const resetForm = () => {
    setNewTitle("");
    setNewBrand("");
    setNewCategory("");
    setNewCondition("");
    setNewPrice("");
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
  };

  return (
    <div className="min-h-screen bg-background">
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
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="font-semibold">
                <Plus className="w-4 h-4 mr-1" /> Add Listing
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">Add New Listing</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Nike Air Force 1 White"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Brand</Label>
                    <Input
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                      placeholder="e.g. Nike"
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="e.g. Trainers"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Condition</Label>
                    <Input
                      value={newCondition}
                      onChange={(e) => setNewCondition(e.target.value)}
                      placeholder="e.g. Good"
                    />
                  </div>
                  <div>
                    <Label>Price (£)</Label>
                    <Input
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <Label>Vinted URL (optional)</Label>
                  <Input
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://www.vinted.co.uk/items/..."
                  />
                </div>
                <Button
                  onClick={handleAddListing}
                  disabled={adding}
                  className="w-full font-semibold"
                >
                  {adding ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
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
            {
              label: "Portfolio Value",
              value: `£${stats.totalValue.toFixed(0)}`,
              icon: Zap,
            },
            {
              label: "Avg Health",
              value: stats.avgHealth !== null ? `${stats.avgHealth}%` : "—",
              icon: Heart,
            },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
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

        {/* Search & Filters */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search listings..."
              className="pl-10"
            />
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
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
                const priceDiff = getPriceDiff(listing.current_price, listing.recommended_price);
                return (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        {/* Image placeholder */}
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          {listing.image_url ? (
                            <img
                              src={listing.image_url}
                              alt={listing.title}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-muted-foreground/40" />
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-display font-bold text-sm truncate">
                                {listing.title}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] capitalize ${statusColors[listing.status] || ""}`}
                                >
                                  {listing.status}
                                </Badge>
                                {listing.brand && (
                                  <span className="text-xs text-muted-foreground">
                                    {listing.brand}
                                  </span>
                                )}
                                {listing.category && (
                                  <span className="text-xs text-muted-foreground">
                                    · {listing.category}
                                  </span>
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
                                  <DropdownMenuItem
                                    onClick={() => window.open(listing.vinted_url!, "_blank")}
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" /> View on Vinted
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteListing(listing.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Metrics Row */}
                          <div className="flex items-center gap-4 mt-3 flex-wrap">
                            {/* Price */}
                            {listing.current_price !== null && (
                              <div className="flex items-center gap-1.5">
                                <span className="font-display font-bold text-sm">
                                  £{listing.current_price.toFixed(2)}
                                </span>
                                {priceDiff !== null && (
                                  <span
                                    className={`text-[10px] font-medium flex items-center ${
                                      priceDiff > 5
                                        ? "text-success"
                                        : priceDiff < -5
                                        ? "text-destructive"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {priceDiff > 0 ? (
                                      <TrendingUp className="w-3 h-3 mr-0.5" />
                                    ) : priceDiff < 0 ? (
                                      <TrendingDown className="w-3 h-3 mr-0.5" />
                                    ) : (
                                      <Minus className="w-3 h-3 mr-0.5" />
                                    )}
                                    {Math.abs(priceDiff).toFixed(0)}%
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Health Score */}
                            {listing.health_score !== null && (
                              <div className="flex items-center gap-1">
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    listing.health_score >= 80
                                      ? "bg-success"
                                      : listing.health_score >= 50
                                      ? "bg-accent"
                                      : "bg-destructive"
                                  }`}
                                />
                                <span className={`text-xs font-medium ${getHealthColor(listing.health_score)}`}>
                                  {listing.health_score}% {getHealthLabel(listing.health_score)}
                                </span>
                              </div>
                            )}

                            {/* Views & Favourites */}
                            {(listing.views_count || listing.favourites_count) && (
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                {listing.views_count !== null && listing.views_count > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Eye className="w-3 h-3" /> {listing.views_count}
                                  </span>
                                )}
                                {listing.favourites_count !== null && listing.favourites_count > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Heart className="w-3 h-3" /> {listing.favourites_count}
                                  </span>
                                )}
                              </div>
                            )}
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
