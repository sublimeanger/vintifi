import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers, Loader2, ExternalLink, Trash2, RefreshCw,
  ShoppingBag, Store, Sparkles, CheckCircle2, XCircle,
  Clock, Filter, Link2,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageShell } from "@/components/PageShell";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { UseCaseSpotlight } from "@/components/UseCaseSpotlight";

type CrossListing = {
  id: string;
  listing_id: string;
  platform: string;
  platform_listing_id: string | null;
  platform_url: string | null;
  status: string;
  platform_price: number | null;
  last_synced_at: string | null;
  sync_error: string | null;
  published_at: string | null;
  listing_title?: string;
  listing_brand?: string;
  listing_image?: string | null;
};

const PLATFORM_META: Record<string, { name: string; icon: React.ElementType; color: string }> = {
  ebay: { name: "eBay", icon: ShoppingBag, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  vinted_pro: { name: "Vinted Pro", icon: Store, color: "bg-teal-500/10 text-teal-600 border-teal-500/20" },
  depop: { name: "Depop", icon: Sparkles, color: "bg-pink-500/10 text-pink-600 border-pink-500/20" },
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  published: "bg-success/10 text-success border-success/20",
  sold: "bg-primary/10 text-primary border-primary/20",
  removed: "bg-muted text-muted-foreground border-border",
  error: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function CrossListings() {
  const { user } = useAuth();
  const [crossListings, setCrossListings] = useState<CrossListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const fetchCrossListings = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("cross_listings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      toast.error("Failed to load cross-listings");
      setLoading(false);
      return;
    }

    // Enrich with listing details
    const listingIds = [...new Set((data || []).map((cl: any) => cl.listing_id))];
    let listingsMap: Record<string, any> = {};
    if (listingIds.length > 0) {
      const { data: listings } = await supabase
        .from("listings")
        .select("id, title, brand, image_url")
        .in("id", listingIds);
      if (listings) {
        listings.forEach((l: any) => { listingsMap[l.id] = l; });
      }
    }

    const enriched = (data || []).map((cl: any) => ({
      ...cl,
      listing_title: listingsMap[cl.listing_id]?.title || "Unknown Listing",
      listing_brand: listingsMap[cl.listing_id]?.brand || null,
      listing_image: listingsMap[cl.listing_id]?.image_url || null,
    }));

    setCrossListings(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchCrossListings();
  }, [user]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.from("cross_listings").delete().eq("id", id);
    if (error) {
      toast.error("Failed to remove");
    } else {
      setCrossListings((prev) => prev.filter((cl) => cl.id !== id));
      toast.success("Cross-listing removed");
    }
    setDeleting(null);
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("sync-platform-status", {
        body: {},
      });
      if (error) throw error;
      toast.success("Sync started — statuses will update shortly");
      setTimeout(fetchCrossListings, 3000);
    } catch (err: any) {
      toast.error(err.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const filtered = crossListings.filter((cl) => {
    if (platformFilter !== "all" && cl.platform !== platformFilter) return false;
    if (statusFilter !== "all" && cl.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: crossListings.length,
    published: crossListings.filter((cl) => cl.status === "published").length,
    sold: crossListings.filter((cl) => cl.status === "sold").length,
    errors: crossListings.filter((cl) => cl.status === "error").length,
  };

  return (
    <PageShell
      title="Cross-Listings"
      subtitle={`${stats.total} listings across platforms`}
      icon={<Layers className="w-5 h-5 text-primary" />}
      actions={
        <Button
          variant="outline"
          size="sm"
          className="h-9 text-xs active:scale-95 transition-transform"
          onClick={handleSyncAll}
          disabled={syncing}
        >
          {syncing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          )}
          Sync All
        </Button>
      }
      maxWidth="max-w-5xl"
    >
      <UseCaseSpotlight
        featureKey="cross-listings"
        icon={Layers}
        scenario="You've published items across eBay and Vinted but lost track of what's where..."
        description="Without a central view, items can sell on one platform while still listed on others — leading to overselling."
        outcome="Cross-Listings dashboard shows every item's status on every platform at a glance, with auto-delist when sold."
        tip="Use 'Sync All' to pull the latest statuses from all connected platforms."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
        {[
          { label: "Total", value: stats.total, icon: Layers },
          { label: "Published", value: stats.published, icon: CheckCircle2, tint: "border-success/10 bg-success/[0.03]" },
          { label: "Sold", value: stats.sold, icon: ShoppingBag, tint: "border-primary/10 bg-primary/[0.03]" },
          { label: "Errors", value: stats.errors, icon: XCircle, tint: stats.errors > 0 ? "border-destructive/10 bg-destructive/[0.03]" : "" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className={`p-3 sm:p-4 ${s.tint || ""}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <s.icon className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider">{s.label}</span>
              </div>
              <p className="font-display text-xl sm:text-2xl font-bold">{s.value}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide">
        <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="ebay">eBay</SelectItem>
            <SelectItem value="vinted_pro">Vinted Pro</SelectItem>
            <SelectItem value="depop">Depop</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Listing Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center">
          <Layers className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-display font-bold text-sm sm:text-base mb-1">No cross-listings yet</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">
            Publish a listing to eBay or another platform to see it here.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs"
            onClick={() => window.location.href = "/listings"}
          >
            Go to Listings
          </Button>
        </Card>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((cl, i) => {
              const meta = PLATFORM_META[cl.platform] || { name: cl.platform, icon: ShoppingBag, color: "" };
              const Icon = meta.icon;

              return (
                <motion.div
                  key={cl.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className="p-3 sm:p-4 active:scale-[0.99] transition-transform">
                    <div className="flex items-start gap-3">
                      {cl.listing_image ? (
                        <img
                          src={cl.listing_image}
                          alt={cl.listing_title}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="text-sm font-semibold truncate">{cl.listing_title}</h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <Badge variant="outline" className={`text-[9px] ${meta.color}`}>
                            <Icon className="w-2.5 h-2.5 mr-1" />
                            {meta.name}
                          </Badge>
                          <Badge variant="outline" className={`text-[9px] ${STATUS_STYLES[cl.status] || ""}`}>
                            {cl.status}
                          </Badge>
                          {cl.platform_price && (
                            <span className="text-[10px] text-muted-foreground">
                              £{cl.platform_price.toFixed(2)}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                          {cl.published_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {new Date(cl.published_at).toLocaleDateString()}
                            </span>
                          )}
                          {cl.sync_error && (
                            <span className="text-destructive line-clamp-1">{cl.sync_error}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {cl.platform_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(cl.platform_url!, "_blank")}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(cl.id)}
                          disabled={deleting === cl.id}
                        >
                          {deleting === cl.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <MobileBottomNav />
    </PageShell>
  );
}
