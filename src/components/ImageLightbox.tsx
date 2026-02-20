import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
  labels?: string[];
}

export default function ImageLightbox({
  images,
  initialIndex = 0,
  open,
  onClose,
  labels,
}: ImageLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(1);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const panTranslateRef = useRef({ x: 0, y: 0 });

  const total = images.length;

  // Reset on open / index change
  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, [index]);

  useEffect(() => {
    if (open) {
      setIndex(initialIndex);
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    }
  }, [open, initialIndex]);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && scale <= 1) setIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight" && scale <= 1) setIndex((i) => Math.min(total - 1, i + 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, scale, total]);

  const goTo = useCallback((i: number) => {
    setIndex(Math.max(0, Math.min(total - 1, i)));
  }, [total]);

  const toggleZoom = useCallback(() => {
    if (scale > 1) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  }, [scale]);

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(4, s + 0.5));
  }, []);

  const zoomOut = useCallback(() => {
    const next = Math.max(1, scale - 0.5);
    setScale(next);
    if (next <= 1) setTranslate({ x: 0, y: 0 });
  }, [scale]);

  // --- Touch handlers ---
  const getDistance = (t1: React.Touch, t2: React.Touch) =>
    Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch start
        pinchStartDistRef.current = getDistance(e.touches[0], e.touches[1]);
        pinchStartScaleRef.current = scale;
      } else if (e.touches.length === 1) {
        const now = Date.now();
        const touch = e.touches[0];

        // Double-tap detection
        if (now - lastTapRef.current < 300) {
          toggleZoom();
          lastTapRef.current = 0;
          return;
        }
        lastTapRef.current = now;

        touchStartRef.current = { x: touch.clientX, y: touch.clientY };

        if (scale > 1) {
          panStartRef.current = { x: touch.clientX, y: touch.clientY };
          panTranslateRef.current = { ...translate };
        }
      }
    },
    [scale, translate, toggleZoom]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
        // Pinch zoom
        const dist = getDistance(e.touches[0], e.touches[1]);
        const ratio = dist / pinchStartDistRef.current;
        const newScale = Math.max(1, Math.min(4, pinchStartScaleRef.current * ratio));
        setScale(newScale);
        e.preventDefault();
      } else if (e.touches.length === 1 && scale > 1 && panStartRef.current) {
        // Pan
        const dx = e.touches[0].clientX - panStartRef.current.x;
        const dy = e.touches[0].clientY - panStartRef.current.y;
        setTranslate({
          x: panTranslateRef.current.x + dx,
          y: panTranslateRef.current.y + dy,
        });
        e.preventDefault();
      }
    },
    [scale]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      // Snap back if barely zoomed
      if (scale <= 1.05 && scale > 1) {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      }

      // Swipe navigation (only when not zoomed)
      if (
        scale <= 1 &&
        touchStartRef.current &&
        e.changedTouches.length === 1
      ) {
        const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
        if (Math.abs(dx) > 60) {
          if (dx < 0 && index < total - 1) goTo(index + 1);
          if (dx > 0 && index > 0) goTo(index - 1);
        }
      }

      pinchStartDistRef.current = null;
      panStartRef.current = null;
      touchStartRef.current = null;
    },
    [scale, index, total, goTo]
  );

  if (!open) return null;

  const label = labels?.[index];
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={containerRef}
          className="fixed inset-0 z-[100] flex flex-col bg-black/95"
          style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-white/70 text-sm font-medium tabular-nums">
                {index + 1} / {total}
              </span>
              {label && (
                <span className="bg-white/15 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-full">
                  {label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={zoomOut}
                className="p-2 text-white/70 hover:text-white transition-colors"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                onClick={zoomIn}
                className="p-2 text-white/70 hover:text-white transition-colors"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-white/70 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Image area */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center select-none">
            {/* Desktop arrows */}
            {!isMobile && total > 1 && (
              <>
                {index > 0 && (
                  <button
                    onClick={() => goTo(index - 1)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    aria-label="Previous"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}
                {index < total - 1 && (
                  <button
                    onClick={() => goTo(index + 1)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    aria-label="Next"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}
              </>
            )}

            <img
              src={images[index]}
              alt={label || `Image ${index + 1}`}
              className="max-w-full max-h-full object-contain transition-transform duration-150 ease-out"
              style={{
                transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
                touchAction: "none",
              }}
              draggable={false}
            />
          </div>

          {/* Bottom area */}
          <div className="shrink-0 pb-2 flex flex-col items-center gap-2">
            {/* Dot indicators */}
            {total > 1 && (
              <div className="flex items-center gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={`rounded-full transition-all duration-200 ${
                      i === index
                        ? "w-2.5 h-2.5 bg-white"
                        : "w-2 h-2 bg-white/40 hover:bg-white/60"
                    }`}
                    aria-label={`Go to image ${i + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Mobile hint */}
            {isMobile && (
              <p className="text-white/30 text-[11px] text-center">
                Pinch to zoom · Double-tap to enlarge · Swipe to navigate
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
