import { useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, ChevronRight, Columns2, Layers, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

type Props = {
  originalUrl: string;
  processedUrl: string | null;
  processing: boolean;
  // Variations
  variations: string[];
  currentVariation: number;
  onVariationChange: (idx: number) => void;
};

type ViewMode = "overlay" | "side-by-side";

export function ComparisonView({
  originalUrl,
  processedUrl,
  processing,
  variations,
  currentVariation,
  onVariationChange,
}: Props) {
  const [sliderValue, setSliderValue] = useState([50]);
  const [viewMode, setViewMode] = useState<ViewMode>("overlay");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const clipPercent = sliderValue[0];

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(Math.max(z + (e.deltaY > 0 ? -0.2 : 0.2), 1), 4));
  }, []);

  const resetZoom = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const showVariationNav = variations.length > 1;

  return (
    <Card className="overflow-hidden">
      {/* Toolbar */}
      {processedUrl && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-border gap-2">
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={viewMode === "overlay" ? "default" : "ghost"}
              className="h-7 px-2 text-xs"
              onClick={() => setViewMode("overlay")}
            >
              <Layers className="w-3.5 h-3.5 mr-1" /> Overlay
            </Button>
            <Button
              size="sm"
              variant={viewMode === "side-by-side" ? "default" : "ghost"}
              className="h-7 px-2 text-xs"
              onClick={() => setViewMode("side-by-side")}
            >
              <Columns2 className="w-3.5 h-3.5 mr-1" /> Side by Side
            </Button>
          </div>
          <div className="flex items-center gap-1">
            {showVariationNav && (
              <div className="flex items-center gap-0.5 mr-2">
                {variations.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => onVariationChange(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${i === currentVariation ? "bg-primary" : "bg-muted-foreground/30"}`}
                  />
                ))}
              </div>
            )}
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(z + 0.5, 4))}>
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(z - 0.5, 1))}>
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            {zoom > 1 && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={resetZoom}>
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Image area */}
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden ${zoom > 1 ? "cursor-grab active:cursor-grabbing" : ""}`}
        style={{ aspectRatio: viewMode === "side-by-side" && processedUrl ? "8/5" : "4/5", maxHeight: 500 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {viewMode === "side-by-side" && processedUrl ? (
          <div
            className="flex h-full gap-1"
            style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, transformOrigin: "center" }}
          >
            <div className="flex-1 relative">
              <img src={originalUrl} alt="Original" className="w-full h-full object-contain bg-muted/30" />
              <Badge variant="secondary" className="absolute top-2 left-2 text-[10px] bg-background/80 backdrop-blur-sm">Original</Badge>
            </div>
            <div className="flex-1 relative">
              <img src={processedUrl} alt="Enhanced" className="w-full h-full object-contain bg-background" />
              <Badge className="absolute top-2 right-2 text-[10px] bg-primary/90 backdrop-blur-sm">Enhanced</Badge>
            </div>
          </div>
        ) : (
          <div style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, transformOrigin: "center", width: "100%", height: "100%" }}>
            {/* Original (full) */}
            <img src={originalUrl} alt="Original" className="absolute inset-0 w-full h-full object-contain bg-muted/30" />
            {/* Processed overlay with clip */}
            {processedUrl && (
              <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - clipPercent}% 0 0)` }}>
                <img src={processedUrl} alt="Processed" className="w-full h-full object-contain bg-background" />
              </div>
            )}
            {/* Slider line */}
            {processedUrl && (
              <div className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none" style={{ left: `${clipPercent}%` }}>
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                  <ChevronRight className="w-4 h-4 text-primary-foreground -ml-0.5" />
                  <ChevronRight className="w-4 h-4 text-primary-foreground -ml-3 rotate-180" />
                </div>
              </div>
            )}
            {/* Labels */}
            <div className="absolute top-3 left-3 z-10">
              <Badge variant="secondary" className="text-[10px] bg-background/80 backdrop-blur-sm">Original</Badge>
            </div>
            {processedUrl && (
              <div className="absolute top-3 right-3 z-10">
                <Badge className="text-[10px] bg-primary/90 backdrop-blur-sm">Enhanced</Badge>
              </div>
            )}
          </div>
        )}

        {/* Processing overlay */}
        {processing && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
            <p className="font-semibold text-sm">AI is working its magic…</p>
            <p className="text-xs text-muted-foreground">This usually takes 5–10 seconds</p>
          </div>
        )}
      </div>

      {/* Overlay slider control */}
      {processedUrl && viewMode === "overlay" && (
        <div className="px-4 py-3 border-t border-border">
          <Slider value={sliderValue} onValueChange={setSliderValue} min={0} max={100} step={1} />
        </div>
      )}
    </Card>
  );
}
