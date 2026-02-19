import { useRef, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, ShoppingBag, Crown, Palmtree, Ghost, Layers, ChevronLeft, ChevronRight, Star, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type Preset = {
  id: string;
  label: string;
  desc: string;
  icon: typeof Zap;
  steps: { operation: string; parameters?: Record<string, string> }[];
  tier: string;
};

export type SavedPreset = {
  id: string;
  name: string;
  pipeline: { operation: string; params: Record<string, string> }[];
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
    desc: "Invisible mannequin — 1 step",
    icon: Ghost,
    steps: [
      { operation: "ghost_mannequin" },
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
  onLockedTap: (tierRequired: string) => void;
  disabled: boolean;
  userTier: string;
  savedPresets?: SavedPreset[];
  onSavedPresetSelect?: (preset: SavedPreset) => void;
  onDeleteSavedPreset?: (id: string) => void;
};

export function QuickPresets({ onSelect, onLockedTap, disabled, userTier, savedPresets = [], onSavedPresetSelect, onDeleteSavedPreset }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const savedScrollRef = useRef<HTMLDivElement>(null);

  const TIER_ORDER: Record<string, number> = { free: 0, pro: 1, business: 2, scale: 3 };
  const userLevel = TIER_ORDER[userTier] ?? 0;
  const isLocked = (preset: Preset): boolean => {
    const requiredLevel = TIER_ORDER[preset.tier.toLowerCase()] ?? 0;
    return userLevel < requiredLevel;
  };

  const scroll = (ref: React.RefObject<HTMLDivElement | null>, dir: "left" | "right") => {
    if (ref.current) {
      ref.current.scrollBy({ left: dir === "right" ? 160 : -160, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-3">
      {/* My Presets */}
      {savedPresets.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-accent fill-accent" />
            <p className="text-sm font-semibold">My Presets</p>
            <Badge variant="secondary" className="text-[9px]">Saved</Badge>
            <div className="ml-auto flex gap-1">
              <button
                onClick={() => scroll(savedScrollRef, "left")}
                className="w-6 h-6 rounded-md border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button
                onClick={() => scroll(savedScrollRef, "right")}
                className="w-6 h-6 rounded-md border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
          <div ref={savedScrollRef} className="w-full flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-0.5 px-0.5">
            {savedPresets.map((sp) => (
              <Card
                key={sp.id}
                onClick={() => {
                  if (disabled) return;
                  onSavedPresetSelect?.(sp);
                }}
                className={`p-3 cursor-pointer transition-all active:scale-[0.97] flex-shrink-0 w-[140px] group relative border-accent/30 hover:border-accent/60 ${
                  disabled ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                {onDeleteSavedPreset && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSavedPreset(sp.id);
                    }}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-destructive/10 text-destructive flex items-center justify-center lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
                <div className="flex items-start justify-between mb-1.5">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Star className="w-4 h-4 text-accent fill-accent" />
                  </div>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                    {sp.pipeline.length} steps
                  </Badge>
                </div>
                <p className="font-semibold text-xs truncate">{sp.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {sp.pipeline.map((s) => s.operation).join(" → ")}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Built-in Presets */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-accent" />
          <p className="text-sm font-semibold">Quick Presets</p>
          <Badge variant="secondary" className="text-[9px]">Multi-step</Badge>
          <div className="ml-auto flex gap-1">
            <button
              onClick={() => scroll(scrollRef, "left")}
              className="w-6 h-6 rounded-md border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={() => scroll(scrollRef, "right")}
              className="w-6 h-6 rounded-md border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
        <div ref={scrollRef} className="w-full flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-0.5 px-0.5">
          {presets.map((p) => (
            <Card
              key={p.id}
              onClick={() => {
                if (disabled) return;
                if (isLocked(p)) {
                  onLockedTap(p.tier.toLowerCase());
                } else {
                  onSelect(p);
                }
              }}
              className={`p-3 cursor-pointer transition-all active:scale-[0.97] flex-shrink-0 w-[140px] ${
                disabled ? "opacity-50 pointer-events-none" :
                isLocked(p) ? "opacity-60 border-border/50" :
                "hover:border-accent/40"
              }`}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <p.icon className="w-4 h-4 text-accent" />
                </div>
                <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 ${isLocked(p) ? "bg-muted text-muted-foreground" : ""}`}>
                  {isLocked(p) ? "🔒 " : ""}{p.tier}
                </Badge>
              </div>
              <p className="font-semibold text-xs">{p.label}</p>
              <p className="text-[10px] text-muted-foreground">{p.desc}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                {p.steps.reduce((sum, s) => sum + (s.operation === "model_shot" ? 4 : s.operation === "ghost_mannequin" ? 2 : 1), 0)} cr
              </p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
