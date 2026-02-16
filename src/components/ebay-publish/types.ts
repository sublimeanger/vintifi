import type { Tag } from "lucide-react";

export type Listing = {
  id: string;
  title: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  size: string | null;
  condition: string | null;
  current_price: number | null;
  health_score: number | null;
  image_url: string | null;
  images: unknown;
  last_optimised_at: string | null;
  colour: string | null;
  material: string | null;
};

export type CheckResult = {
  label: string;
  field: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  icon: typeof Tag;
  editable?: boolean;
  inputType?: "text" | "number" | "select" | "textarea";
  selectOptions?: string[];
};

export type EbayPreview = {
  categoryId: string;
  categoryName: string;
  aspects: Record<string, string[]>;
  warnings: string[];
};

export interface EbayPublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: Listing;
  publishing: boolean;
  onPublish: (editedListing: Listing) => void;
  onOptimise: () => void;
  onSave: (updates: Partial<Listing>) => Promise<void>;
}
