import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Package, Zap, Layers, User as UserIcon, Sparkles } from "lucide-react";
import { ItemPickerDialog } from "@/components/ItemPickerDialog";

type Props = {
  itemId: string | null;
  linkedItemTitle: string;
  onFilesSelected: (files: FileList) => void;
};

const PRESETS = [
  {
    id: "enhance",
    label: "Marketplace Ready",
    desc: "Remove BG + Enhance",
    icon: Sparkles,
    tier: null,
  },
  {
    id: "flatlay",
    label: "Flat-Lay Pro",
    desc: "Pro flat-lay shot",
    icon: Layers,
    tier: "Pro",
  },
  {
    id: "ai_model",
    label: "AI Model Shot",
    desc: "Virtual model wearing your item",
    icon: UserIcon,
    tier: "Business",
  },
];

export function EmptyState({ itemId, linkedItemTitle, onFilesSelected }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <Card
        className="border-2 border-dashed border-primary/30 hover:border-primary/60 transition-colors p-8 sm:p-12 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length > 0) onFilesSelected(e.dataTransfer.files);
        }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Camera className="w-7 h-7 text-primary" />
          </div>
          <div>
            {itemId && linkedItemTitle ? (
              <>
                <p className="font-display font-bold text-base sm:text-xl">No photos yet</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Upload the first photo for{" "}
                  <span className="font-semibold text-foreground">{linkedItemTitle}</span>
                </p>
              </>
            ) : (
              <>
                <p className="font-display font-bold text-xl sm:text-2xl">
                  Transform your Vinted photos
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Professional listings get 3× more views.
                </p>
              </>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button
              size="lg"
              className="h-12 px-8 text-sm active:scale-95 transition-transform"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="w-4 h-4 mr-2" /> Choose Photos
            </Button>
            {!itemId && (
              <ItemPickerDialog
                onSelect={(picked) => {
                  navigate(`/vintography?itemId=${picked.id}`, { replace: true });
                }}
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 text-sm active:scale-95 transition-transform"
                >
                  <Package className="w-4 h-4 mr-2" /> From My Items
                </Button>
              </ItemPickerDialog>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) onFilesSelected(e.target.files);
          }}
        />
      </Card>

      {/* Quick Presets strip */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
          <Zap className="w-3 h-3" /> Popular presets — select one, then upload
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {PRESETS.map((preset) => (
            <Card
              key={preset.id}
              onClick={() => fileInputRef.current?.click()}
              className="p-3 cursor-pointer hover:border-primary/40 transition-all active:scale-[0.97] flex-shrink-0 w-[160px] text-left"
            >
              <div className="flex items-start justify-between mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <preset.icon className="w-3.5 h-3.5 text-primary" />
                </div>
                {preset.tier && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                    {preset.tier}
                  </Badge>
                )}
              </div>
              <p className="font-semibold text-xs">{preset.label}</p>
              <p className="text-[10px] text-muted-foreground">{preset.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
