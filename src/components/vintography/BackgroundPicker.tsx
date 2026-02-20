import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

const PRESETS = [
  { name: "White Studio", prompt: "professional photography studio with white seamless backdrop and soft even lighting", gradient: "from-gray-100 to-white" },
  { name: "Marble Surface", prompt: "elegant white marble surface with subtle grey veining and soft directional lighting", gradient: "from-gray-200 via-white to-gray-100" },
  { name: "Wooden Table", prompt: "warm honey-toned oak wood table with natural grain texture and soft window light", gradient: "from-amber-200 via-amber-100 to-yellow-50" },
  { name: "Linen Fabric", prompt: "soft natural Belgian linen fabric surface with gentle texture and warm side lighting", gradient: "from-stone-200 via-stone-100 to-amber-50" },
  { name: "Outdoor Park", prompt: "beautiful park setting with soft green foliage bokeh and golden hour natural lighting", gradient: "from-emerald-200 via-green-100 to-lime-50" },
  { name: "City Street", prompt: "contemporary urban street with blurred architecture bokeh and natural overcast daylight", gradient: "from-slate-300 via-slate-200 to-gray-100" },
  { name: "Cozy Bedroom", prompt: "stylish modern bedroom with neutral tones and soft ambient window light", gradient: "from-orange-100 via-amber-50 to-stone-100" },
  { name: "Beach", prompt: "bright summer beach with soft golden sand and turquoise ocean bokeh in background", gradient: "from-sky-200 via-cyan-100 to-amber-100" },
] as const;

type Props = {
  value: string;
  onChange: (prompt: string) => void;
};

export function BackgroundPicker({ value, onChange }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(() => {
    const idx = PRESETS.findIndex((p) => p.prompt === value);
    return idx >= 0 ? idx : null;
  });

  // Sync selection when value changes externally
  useEffect(() => {
    const idx = PRESETS.findIndex((p) => p.prompt === value);
    setSelectedIdx(idx >= 0 ? idx : null);
  }, [value]);

  const handlePresetClick = (idx: number) => {
    setSelectedIdx(idx);
    onChange(PRESETS[idx].prompt);
  };

  const handleInputChange = (text: string) => {
    setSelectedIdx(null);
    onChange(text);
  };

  return (
    <div className="space-y-2.5">
      <Input
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder="Describe your scene..."
        className="h-9 text-xs rounded-lg"
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {PRESETS.map((preset, i) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => handlePresetClick(i)}
            className={`rounded-lg border p-2 text-left transition-all active:scale-[0.97] ${
              selectedIdx === i
                ? "border-primary ring-1 ring-primary/30 bg-primary/[0.04]"
                : "border-border hover:border-primary/30"
            }`}
          >
            <div className={`w-full h-8 rounded-md bg-gradient-to-br ${preset.gradient} mb-1.5`} />
            <p className={`text-[11px] font-semibold leading-tight ${
              selectedIdx === i ? "text-primary" : "text-foreground"
            }`}>
              {preset.name}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
