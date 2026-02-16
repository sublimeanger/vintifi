import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Link2, Unlink, Loader2, ExternalLink, CheckCircle2,
  Clock, AlertTriangle, ShoppingBag, Store, Sparkles, ShieldCheck,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { UseCaseSpotlight } from "@/components/UseCaseSpotlight";
import { VintedProModal } from "@/components/VintedProModal";
import { FEATURE_FLAGS } from "@/lib/constants";

type PlatformConnection = {
  id: string;
  platform: string;
  platform_username: string | null;
  status: string;
  connected_at: string;
  token_expires_at: string | null;
};

const PLATFORMS = [
  {
    key: "ebay",
    name: "eBay",
    icon: ShoppingBag,
    description: "List items on eBay with full API integration. Supports inventory management, offers, and order sync.",
    status: "available" as const,
    color: "border-blue-500/20 bg-blue-500/[0.03]",
    badgeColor: "bg-success/10 text-success border-success/20",
    badgeLabel: "Ready",
  },
  {
    key: "vinted_pro",
    name: "Vinted Pro",
    icon: Store,
    description: "Publish directly to Vinted via the Pro Integrations API. Requires a Vinted Pro business account.",
    status: (FEATURE_FLAGS.VINTED_PRO_ENABLED ? "available" : "coming_soon") as "available" | "coming_soon",
    color: "border-teal-500/20 bg-teal-500/[0.03]",
    badgeColor: FEATURE_FLAGS.VINTED_PRO_ENABLED
      ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
      : "bg-accent/10 text-accent border-accent/20",
    badgeLabel: FEATURE_FLAGS.VINTED_PRO_ENABLED ? "Beta" : "Coming Soon",
  },
  {
    key: "depop",
    name: "Depop",
    icon: Sparkles,
    description: "Cross-list to Depop's marketplace. Partner API access pending approval.",
    status: "coming_soon" as const,
    color: "border-pink-500/20 bg-pink-500/[0.03]",
    badgeColor: "bg-accent/10 text-accent border-accent/20",
    badgeLabel: "Coming Soon",
  },
];

