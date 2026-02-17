import { useState, useRef, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, ChevronRight, Columns2, Layers, ZoomIn, ZoomOut, RotateCcw, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type ProcessingStep = "uploading" | "analysing" | "generating" | "finalising" | null;

type Props = {
  originalUrl: string;
  processedUrl: string | null;
  processing: boolean;
  processingStep?: ProcessingStep;
  operationId?: string;
  variations: string[];
  currentVariation: number;
  onVariationChange: (idx: number) => void;
};

type ViewMode = "overlay" | "side-by-side";

const PROCESSING_STEPS: { key: ProcessingStep; label: string; icon: string }[] = [
  { key: "uploading", label: "Uploading photo…", icon: "📤" },
  { key: "analysing", label: "AI analysing garment…", icon: "🔍" },
  { key: "generating", label: "Generating result…", icon: "✨" },
  { key: "finalising", label: "Finalising…", icon: "🎨" },
];

const TIPS: Record<string, string[]> = {
  clean_bg: [
    "Clean Background works best with high-contrast photos",
    "For lace and transparent fabrics, use a contrasting background when photographing",
    "Natural shadows are preserved for a grounded, professional look",
  ],
  lifestyle_bg: [
    "Lifestyle mode matches your garment's lighting to the scene",
    "Try different backgrounds — each creates a unique mood for your listing",
    "Great for social media posts and Instagram-style product shots",
  ],
  virtual_model: [
    "Virtual Model preserves all garment details like logos and prints",
    "Try different poses to show how the garment moves and drapes",
    "The AI creates realistic fabric physics — drape, tension, and weight",
  ],
  enhance: [
    "Enhance corrects white balance and colour temperature automatically",
    "Fabric textures become more visible with micro-contrast enhancement",
    "Phone photos can look like professional studio shots after enhancement",
  ],
  default: [
    "Each operation uses 1 credit from your monthly allowance",
    "You can chain operations — try Clean Background then Lifestyle",
    "Download your results or they're saved in your gallery automatically",
  ],
};

function touchDist(a: React.Touch, b: React.Touch) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function touchMid(a: React.Touch, b: React.Touch) {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
}

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
const SNAP_THRESHOLD_ZOOM = 0.005;
const SNAP_THRESHOLD_PAN = 0.5;
const DOUBLE_TAP_ZOOM = 2.5;

export function ComparisonView({
  originalUrl, processedUrl, processing, processingStep, operationId, variations, currentVariation, onVariationChange,
}: Props) {
  const [sliderValue, setSliderValue] = useState([50]);
  const [viewMode, setViewMode] = useState<ViewMode>("overlay");
  const [tipIndex, setTipIndex] = useState(0);

  // Cycle tips during processing
  useEffect(() => {
    if (!processing) { setTipIndex(0); return; }
    const tips = TIPS[operationId || "default"] || TIPS.default;
    const interval = setInterval(() => {
      setTipIndex((i) => (i + 1) % tips.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [processing, operationId]);

  // Visual (rendered) zoom/pan – animated via rAF
  const displayZoomRef = useRef(1);
  const displayPanRef = useRef({ x: 0, y: 0 });
  const [, forceRender] = useState(0);

  // Target zoom/pan
  const targetZoom = useRef(1);
  const targetPan = useRef({ x: 0, y: 0 });
  const rafId = useRef(0);
  const animating = useRef(false);

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

  // Overlay swipe
  const overlaySwipeActive = useRef(false);

  // ── Smart animation loop ─────────────────
  const animate = useCallback(() => {
    const tz = targetZoom.current;
    const tp = targetPan.current;
    const dz = displayZoomRef.current;
    const dp = displayPanRef.current;

    const diffZ = tz - dz;
    const diffX = tp.x - dp.x;
    const diffY = tp.y - dp.y;

    const zoomDone = Math.abs(diffZ) < SNAP_THRESHOLD_ZOOM;
    const panDone = Math.abs(diffX) < SNAP_THRESHOLD_PAN && Math.abs(diffY) < SNAP_THRESHOLD_PAN;

    if (zoomDone && panDone) {
      displayZoomRef.current = tz;
      displayPanRef.current = tp;
      forceRender((c) => c + 1);
      animating.current = false;
      return;
    }

    displayZoomRef.current = zoomDone ? tz : dz + diffZ * LERP_SPEED;
    displayPanRef.current = {
      x: panDone ? tp.x : dp.x + diffX * LERP_SPEED,
      y: panDone ? tp.y : dp.y + diffY * LERP_SPEED,
    };

    forceRender((c) => c + 1);
    rafId.current = requestAnimationFrame(animate);
  }, []);

  const startAnimation = useCallback(() => {
    if (animating.current) return;
    animating.current = true;
    rafId.current = requestAnimationFrame(animate);
  }, [animate]);

  useEffect(() => {
    return () => cancelAnimationFrame(rafId.current);
  }, []);

  const getRect = () => containerRef.current?.getBoundingClientRect() ?? null;

  const setTargetZoom = useCallback((z: number, cursorX?: number, cursorY?: number) => {
    const rect = getRect();
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

    if (clamped <= 1) {
      targetZoom.current = 1;
      targetPan.current = { x: 0, y: 0 };
      startAnimation();
      return;
    }

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
    startAnimation();
  }, [startAnimation]);

  const resetZoom = useCallback(() => {
    targetZoom.current = 1;
    targetPan.current = { x: 0, y: 0 };
    startAnimation();
  }, [startAnimation]);

  // ── Mouse: pan ───────────────────────────
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
    targetPan.current = clampPan(panPanStart.current.x + dx, panPanStart.current.y + dy, targetZoom.current, rect);
    startAnimation();
  }, [startAnimation]);

  const handleMouseUp = useCallback(() => { isPanning.current = false; }, []);

  // ── Mouse: wheel zoom ─────────────────────
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

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (targetZoom.current > 1.1) resetZoom();
    else setTargetZoom(DOUBLE_TAP_ZOOM, e.clientX, e.clientY);
  }, [setTargetZoom, resetZoom]);

  // ── Touch ────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      overlaySwipeActive.current = false;
      isTouchPanning.current = false;
      lastTouchDist.current = touchDist(e.touches[0], e.touches[1]);
      lastTouchMid.current = touchMid(e.touches[0], e.touches[1]);
      return;
    }
    if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapTime.current < 300) {
        const t = e.touches[0];
        if (targetZoom.current > 1.1) resetZoom();
        else setTargetZoom(DOUBLE_TAP_ZOOM, t.clientX, t.clientY);
        lastTapTime.current = 0;
        return;
      }
      lastTapTime.current = now;
      if (viewMode === "overlay" && processedUrl && targetZoom.current <= 1) {
        overlaySwipeActive.current = true;
        return;
      }
      if (targetZoom.current > 1) {
        isTouchPanning.current = true;
        touchPanStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        touchPanPanStart.current = { ...targetPan.current };
      }
    }
  }, [viewMode, processedUrl, setTargetZoom, resetZoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = touchDist(e.touches[0], e.touches[1]);
      const mid = touchMid(e.touches[0], e.touches[1]);
      const scale = dist / lastTouchDist.current;
      setTargetZoom(targetZoom.current * scale, mid.x, mid.y);
      lastTouchDist.current = dist;
      lastTouchMid.current = mid;
      return;
    }
    if (e.touches.length === 1) {
      if (overlaySwipeActive.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const pct = Math.max(0, Math.min(100, ((e.touches[0].clientX - rect.left) / rect.width) * 100));
        setSliderValue([pct]);
        return;
      }
      if (isTouchPanning.current) {
        const dx = e.touches[0].clientX - touchPanStart.current.x;
        const dy = e.touches[0].clientY - touchPanStart.current.y;
        const rect = getRect();
        targetPan.current = clampPan(touchPanPanStart.current.x + dx, touchPanPanStart.current.y + dy, targetZoom.current, rect);
        startAnimation();
      }
    }
  }, [setTargetZoom, startAnimation]);

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = 0;
    isTouchPanning.current = false;
    overlaySwipeActive.current = false;
  }, []);

  const showVariationNav = variations.length > 1;
  const clipPercent = sliderValue[0];
  const displayZoom = displayZoomRef.current;
  const displayPan = displayPanRef.current;
  const isZoomed = displayZoom > 1.01;

  const transformStyle = {
    transform: `scale(${displayZoom}) translate(${displayPan.x / displayZoom}px, ${displayPan.y / displayZoom}px)`,
    transformOrigin: "center",
    willChange: isZoomed ? "transform" as const : "auto" as const,
  };

  const currentStepIndex = processingStep ? PROCESSING_STEPS.findIndex(s => s.key === processingStep) : -1;
  const tips = TIPS[operationId || "default"] || TIPS.default;

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

        {/* ── Shimmer Skeleton Processing Overlay ── */}
        {processing && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
            {/* Dimmed original + shimmer sweep */}
            <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 animate-shimmer-sweep" style={{
                background: "linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.08) 40%, hsl(var(--primary) / 0.15) 50%, hsl(var(--primary) / 0.08) 60%, transparent 100%)",
                backgroundSize: "200% 100%",
              }} />
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-4 px-6 max-w-xs text-center">
              {/* Animated icon */}
              <motion.div
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center"
              >
                <Sparkles className="w-7 h-7 text-primary" />
              </motion.div>

              {/* Multi-step progress */}
              <div className="w-full space-y-2">
                {PROCESSING_STEPS.map((step, i) => {
                  const isActive = i === currentStepIndex;
                  const isDone = i < currentStepIndex;
                  return (
                    <motion.div
                      key={step.key}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: isDone || isActive ? 1 : 0.35, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`flex items-center gap-2 text-xs transition-colors ${isActive ? "text-primary font-semibold" : isDone ? "text-muted-foreground" : "text-muted-foreground/50"}`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 transition-colors ${
                        isDone ? "bg-primary/20 text-primary" : isActive ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}>
                        {isDone ? "✓" : isActive ? <Loader2 className="w-3 h-3 animate-spin" /> : step.icon}
                      </div>
                      <span>{step.label}</span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: "5%" }}
                  animate={{ width: `${Math.max(10, ((currentStepIndex + 1) / PROCESSING_STEPS.length) * 100)}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>

              {/* Rotating tips */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={tipIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="text-[11px] text-muted-foreground italic"
                >
                  💡 {tips[tipIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
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
