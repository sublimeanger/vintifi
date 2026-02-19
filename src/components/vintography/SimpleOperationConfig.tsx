import { Operation } from "./vintographyReducer";
import { ImageOff, Sparkles, Info } from "lucide-react";

const CONFIGS: Record<string, { icon: typeof ImageOff; title: string; desc: string; tip: string }> = {
  clean_bg: {
    icon: ImageOff,
    title: "Clean Background",
    desc: "Removes any background and replaces with pure white — the standard for Vinted listings.",
    tip: "Works best with a full-garment shot. Natural shadows are preserved for a grounded look.",
  },
  enhance: {
    icon: Sparkles,
    title: "Enhance",
    desc: "Pro retouch — fixes lighting, sharpens details, boosts colours to professional e-commerce standard.",
    tip: "Phone photos can look like studio shots. Great as the last step in any pipeline.",
  },
};

type Props = { operation: Operation };

export function SimpleOperationConfig({ operation }: Props) {
  const cfg = CONFIGS[operation];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <div className="space-y-3 py-1">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">{cfg.title}</p>
          <p className="text-xs text-muted-foreground">{cfg.desc}</p>
        </div>
      </div>
      <div className="flex items-start gap-2 rounded-xl bg-primary/[0.04] border border-primary/10 p-3">
        <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">{cfg.tip}</p>
      </div>
    </div>
  );
}
