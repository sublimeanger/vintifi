import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Image as ImageIcon, Trash2 } from "lucide-react";
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
};

export function GalleryCard({ job, opLabel, onRestore, onDelete }: Props) {
  const [showProcessed, setShowProcessed] = useState(true);
  const hasBeforeAfter = !!job.processed_url && !!job.original_url;

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

          {job.status === "processing" && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          )}

          {/* Hover overlay with actions */}
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            {job.processed_url && (
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 rounded-full"
                onClick={() => onRestore(job)}
              >
                <ImageIcon className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              size="icon"
              variant="destructive"
              className="h-8 w-8 rounded-full"
              onClick={() => onDelete(job.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Before/After label on hover */}
          {hasBeforeAfter && (
            <div className="absolute bottom-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[9px] font-semibold bg-background/80 backdrop-blur-sm px-1.5 py-0.5 rounded">
                {showProcessed ? "After" : "Before"}
              </span>
            </div>
          )}
        </div>
        <div className="p-2">
          <p className="text-xs font-medium truncate">{opLabel}</p>
          <p className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
          </p>
        </div>
      </Card>
    </motion.div>
  );
}
