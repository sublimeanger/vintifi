import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Sparkles, Camera, ShoppingBag, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type StepId = "price-check" | "optimise" | "photos" | "inventory";

const STEPS: { id: StepId; label: string; icon: typeof Search; path: string }[] = [
  { id: "price-check", label: "Price", icon: Search, path: "/price-check" },
  { id: "optimise", label: "Optimise", icon: Sparkles, path: "/optimize" },
  { id: "photos", label: "Photos", icon: Camera, path: "/vintography" },
  { id: "inventory", label: "Inventory", icon: ShoppingBag, path: "/listings" },
];

type SellSmartProgressProps = {
  currentStep: StepId;
  className?: string;
};

export function SellSmartProgress({ currentStep, className }: SellSmartProgressProps) {
  const navigate = useNavigate();
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("flex items-center justify-between gap-1 px-2 py-2.5 sm:py-2 rounded-xl bg-muted/40 border border-border/50", className)}
    >
      {STEPS.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isFuture = i > currentIndex;
        const Icon = isCompleted ? Check : step.icon;

        return (
          <div key={step.id} className="flex items-center flex-1 min-w-0">
            {/* Step pill */}
            <button
              onClick={() => navigate(step.path)}
              className={cn(
                "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-semibold transition-all active:scale-95 whitespace-nowrap",
                isCurrent && "bg-primary text-primary-foreground shadow-sm shadow-primary/20",
                isCompleted && "bg-success/15 text-success hover:bg-success/25",
                isFuture && "text-muted-foreground hover:text-foreground hover:bg-muted/60",
              )}
            >
              <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="hidden xs:inline sm:inline">{step.label}</span>
            </button>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div className="flex-1 mx-1 h-px min-w-[8px]">
                <div
                  className={cn(
                    "h-full rounded-full transition-colors",
                    i < currentIndex ? "bg-success/40" : "bg-border",
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </motion.div>
  );
}
