import { useId } from "react";
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
  const fileId = useId();
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
          {/* Use native <label> instead of programmatic .click() — works reliably on all browsers including iOS Safari */}
          <label
            htmlFor={fileId}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 text-sm active:scale-95 transition-transform cursor-pointer"
          >
            <Camera className="w-4 h-4" /> Choose Photos
          </label>
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
        id={fileId}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) onFilesSelected(e.target.files);
          e.target.value = "";
        }}
      />
    </Card>
  );
}
