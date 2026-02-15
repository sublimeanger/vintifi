import { useState, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Lightbulb, ChevronDown, CheckCircle2, type LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UseCaseSpotlightProps {
  featureKey: string;
  icon: LucideIcon;
  scenario: string;
  description: string;
  outcome: string;
  tip?: string;
}

export function UseCaseSpotlight({
  featureKey,
  icon: Icon,
  scenario,
  description,
  outcome,
  tip,
}: UseCaseSpotlightProps) {
  const dismissKey = `spotlight_dismissed_${featureKey}`;
  const seenKey = `spotlight_seen_${featureKey}`;

  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(dismissKey) === "true"; } catch { return false; }
  });

  const [open, setOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(seenKey, "true"); } catch {}
  }, [seenKey]);

  if (dismissed) return null;

  const handleDismiss = () => {
    try { localStorage.setItem(dismissKey, "true"); } catch {}
    setDismissed(true);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-6">
      <div className="rounded-xl border-l-2 border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left group">
            <div className="flex items-center gap-2.5">
              <Lightbulb className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-semibold">When to use this</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="px-4 pb-4 space-y-3"
              >
                <div className="flex items-start gap-2.5">
                  <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-semibold leading-snug">{scenario}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                    <p className="text-sm text-success font-medium leading-relaxed">✓ {outcome}</p>
                    {tip && (
                      <p className="text-xs text-muted-foreground italic">💡 Pro tip: {tip}</p>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground w-full"
                  onClick={handleDismiss}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1.5" />
                  Got it, don't show again
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
