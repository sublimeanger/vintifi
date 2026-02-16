import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { ImageIcon, GripVertical, Save, Loader2, Plus, Upload } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

function SortableThumbnail({
  url,
  index,
  isSelected,
  onSelect,
}: {
  url: string;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <button
        onClick={onSelect}
        className={`aspect-square rounded-lg overflow-hidden border-2 transition-all w-full ${
          isSelected
            ? "border-primary ring-2 ring-primary/20"
            : "border-border hover:border-primary/40"
        }`}
      >
        <img src={url} alt={`Thumb ${index + 1}`} className="w-full h-full object-cover" />
      </button>

      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 w-6 h-6 rounded bg-background/80 border border-border flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100 touch-none transition-opacity"
        style={{ touchAction: "none" }}
      >
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
      </div>

      {index === 0 && (
        <span className="absolute bottom-1 right-1 bg-primary text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded">
          Cover
        </span>
      )}
    </div>
  );
}

export function PhotosTab({ item, onEditPhotos, onItemUpdate }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build unified photo array: image_url first, then images array
  const rawImages = Array.isArray(item.images) ? (item.images as string[]) : [];
  const allPhotosInit: string[] = [];
  if (item.image_url) allPhotosInit.push(item.image_url);
  for (const url of rawImages) {
    if (url && !allPhotosInit.includes(url)) allPhotosInit.push(url);
  }

  const [photos, setPhotos] = useState<string[]>(allPhotosInit);
  const [hasReordered, setHasReordered] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleUploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;
    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${item.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("listing-photos")
          .upload(path, file, { upsert: false });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("listing-photos")
          .getPublicUrl(path);
        newUrls.push(urlData.publicUrl);
      }
      if (newUrls.length === 0) return;

      const updatedPhotos = [...photos, ...newUrls];
      const newImageUrl = updatedPhotos[0] || null;
      const newImagesArray = updatedPhotos.slice(1);

      const { error } = await supabase
        .from("listings")
        .update({ image_url: newImageUrl, images: newImagesArray, last_photo_edit_at: new Date().toISOString() })
        .eq("id", item.id)
        .eq("user_id", user.id);
      if (error) throw error;

      setPhotos(updatedPhotos);
      onItemUpdate((prev: any) => ({
        ...prev,
        image_url: newImageUrl,
        images: newImagesArray,
      }));
      toast.success(`${newUrls.length} photo${newUrls.length > 1 ? "s" : ""} uploaded`);
    } catch (err: any) {
      console.error(err);
      toast.error("Upload failed: " + (err.message || "Unknown error"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setPhotos((prev) => {
      const oldIndex = prev.indexOf(active.id as string);
      const newIndex = prev.indexOf(over.id as string);
      const next = arrayMove(prev, oldIndex, newIndex);
      return next;
    });

    // Update selected index to follow the item if it was selected
    setSelectedIdx((prevIdx) => {
      const oldIndex = photos.indexOf(active.id as string);
      const newIndex = photos.indexOf(over.id as string);
      if (prevIdx === oldIndex) return newIndex;
      if (prevIdx >= Math.min(oldIndex, newIndex) && prevIdx <= Math.max(oldIndex, newIndex)) {
        return oldIndex < newIndex ? prevIdx - 1 : prevIdx + 1;
      }
      return prevIdx;
    });

    setHasReordered(true);
  }, [photos]);

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
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUploadPhotos} />
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Photos</h3>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
              Upload
            </Button>
            <Button size="sm" onClick={onEditPhotos}>
              <ImageIcon className="w-3.5 h-3.5 mr-1.5" /> Photo Studio
            </Button>
          </div>
        </div>
        <Card className="p-10 text-center">
          <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium mb-1">No photos yet</p>
          <p className="text-xs text-muted-foreground mb-4">Upload photos or use Photo Studio to enhance them.</p>
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
            Add Photos
          </Button>
        </Card>
      </>
    );
  }

  // Clamp selected index
  const safeIdx = Math.min(selectedIdx, photos.length - 1);

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUploadPhotos} />
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Photos ({photos.length})</h3>
        <div className="flex items-center gap-2">
          {hasReordered && (
            <Button size="sm" onClick={handleSaveOrder} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
              Save Order
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
            Add
          </Button>
          <Button size="sm" variant="outline" onClick={onEditPhotos}>
            <ImageIcon className="w-3.5 h-3.5 mr-1.5" /> Photo Studio
          </Button>
        </div>
      </div>

      {/* Large preview */}
      <Card className="overflow-hidden">
        <motion.div
          key={photos[safeIdx]}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="aspect-[4/3] sm:aspect-[16/9] relative bg-muted"
        >
          <img
            src={photos[safeIdx]}
            alt={`${item.title} — photo ${safeIdx + 1}`}
            className="w-full h-full object-contain"
          />
          {safeIdx === 0 && (
            <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
              Cover
            </span>
          )}
        </motion.div>
      </Card>

      {/* Drag-and-drop thumbnail strip */}
      <div>
        <p className="text-[10px] text-muted-foreground mb-2">Drag thumbnails to reorder · first photo becomes the cover</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={photos} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {photos.map((url, i) => (
                <SortableThumbnail
                  key={url}
                  url={url}
                  index={i}
                  isSelected={i === safeIdx}
                  onSelect={() => setSelectedIdx(i)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {item.last_photo_edit_at && (
        <p className="text-[10px] text-muted-foreground">
          Last edited {format(new Date(item.last_photo_edit_at), "dd MMM yyyy 'at' HH:mm")}
        </p>
      )}
    </>
  );
}
