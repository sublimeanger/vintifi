import { motion } from "framer-motion";
import { Wind } from "lucide-react";

const OPTIONS = [
  { value: "light", label: "Light Press", sub: "Sharp packing lines only" },
  { value: "standard", label: "Steam", sub: "All storage creases gone" },
  { value: "deep", label: "Deep Press", sub: "Showroom perfect" },
];

type Props = {
  intensity: string;
  onChange: (v: string) => void;
};

export function SteamConfig({ intensity, onChange }: Props) {
  return (
    <div className="space-y-3 py-1">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Wind className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">Steam & Press</p>
          <p className="text-xs text-muted-foreground">AI-powered crease removal. Preserves fabric texture & logos.</p>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Press Intensity</p>
        <div className="grid grid-cols-3 gap-2">
          {OPTIONS.map((opt) => {
            const selected = intensity === opt.value;
            return (
              <motion.button
                key={opt.value}
                whileTap={{ scale: 0.95 }}
                onClick={() => onChange(opt.value)}
                className={`flex flex-col items-center gap-1 rounded-xl p-3 border text-center transition-all ${
                  selected
                    ? "border-primary bg-primary/[0.08] ring-1 ring-primary/30"
                    : "border-border hover:border-primary/20 bg-card"
                }`}
              >
                <span className={`text-xs font-semibold leading-tight ${selected ? "text-primary" : "text-foreground"}`}>
                  {opt.label}
                </span>
                <span className="text-[9px] text-muted-foreground leading-tight">{opt.sub}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
