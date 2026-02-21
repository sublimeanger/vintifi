import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, X } from "lucide-react";

interface MobileConfigDrawerProps {
  open: boolean;
  onClose: () => void;
  photoUrl: string | null;
  previousOpLabel?: string | null;
  selectedOp: string | null;
  selectedOpConfig: { label: string; credits: number } | null;
  children: React.ReactNode;
  canProcess: boolean;
  isProcessing: boolean;
  onProcess: () => void;
}

export function MobileConfigDrawer({
  open, onClose, photoUrl, previousOpLabel, selectedOpConfig,
  children, canProcess, isProcessing, onProcess,
}: MobileConfigDrawerProps) {
  useEffect(() => {
    if (!open) return;

    // Prevent body scroll and iOS rubber-banding
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            key="drawer-panel"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[60] flex flex-col max-h-[85vh] rounded-t-2xl bg-card border-t border-border shadow-2xl"
            style={{ willChange: "transform" }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header with photo preview */}
            <div className="flex items-center gap-3 px-4 pb-3">
              {photoUrl && (
                <div className="w-14 h-14 rounded-xl overflow-hidden border border-border shrink-0">
                  <img src={photoUrl} alt="Photo" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {selectedOpConfig?.label || "Configure"}
                </p>
                {previousOpLabel ? (
                  <p className="text-xs text-muted-foreground truncate">
                    Editing your {previousOpLabel} result
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Choose your options below
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 active:scale-95 transition-transform"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Divider */}
            <div className="h-px bg-border mx-4" />

            {/* Config content (children) */}
            <div className="flex-1 overflow-y-auto px-4 py-4 overscroll-contain touch-pan-y">
              {children}
            </div>

            {/* Process button — fixed at bottom of drawer */}
            <div className="px-4 pt-3 pb-[calc(5rem+env(safe-area-inset-bottom))] border-t border-border bg-card">
              <Button
                className="w-full h-14 text-base font-semibold rounded-2xl gap-2"
                disabled={!canProcess || isProcessing}
                onClick={onProcess}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-5 h-5" />
                    <span className="flex flex-col items-start leading-tight">
                      {selectedOpConfig?.label || "Process"}
                      <span className="text-[10px] font-normal opacity-70">
                        {selectedOpConfig?.credits} credit{(selectedOpConfig?.credits || 0) > 1 ? "s" : ""}
                      </span>
                    </span>
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
