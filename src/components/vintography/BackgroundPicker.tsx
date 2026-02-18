import { forwardRef } from "react";
import { Card } from "@/components/ui/card";
import { Paintbrush } from "lucide-react";
import { motion } from "framer-motion";

type BgOption = {
  value: string;
  label: string;
  desc: string;
  color: string; // tailwind gradient classes
};

const groups: { heading: string; options: BgOption[] }[] = [
  {
    heading: "Studio & Clean",
    options: [
      { value: "studio_white", label: "White Studio", desc: "Seamless, softbox lit", color: "from-gray-50 to-white" },
      { value: "studio_grey", label: "Grey Gradient", desc: "Mid-grey with vignette", color: "from-gray-300 to-gray-500" },
      { value: "marble_luxury", label: "White Marble", desc: "Luxury Carrara marble", color: "from-gray-100 via-slate-50 to-gray-200" },
      { value: "linen_flat", label: "Natural Linen", desc: "Warm Belgian linen", color: "from-stone-100 to-stone-300" },
    ],
  },
  {
    heading: "Indoor Lifestyle",
    options: [
      { value: "living_room_sofa", label: "Living Room", desc: "Sofa, plant, afternoon light", color: "from-amber-50 to-stone-200" },
      { value: "bedroom_mirror", label: "Bedroom Mirror", desc: "Wall mirror, morning light", color: "from-rose-50 to-stone-100" },
      { value: "kitchen_counter", label: "Kitchen / Brunch", desc: "Marble counter, coffee vibes", color: "from-stone-50 to-amber-100" },
      { value: "dressing_room", label: "Dressing Room", desc: "Clothing rail, warm bulbs", color: "from-amber-100 to-rose-100" },
      { value: "reading_nook", label: "Reading Nook", desc: "Armchair, bookshelves, lamp", color: "from-amber-200 to-amber-400" },
      { value: "bathroom_shelf", label: "Bathroom Shelf", desc: "White tiles, vanity light", color: "from-sky-50 to-slate-100" },
    ],
  },
  {
    heading: "Outdoor & Location",
    options: [
      { value: "golden_hour_park", label: "Golden Hour Park", desc: "Bokeh foliage, warm rim light", color: "from-yellow-200 to-green-200" },
      { value: "city_street", label: "City Street", desc: "Blurred urban architecture", color: "from-slate-200 to-gray-400" },
      { value: "beach_summer", label: "Beach / Summer", desc: "Sand, turquoise ocean bokeh", color: "from-sky-200 to-yellow-100" },
      { value: "brick_wall", label: "Brick Wall", desc: "Red-brown brick, editorial", color: "from-red-200 to-amber-300" },
      { value: "autumn_leaves", label: "Autumn Leaves", desc: "Golden leaves, warm ambient", color: "from-orange-200 to-red-300" },
      { value: "christmas_market", label: "Winter Market", desc: "Fairy lights, cold atmosphere", color: "from-blue-100 to-indigo-200" },
    ],
  },
];

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export const BackgroundPicker = forwardRef<HTMLDivElement, Props>(
  function BackgroundPicker({ value, onChange }, ref) {
    return (
      <Card ref={ref} className="p-4 lg:p-5 space-y-4 lg:space-y-5">
        <div className="flex items-center gap-2">
          <Paintbrush className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
          <p className="text-sm lg:text-base font-semibold">Lifestyle Scene</p>
        </div>

        {groups.map((group) => (
          <div key={group.heading}>
            <p className="text-[10px] lg:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {group.heading}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {group.options.map((opt) => {
                const selected = value === opt.value;
                return (
                  <motion.button
                    key={opt.value}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onChange(opt.value)}
                    className={`flex flex-col items-start gap-1.5 rounded-xl p-2.5 lg:p-3 border text-left transition-all ${
                      selected
                        ? "border-primary ring-1 ring-primary/30 bg-primary/[0.04]"
                        : "border-border hover:border-primary/20"
                    }`}
                  >
                    <div className={`w-full h-8 lg:h-10 rounded-lg bg-gradient-to-br ${opt.color} border border-border/50`} />
                    <div>
                      <span className={`block text-[11px] lg:text-xs font-semibold leading-tight ${selected ? "text-primary" : "text-foreground"}`}>
                        {opt.label}
                      </span>
                      <span className="block text-[9px] lg:text-[10px] text-muted-foreground leading-tight mt-0.5">
                        {opt.desc}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </Card>
    );
  }
);
