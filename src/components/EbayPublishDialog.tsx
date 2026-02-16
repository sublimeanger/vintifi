import { useState, useEffect, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ExternalLink, Loader2, Save, Tag as TagIcon } from "lucide-react";
import { CheckRow } from "@/components/ebay-publish/CheckRow";
import { runChecks } from "@/components/ebay-publish/checks";
import { supabase } from "@/integrations/supabase/client";
import type { Listing, EbayPreview, EbayPublishDialogProps } from "@/components/ebay-publish/types";

export type { Listing } from "@/components/ebay-publish/types";

export function EbayPublishDialog({
  open, onOpenChange, listing, publishing, onPublish, onOptimise, onSave,
}: EbayPublishDialogProps) {
  const [editedListing, setEditedListing] = useState<Listing>(listing);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [pendingEdits, setPendingEdits] = useState<Partial<Listing>>({});
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<EbayPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Reset state when listing changes or dialog opens
  useEffect(() => {
    if (open) {
      setEditedListing(listing);
      setPendingEdits({});
      setEditingField(null);
      fetchPreview(listing.id);
    }
  }, [open, listing.id]);

  const fetchPreview = async (listingId: string) => {
    setPreviewLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ebay-preview", {
        body: { listing_id: listingId },
      });
      if (!error && data) {
        setPreview(data as EbayPreview);
      }
    } catch {
      // Preview is non-critical
    } finally {
      setPreviewLoading(false);
    }
  };

  const checks = useMemo(() => runChecks(editedListing), [editedListing]);
  const fails = checks.filter((c) => c.status === "fail");
  const warns = checks.filter((c) => c.status === "warn");
  const passes = checks.filter((c) => c.status === "pass");
  const hasBlockers = fails.length > 0;
  const needsOptimisation = !editedListing.last_optimised_at;
  const score = Math.round((passes.length / checks.length) * 100);
  const hasPendingEdits = Object.keys(pendingEdits).length > 0;

  const getEditValue = (field: string): string => {
    const val = (editedListing as any)[field];
    if (val == null) return "";
    return String(val);
  };

  const handleEditChange = (field: string, value: string) => {
    const parsed = field === "current_price" ? (value ? parseFloat(value) : null) : (value || null);
    setEditedListing((prev) => ({ ...prev, [field]: parsed }));
    setPendingEdits((prev) => ({ ...prev, [field]: parsed }));
  };

  const handleSave = async () => {
    if (!hasPendingEdits) return;
    setSaving(true);
    try {
      await onSave(pendingEdits);
      setPendingEdits({});
      setEditingField(null);
      // Re-fetch preview with updated data
      fetchPreview(editedListing.id);
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5" /> eBay Readiness Check
          </DialogTitle>
          <DialogDescription>
            {hasBlockers
              ? "Some issues must be fixed before publishing."
              : warns.length > 0
                ? "Your listing is ready but could be improved."
                : "Your listing looks great — ready to publish!"}
          </DialogDescription>
        </DialogHeader>

        {/* Category Preview */}
        <div className="flex items-center gap-2 px-1">
          <TagIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">eBay Category:</span>
          {previewLoading ? (
            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
          ) : preview ? (
            <Badge variant="secondary" className="text-xs font-medium">
              {preview.categoryName}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground italic">Detecting…</span>
          )}
        </div>

        {/* Score bar */}
        <div className="flex items-center gap-3 px-1">
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                hasBlockers ? "bg-destructive" : warns.length > 0 ? "bg-warning" : "bg-success"
              }`}
              style={{ width: `${score}%` }}
            />
          </div>
          <span className="text-sm font-bold tabular-nums">{score}%</span>
        </div>

        {/* Checks */}
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {[...fails, ...warns, ...passes].map((check) => (
            <CheckRow
              key={check.field}
              check={check}
              editingField={editingField}
              onStartEdit={setEditingField}
              editValue={getEditValue(check.field)}
              onEditChange={(val) => handleEditChange(check.field, val)}
            />
          ))}
        </div>

        {/* Aspects preview */}
        {preview && Object.keys(preview.aspects).length > 0 && (
          <div className="px-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
              Item Specifics sent to eBay
            </p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(preview.aspects).map(([key, values]) => (
                <Badge key={key} variant="outline" className="text-[10px]">
                  {key}: {values.join(", ")}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {hasPendingEdits && (
            <Button variant="outline" onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
              Save Changes
            </Button>
          )}
          {needsOptimisation && !hasPendingEdits && (
            <Button variant="outline" onClick={onOptimise} className="w-full sm:w-auto">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Optimise First
            </Button>
          )}
          <Button
            onClick={() => onPublish(editedListing)}
            disabled={hasBlockers || publishing || hasPendingEdits}
            className="w-full sm:w-auto"
          >
            {publishing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
            ) : (
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            )}
            {hasBlockers ? "Fix Issues First" : hasPendingEdits ? "Save First" : warns.length > 0 ? "Publish Anyway" : "Publish to eBay"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
