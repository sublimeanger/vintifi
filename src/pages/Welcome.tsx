import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download, ArrowRight, Sparkles, Search, Package,
  ExternalLink, Loader2, Check, SkipForward,
} from "lucide-react";

type ImportedItem = {
  id: string;
  title: string;
  brand: string | null;
  current_price: number | null;
  image_url: string | null;
  vinted_url: string | null;
};

export default function Welcome() {
  const [step, setStep] = useState(0);
  const [profileUrl, setProfileUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [items, setItems] = useState<ImportedItem[]>([]);
  const [existingCount, setExistingCount] = useState<number | null>(null);
  const { user, session } = useAuth();
  const navigate = useNavigate();

  // Check if user already has items
  useEffect(() => {
    if (!user) return;
    supabase
      .from("listings")
      .select("id, title, brand, current_price, image_url, vinted_url", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data, count }) => {
        if (count && count > 0) {
          setExistingCount(count);
          setItems((data || []) as ImportedItem[]);
        }
      });
  }, [user]);

  const handleImport = async () => {
    if (!profileUrl.trim() || !session?.access_token) {
      toast.error("Please enter your Vinted profile URL");
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
          body: JSON.stringify({ profile_url: profileUrl.trim() }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || "Import failed");
        setImporting(false);
        return;
      }

      setImportedCount(data.imported + (data.updated || 0));

      // Fetch the first 3 items to show in step 2
      const { data: newItems } = await supabase
        .from("listings")
        .select("id, title, brand, current_price, image_url, vinted_url")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(3);

      setItems((newItems || []) as ImportedItem[]);

      // Auto-advance to step 2 after a brief celebration
      setTimeout(() => {
        setStep(1);
      }, 1500);
    } catch (err) {
      console.error("Import error:", err);
      toast.error("Failed to import. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  const handlePriceCheck = (item: ImportedItem) => {
    if (item.vinted_url) {
      navigate(`/price-check?url=${encodeURIComponent(item.vinted_url)}`);
    } else {
      navigate("/price-check");
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4 py-6">
      <Card className="w-full max-w-lg p-5 sm:p-8">
        {/* Progress dots */}
        <div className="flex gap-1.5 sm:gap-2 mb-6 sm:mb-8">
          {[0, 1].map((i) => (
            <motion.div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= step ? "bg-primary" : "bg-muted"}`}
              initial={false}
              animate={{ scaleX: i <= step ? 1 : 0.95 }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-1.5 sm:mb-2 flex items-center gap-2">
                <Download className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <span className="text-[10px] sm:text-sm text-muted-foreground font-semibold uppercase tracking-wider">
                  Step 1 of 2
                </span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold mb-0.5 sm:mb-1">
                Let's fill your shop with data
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm mb-5 sm:mb-6">
                Paste your Vinted profile URL and we'll import your listings in seconds
              </p>

              {existingCount && existingCount > 0 && !importing && importedCount === 0 ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-success/10 border border-success/20 p-4 text-center">
                    <Package className="w-8 h-8 text-success mx-auto mb-2" />
                    <p className="font-display font-bold text-lg text-foreground">
                      You already have {existingCount} items
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You can re-import to sync, or skip ahead
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 h-11 sm:h-10"
                      onClick={() => setStep(1)}
                    >
                      Continue <ArrowRight className="ml-1.5 w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : importedCount > 0 ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="rounded-xl bg-success/10 border border-success/20 p-6 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                  >
                    <Check className="w-12 h-12 text-success mx-auto mb-3" />
                  </motion.div>
                  <p className="font-display font-bold text-2xl text-foreground">
                    {importedCount} items imported!
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Moving to your first price check...
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <Input
                    value={profileUrl}
                    onChange={(e) => setProfileUrl(e.target.value)}
                    placeholder="e.g. vinted.co.uk/member/12345678-username"
                    className="h-11 sm:h-10 text-base sm:text-sm"
                    disabled={importing}
                    autoFocus
                  />

                  {importing && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span>Scanning your Vinted profile...</span>
                      </div>
                      <Progress value={undefined} className="h-1.5" />
                    </div>
                  )}

                  <Button
                    onClick={handleImport}
                    disabled={importing || !profileUrl.trim()}
                    className="w-full h-11 sm:h-10 font-semibold active:scale-95 transition-transform"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-1.5" />
                        Import My Wardrobe
                      </>
                    )}
                  </Button>
                </div>
              )}

              {!importedCount && (
                <button
                  onClick={() => setStep(1)}
                  className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors text-center flex items-center justify-center gap-1.5"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  Skip — I'll add items manually later
                </button>
              )}
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-1.5 sm:mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <span className="text-[10px] sm:text-sm text-muted-foreground font-semibold uppercase tracking-wider">
                  Step 2 of 2
                </span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold mb-0.5 sm:mb-1">
                See what your items are really worth
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm mb-5 sm:mb-6">
                {items.length > 0
                  ? "Pick any item below for a free AI price check"
                  : "Paste any Vinted listing URL to try a free price check"}
              </p>

              {items.length > 0 ? (
                <div className="space-y-2.5">
                  {items.map((item) => (
                    <Card
                      key={item.id}
                      className="p-3 sm:p-4 flex items-center gap-3 hover:border-primary/30 transition-colors cursor-pointer group"
                      onClick={() => handlePriceCheck(item)}
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover shrink-0 bg-muted"
                        />
                      ) : (
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.brand && (
                            <span className="text-xs text-muted-foreground">{item.brand}</span>
                          )}
                          {item.current_price != null && (
                            <span className="text-xs font-semibold text-foreground">
                              £{item.current_price.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      >
                        <Search className="w-3.5 h-3.5 mr-1" />
                        Check Price
                      </Button>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <Input
                    placeholder="Paste any Vinted listing URL..."
                    className="h-11 sm:h-10 text-base sm:text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) navigate(`/price-check?url=${encodeURIComponent(val)}`);
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      const input = document.querySelector<HTMLInputElement>(
                        'input[placeholder*="Vinted listing"]'
                      );
                      const val = input?.value.trim();
                      if (val) navigate(`/price-check?url=${encodeURIComponent(val)}`);
                      else toast.error("Please paste a Vinted listing URL");
                    }}
                    className="w-full h-11 sm:h-10 font-semibold"
                  >
                    <Search className="w-4 h-4 mr-1.5" />
                    Try a Price Check
                  </Button>
                </div>
              )}

              <button
                onClick={() => navigate("/dashboard")}
                className="w-full mt-5 text-sm text-muted-foreground hover:text-foreground transition-colors text-center flex items-center justify-center gap-1.5"
              >
                Go to Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}
