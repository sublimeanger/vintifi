import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Package } from "lucide-react";
import { ItemPickerDialog } from "@/components/ItemPickerDialog";

type Props = {
  itemId: string | null;
  linkedItemTitle: string;
  onFilesSelected: (files: FileList) => void;
};

export function EmptyState({ itemId, linkedItemTitle, onFilesSelected }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  return (
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
                Upload a photo, then choose from AI effects like background removal, lifestyle scenes, and more.
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
  );
}
