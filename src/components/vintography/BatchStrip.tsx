import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, Download } from "lucide-react";

export type BatchItem = {
  id: string;
  file: File;
  previewUrl: string;
  uploadedUrl: string | null;
  processedUrl: string | null;
  status: "pending" | "uploading" | "processing" | "done" | "error";
};

type Props = {
  items: BatchItem[];
  activeIndex: number;
  onSelect: (idx: number) => void;
  onRemove: (idx: number) => void;
  onDownloadAll: () => void;
};

export function BatchStrip({ items, activeIndex, onSelect, onRemove, onDownloadAll }: Props) {
  if (items.length <= 1) return null;

  const doneCount = items.filter((i) => i.status === "done").length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">Batch Queue</p>
          <Badge variant="secondary" className="text-xs">{doneCount}/{items.length} done</Badge>
        </div>
        {doneCount > 0 && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onDownloadAll}>
            <Download className="w-3 h-3 mr-1" /> Download All
          </Button>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {items.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => onSelect(idx)}
            className={`relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
              idx === activeIndex ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/30"
            }`}
          >
            <img src={item.processedUrl || item.previewUrl} alt="" className="w-full h-full object-cover" />
            {/* Status overlay */}
            {item.status === "uploading" || item.status === "processing" ? (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              </div>
            ) : item.status === "done" ? (
              <div className="absolute bottom-0.5 right-0.5">
                <div className="w-4 h-4 rounded-full bg-success flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-success-foreground" />
                </div>
              </div>
            ) : item.status === "error" ? (
              <div className="absolute bottom-0.5 right-0.5">
                <div className="w-4 h-4 rounded-full bg-destructive flex items-center justify-center">
                  <X className="w-2.5 h-2.5 text-destructive-foreground" />
                </div>
              </div>
            ) : null}
            {/* Remove button */}
            {item.status === "pending" && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(idx); }}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-foreground/60 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5 text-background" />
              </button>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
