import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, type LucideIcon } from "lucide-react";

type Step = {
  label: string;
  path: string;
  icon: LucideIcon;
  active?: boolean;
  completed?: boolean;
};

type JourneyBannerProps = {
  title: string;
  steps: Step[];
  nextLabel: string;
  nextPath: string;
  nextIcon: LucideIcon;
};

export function JourneyBanner({ title, steps, nextLabel, nextPath, nextIcon: NextIcon }: JourneyBannerProps) {
  const navigate = useNavigate();

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card className="p-4 sm:p-5 border-primary/15 bg-gradient-to-r from-primary/[0.04] to-transparent">
        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {title}
        </p>
        {/* Step dots */}
        <div className="flex items-center gap-1 mb-4 overflow-x-auto scrollbar-hide">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => navigate(step.path)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] sm:text-xs font-medium border transition-all active:scale-95 ${
                  step.active
                    ? "bg-primary/10 text-primary border-primary/30 ring-2 ring-primary/10"
                    : step.completed
                      ? "bg-success/10 text-success border-success/30"
                      : "bg-muted/50 text-muted-foreground border-border hover:border-primary/30"
                }`}
              >
                <step.icon className="w-3 h-3" />
                {step.label}
              </button>
              {i < steps.length - 1 && (
                <ArrowRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
              )}
            </div>
          ))}
        </div>
        <Button
          onClick={() => navigate(nextPath)}
          size="sm"
          className="w-full sm:w-auto h-10 sm:h-9 font-semibold active:scale-95 transition-transform"
        >
          <NextIcon className="w-3.5 h-3.5 mr-1.5" />
          {nextLabel}
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </Card>
    </motion.div>
  );
}
