import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  ImageOff, Paintbrush, Layers, Package, User as UserIcon,
  Sparkles, Wind, Lock,
} from "lucide-react";
import { Operation, OP_LABEL, getOperationCreditCost } from "./vintographyReducer";

type OpConfig = {
  id: Operation;
  icon: typeof ImageOff;
  creditCost: number;
  locked: boolean;
  tierLabel?: string;
};

type Props = {
  pipeline: { operation: Operation }[];
  activePipelineIndex: number;
  flatlayLocked: boolean;
  mannequinLocked: boolean;
  aiModelLocked: boolean;
  onSelect: (op: Operation) => void;
  onLockedTap: (op: "flatlay" | "mannequin" | "ai_model") => void;
};

const OP_ICONS: Record<Operation, typeof ImageOff> = {
  clean_bg: ImageOff,
  lifestyle_bg: Paintbrush,
  flatlay: Layers,
  mannequin: Package,
  ai_model: UserIcon,
  enhance: Sparkles,
  decrease: Wind,
};

export function OperationBar({
  pipeline,
  activePipelineIndex,
  flatlayLocked,
  mannequinLocked,
  aiModelLocked,
  onSelect,
  onLockedTap,
}: Props) {
  const activeOp = pipeline[activePipelineIndex]?.operation;

  const operations: OpConfig[] = [
    { id: "clean_bg", icon: ImageOff, creditCost: 1, locked: false },
    { id: "enhance", icon: Sparkles, creditCost: 1, locked: false },
    { id: "decrease", icon: Wind, creditCost: 1, locked: false },
    { id: "lifestyle_bg", icon: Paintbrush, creditCost: 1, locked: false },
    { id: "flatlay", icon: Layers, creditCost: 1, locked: flatlayLocked, tierLabel: "Pro" },
    { id: "mannequin", icon: Package, creditCost: 1, locked: mannequinLocked, tierLabel: "Pro" },
    { id: "ai_model", icon: UserIcon, creditCost: 4, locked: aiModelLocked, tierLabel: "Business" },
  ];

  return (
    <div className="w-full flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-0.5 px-0.5">
      {operations.map((op) => {
        const Icon = OP_ICONS[op.id];
        const isActive = op.id === activeOp;

        const handleClick = () => {
          if (op.locked) {
            onLockedTap(op.id as "flatlay" | "mannequin" | "ai_model");
          } else {
            onSelect(op.id);
          }
        };

        return (
          <motion.button
            key={op.id}
            whileTap={{ scale: 0.93 }}
            onClick={handleClick}
            className={`relative flex-shrink-0 flex flex-col items-center gap-1 rounded-xl px-3 py-2.5 border transition-all min-w-[72px] ${
              op.locked
                ? "border-border/50 opacity-60 bg-muted/30"
                : isActive
                ? "border-primary bg-primary/[0.08] ring-1 ring-primary/30 shadow-sm"
                : "border-border hover:border-primary/30 bg-card"
            }`}
          >
            {/* Lock badge */}
            {op.locked && (
              <div className="absolute -top-1.5 -right-1.5 z-10">
                <div className="w-4 h-4 rounded-full bg-muted border border-border flex items-center justify-center">
                  <Lock className="w-2 h-2 text-muted-foreground" />
                </div>
              </div>
            )}

            {/* Tier badge (unlocked but premium) */}
            {!op.locked && op.tierLabel && (
              <div className="absolute -top-1.5 -right-1.5 z-10">
                <Badge className="text-[8px] px-1 py-0 h-3.5 leading-none bg-primary text-primary-foreground">
                  {op.tierLabel}
                </Badge>
              </div>
            )}

            <Icon
              className={`w-4 h-4 ${
                op.locked
                  ? "text-muted-foreground"
                  : isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            />
            <span
              className={`text-[10px] font-semibold leading-tight text-center whitespace-nowrap ${
                isActive ? "text-primary" : "text-foreground"
              }`}
            >
              {OP_LABEL[op.id]}
            </span>
            <span
              className={`text-[9px] leading-none ${
                isActive ? "text-primary/70" : "text-muted-foreground"
              }`}
            >
              {op.creditCost === 4 ? "4 cr" : "1 cr"}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
