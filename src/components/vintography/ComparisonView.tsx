import { useState, useRef, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, ChevronRight, Columns2, Layers, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

type Props = {
  originalUrl: string;
  processedUrl: string | null;
  processing: boolean;
  variations: string[];
  currentVariation: number;
  onVariationChange: (idx: number) => void;
};

type ViewMode = "overlay" | "side-by-side";

// ── Utility: distance between two touch points ─────────────────────
function touchDist(a: React.Touch, b: React.Touch) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

// ── Utility: midpoint between two touch points ─────────────────────
function touchMid(a: React.Touch, b: React.Touch) {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
}

// ── Utility: clamp pan so image stays visible ──────────────────────
function clampPan(px: number, py: number, zoom: number, rect: DOMRect | null) {
  if (!rect || zoom <= 1) return { x: 0, y: 0 };
  const maxX = (rect.width * (zoom - 1)) / 2;
  const maxY = (rect.height * (zoom - 1)) / 2;
  return {
    x: Math.max(-maxX, Math.min(maxX, px)),
    y: Math.max(-maxY, Math.min(maxY, py)),
  };
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP_WHEEL = 0.08;
const ZOOM_STEP_BUTTON = 0.5;
const LERP_SPEED = 0.18;
const DOUBLE_TAP_ZOOM = 2.5;

export function ComparisonView({
  originalUrl, processedUrl, processing, variations, currentVariation, onVariationChange,
}: Props) {
  const [sliderValue, setSliderValue] = useState([50]);
  const [viewMode, setViewMode] = useState<ViewMode>("overlay");

  // Visual (rendered) zoom/pan – animated via rAF
  const [displayZoom, setDisplayZoom] = useState(1);
  const [displayPan, setDisplayPan] = useState({ x: 0, y: 0 });

  // Target zoom/pan – instantly set by interactions, display lerps toward these
  const targetZoom = useRef(1);
  const targetPan = useRef({ x: 0, y: 0 });
  const rafId = useRef(0);

  // Interaction refs
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panPanStart = useRef({ x: 0, y: 0 });

  // Touch refs
  const lastTouchDist = useRef(0);
  const lastTouchMid = useRef({ x: 0, y: 0 });
  const isTouchPanning = useRef(false);
  const touchPanStart = useRef({ x: 0, y: 0 });
  const touchPanPanStart = useRef({ x: 0, y: 0 });

  // Double-click/tap
  const lastTapTime = useRef(0);

  // Overlay swipe (single finger at 1x in overlay mode)
  const overlaySwipeActive = useRef(false);

  // ── Animation loop ───────────────────────────────────────────────
  const animate = useCallback(() => {
    setDisplayZoom((prev) => {
      const diff = targetZoom.current - prev;
      if (Math.abs(diff) < 0.005) return targetZoom.current;
      return prev + diff * LERP_SPEED;
    });
    setDisplayPan((prev) => {
      const dx = targetPan.current.x - prev.x;
      const dy = targetPan.current.y - prev.y;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return targetPan.current;
      return { x: prev.x + dx * LERP_SPEED, y: prev.y + dy * LERP_SPEED };
    });
    rafId.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    rafId.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId.current);
  }, [animate]);

  // ── Helpers ──────────────────────────────────────────────────────
  const getRect = () => containerRef.current?.getBoundingClientRect() ?? null;

  const setTargetZoom = useCallback((z: number, cursorX?: number, cursorY?: number) => {
    const rect = getRect();
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

    if (clamped <= 1) {
      // Reset everything
      targetZoom.current = 1;
      targetPan.current = { x: 0, y: 0 };
      return;
    }

    // Zoom toward cursor/pinch point
    if (rect && cursorX !== undefined && cursorY !== undefined) {
      const cx = cursorX - rect.left - rect.width / 2;
      const cy = cursorY - rect.top - rect.height / 2;
      const prevZ = targetZoom.current;
      const scale = clamped / prevZ;
      const newPx = targetPan.current.x - (cx - targetPan.current.x) * (scale - 1);
      const newPy = targetPan.current.y - (cy - targetPan.current.y) * (scale - 1);
      targetPan.current = clampPan(newPx, newPy, clamped, rect);
    } else {
      targetPan.current = clampPan(targetPan.current.x, targetPan.current.y, clamped, rect);
    }

    targetZoom.current = clamped;
  }, []);

  const resetZoom = useCallback(() => {
    targetZoom.current = 1;
    targetPan.current = { x: 0, y: 0 };
  }, []);

  // ── Mouse: pan ───────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (targetZoom.current <= 1) return;
    e.preventDefault();
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY };
    panPanStart.current = { ...targetPan.current };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    const rect = getRect();
    targetPan.current = clampPan(
      panPanStart.current.x + dx,
      panPanStart.current.y + dy,
      targetZoom.current,
      rect
    );
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  // ── Mouse: wheel zoom (non-passive) ─────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * ZOOM_STEP_WHEEL * 0.01;
      setTargetZoom(targetZoom.current * (1 + delta), e.clientX, e.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [setTargetZoom]);

  // ── Double click to zoom ─────────────────────────────────────────
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (targetZoom.current > 1.1) {
      resetZoom();
    } else {
      setTargetZoom(DOUBLE_TAP_ZOOM, e.clientX, e.clientY);
    }
  }, [setTargetZoom, resetZoom]);

  // ── Touch: pinch-to-zoom + pan + overlay swipe ───────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      overlaySwipeActive.current = false;
      isTouchPanning.current = false;
      lastTouchDist.current = touchDist(e.touches[0], e.touches[1]);
      lastTouchMid.current = touchMid(e.touches[0], e.touches[1]);
      return;
    }

    if (e.touches.length === 1) {
      // Double-tap detection
      const now = Date.now();
      if (now - lastTapTime.current < 300) {
        const t = e.touches[0];
        if (targetZoom.current > 1.1) {
          resetZoom();
        } else {
          setTargetZoom(DOUBLE_TAP_ZOOM, t.clientX, t.clientY);
        }
        lastTapTime.current = 0;
        return;
      }
      lastTapTime.current = now;

      // If overlay mode at 1x, start overlay swipe
      if (viewMode === "overlay" && processedUrl && targetZoom.current <= 1) {
        overlaySwipeActive.current = true;
        return;
      }

      // Otherwise start pan (if zoomed)
      if (targetZoom.current > 1) {
        isTouchPanning.current = true;
        touchPanStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        touchPanPanStart.current = { ...targetPan.current };
      }
    }
  }, [viewMode, processedUrl, setTargetZoom, resetZoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch zoom
      const dist = touchDist(e.touches[0], e.touches[1]);
      const mid = touchMid(e.touches[0], e.touches[1]);
      const scale = dist / lastTouchDist.current;
      setTargetZoom(targetZoom.current * scale, mid.x, mid.y);
      lastTouchDist.current = dist;
      lastTouchMid.current = mid;
      return;
    }

    if (e.touches.length === 1) {
      // Overlay swipe
      if (overlaySwipeActive.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const pct = Math.max(0, Math.min(100, ((e.touches[0].clientX - rect.left) / rect.width) * 100));
        setSliderValue([pct]);
        return;
      }

      // Touch pan
      if (isTouchPanning.current) {
        const dx = e.touches[0].clientX - touchPanStart.current.x;
        const dy = e.touches[0].clientY - touchPanStart.current.y;
        const rect = getRect();
        targetPan.current = clampPan(
          touchPanPanStart.current.x + dx,
          touchPanPanStart.current.y + dy,
          targetZoom.current,
          rect
        );
      }
    }
  }, [setTargetZoom]);

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = 0;
    isTouchPanning.current = false;
    overlaySwipeActive.current = false;
  }, []);

  const showVariationNav = variations.length > 1;
  const clipPercent = sliderValue[0];
  const isZoomed = displayZoom > 1.01;

  const transformStyle = {
    transform: `scale(${displayZoom}) translate(${displayPan.x / displayZoom}px, ${displayPan.y / displayZoom}px)`,
    transformOrigin: "center",
    willChange: "transform" as const,
  };

  return (
    <Card className="overflow-hidden">
      {processedUrl && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-border gap-2">
          <div className="flex items-center gap-1">
            <Button size="sm" variant={viewMode === "overlay" ? "default" : "ghost"} className="h-7 px-2 text-xs"
              onClick={() => setViewMode("overlay")}>
              <Layers className="w-3.5 h-3.5 mr-1" /> Overlay
            </Button>
            <Button size="sm" variant={viewMode === "side-by-side" ? "default" : "ghost"} className="h-7 px-2 text-xs"
              onClick={() => setViewMode("side-by-side")}>
              <Columns2 className="w-3.5 h-3.5 mr-1" /> Side by Side
            </Button>
          </div>
          <div className="flex items-center gap-1">
            {showVariationNav && (
              <div className="flex items-center gap-0.5 mr-2">
                {variations.map((_, i) => (
                  <button key={i} onClick={() => onVariationChange(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${i === currentVariation ? "bg-primary" : "bg-muted-foreground/30"}`} />
                ))}
              </div>
            )}
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setTargetZoom(targetZoom.current + ZOOM_STEP_BUTTON)}>
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setTargetZoom(targetZoom.current - ZOOM_STEP_BUTTON)}>
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            {isZoomed && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={resetZoom}>
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden select-none ${isZoomed ? "cursor-grab active:cursor-grabbing" : ""}`}
        style={{ aspectRatio: viewMode === "side-by-side" && processedUrl ? "8/5" : "4/5", maxHeight: 500, touchAction: "none" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {viewMode === "side-by-side" && processedUrl ? (
          <div className="flex h-full gap-1" style={transformStyle}>
            <div className="flex-1 relative">
              <img src={originalUrl} alt="Original" className="w-full h-full object-contain bg-muted/30" draggable={false} />
              <Badge variant="secondary" className="absolute top-2 left-2 text-[10px] bg-background/80 backdrop-blur-sm">Original</Badge>
            </div>
            <div className="flex-1 relative">
              <img src={processedUrl} alt="Enhanced" className="w-full h-full object-contain bg-background" draggable={false} />
              <Badge className="absolute top-2 right-2 text-[10px] bg-primary/90 backdrop-blur-sm">Enhanced</Badge>
            </div>
          </div>
        ) : (
          <div style={{ ...transformStyle, width: "100%", height: "100%" }}>
            <img src={originalUrl} alt="Original" className="absolute inset-0 w-full h-full object-contain bg-muted/30" draggable={false} />
            {processedUrl && (
              <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - clipPercent}% 0 0)` }}>
                <img src={processedUrl} alt="Processed" className="w-full h-full object-contain bg-background" draggable={false} />
              </div>
            )}
            {processedUrl && (
              <div className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none" style={{ left: `${clipPercent}%` }}>
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                  <ChevronRight className="w-4 h-4 text-primary-foreground -ml-0.5" />
                  <ChevronRight className="w-4 h-4 text-primary-foreground -ml-3 rotate-180" />
                </div>
              </div>
            )}
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

        {processing && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
            <p className="font-semibold text-sm">AI is working its magic…</p>
            <p className="text-xs text-muted-foreground">This usually takes 5–10 seconds</p>
          </div>
        )}
      </div>

      {processedUrl && viewMode === "overlay" && (
        <div className="px-4 py-3 border-t border-border">
          <Slider value={sliderValue} onValueChange={setSliderValue} min={0} max={100} step={1} />
        </div>
      )}
    </Card>
  );
}
