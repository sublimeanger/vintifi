import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "vintifi_tour_completed";

type TourStep = {
  targetId: string;
  title: string;
  description: string;
};

const TOUR_STEPS: TourStep[] = [
  {
    targetId: "tour-price-check",
    title: "Price Intelligence Engine",
    description: "Paste any Vinted URL here to get AI-powered pricing intelligence in seconds.",
  },
  {
    targetId: "tour-listings",
    title: "My Listings",
    description: "Track all your active listings, views, favourites, and health scores here.",
  },
  {
    targetId: "tour-trends",
    title: "Trend Radar",
    description: "Discover rising brands and styles before they peak.",
  },
  {
    targetId: "tour-arbitrage",
    title: "Arbitrage Scanner",
    description: "Find profitable buy-low-sell-high opportunities across platforms.",
  },
];

type Position = { top: number; left: number; width: number; height: number };

export function GuidedTour() {
  const isMobile = useIsMobile();
  const { profile, user, refreshProfile } = useAuth();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [pos, setPos] = useState<Position | null>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (isMobile || !profile || !user) return;
    // Check DB first (authoritative), localStorage as fast cache
    if (profile.tour_completed || localStorage.getItem(STORAGE_KEY)) {
      // Ensure localStorage is in sync
      localStorage.setItem(STORAGE_KEY, "true");
      return;
    }
    const timer = setTimeout(() => setActive(true), 600);
    return () => clearTimeout(timer);
  }, [isMobile, profile, user]);

  const updatePosition = useCallback(() => {
    if (!active) return;
    const el = document.getElementById(TOUR_STEPS[step].targetId);
    if (el) {
      const rect = el.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [active, step]);

  useEffect(() => {
    updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [updatePosition]);

  const finish = useCallback(async () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setActive(false);
    if (user) {
      await supabase
        .from("profiles")
        .update({ tour_completed: true } as any)
        .eq("user_id", user.id);
      refreshProfile();
    }
  }, [user, refreshProfile]);

  const next = () => {
    if (step < TOUR_STEPS.length - 1) setStep(step + 1);
    else finish();
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  if (!active || !pos) return null;

  const currentStep = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  // Position tooltip below target, centered
  const tooltipStyle: React.CSSProperties = {
    position: "fixed",
    top: pos.top + pos.height + 12,
    left: Math.max(12, Math.min(pos.left + pos.width / 2 - 160, window.innerWidth - 332)),
    zIndex: 10001,
    width: 320,
  };

  // If tooltip would go off-screen bottom, put it above
  if (pos.top + pos.height + 200 > window.innerHeight) {
    tooltipStyle.top = pos.top - 12;
    (tooltipStyle as any).transform = "translateY(-100%)";
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[10000] transition-opacity"
        onClick={finish}
      />
      {/* Highlight cutout */}
      <div
        className="fixed z-[10000] rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-background pointer-events-none transition-all duration-300"
        style={{
          top: pos.top - 4,
          left: pos.left - 4,
          width: pos.width + 8,
          height: pos.height + 8,
        }}
      />
      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          style={tooltipStyle}
        >
          <Card className="p-4 shadow-xl border-primary/20">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h4 className="font-display font-bold text-sm">{currentStep.title}</h4>
              </div>
              <button onClick={finish} className="text-muted-foreground hover:text-foreground p-0.5">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{currentStep.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {step + 1} of {TOUR_STEPS.length}
              </span>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <Button variant="ghost" size="sm" onClick={back} className="h-8 text-xs">
                    <ChevronLeft className="w-3 h-3 mr-1" /> Back
                  </Button>
                )}
                <Button size="sm" onClick={next} className="h-8 text-xs font-semibold">
                  {isLast ? "Got it!" : "Next"} {!isLast && <ChevronRight className="w-3 h-3 ml-1" />}
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>
    </>,
    document.body
  );
}
