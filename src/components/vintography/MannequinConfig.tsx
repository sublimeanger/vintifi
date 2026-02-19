import { motion } from "framer-motion";
import { Package, PersonStanding, Ghost, ShirtIcon, User as UserIcon, Sun, Zap, Wind } from "lucide-react";

const MANNEQUIN_TYPES = [
  { value: "headless", label: "Headless", desc: "Classic retail, no head", icon: PersonStanding },
  { value: "ghost", label: "Ghost / Invisible", desc: "Garment floats 3D", icon: Ghost },
  { value: "dress_form", label: "Dress Form", desc: "Tailor's dummy", icon: ShirtIcon },
  { value: "half_body", label: "Half Body", desc: "Waist-up, tops", icon: UserIcon },
];

const MANNEQUIN_LIGHTINGS = [
  { value: "soft_studio", label: "Soft Studio", desc: "Even, clean", icon: Sun },
  { value: "dramatic", label: "Dramatic", desc: "Single key, editorial", icon: Zap },
  { value: "natural", label: "Natural Light", desc: "Window light, warm", icon: Wind },
];

const MANNEQUIN_BACKGROUNDS = [
  { value: "studio", label: "White Studio", desc: "Clean & minimal" },
  { value: "grey_gradient", label: "Grey Studio", desc: "Soft gradient" },
  { value: "living_room", label: "Living Room", desc: "Lifestyle warmth" },
  { value: "dressing_room", label: "Dressing Room", desc: "Rail, warm bulbs" },
  { value: "brick", label: "Brick Wall", desc: "Editorial feel" },
  { value: "flat_marble", label: "Marble Surface", desc: "Luxury aesthetic" },
  { value: "park", label: "Park / Outdoor", desc: "Natural greenery" },
];

type Props = {
  mannequinType: string;
  lighting: string;
  bg: string;
  onTypeChange: (v: string) => void;
  onLightingChange: (v: string) => void;
  onBgChange: (v: string) => void;
};

function SegmentPicker<T extends { value: string; label: string; desc: string; icon?: typeof Sun }>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: T[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
      <div className={`grid gap-2 ${options.length <= 3 ? `grid-cols-${options.length}` : "grid-cols-2"}`}>
        {options.map((opt) => {
          const selected = value === opt.value;
          const Icon = (opt as any).icon;
          return (
            <motion.button
              key={opt.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => onChange(opt.value)}
              className={`flex flex-col items-center gap-1 rounded-xl p-2.5 border text-center transition-all ${
                selected
                  ? "border-primary bg-primary/[0.08] ring-1 ring-primary/30"
                  : "border-border hover:border-primary/20 bg-card"
              }`}
            >
              {Icon && <Icon className={`w-4 h-4 ${selected ? "text-primary" : "text-muted-foreground"}`} />}
              <span className={`text-[11px] font-semibold leading-tight ${selected ? "text-primary" : "text-foreground"}`}>
                {opt.label}
              </span>
              <span className="text-[9px] text-muted-foreground leading-tight">{opt.desc}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export function MannequinConfig({ mannequinType, lighting, bg, onTypeChange, onLightingChange, onBgChange }: Props) {
  return (
    <div className="space-y-4 py-1">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Package className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">Mannequin Shot</p>
          <p className="text-xs text-muted-foreground">Professional retail display. No model needed.</p>
        </div>
      </div>

      <SegmentPicker label="Mannequin Type" options={MANNEQUIN_TYPES} value={mannequinType} onChange={onTypeChange} />
      <SegmentPicker label="Lighting" options={MANNEQUIN_LIGHTINGS} value={lighting} onChange={onLightingChange} />

      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Background / Setting</p>
        <div className="grid grid-cols-3 gap-1.5">
          {MANNEQUIN_BACKGROUNDS.map((mbg) => {
            const selected = bg === mbg.value;
            return (
              <motion.button
                key={mbg.value}
                whileTap={{ scale: 0.95 }}
                onClick={() => onBgChange(mbg.value)}
                className={`flex flex-col items-center gap-1 rounded-xl p-2 border text-center transition-all ${
                  selected
                    ? "border-primary bg-primary/[0.06] ring-1 ring-primary/30"
                    : "border-border hover:border-primary/20 bg-card"
                }`}
              >
                <span className={`text-[10px] font-semibold leading-tight ${selected ? "text-primary" : "text-foreground"}`}>
                  {mbg.label}
                </span>
                <span className="text-[8px] text-muted-foreground leading-tight">{mbg.desc}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
