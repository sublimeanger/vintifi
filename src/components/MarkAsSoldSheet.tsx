import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, CheckCircle2, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MarkAsSoldSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: {
    id: string;
    title: string;
    current_price: number | null;
    purchase_price: number | null;
  };
  onSold: (id: string, salePrice: number, soldAt: string) => void;
}

export function MarkAsSoldSheet({ open, onOpenChange, listing, onSold }: MarkAsSoldSheetProps) {
  const [salePrice, setSalePrice] = useState(
    listing.current_price != null ? listing.current_price.toFixed(2) : ""
  );
  const [soldDate, setSoldDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const parsedPrice = parseFloat(salePrice);
  const profit =
    !isNaN(parsedPrice) && listing.purchase_price != null
      ? parsedPrice - listing.purchase_price
      : null;

  const handleConfirm = async () => {
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error("Please enter a valid sale price");
      return;
    }
    setSaving(true);
    const soldAt = soldDate.toISOString();
    const { error } = await supabase
      .from("listings")
      .update({
        status: "sold",
        sale_price: parsedPrice,
        sold_at: soldAt,
      })
      .eq("id", listing.id);

    if (error) {
      toast.error("Failed to record sale");
      console.error(error);
      setSaving(false);
      return;
    }

    const profitMsg =
      profit != null
        ? ` · profit: ${profit >= 0 ? "+" : ""}£${profit.toFixed(2)}`
        : "";
    toast.success(`🎉 Sold for £${parsedPrice.toFixed(2)}${profitMsg}`);
    onSold(listing.id, parsedPrice, soldAt);
    onOpenChange(false);
    setSaving(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto pb-safe">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="w-5 h-5 text-success" />
            Mark as Sold
          </SheetTitle>
          <p className="text-xs text-muted-foreground line-clamp-1">{listing.title}</p>
        </SheetHeader>

        <div className="space-y-4">
          {/* Sale Price */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sale Price (£)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">£</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="pl-7 text-base font-bold h-12 rounded-xl"
                placeholder="0.00"
                autoFocus
              />
            </div>
            {profit != null && (
              <p className={`text-xs font-semibold ${profit >= 0 ? "text-success" : "text-destructive"}`}>
                {profit >= 0 ? "+" : ""}£{profit.toFixed(2)} profit
                {listing.purchase_price != null && ` (cost £${listing.purchase_price.toFixed(2)})`}
              </p>
            )}
          </div>

          {/* Date Sold */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Date Sold
            </Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-10 justify-start text-left font-normal rounded-xl",
                    !soldDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {soldDate ? format(soldDate, "d MMM yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={soldDate}
                  onSelect={(d) => { if (d) { setSoldDate(d); setCalendarOpen(false); } }}
                  disabled={(d) => d > new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notes (optional)
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Royal Mail Tracked 48, buyer collected…"
              className="rounded-xl text-sm resize-none h-20"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl font-semibold gap-1.5 bg-success text-success-foreground hover:bg-success/90"
              onClick={handleConfirm}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Confirm Sale
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
