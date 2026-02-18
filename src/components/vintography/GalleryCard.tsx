import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Image as ImageIcon, Trash2, Wand2, ImageOff, Paintbrush, User as UserIcon, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

export type VintographyJob = {
  id: string;
  original_url: string;
  processed_url: string | null;
  operation: string;
  status: string;
  created_at: string;
};

type Props = {
  job: VintographyJob;
  opLabel: string;
  onRestore: (job: VintographyJob) => void;
  onDelete: (id: string) => void;
  onUseAsInput?: (job: VintographyJob) => void;
};

const OP_ICONS: Record<string, typeof ImageOff> = {
  remove_bg: ImageOff,
  smart_bg: Paintbrush,
  model_shot: UserIcon,
  mannequin_shot: UserIcon,
  ghost_mannequin: UserIcon,
  flatlay_style: ImageIcon,
  enhance: Sparkles,
};

export function GalleryCard({ job, opLabel, onRestore, onDelete, onUseAsInput }: Props) {
  const [showProcessed, setShowProcessed] = useState(true);
  const hasBeforeAfter = !!job.processed_url && !!job.original_url;
  const OpIcon = OP_ICONS[job.operation] || Sparkles;

  // Mobile tap toggle
  const handleTap = () => {
    if (hasBeforeAfter) setShowProcessed((p) => !p);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group"
    >
      <Card className="overflow-hidden">
        <div
          className="relative aspect-square bg-muted/30"
          onMouseEnter={() => hasBeforeAfter && setShowProcessed(false)}
          onMouseLeave={() => setShowProcessed(true)}
          onClick={handleTap}
        >
          {/* Crossfade between original and processed */}
          {hasBeforeAfter ? (
            <>
              <img
                src={job.original_url}
                alt="Original"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${showProcessed ? "opacity-0" : "opacity-100"}`}
                loading="lazy"
              />
              <img
                src={job.processed_url!}
                alt="Processed"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${showProcessed ? "opacity-100" : "opacity-0"}`}
                loading="lazy"
              />
            </>
          ) : (
            <img
              src={job.processed_url || job.original_url}
              alt="Vintography edit"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}

          {/* Operation icon badge */}
          <div className="absolute top-1 left-1 z-10">
            <div className="w-5 h-5 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
              <OpIcon className="w-2.5 h-2.5 text-primary" />
            </div>
          </div>

          {job.status === "processing" && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          )}

          {/* Hover overlay with actions */}
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
            {job.processed_url && onUseAsInput && (
              <Button
                size="icon"
                variant="secondary"
                className="h-7 w-7 rounded-full"
                onClick={(e) => { e.stopPropagation(); onUseAsInput(job); }}
                title="Edit again"
              >
                <Wand2 className="w-3 h-3" />
              </Button>
            )}
            {job.processed_url && (
              <Button
                size="icon"
                variant="secondary"
                className="h-7 w-7 rounded-full"
                onClick={(e) => { e.stopPropagation(); onRestore(job); }}
                title="View in editor"
              >
                <ImageIcon className="w-3 h-3" />
              </Button>
            )}
            <Button
              size="icon"
              variant="destructive"
              className="h-7 w-7 rounded-full"
              onClick={(e) => { e.stopPropagation(); onDelete(job.id); }}
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>

          {/* Before/After label */}
          {hasBeforeAfter && (
            <div className="absolute bottom-1 left-1 z-10 opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-background/80 backdrop-blur-sm">
                {showProcessed ? "After" : "Before"}
              </Badge>
            </div>
          )}

          {/* Mobile tap hint */}
          {hasBeforeAfter && (
            <div className="absolute bottom-1 right-1 z-10 sm:hidden">
              <Badge variant="secondary" className="text-[7px] px-1 py-0 bg-background/60 backdrop-blur-sm">
                Tap to compare
              </Badge>
            </div>
          )}
        </div>
        <div className="p-2 lg:p-3">
          <p className="text-xs lg:text-sm font-medium truncate">{opLabel}</p>
          <p className="text-[10px] lg:text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
          </p>
        </div>
      </Card>
    </motion.div>
  );
}
