import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ChevronRight, ChevronLeft, User as UserIcon, Users, Shirt, Dumbbell, PersonStanding, Footprints, Armchair, Zap, Building2, TreePine, Blocks, Home, Waves, Flower, GraduationCap, Baby } from "lucide-react";

type OptionCard = { value: string; label: string; icon: typeof UserIcon; desc?: string };

const genderOptions: OptionCard[] = [
  { value: "female", label: "Female", icon: UserIcon },
  { value: "male", label: "Male", icon: Users },
];
const lookOptions: OptionCard[] = [
  { value: "classic", label: "Classic", icon: Shirt, desc: "Clean-cut, neutral" },
  { value: "editorial", label: "Editorial", icon: GraduationCap, desc: "High-fashion" },
  { value: "streetwear", label: "Streetwear", icon: Blocks, desc: "Urban, casual" },
  { value: "athletic", label: "Athletic", icon: Dumbbell, desc: "Sporty, fit" },
  { value: "mature", label: "Mature", icon: Users, desc: "35-45 range" },
  { value: "youthful", label: "Youthful", icon: Baby, desc: "18-25 range" },
];
const poseOptions: OptionCard[] = [
  { value: "standing_front", label: "Front", icon: PersonStanding, desc: "Facing camera" },
  { value: "standing_angled", label: "Angled", icon: PersonStanding, desc: "3/4 view" },
  { value: "walking", label: "Walking", icon: Footprints, desc: "Mid-stride" },
  { value: "casual_leaning", label: "Leaning", icon: PersonStanding, desc: "Casual lean" },
  { value: "seated", label: "Seated", icon: Armchair, desc: "On stool" },
  { value: "action", label: "Action", icon: Zap, desc: "Dynamic" },
];
const shotStyles = [
  { value: "editorial", label: "Editorial", desc: "Polished campaign look" },
  { value: "natural_photo", label: "Natural Photo", desc: "Photorealistic, on-location" },
  { value: "street_style", label: "Street Style", desc: "Candid, authentic energy" },
];
const bgOptions: OptionCard[] = [
  { value: "studio", label: "White Studio", icon: Building2, desc: "Clean & minimal" },
  { value: "grey_gradient", label: "Grey Studio", icon: Building2, desc: "Soft gradient" },
  { value: "living_room", label: "Living Room", icon: Home, desc: "Sofa, afternoon light" },
  { value: "urban", label: "City Street", icon: Building2, desc: "Urban architecture" },
  { value: "park", label: "Golden Park", icon: TreePine, desc: "Bokeh foliage" },
  { value: "brick", label: "Brick Wall", icon: Blocks, desc: "Editorial feel" },
  { value: "dressing_room", label: "Dressing Room", icon: Flower, desc: "Rail, warm bulbs" },
  { value: "beach", label: "Beach / Summer", icon: Waves, desc: "Sand, ocean bokeh" },
];

function OptionGrid({ title, options, value, onChange, cols = 3 }: {
  title: string;
  options: OptionCard[];
  value: string;
  onChange: (v: string) => void;
  cols?: number;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</p>
      <div className={`grid gap-1.5 ${cols === 2 ? "grid-cols-2" : cols === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <motion.button
              key={opt.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => onChange(opt.value)}
              className={`flex flex-col items-center gap-1 rounded-xl p-2.5 border text-center transition-all ${
                selected
                  ? "border-primary bg-primary/[0.06] ring-1 ring-primary/30"
                  : "border-border hover:border-primary/20 bg-card"
              }`}
            >
              <opt.icon className={`w-4 h-4 ${selected ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-[11px] font-medium leading-tight ${selected ? "text-primary" : "text-foreground"}`}>
                {opt.label}
              </span>
              {opt.desc && (
                <span className="text-[9px] text-muted-foreground leading-tight">{opt.desc}</span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export type ModelParams = {
  gender: string;
  look: string;
  pose: string;
  bg: string;
  shot_style: string;
  full_body: boolean;
};

type Props = {
  params: ModelParams;
  onChange: (p: Partial<ModelParams>) => void;
};

const STEP_LABELS = ["Gender & Style", "Pose & Background", "Review"];

export function ModelShotWizard({ params, onChange }: Props) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const goTo = (s: number) => {
    setDirection(s > step ? 1 : -1);
    setStep(s);
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div className="space-y-3 py-1">
      {/* Step indicator */}
      <div className="flex items-center gap-1.5">
        {STEP_LABELS.map((label, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`flex items-center gap-1.5 ${i < step ? "cursor-pointer" : "cursor-default"}`}
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
              i === step
                ? "bg-primary text-primary-foreground"
                : i < step
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            }`}>
              {i + 1}
            </div>
            <span className={`text-[10px] font-medium hidden sm:block ${i === step ? "text-foreground" : "text-muted-foreground"}`}>
              {label}
            </span>
            {i < STEP_LABELS.length - 1 && (
              <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
            )}
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          {step === 0 && (
            <motion.div
              key="step0"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <OptionGrid title="Gender" options={genderOptions} value={params.gender} onChange={(v) => onChange({ gender: v })} cols={2} />
              <OptionGrid title="Model Look" options={lookOptions} value={params.look} onChange={(v) => onChange({ look: v })} cols={3} />
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Shot Style</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {shotStyles.map((s) => {
                    const sel = params.shot_style === s.value;
                    return (
                      <motion.button
                        key={s.value}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onChange({ shot_style: s.value })}
                        className={`flex flex-col items-center gap-1 rounded-xl p-2.5 border text-center transition-all ${
                          sel ? "border-primary bg-primary/[0.06] ring-1 ring-primary/30" : "border-border hover:border-primary/20 bg-card"
                        }`}
                      >
                        <span className={`text-[11px] font-semibold leading-tight ${sel ? "text-primary" : "text-foreground"}`}>{s.label}</span>
                        <span className="text-[9px] text-muted-foreground leading-tight">{s.desc}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <OptionGrid title="Pose" options={poseOptions} value={params.pose} onChange={(v) => onChange({ pose: v })} cols={3} />
              <OptionGrid title="Background" options={bgOptions} value={params.bg} onChange={(v) => onChange({ bg: v })} cols={4} />
              <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5 border border-border">
                <div>
                  <p className="text-xs font-semibold">Always show full garment</p>
                  <p className="text-[10px] text-muted-foreground">Guarantees neckline-to-hem visibility</p>
                </div>
                <Switch
                  checked={params.full_body}
                  onCheckedChange={(v) => onChange({ full_body: v })}
                />
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 space-y-2">
                <p className="text-sm font-semibold">Your AI Model Shot</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  {[
                    ["Gender", params.gender],
                    ["Look", params.look],
                    ["Shot Style", params.shot_style],
                    ["Pose", params.pose],
                    ["Background", params.bg],
                    ["Full Garment", params.full_body ? "Yes" : "No"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium capitalize">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                4 credits will be deducted. AI models may not reproduce exact logos or prints.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Wizard navigation */}
      <div className="flex items-center gap-2 pt-1">
        {step > 0 && (
          <Button variant="outline" size="sm" onClick={() => goTo(step - 1)} className="h-9 gap-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
        )}
        {step < 2 && (
          <Button size="sm" onClick={() => goTo(step + 1)} className="flex-1 h-9 gap-1">
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
