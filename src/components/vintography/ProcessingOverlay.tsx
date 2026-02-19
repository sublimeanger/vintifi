import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check } from "lucide-react";
import { OP_LABEL, Operation, PipelineStep } from "./vintographyReducer";

type Props = {
  isProcessing: boolean;
  pipeline: PipelineStep[];
  processingStepIndex: number;
  isMobile: boolean;
};

export function ProcessingOverlay({ isProcessing, pipeline, processingStepIndex, isMobile }: Props) {
  if (!isProcessing) return null;

  if (isMobile) {
    // Mobile: compact strip above the Generate button
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="flex items-center gap-3 rounded-xl bg-primary/[0.06] border border-primary/20 px-4 py-3"
        >
          <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">
              {pipeline[processingStepIndex]
                ? `Step ${processingStepIndex + 1}/${pipeline.length}: ${OP_LABEL[pipeline[processingStepIndex].operation as Operation]}`
                : "Processing…"}
            </p>
            <div className="h-1 bg-muted rounded-full mt-1.5 overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: pipeline.length > 0 ? `${((processingStepIndex + 0.5) / pipeline.length) * 100}%` : "50%" }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Desktop: checklist in the left panel
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 space-y-2"
      >
        <div className="flex items-center gap-2 mb-3">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <p className="text-sm font-semibold">Processing pipeline…</p>
        </div>
        {pipeline.map((step, i) => {
          const done = i < processingStepIndex;
          const running = i === processingStepIndex;
          return (
            <div key={i} className="flex items-center gap-2.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                done ? "bg-success" : running ? "bg-primary" : "bg-muted"
              }`}>
                {done ? (
                  <Check className="w-3 h-3 text-success-foreground" />
                ) : running ? (
                  <Loader2 className="w-3 h-3 text-primary-foreground animate-spin" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                )}
              </div>
              <span className={`text-xs ${
                done ? "text-success line-through" : running ? "text-foreground font-semibold" : "text-muted-foreground"
              }`}>
                {OP_LABEL[step.operation as Operation]}
              </span>
            </div>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
}
