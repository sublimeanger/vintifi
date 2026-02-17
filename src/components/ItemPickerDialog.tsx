import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Package, ChevronRight } from "lucide-react";

type PickedItem = {
  id: string;
  title: string;
  brand: string | null;
  category: string | null;
  condition: string | null;
  size: string | null;
  image_url: string | null;
  vinted_url: string | null;
  status: string;
};

interface ItemPickerDialogProps {
  onSelect: (item: PickedItem) => void;
  children: React.ReactNode;
}

export function ItemPickerDialog({ onSelect, children }: ItemPickerDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PickedItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    supabase
      .from("listings")
      .select("id, title, brand, category, condition, size, image_url, vinted_url, status")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setItems((data as PickedItem[]) || []);
        setLoading(false);
      });
  }, [open, user]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md max-h-[70vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 shrink-0">
          <DialogTitle className="text-base font-display font-bold">Pick from Your Items</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {loading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No items yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { onSelect(item); setOpen(false); }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 active:scale-[0.98] transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0 border border-border">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-4 h-4 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {[item.brand, item.category, item.size].filter(Boolean).join(" · ") || "No details"}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
