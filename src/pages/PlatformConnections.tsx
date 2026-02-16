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
  Clock, AlertTriangle, ShoppingBag,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { UseCaseSpotlight } from "@/components/UseCaseSpotlight";

type PlatformConnection = {
  id: string;
  platform: string;
  platform_username: string | null;
  status: string;
  connected_at: string;
  token_expires_at: string | null;
};

export default function PlatformConnections() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchConnections = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("platform_connections")
      .select("id, platform, platform_username, status, connected_at, token_expires_at")
      .eq("user_id", user.id)
      .eq("platform", "ebay");

    if (!error) setConnections((data || []) as PlatformConnection[]);
    setLoading(false);
  };

  // Handle OAuth callback: exchange code for tokens
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code || !user) return;

    const exchangeCode = async () => {
      setConnecting(true);
      try {
        const { data, error } = await supabase.functions.invoke("connect-ebay", {
          body: { action: "exchange_code", code },
        });
        if (error) throw error;
        toast.success("eBay connected successfully!");
        await fetchConnections();
      } catch (err: any) {
        toast.error(err.message || "Failed to complete eBay connection");
      } finally {
        setConnecting(false);
        // Clean the URL to prevent re-triggering
        window.history.replaceState({}, "", window.location.pathname);
      }
    };

    exchangeCode();
  }, [user]);

  useEffect(() => { fetchConnections(); }, [user]);

  const ebayConnection = connections.find((c) => c.platform === "ebay");
  const isConnected = ebayConnection && ebayConnection.status === "active";
  const hasError = ebayConnection && ebayConnection.status === "error";
  const expired = ebayConnection && ebayConnection.token_expires_at && new Date(ebayConnection.token_expires_at) < new Date();

  const handleConnect = async () => {
    setConnecting(true);
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
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!ebayConnection) return;
    setDisconnecting(true);
    try {
      const { error } = await supabase
        .from("platform_connections")
        .delete()
        .eq("id", ebayConnection.id);
      if (error) throw error;
      setConnections([]);
      toast.success("eBay disconnected");
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <PageShell
      title="eBay Connection"
      subtitle="Connect your eBay seller account for one-click cross-listing"
      icon={<ShoppingBag className="w-5 h-5 text-primary" />}
      backTo="/settings"
      maxWidth="max-w-3xl"
    >
      <UseCaseSpotlight
        featureKey="platform-connections"
        icon={Link2}
        scenario="You're manually copy-pasting listings to eBay, wasting hours..."
        description="Cross-listing manually eats time and leads to inconsistent listings."
        outcome="Connect your eBay account once and publish any Vintifi listing to eBay with a single click."
        tip="Once connected, you'll see 'List on eBay' buttons on every item."
      />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-4 sm:p-6 border-blue-500/20 bg-blue-500/[0.03]">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center shrink-0">
              <ShoppingBag className="w-6 h-6 text-foreground" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-display font-bold text-base">eBay</h3>
                <Badge variant="outline" className={`text-[10px] ${
                  isConnected
                    ? expired
                      ? "bg-destructive/10 text-destructive border-destructive/20"
                      : "bg-success/10 text-success border-success/20"
                    : hasError
                      ? "bg-destructive/10 text-destructive border-destructive/20"
                      : "bg-success/10 text-success border-success/20"
                }`}>
                  {isConnected
                    ? expired ? "Token Expired" : "Connected"
                    : hasError ? "Error" : "Ready"}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                List items on eBay with full API integration. Supports inventory management, offers, and automatic condition mapping.
              </p>

              {(isConnected || hasError) && ebayConnection && (
                <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
                  {ebayConnection.platform_username && (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-success" />
                      {ebayConnection.platform_username}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Connected {new Date(ebayConnection.connected_at).toLocaleDateString()}
                  </span>
                  {expired && (
                    <span className="flex items-center gap-1 text-destructive">
                      <AlertTriangle className="w-3 h-3" /> Needs re-auth
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                {isConnected || hasError ? (
                  <>
                    {(expired || hasError) && (
                      <Button size="sm" className="h-9 text-xs" onClick={handleConnect} disabled={connecting}>
                        {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <ExternalLink className="w-3.5 h-3.5 mr-1.5" />}
                        Re-authorise
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="h-9 text-xs text-destructive hover:text-destructive" onClick={handleDisconnect} disabled={disconnecting}>
                      {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Unlink className="w-3.5 h-3.5 mr-1.5" />}
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button size="sm" className="h-9 text-xs" onClick={handleConnect} disabled={connecting}>
                    {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Link2 className="w-3.5 h-3.5 mr-1.5" />}
                    Connect eBay
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
        <Card className="p-4 sm:p-5 mt-6 border-primary/10 bg-primary/[0.02]">
          <h3 className="font-display font-bold text-sm mb-2 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" />
            How eBay Publishing Works
          </h3>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground shrink-0">1.</span>
              Connect your eBay seller account above.
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground shrink-0">2.</span>
              Go to any listing and tap "List on eBay" to publish with one click.
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground shrink-0">3.</span>
              Vintifi maps your condition, category, price, and photos automatically.
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground shrink-0">4.</span>
              Track your eBay listing status directly from the item detail page.
            </li>
          </ul>
        </Card>
      </motion.div>
    </PageShell>
  );
}
