import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, ShoppingBag, Crown, Palmtree } from "lucide-react";

export type Preset = {
  id: string;
  label: string;
  desc: string;
  icon: typeof Zap;
  steps: { operation: string; parameters?: Record<string, string> }[];
  tier: string;
};

export const presets: Preset[] = [
  {
    id: "marketplace_ready",
    label: "Marketplace Ready",
    desc: "Remove BG + Enhance",
    icon: ShoppingBag,
    steps: [
      { operation: "remove_bg" },
      { operation: "enhance" },
    ],
    tier: "Free",
  },
  {
    id: "lifestyle_shot",
    label: "Lifestyle Shot",
    desc: "Wooden floor BG + Enhance",
    icon: Palmtree,
    steps: [
      { operation: "smart_bg", parameters: { bg_style: "wooden_floor" } },
      { operation: "enhance" },
    ],
    tier: "Pro",
  },
  {
    id: "premium_listing",
    label: "Premium Listing",
    desc: "Model shot + Enhance",
    icon: Crown,
    steps: [
      { operation: "model_shot", parameters: { gender: "female", pose: "standing" } },
      { operation: "enhance" },
    ],
    tier: "Business",
  },
];

type Props = {
  onSelect: (preset: Preset) => void;
  disabled: boolean;
};

export function QuickPresets({ onSelect, disabled }: Props) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-4 h-4 text-accent" />
        <p className="text-sm font-semibold">Quick Presets</p>
        <Badge variant="secondary" className="text-[9px]">2-in-1</Badge>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {presets.map((p) => (
          <Card
            key={p.id}
            onClick={() => !disabled && onSelect(p)}
            className={`p-3 cursor-pointer transition-all active:scale-[0.97] hover:border-accent/40 ${disabled ? "opacity-50 pointer-events-none" : ""}`}
          >
            <div className="flex items-start justify-between mb-1.5">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <p.icon className="w-4 h-4 text-accent" />
              </div>
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{p.tier}</Badge>
            </div>
            <p className="font-semibold text-xs">{p.label}</p>
            <p className="text-[10px] text-muted-foreground">{p.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
