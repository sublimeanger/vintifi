import { useState } from "react";
import { type Easing, motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HealthScoreMini } from "@/components/HealthScoreGauge";
import {
  Copy, Check, Download, ExternalLink, Package,
  Sparkles, ImageIcon, Hash, Type, FileText,
} from "lucide-react";

type Listing = {
  id: string;
  title: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  size: string | null;
  condition: string | null;
  status: string;
  current_price: number | null;
  recommended_price: number | null;
  health_score: number | null;
  image_url: string | null;
  images: unknown;
  vinted_url: string | null;
  last_optimised_at: string | null;
  last_photo_edit_at: string | null;
  last_price_check_at: string | null;
};

interface VintedReadyPackProps {
  item: Listing;
  onOptimise: () => void;
  onPhotoStudio: () => void;
}

function extractHashtags(description: string): { cleanDescription: string; hashtags: string[] } {
  const hashtagRegex = /#[\w]+/g;
  const hashtags = description.match(hashtagRegex) || [];
  const cleanDescription = description
    .split("\n")
    .filter((line) => !line.trim().match(/^(#[\w]+\s*)+$/))
    .join("\n")
    .trim();
  return { cleanDescription, hashtags: [...new Set(hashtags)] };
}

function getAllImages(item: Listing): string[] {
  const all: string[] = [];
  if (item.image_url) all.push(item.image_url);
  if (Array.isArray(item.images)) {
    for (const img of item.images as any[]) {
      const u = typeof img === "string" ? img : img?.url;
      if (u && !all.includes(u)) all.push(u);
    }
  }
  return all;
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const easeOut: Easing = [0, 0, 0.2, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeOut } },
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`h-7 text-xs gap-1.5 transition-all ${copied ? "text-success" : ""}`}
      onClick={handleCopy}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

export function VintedReadyPack({ item, onOptimise, onPhotoStudio }: VintedReadyPackProps) {
  const [downloading, setDownloading] = useState(false);

  const isReady = !!item.last_optimised_at;
  const hasPhotos = !!item.image_url || (Array.isArray(item.images) && (item.images as any[]).length > 0);

  if (!isReady) return null;

  const { cleanDescription, hashtags } = item.description
    ? extractHashtags(item.description)
    : { cleanDescription: "", hashtags: [] };

  const allImages = getAllImages(item);

  const fullListingText = [
    item.title,
    cleanDescription,
    hashtags.length > 0 ? hashtags.join(" ") : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const handleDownloadAll = async () => {
    if (allImages.length === 0) return;
    setDownloading(true);
    for (let i = 0; i < allImages.length; i++) {
      try {
        const res = await fetch(allImages[i]);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `vintifi-${item.title.slice(0, 20).replace(/\s+/g, "-")}-${i + 1}.png`;
        a.click();
        URL.revokeObjectURL(url);
        await new Promise((r) => setTimeout(r, 300));
      } catch {}
    }
    setDownloading(false);
    toast.success("All photos downloaded!");
  };

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="gradient-border rounded-xl"
    >
      <div className="rounded-xl bg-card p-4 sm:p-6 space-y-5">
        {/* ── Header ── */}
        <motion.div variants={fadeUp} className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center">
              <Package className="w-6 h-6 text-success" />
            </div>
            {/* Celebration sparkles */}
            <motion.div
              className="absolute -top-1 -right-1"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
            >
              <Sparkles className="w-4 h-4 text-accent" />
            </motion.div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg font-bold tracking-tight">
              Ready to Post
            </h3>
            <p className="text-xs text-muted-foreground">
              Copy everything below and paste straight into Vinted
            </p>
          </div>
          {item.health_score != null && (
            <div className="shrink-0">
              <HealthScoreMini score={item.health_score} />
            </div>
          )}
        </motion.div>

        {/* ── Title Section ── */}
        <motion.div variants={fadeUp} className="rounded-lg border border-border bg-background/60 p-3.5">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Type className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase tracking-wider font-semibold">Title</span>
            </div>
            <CopyButton text={item.title} label="Title" />
          </div>
          <p className="text-sm font-semibold leading-snug">{item.title}</p>
        </motion.div>

        {/* ── Description Section ── */}
        {cleanDescription && (
          <motion.div variants={fadeUp} className="rounded-lg border border-border bg-background/60 p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <FileText className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase tracking-wider font-semibold">Description</span>
              </div>
              <CopyButton text={cleanDescription} label="Description" />
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-28 overflow-y-auto scrollbar-hide">
              {cleanDescription}
            </p>
          </motion.div>
        )}

        {/* ── Hashtags Section ── */}
        {hashtags.length > 0 && (
          <motion.div variants={fadeUp} className="rounded-lg border border-border bg-background/60 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Hash className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase tracking-wider font-semibold">
                  Hashtags ({hashtags.length})
                </span>
              </div>
              <CopyButton text={hashtags.join(" ")} label="Hashtags" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {hashtags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs font-medium cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(tag);
                    toast.success(`${tag} copied`);
                  }}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Photos Section ── */}
        <motion.div variants={fadeUp} className="rounded-lg border border-border bg-background/60 p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase tracking-wider font-semibold">
                Photos{allImages.length > 0 ? ` (${allImages.length})` : ""}
              </span>
            </div>
            {allImages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={handleDownloadAll}
                disabled={downloading}
              >
                <Download className="w-3 h-3" />
                {downloading ? "Downloading…" : "Download All"}
              </Button>
            )}
          </div>

          {allImages.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
              {allImages.map((url, i) => (
                <motion.div
                  key={i}
                  className="shrink-0 group relative"
                  whileHover={{ scale: 1.04 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <div className="w-20 h-20 rounded-lg overflow-hidden border border-border shadow-sm bg-muted">
                    <img
                      src={url}
                      alt={`Photo ${i + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  {/* Download on hover */}
                  <button
                    className="absolute inset-0 rounded-lg bg-secondary/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    onClick={async () => {
                      try {
                        const res = await fetch(url);
                        const blob = await res.blob();
                        const href = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = href;
                        a.download = `vintifi-${item.title.slice(0, 20).replace(/\s+/g, "-")}-${i + 1}.png`;
                        a.click();
                        URL.revokeObjectURL(href);
                      } catch {}
                    }}
                  >
                    <Download className="w-4 h-4 text-primary-foreground" />
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <button
              onClick={onPhotoStudio}
              className="w-full py-6 rounded-lg border-2 border-dashed border-border hover:border-primary/40 transition-colors flex flex-col items-center gap-2 text-muted-foreground hover:text-primary"
            >
              <ImageIcon className="w-5 h-5" />
              <span className="text-xs font-medium">Add photos to complete your pack</span>
            </button>
          )}
        </motion.div>

        {/* ── Master Actions Bar ── */}
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-2 pt-1">
          <Button
            className="flex-1 h-11 font-semibold text-sm active:scale-[0.97] transition-transform"
            onClick={() => {
              navigator.clipboard.writeText(fullListingText);
              toast.success("Full listing copied — paste into Vinted!");
            }}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Full Listing
          </Button>

          {item.vinted_url && (
            <Button variant="outline" className="h-11 active:scale-[0.97] transition-transform" asChild>
              <a href={item.vinted_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open on Vinted
              </a>
            </Button>
          )}

          {allImages.length > 0 && (
            <Button
              variant="outline"
              className="h-11 active:scale-[0.97] transition-transform"
              onClick={handleDownloadAll}
              disabled={downloading}
            >
              <Download className="w-4 h-4 mr-2" />
              Photos ({allImages.length})
            </Button>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
