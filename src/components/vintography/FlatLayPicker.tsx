import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Minimize2, Sparkles, Sun } from "lucide-react";

type FlatLayOption = { value: string; label: string; desc: string; icon: typeof Minimize2 };

const options: FlatLayOption[] = [
  { value: "minimal", label: "Minimal", desc: "Clean, no props", icon: Minimize2 },
  { value: "styled", label: "Styled", desc: "With accessories", icon: Sparkles },
  { value: "seasonal", label: "Seasonal", desc: "Themed elements", icon: Sun },
];

type Props = { value: string; onChange: (v: string) => void };

export function FlatLayPicker({ value, onChange }: Props) {
  return (
    <Card className="p-4">
      <p className="text-sm font-semibold mb-3">Flat-Lay Style</p>
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <motion.button
              key={opt.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => onChange(opt.value)}
              className={`flex flex-col items-center gap-1 rounded-xl p-3 border transition-all ${
                selected
                  ? "border-primary ring-1 ring-primary/30 bg-primary/[0.06]"
                  : "border-border hover:border-primary/20"
              }`}
            >
              <opt.icon className={`w-5 h-5 ${selected ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-xs font-medium ${selected ? "text-primary" : "text-foreground"}`}>{opt.label}</span>
              <span className="text-[9px] text-muted-foreground">{opt.desc}</span>
            </motion.button>
          );
        })}
      </div>
    </Card>
  );
}
