import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2, CheckCircle2, XCircle, ShoppingBag, Store,
  Sparkles, Send, ExternalLink,
} from "lucide-react";

type Listing = {
  id: string;
  title: string;
  brand: string | null;
  current_price: number | null;
  image_url: string | null;
};

type PlatformConnection = {
  id: string;
  platform: string;
  platform_username: string | null;
  status: string;
};

const PLATFORM_META: Record<string, { name: string; icon: React.ElementType }> = {
  ebay: { name: "eBay", icon: ShoppingBag },
  vinted_pro: { name: "Vinted Pro", icon: Store },
  depop: { name: "Depop", icon: Sparkles },
};

type PublishStatus = "idle" | "publishing" | "success" | "error";

interface PublishModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: Listing | null;
}

export function PublishModal({ open, onOpenChange, listing }: PublishModalProps) {
  const { user } = useAuth();
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [priceOverrides, setPriceOverrides] = useState<Record<string, string>>({});
  const [publishStatus, setPublishStatus] = useState<Record<string, PublishStatus>>({});
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    supabase
      .from("platform_connections")
      .select("id, platform, platform_username, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .then(({ data, error }) => {
        if (!error && data) {
          setConnections(data as PlatformConnection[]);
          const initial: Record<string, string> = {};
          data.forEach((c: any) => {
            initial[c.platform] = listing?.current_price?.toFixed(2) || "";
          });
          setPriceOverrides(initial);
        }
        setLoading(false);
      });

    // Reset state
    setSelectedPlatforms(new Set());
    setPublishStatus({});
    setIsPublishing(false);
  }, [open, user, listing]);

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  };

  const handlePublish = async () => {
    if (!listing || selectedPlatforms.size === 0) return;
    setIsPublishing(true);

    const platforms = Array.from(selectedPlatforms);
    const statusMap: Record<string, PublishStatus> = {};
    platforms.forEach((p) => (statusMap[p] = "publishing"));
    setPublishStatus({ ...statusMap });

    try {
      const { data, error } = await supabase.functions.invoke("publish-to-platform", {
        body: {
          listing_id: listing.id,
          platforms: platforms.map((p) => ({
            platform: p,
            price_override: priceOverrides[p] ? parseFloat(priceOverrides[p]) : undefined,
          })),
        },
      });

      if (error) throw error;

      const results = data?.results || {};
      const updatedStatus: Record<string, PublishStatus> = {};
      platforms.forEach((p) => {
        updatedStatus[p] = results[p]?.success ? "success" : "error";
      });
      setPublishStatus(updatedStatus);

      const successCount = platforms.filter((p) => updatedStatus[p] === "success").length;
      if (successCount === platforms.length) {
        toast.success(`Published to ${successCount} platform${successCount > 1 ? "s" : ""}!`);
      } else if (successCount > 0) {
        toast.warning(`Published to ${successCount}/${platforms.length} platforms`);
      } else {
        toast.error("Publishing failed. Check your platform connections.");
      }
    } catch (err: any) {
      platforms.forEach((p) => (statusMap[p] = "error"));
      setPublishStatus({ ...statusMap });
      toast.error(err.message || "Publishing failed");
    } finally {
      setIsPublishing(false);
    }
  };

  const allDone = Object.values(publishStatus).length > 0 &&
    Object.values(publishStatus).every((s) => s === "success" || s === "error");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            Publish to Platforms
          </DialogTitle>
        </DialogHeader>

        {listing && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 mb-2">
            {listing.image_url ? (
              <img
                src={listing.image_url}
                alt={listing.title}
                className="w-10 h-10 rounded-lg object-cover border border-border"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{listing.title}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {listing.brand && `${listing.brand} · `}
                {listing.current_price ? `£${listing.current_price.toFixed(2)}` : "No price set"}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : connections.length === 0 ? (
          <div className="text-center py-6">
            <ExternalLink className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-semibold mb-1">No platforms connected</p>
            <p className="text-xs text-muted-foreground mb-3">
              Connect eBay or other platforms in Settings → Platform Connections first.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => {
                onOpenChange(false);
                window.location.href = "/platforms";
              }}
            >
              Go to Connections
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map((conn) => {
              const meta = PLATFORM_META[conn.platform] || {
                name: conn.platform,
                icon: ShoppingBag,
              };
              const Icon = meta.icon;
              const isSelected = selectedPlatforms.has(conn.platform);
              const status = publishStatus[conn.platform];

              return (
                <Card
                  key={conn.id}
                  className={`p-3 sm:p-4 cursor-pointer transition-all active:scale-[0.99] ${
                    isSelected ? "border-primary ring-1 ring-primary" : ""
                  } ${status === "success" ? "border-success/30 bg-success/[0.03]" : ""}
                    ${status === "error" ? "border-destructive/30 bg-destructive/[0.03]" : ""}`}
                  onClick={() => !isPublishing && togglePlatform(conn.platform)}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isSelected}
                      disabled={isPublishing}
                      onCheckedChange={() => togglePlatform(conn.platform)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Icon className="w-4 h-4 text-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{meta.name}</span>
                        {conn.platform_username && (
                          <span className="text-[10px] text-muted-foreground">
                            @{conn.platform_username}
                          </span>
                        )}
                        {status === "publishing" && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                        )}
                        {status === "success" && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                        )}
                        {status === "error" && (
                          <XCircle className="w-3.5 h-3.5 text-destructive" />
                        )}
                      </div>
                    </div>
                  </div>

                  {isSelected && !isPublishing && !allDone && (
                    <div className="mt-3 pl-7">
                      <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Price on {meta.name} (£)
                      </Label>
                      <Input
                        className="h-9 mt-1 text-sm"
                        type="number"
                        step="0.01"
                        value={priceOverrides[conn.platform] || ""}
                        onChange={(e) =>
                          setPriceOverrides((prev) => ({
                            ...prev,
                            [conn.platform]: e.target.value,
                          }))
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                </Card>
              );
            })}

            {allDone ? (
              <Button
                className="w-full h-11 sm:h-10 font-semibold active:scale-95 transition-transform"
                onClick={() => onOpenChange(false)}
              >
                Done
              </Button>
            ) : (
              <Button
                className="w-full h-11 sm:h-10 font-semibold active:scale-95 transition-transform"
                disabled={selectedPlatforms.size === 0 || isPublishing}
                onClick={handlePublish}
              >
                {isPublishing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Publish to {selectedPlatforms.size} Platform{selectedPlatforms.size !== 1 ? "s" : ""}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
