import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { ImageIcon, GripVertical, ArrowUp, ArrowDown, Save, Loader2 } from "lucide-react";

type Listing = {
  id: string;
  title: string;
  image_url: string | null;
  images: unknown;
  last_photo_edit_at: string | null;
};

type Props = {
  item: Listing;
  onEditPhotos: () => void;
  onItemUpdate: (item: any) => void;
};

export function PhotosTab({ item, onEditPhotos, onItemUpdate }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Build unified photo array: image_url first, then images array
  const rawImages = Array.isArray(item.images) ? (item.images as string[]) : [];
  const allPhotosInit: string[] = [];
  if (item.image_url) allPhotosInit.push(item.image_url);
  for (const url of rawImages) {
    if (url && !allPhotosInit.includes(url)) allPhotosInit.push(url);
  }

  const [photos, setPhotos] = useState<string[]>(allPhotosInit);
  const [hasReordered, setHasReordered] = useState(false);

  const movePhoto = useCallback((from: number, to: number) => {
    if (to < 0 || to >= photos.length) return;
    setPhotos(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setHasReordered(true);
    // Keep selected on the moved item
    setSelectedIdx(to);
  }, [photos.length]);

  const handleSaveOrder = async () => {
    if (!user || !hasReordered) return;
    setSaving(true);
    try {
      const newImageUrl = photos[0] || null;
      const newImagesArray = photos.slice(1);

      const { error } = await supabase
        .from("listings")
        .update({
          image_url: newImageUrl,
          images: newImagesArray,
        })
        .eq("id", item.id)
        .eq("user_id", user.id);

      if (error) throw error;

      // Update parent state
      onItemUpdate((prev: any) => ({
        ...prev,
        image_url: newImageUrl,
        images: newImagesArray,
      }));
      setHasReordered(false);
      toast.success("Photo order saved");
    } catch (e: any) {
      toast.error("Failed to save photo order");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (photos.length === 0) {
    return (
      <>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Photos</h3>
          <Button size="sm" onClick={onEditPhotos}>
            <ImageIcon className="w-3.5 h-3.5 mr-1.5" /> Edit in Photo Studio
          </Button>
        </div>
        <Card className="p-10 text-center">
          <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium mb-1">No photos yet</p>
          <p className="text-xs text-muted-foreground mb-4">Use Photo Studio to enhance your item photos.</p>
          <Button onClick={onEditPhotos}>
            <ImageIcon className="w-3.5 h-3.5 mr-1.5" /> Open Photo Studio
          </Button>
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Photos ({photos.length})</h3>
        <div className="flex items-center gap-2">
          {hasReordered && (
            <Button size="sm" onClick={handleSaveOrder} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
              Save Order
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onEditPhotos}>
            <ImageIcon className="w-3.5 h-3.5 mr-1.5" /> Photo Studio
          </Button>
        </div>
      </div>

      {/* Large preview */}
      <Card className="overflow-hidden">
        <motion.div
          key={photos[selectedIdx]}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="aspect-[4/3] sm:aspect-[16/9] relative bg-muted"
        >
          <img
            src={photos[selectedIdx]}
            alt={`${item.title} — photo ${selectedIdx + 1}`}
            className="w-full h-full object-contain"
          />
          {selectedIdx === 0 && (
            <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
              Cover
            </span>
          )}
        </motion.div>
      </Card>

      {/* Thumbnail strip with reorder controls */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {photos.map((url, i) => (
          <div key={`${url}-${i}`} className="group relative">
            <button
              onClick={() => setSelectedIdx(i)}
              className={`aspect-square rounded-lg overflow-hidden border-2 transition-all w-full ${
                i === selectedIdx
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <img src={url} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
            </button>

            {/* Reorder arrows */}
            <div className="absolute -right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {i > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); movePhoto(i, i - 1); }}
                  className="w-5 h-5 rounded bg-background/90 border border-border flex items-center justify-center hover:bg-muted"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
              )}
              {i < photos.length - 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); movePhoto(i, i + 1); }}
                  className="w-5 h-5 rounded bg-background/90 border border-border flex items-center justify-center hover:bg-muted"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              )}
            </div>

            {i === 0 && (
              <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-[8px] font-bold px-1 rounded">
                Cover
              </span>
            )}
          </div>
        ))}
      </div>

      {item.last_photo_edit_at && (
        <p className="text-[10px] text-muted-foreground">
          Last edited {format(new Date(item.last_photo_edit_at), "dd MMM yyyy 'at' HH:mm")}
        </p>
      )}
    </>
  );
}
