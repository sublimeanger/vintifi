import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  RefreshCw, Download, RotateCcw, Image as ImageIcon,
  Plus, Check, Loader2, ChevronRight, Wand2, Star,
} from "lucide-react";

type Props = {
  processedUrl: string | null;
  itemId: string | null;
  activePhotoSaved: boolean;
  savingToItem: boolean;
  processing: boolean;
  itemPhotos: string[];
  activePhotoUrl: string | null;
  creditsLow: boolean;
  onReprocess: () => void;
  onDownload: () => void;
  onReset: () => void;
  onSaveReplace: () => void;
  onSaveAdd: () => void;
  onUseAsStartingPoint: () => void;
  onNextPhoto?: () => void;
  onTopUp?: () => void;
  onSavePreset?: () => void;
  showSavePreset?: boolean;
};

export function ResultActions({
  processedUrl,
  itemId,
  activePhotoSaved,
  savingToItem,
  processing,
  itemPhotos,
  activePhotoUrl,
  creditsLow,
  onReprocess,
  onDownload,
  onReset,
  onSaveReplace,
  onSaveAdd,
  onUseAsStartingPoint,
  onNextPhoto,
  onTopUp,
  onSavePreset,
  showSavePreset,
}: Props) {
  if (!processedUrl) return null;

  const currentPhotoIndex = activePhotoUrl ? itemPhotos.indexOf(activePhotoUrl) : -1;
  const hasNextPhoto = currentPhotoIndex >= 0 && currentPhotoIndex < itemPhotos.length - 1;

  return (
    <div className="space-y-2">
      {/* Primary actions row */}
      <div className="flex gap-2">
        {/* Save to item (if linked) */}
        {itemId && (
          <Button
            onClick={onSaveReplace}
            disabled={activePhotoSaved || savingToItem}
            className={`flex-1 h-11 text-sm font-semibold active:scale-95 transition-all ${
              activePhotoSaved
                ? "bg-success/90 text-success-foreground hover:bg-success/80"
                : "bg-success text-success-foreground hover:bg-success/90"
            }`}
          >
            {savingToItem ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : activePhotoSaved ? (
              <Check className="w-4 h-4 mr-1.5" />
            ) : (
              <ImageIcon className="w-4 h-4 mr-1.5" />
            )}
            {activePhotoSaved ? "Saved ✓" : "Save to Listing"}
          </Button>
        )}

        {/* Download — always available */}
        <Button
          variant="outline"
          onClick={onDownload}
          className={`h-11 text-sm active:scale-95 transition-transform ${itemId ? "px-3" : "flex-1"}`}
        >
          <Download className="w-4 h-4 mr-1.5" /> Download
        </Button>

        {/* Add alongside (if linked and not yet saved) */}
        {itemId && !activePhotoSaved && (
          <Button
            variant="outline"
            onClick={onSaveAdd}
            disabled={savingToItem}
            className="h-11 text-sm active:scale-95 transition-transform px-3"
            title="Add as extra photo"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Edit Further — the key new action */}
      <Card
        onClick={onUseAsStartingPoint}
        className="p-3 cursor-pointer border-primary/20 bg-primary/[0.03] hover:bg-primary/[0.06] hover:border-primary/30 transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Wand2 className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Edit this result further</p>
            <p className="text-[10px] text-muted-foreground">
              Use as your new starting point — apply another effect
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>
      </Card>

      {/* Tertiary actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={onReprocess}
          disabled={processing}
          className="h-8 text-xs active:scale-95 transition-transform"
        >
          <RefreshCw className="w-3 h-3 mr-1" /> Retry
        </Button>
        {hasNextPhoto && onNextPhoto && (
          <Button
            variant="ghost"
            onClick={onNextPhoto}
            className="h-8 text-xs active:scale-95 transition-transform"
          >
            Next Photo <ChevronRight className="w-3 h-3 ml-0.5" />
          </Button>
        )}
        {showSavePreset && onSavePreset && (
          <Button
            variant="ghost"
            onClick={onSavePreset}
            className="h-8 text-xs active:scale-95 transition-transform"
          >
            <Star className="w-3 h-3 mr-1" /> Save Preset
          </Button>
        )}
        <div className="flex-1" />
        <Button
          variant="ghost"
          onClick={onReset}
          className="h-8 text-xs text-muted-foreground active:scale-95 transition-transform"
        >
          <RotateCcw className="w-3 h-3 mr-1" /> Start Over
        </Button>
      </div>

      {/* Low-credit top-up nudge */}
      {creditsLow && onTopUp && (
        <button
          onClick={onTopUp}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          Running low on credits? <span className="text-primary font-medium underline">Top up 10 for £2.99 →</span>
        </button>
      )}
    </div>
  );
}
