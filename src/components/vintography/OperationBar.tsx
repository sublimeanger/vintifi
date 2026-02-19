import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  ImageOff, Paintbrush, Layers, Package, User as UserIcon,
  Sparkles, Wind, Lock, ChevronLeft, ChevronRight,
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (activeOp && buttonRefs.current[activeOp]) {
      buttonRefs.current[activeOp]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeOp]);

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === "right" ? 160 : -160, behavior: "smooth" });
    }
  };

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
    <div className="w-full">
      <div ref={scrollRef} className="w-full flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-0.5 px-0.5 lg:flex-wrap lg:overflow-visible">
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
              ref={(el) => { buttonRefs.current[op.id] = el; }}
              whileTap={{ scale: 0.93 }}
              onClick={handleClick}
              className={`relative flex-shrink-0 lg:flex-shrink flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-2 border transition-all min-w-[64px] lg:min-w-0 lg:flex-1 lg:basis-[calc(25%-6px)] ${
                op.locked
                  ? "border-border/50 opacity-60 bg-muted/30"
                  : isActive
                  ? "border-primary bg-primary/[0.08] ring-1 ring-primary/30 shadow-sm"
                  : "border-border hover:border-primary/30 bg-card"
              }`}
            >
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
              {op.tierLabel ? (
                <span className="text-[8px] leading-none font-semibold text-primary/80 bg-primary/10 rounded px-1 py-0.5">
                  {op.tierLabel}
                </span>
              ) : (
                <span
                  className={`text-[9px] leading-none ${
                    isActive ? "text-primary/70" : "text-muted-foreground"
                  }`}
                >
                  {op.creditCost === 4 ? "4 cr" : "1 cr"}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
