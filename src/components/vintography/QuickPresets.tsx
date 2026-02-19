import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, ShoppingBag, Crown, Palmtree, Ghost, Layers } from "lucide-react";

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
      { operation: "model_shot", parameters: { gender: "female", pose: "standing_front", model_look: "classic", model_bg: "studio" } },
      { operation: "enhance" },
    ],
    tier: "Business",
  },
  {
    id: "ghost_to_clean",
    label: "Ghost to Clean",
    desc: "Ghost Mannequin + Remove BG",
    icon: Ghost,
    steps: [
      { operation: "ghost_mannequin" },
      { operation: "remove_bg" },
    ],
    tier: "Pro",
  },
  {
    id: "full_studio",
    label: "Full Studio",
    desc: "Remove BG + Smart BG + Enhance",
    icon: Layers,
    steps: [
      { operation: "remove_bg" },
      { operation: "smart_bg", parameters: { bg_style: "studio" } },
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
        <Badge variant="secondary" className="text-[9px]">Multi-step</Badge>
      </div>
      <div className="w-full flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-0.5 px-0.5">
        {presets.map((p) => (
          <Card
            key={p.id}
            onClick={() => !disabled && onSelect(p)}
            className={`p-3 cursor-pointer transition-all active:scale-[0.97] hover:border-accent/40 flex-shrink-0 w-[140px] ${disabled ? "opacity-50 pointer-events-none" : ""}`}
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
