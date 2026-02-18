import { forwardRef } from "react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  User, Users, Shirt, Dumbbell, GraduationCap, Baby,
  PersonStanding, Footprints, Armchair,
  Zap, Building2, TreePine, Blocks, Home, Waves, Flower,
} from "lucide-react";

type OptionCard = { value: string; label: string; icon: typeof User; desc?: string };

const genderOptions: OptionCard[] = [
  { value: "female", label: "Female", icon: User },
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
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</p>
      <div className={`grid gap-1.5 ${cols === 2 ? "grid-cols-2" : cols === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <motion.button
              key={opt.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => onChange(opt.value)}
              className={`relative flex flex-col items-center gap-1 rounded-xl p-2.5 border text-center transition-all ${
                selected
                  ? "border-primary bg-primary/[0.06] ring-1 ring-primary/30"
                  : "border-border hover:border-primary/20 bg-background"
              }`}
            >
              <opt.icon className={`w-4 h-4 ${selected ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-[11px] font-medium leading-tight ${selected ? "text-primary" : "text-foreground"}`}>{opt.label}</span>
              {opt.desc && <span className="text-[9px] text-muted-foreground leading-tight">{opt.desc}</span>}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

type Props = {
  gender: string;
  look: string;
  pose: string;
  bg: string;
  onGenderChange: (v: string) => void;
  onLookChange: (v: string) => void;
  onPoseChange: (v: string) => void;
  onBgChange: (v: string) => void;
  showLook?: boolean;
};

export const ModelPicker = forwardRef<HTMLDivElement, Props>(
  function ModelPicker({ gender, look, pose, bg, onGenderChange, onLookChange, onPoseChange, onBgChange, showLook = true }, ref) {
    return (
      <Card ref={ref} className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Model Configuration</p>
        </div>
        <OptionGrid title="Gender" options={genderOptions} value={gender} onChange={onGenderChange} cols={2} />
        {showLook && (
          <OptionGrid title="Model Look" options={lookOptions} value={look} onChange={onLookChange} cols={3} />
        )}
        {showLook && (
          <OptionGrid title="Pose" options={poseOptions} value={pose} onChange={onPoseChange} cols={3} />
        )}
        <OptionGrid title="Background" options={bgOptions} value={bg} onChange={onBgChange} cols={4} />
      </Card>
    );
  }
);
