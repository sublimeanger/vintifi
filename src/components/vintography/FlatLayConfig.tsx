import { motion } from "framer-motion";
import { Layers } from "lucide-react";

const OPTIONS = [
  { value: "minimal_white", label: "Clean White", desc: "No props, pure product focus" },
  { value: "styled_accessories", label: "With Accessories", desc: "Sunglasses, watch, wallet" },
  { value: "seasonal_props", label: "Seasonal Styled", desc: "Flowers, leaves, botanicals" },
  { value: "denim_denim", label: "Denim Surface", desc: "Indigo denim texture below" },
  { value: "wood_grain", label: "Wood Surface", desc: "Warm oak overhead shot" },
];

type Props = {
  style: string;
  onChange: (v: string) => void;
};

export function FlatLayConfig({ style, onChange }: Props) {
  return (
    <div className="space-y-3 py-1">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Layers className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">Flat-Lay Pro</p>
          <p className="text-xs text-muted-foreground">Professional overhead flat-lay shot.</p>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Style</p>
        <div className="grid grid-cols-2 gap-2">
          {OPTIONS.map((opt) => {
            const selected = style === opt.value;
            return (
              <motion.button
                key={opt.value}
                whileTap={{ scale: 0.95 }}
                onClick={() => onChange(opt.value)}
                className={`flex flex-col items-start gap-0.5 rounded-xl p-3 border text-left transition-all ${
                  selected
                    ? "border-primary bg-primary/[0.08] ring-1 ring-primary/30"
                    : "border-border hover:border-primary/20 bg-card"
                }`}
              >
                <span className={`text-xs font-semibold leading-tight ${selected ? "text-primary" : "text-foreground"}`}>
                  {opt.label}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
