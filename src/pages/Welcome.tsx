import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Sparkles, Search, Package, TrendingUp,
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
  const [items, setItems] = useState<ImportedItem[]>([]);
  const [existingCount, setExistingCount] = useState<number | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

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

  const handlePriceCheck = (item: ImportedItem) => {
    if (item.vinted_url) {
      navigate(`/price-check?url=${encodeURIComponent(item.vinted_url)}&itemId=${item.id}`);
    } else {
      navigate("/price-check");
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4 py-6">
      <Card className="w-full max-w-lg p-5 sm:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key="welcome"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-1.5 sm:mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <span className="text-[10px] sm:text-sm text-muted-foreground font-semibold uppercase tracking-wider">
                Welcome
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

            {existingCount && existingCount > 0 && items.length > 0 ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-success/10 border border-success/20 p-4 text-center">
                  <Package className="w-8 h-8 text-success mx-auto mb-2" />
                  <p className="font-display font-bold text-lg text-foreground">
                    You have {existingCount} items
                  </p>
                </div>
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

            <div className="mt-5 space-y-2">
              <button
                onClick={() => navigate("/trends")}
                className="w-full text-sm text-primary hover:text-primary/80 transition-colors text-center flex items-center justify-center gap-1.5 font-medium"
              >
                <TrendingUp className="w-3.5 h-3.5" /> Explore what's trending right now
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center flex items-center justify-center gap-1.5"
              >
                Go to Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </Card>
    </div>
  );
}
