import { Card } from "@/components/ui/card";
import { Paintbrush } from "lucide-react";
import { motion } from "framer-motion";

type BgOption = { value: string; label: string; color: string };

const bgOptions: BgOption[] = [
  { value: "studio", label: "Studio", color: "from-gray-100 to-gray-300" },
  { value: "wooden_floor", label: "Wooden Floor", color: "from-amber-200 to-amber-400" },
  { value: "marble", label: "Marble", color: "from-gray-50 to-slate-200" },
  { value: "outdoor", label: "Outdoor", color: "from-green-200 to-green-400" },
  { value: "vintage", label: "Vintage", color: "from-orange-100 to-amber-300" },
  { value: "concrete", label: "Concrete", color: "from-gray-300 to-gray-500" },
  { value: "linen", label: "Linen", color: "from-stone-100 to-stone-300" },
  { value: "summer", label: "Summer", color: "from-sky-200 to-yellow-200" },
  { value: "autumn", label: "Autumn", color: "from-orange-200 to-red-300" },
  { value: "winter", label: "Winter", color: "from-blue-100 to-slate-300" },
  { value: "bedroom", label: "Bedroom", color: "from-rose-100 to-stone-200" },
  { value: "cafe", label: "Café", color: "from-amber-100 to-stone-300" },
];

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export function BackgroundPicker({ value, onChange }: Props) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Paintbrush className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold">Background Scene</p>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {bgOptions.map((opt) => {
          const selected = value === opt.value;
          return (
            <motion.button
              key={opt.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => onChange(opt.value)}
              className={`flex flex-col items-center gap-1.5 rounded-xl p-2 border transition-all ${
                selected
                  ? "border-primary ring-1 ring-primary/30 bg-primary/[0.04]"
                  : "border-border hover:border-primary/20"
              }`}
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${opt.color} border border-border/50`} />
              <span className={`text-[10px] font-medium leading-tight ${selected ? "text-primary" : "text-foreground"}`}>
                {opt.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </Card>
  );
}
