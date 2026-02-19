import { motion } from "framer-motion";
import { X, Plus, ChevronRight } from "lucide-react";
import { Operation, OP_LABEL, PipelineStep, getAvailableOpsToAdd, defaultParams } from "./vintographyReducer";

type Props = {
  pipeline: PipelineStep[];
  activePipelineIndex: number;
  onSelectStep: (index: number) => void;
  onRemoveStep: (index: number) => void;
  onAddStep: (op: Operation) => void;
  flatlayLocked: boolean;
  mannequinLocked: boolean;
  aiModelLocked: boolean;
};

export function PipelineStrip({
  pipeline,
  activePipelineIndex,
  onSelectStep,
  onRemoveStep,
  onAddStep,
  flatlayLocked,
  mannequinLocked,
  aiModelLocked,
}: Props) {
  const available = getAvailableOpsToAdd(pipeline).filter((op) => {
    if (op === "flatlay" && flatlayLocked) return false;
    if (op === "mannequin" && mannequinLocked) return false;
    if (op === "ai_model" && aiModelLocked) return false;
    return true;
  });

  if (pipeline.length <= 1 && available.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Effect Pipeline · {pipeline.length} step{pipeline.length !== 1 ? "s" : ""}
      </p>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
        {pipeline.map((step, i) => {
          const isActive = i === activePipelineIndex;
          return (
            <div key={i} className="flex items-center gap-1 shrink-0">
              {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelectStep(i)}
                className={`group relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border text-xs font-medium transition-all ${
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:border-primary/30"
                }`}
              >
                <span className="text-[9px] opacity-60">#{i + 1}</span>
                {OP_LABEL[step.operation]}
                {pipeline.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveStep(i);
                    }}
                    className={`ml-0.5 rounded-full transition-colors ${
                      isActive
                        ? "text-primary/60 hover:text-primary"
                        : "text-muted-foreground/40 hover:text-muted-foreground"
                    }`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </motion.button>
            </div>
          );
        })}

        {/* + Add Effect button */}
        {available.length > 0 && (
          <div className="relative group shrink-0">
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 border border-dashed border-primary/30 text-[10px] font-semibold text-primary/70 hover:border-primary hover:text-primary transition-all bg-primary/[0.02]"
            >
              <Plus className="w-3 h-3" />
              Add Effect
            </motion.button>
            {/* Dropdown picker */}
            <div className="absolute left-0 top-full mt-1 z-50 min-w-[160px] rounded-xl border border-border bg-card shadow-lg p-1 hidden group-focus-within:block group-hover:block">
              {available.map((op) => (
                <button
                  key={op}
                  onClick={() => onAddStep(op)}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-primary/[0.06] hover:text-primary transition-colors text-left"
                >
                  {OP_LABEL[op]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
