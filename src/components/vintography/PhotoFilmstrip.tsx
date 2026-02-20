import { useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Check, Plus, Wand2 } from "lucide-react";

export type PhotoEditState = {
  editedUrl: string | null;
  savedToItem: boolean;
  operationApplied: string | null;
};

type Props = {
  photos: string[];
  activeUrl: string | null;
  editStates: Record<string, PhotoEditState>;
  itemId: string | null;
  onSelect: (url: string) => void;
  onAddPhoto?: () => void;
};

const OP_SHORT: Record<string, string> = {
  clean_bg: "BG",
  lifestyle_bg: "Scene",
  virtual_model: "Model",
  enhance: "Enhance",
  decrease: "Steam",
};

export function PhotoFilmstrip({ photos, activeUrl, editStates, itemId, onSelect, onAddPhoto }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Preload adjacent photos for instant switching
  useEffect(() => {
    const currentIndex = photos.indexOf(activeUrl || "");
    const toPreload = [
      photos[currentIndex - 1],
      photos[currentIndex + 1],
    ].filter(Boolean);

    toPreload.forEach((url) => {
      const img = new Image();
      img.src = url;
    });
  }, [activeUrl, photos]);

  if (photos.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] lg:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Listing Photos · {photos.length}
        </p>
        <p className="text-[10px] text-muted-foreground">Tap to edit</p>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {photos.map((url, idx) => {
          const isActive = url === activeUrl;
          const editState = editStates[url];
          const isEdited = editState?.editedUrl !== null && editState?.editedUrl !== undefined;
          const isSaved = editState?.savedToItem === true;
          const displayUrl = isEdited ? editState.editedUrl! : url;
          const opShort = editState?.operationApplied ? OP_SHORT[editState.operationApplied] || editState.operationApplied : null;

          return (
            <button
              key={url}
              onClick={() => onSelect(url)}
              className={`relative shrink-0 w-[72px] h-[72px] lg:w-20 lg:h-20 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                isActive
                  ? "border-primary ring-2 ring-primary/25 shadow-md"
                  : isEdited
                  ? "border-success/60 hover:border-success"
                  : "border-border hover:border-primary/40"
              }`}
            >
              {/* Photo thumbnail — show edited version if available */}
              <img
                src={displayUrl}
                alt={`Photo ${idx + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Split diagonal overlay: show original hint if edited and active */}
              {isActive && isEdited && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `linear-gradient(135deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.25) 45%, transparent 45%)`,
                  }}
                >
                  <img
                    src={url}
                    alt="Original"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ clipPath: "polygon(0 0, 45% 0, 0 55%)" }}
                  />
                </div>
              )}

              {/* Index badge (top-left) */}
              <div className="absolute top-1 left-1">
                {idx === 0 ? (
                  <Badge className="text-[7px] lg:text-[8px] px-1 py-0 h-4 bg-primary/90 backdrop-blur-sm leading-none">
                    Primary
                  </Badge>
                ) : (
                  <span className="w-4 h-4 rounded-full bg-background/70 backdrop-blur-sm text-[8px] font-bold flex items-center justify-center text-foreground">
                    {idx + 1}
                  </span>
                )}
              </div>

              {/* Edit status — bottom right */}
              {isEdited && (
                <div className="absolute bottom-1 right-1 flex items-center gap-0.5">
                  {isSaved ? (
                    <div className="w-4 h-4 rounded-full bg-success flex items-center justify-center shadow">
                      <Check className="w-2.5 h-2.5 text-success-foreground" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow">
                      <Wand2 className="w-2.5 h-2.5 text-primary-foreground" />
                    </div>
                  )}
                </div>
              )}

              {/* Op label pill (bottom-left, only if edited and not active) */}
              {isEdited && opShort && !isActive && (
                <div className="absolute bottom-1 left-1">
                  <span className="text-[7px] font-semibold bg-background/80 backdrop-blur-sm text-foreground rounded px-1 py-0.5 leading-none">
                    {opShort}
                  </span>
                </div>
              )}

              {/* Active indicator — animated ring glow */}
              {isActive && (
                <div className="absolute inset-0 rounded-xl ring-2 ring-inset ring-primary/40 pointer-events-none" />
              )}
            </button>
          );
        })}

        {/* + Add Photo button — only shown when linked to an item */}
        {itemId && onAddPhoto && (
          <button
            onClick={onAddPhoto}
            className="shrink-0 w-[72px] h-[72px] lg:w-20 lg:h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-colors bg-muted/30 hover:bg-primary/[0.04]"
          >
            <Plus className="w-4 h-4 text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground font-medium">Add</span>
          </button>
        )}
      </div>
    </div>
  );
}
