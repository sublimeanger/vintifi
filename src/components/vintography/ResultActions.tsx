import { Button } from "@/components/ui/button";
import { RefreshCw, Download, RotateCcw, Image as ImageIcon, Plus, Check, Loader2, ChevronRight } from "lucide-react";

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
  onNextPhoto?: () => void;
  onTopUp?: () => void;
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
  onNextPhoto,
  onTopUp,
}: Props) {
  if (!processedUrl) return null;

  const currentPhotoIndex = activePhotoUrl ? itemPhotos.indexOf(activePhotoUrl) : -1;
  const hasNextPhoto = currentPhotoIndex >= 0 && currentPhotoIndex < itemPhotos.length - 1;

  return (
    <div className="space-y-2">
      {/* Save to Item — replace vs add alongside */}
      {itemId && (
        <div className="flex gap-2">
          <Button
            onClick={onSaveReplace}
            disabled={activePhotoSaved || savingToItem}
            className={`flex-1 h-10 text-sm font-semibold active:scale-95 transition-all ${
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
            {activePhotoSaved ? "Saved ✓" : "Replace Original"}
          </Button>
          {!activePhotoSaved && (
            <Button
              variant="outline"
              onClick={onSaveAdd}
              disabled={savingToItem}
              className="h-10 text-sm active:scale-95 transition-transform px-3"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Alongside
            </Button>
          )}
        </div>
      )}

      {/* Secondary actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={onReprocess}
          disabled={processing}
          className="h-9 text-sm active:scale-95 transition-transform"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Try Again
        </Button>
        <Button
          variant="outline"
          onClick={onDownload}
          className="h-9 text-sm active:scale-95 transition-transform"
        >
          <Download className="w-3.5 h-3.5 mr-1.5" /> Download
        </Button>
        {hasNextPhoto && onNextPhoto && (
          <Button
            variant="outline"
            onClick={onNextPhoto}
            className="h-9 text-sm active:scale-95 transition-transform"
          >
            Next Photo <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={onReset}
          className="h-9 text-sm active:scale-95 transition-transform"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> New Photo
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