export default function PlatformConnections() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [vintedProModalOpen, setVintedProModalOpen] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  const fetchConnections = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("platform_connections")
      .select("id, platform, platform_username, status, connected_at, token_expires_at")
      .eq("user_id", user.id);

    if (error) {
      console.error(error);
    } else {
      setConnections((data || []) as PlatformConnection[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConnections();
  }, [user]);

  const getConnection = (platform: string) =>
    connections.find((c) => c.platform === platform);

  const handleConnect = async (platform: string) => {
    if (platform === "vinted_pro" && FEATURE_FLAGS.VINTED_PRO_ENABLED) {
      setVintedProModalOpen(true);
      return;
    }
    if (platform !== "ebay") {
      toast.info("This platform integration is coming soon!");
      return;
    }
    setConnecting(platform);
    try {
      const { data, error } = await supabase.functions.invoke("connect-ebay", {
        body: { action: "get_auth_url" },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Complete the authorisation in the new tab, then refresh this page.");
      } else {
        toast.info("eBay connection requires API keys to be configured. Please contact support.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start connection");
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (platform: string) => {
    const conn = getConnection(platform);
    if (!conn) return;
    setDisconnecting(platform);
    try {
      const { error } = await supabase
        .from("platform_connections")
        .delete()
        .eq("id", conn.id);
      if (error) throw error;
      setConnections((prev) => prev.filter((c) => c.id !== conn.id));
      toast.success(`${PLATFORMS.find((p) => p.key === platform)?.name} disconnected`);
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect");
    } finally {
      setDisconnecting(null);
    }
  };

  const handleTestConnection = async (platform: string) => {
    setTestingConnection(platform);
    try {
      const { data, error } = await supabase.functions.invoke("connect-vinted-pro", {
        body: { action: "test_connection" },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success("Connection is healthy!");
      } else {
        toast.error(data?.error || "Connection test failed");
      }
      fetchConnections();
    } catch (err: any) {
      toast.error(err.message || "Test failed");
    } finally {
      setTestingConnection(null);
    }
  };

  const isTokenExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <PageShell
      title="Platform Connections"
      subtitle="Connect your selling accounts for one-click cross-listing"
      icon={<Link2 className="w-5 h-5 text-primary" />}
      backTo="/settings"
      maxWidth="max-w-3xl"
    >
      <UseCaseSpotlight
        featureKey="platform-connections"
        icon={Link2}
        scenario="You're manually copy-pasting listings between Vinted, eBay, and Depop..."
        description="Cross-listing manually eats hours every week and leads to inconsistent listings across platforms."
        outcome="Connect your accounts once and publish to multiple platforms with a single click from any listing."
        tip="Start with eBay — it's fully supported right now. Vinted Pro and Depop are coming soon."
      />

      <div className="space-y-3 sm:space-y-4">
        {PLATFORMS.map((platform, i) => {
          const conn = getConnection(platform.key);
          const isConnected = conn && conn.status === "active";
          const hasError = conn && conn.status === "error";
          const expired = conn && isTokenExpired(conn.token_expires_at);
          const Icon = platform.icon;

          return (
            <motion.div
              key={platform.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card className={`p-4 sm:p-5 ${platform.color} active:scale-[0.99] transition-transform`}>
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-card border border-border flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display font-bold text-sm sm:text-base">{platform.name}</h3>
                      <Badge variant="outline" className={`text-[9px] sm:text-[10px] ${
                        isConnected
                          ? expired
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-success/10 text-success border-success/20"
                          : hasError
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : platform.badgeColor
                      }`}>
                        {isConnected
                          ? expired
                            ? "Token Expired"
                            : "Connected"
                          : hasError
                            ? "Error"
                            : platform.badgeLabel}
                      </Badge>
                    </div>

                    <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                      {platform.description}
                    </p>

                    {(isConnected || hasError) && conn && (
                      <div className="flex items-center gap-3 mb-3 text-[10px] sm:text-xs text-muted-foreground">
                        {conn.platform_username && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-success" />
                            {conn.platform_username}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Connected {new Date(conn.connected_at).toLocaleDateString()}
                        </span>
                        {expired && (
                          <span className="flex items-center gap-1 text-destructive">
                            <AlertTriangle className="w-3 h-3" />
                            Needs re-auth
                          </span>
                        )}
                        {hasError && (
                          <span className="flex items-center gap-1 text-destructive">
                            <AlertTriangle className="w-3 h-3" />
                            Credentials invalid
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {isConnected || hasError ? (
                        <>
                          {(expired || hasError) && (
                            <Button
                              size="sm"
                              className="h-8 sm:h-9 text-xs active:scale-95 transition-transform"
                              onClick={() => handleConnect(platform.key)}
                              disabled={connecting === platform.key}
                            >
                              {connecting === platform.key ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                              ) : (
                                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                              )}
                              Re-authorise
                            </Button>
                          )}
                          {platform.key === "vinted_pro" && isConnected && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 sm:h-9 text-xs active:scale-95 transition-transform"
                              onClick={() => handleTestConnection(platform.key)}
                              disabled={testingConnection === platform.key}
                            >
                              {testingConnection === platform.key ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                              ) : (
                                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                              )}
                              Test Connection
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 sm:h-9 text-xs text-destructive hover:text-destructive active:scale-95 transition-transform"
                            onClick={() => handleDisconnect(platform.key)}
                            disabled={disconnecting === platform.key}
                          >
                            {disconnecting === platform.key ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            ) : (
                              <Unlink className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          className="h-8 sm:h-9 text-xs active:scale-95 transition-transform"
                          onClick={() => handleConnect(platform.key)}
                          disabled={connecting === platform.key || platform.status === "coming_soon"}
                        >
                          {connecting === platform.key ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          ) : (
                            <Link2 className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          {platform.status === "coming_soon" ? "Coming Soon" : "Connect"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Info Card */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <Card className="p-4 sm:p-5 mt-6 border-primary/10 bg-primary/[0.02]">
          <h3 className="font-display font-bold text-sm mb-2 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" />
            How Cross-Platform Publishing Works
          </h3>
          <ul className="space-y-2 text-[10px] sm:text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground shrink-0">1.</span>
              Connect your platform accounts above (eBay first — it's ready now).
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground shrink-0">2.</span>
              Go to any listing and tap "Publish" to cross-list with one click.
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground shrink-0">3.</span>
              Vintifi adapts your listing format, pricing, and photos for each platform automatically.
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground shrink-0">4.</span>
              When an item sells anywhere, all other listings are auto-removed.
            </li>
          </ul>
        </Card>
      </motion.div>

      <VintedProModal
        open={vintedProModalOpen}
        onOpenChange={setVintedProModalOpen}
        onConnected={fetchConnections}
      />

      
    </PageShell>
  );
}
