import {
  Tag, FileText, PoundSterling, ShieldCheck, Sparkles,
  Ruler, Palette, Layers,
} from "lucide-react";
import type { ImageIcon } from "lucide-react";
import type { Listing, CheckResult } from "./types";

const CONDITIONS = [
  "New with tags", "New without tags", "Excellent", "Very good", "Good", "Satisfactory",
];

export function runChecks(item: Listing): CheckResult[] {
  const checks: CheckResult[] = [];

  // Title
  const titleLen = (item.title || "").length;
  checks.push({
    label: "Title", field: "title", icon: Tag, editable: true, inputType: "text",
    ...(titleLen === 0
      ? { status: "fail", detail: "Missing — eBay requires a title" }
      : titleLen > 80
        ? { status: "warn", detail: `${titleLen} chars — eBay truncates at 80. Consider shortening.` }
        : titleLen < 20
          ? { status: "warn", detail: `Only ${titleLen} chars — longer titles rank better on eBay.` }
          : { status: "pass", detail: `${titleLen} chars — good length` }),
  });

  // Description
  const descLen = (item.description || "").length;
  checks.push({
    label: "Description", field: "description", icon: FileText, editable: true, inputType: "textarea",
    ...(descLen === 0
      ? { status: "fail", detail: "Missing — listings without descriptions get far fewer bids." }
      : descLen < 50
        ? { status: "warn", detail: "Very short — consider adding more detail for eBay buyers." }
        : { status: "pass", detail: `${descLen} chars — good` }),
  });

  // Price
  checks.push({
    label: "Price", field: "current_price", icon: PoundSterling, editable: true, inputType: "number",
    ...(item.current_price == null || item.current_price <= 0
      ? { status: "fail", detail: "No price set — required for eBay." }
      : { status: "pass", detail: `£${item.current_price.toFixed(2)}` }),
  });

  // Condition
  checks.push({
    label: "Condition", field: "condition", icon: ShieldCheck, editable: true, inputType: "select", selectOptions: CONDITIONS,
    ...(!item.condition
      ? { status: "fail", detail: "Missing — eBay requires a condition." }
      : { status: "pass", detail: item.condition }),
  });

  // Photos
  const imageCount = Array.isArray(item.images) ? (item.images as string[]).length : item.image_url ? 1 : 0;
  checks.push({
    label: "Photos", field: "photos", icon: Tag, editable: false,
    ...(imageCount === 0
      ? { status: "fail", detail: "No photos — eBay listings without photos rarely sell." }
      : imageCount < 3
        ? { status: "warn", detail: `Only ${imageCount} photo${imageCount > 1 ? "s" : ""} — eBay recommends 3+.` }
        : { status: "pass", detail: `${imageCount} photos` }),
  });

  // Brand
  checks.push({
    label: "Brand", field: "brand", icon: Tag, editable: true, inputType: "text",
    ...(!item.brand
      ? { status: "warn", detail: "Not set — will default to 'Unbranded' on eBay." }
      : { status: "pass", detail: item.brand }),
  });

  // Size
  checks.push({
    label: "Size", field: "size", icon: Ruler, editable: true, inputType: "text",
    ...(!item.size
      ? { status: "warn", detail: "Not set — buyers often filter by size." }
      : { status: "pass", detail: item.size }),
  });

  // Colour
  checks.push({
    label: "Colour", field: "colour", icon: Palette, editable: true, inputType: "text",
    ...(!item.colour
      ? { status: "warn", detail: "Not set — required item specific for most eBay clothing categories." }
      : { status: "pass", detail: item.colour }),
  });

  // Material
  checks.push({
    label: "Material", field: "material", icon: Layers, editable: true, inputType: "text",
    ...(!item.material
      ? { status: "warn", detail: "Not set — improves eBay search ranking significantly." }
      : { status: "pass", detail: item.material }),
  });

  // AI Optimised
  checks.push({
    label: "AI Optimised", field: "optimised", icon: Sparkles, editable: false,
    ...(!item.last_optimised_at
      ? { status: "warn", detail: "Not optimised — AI-improved listings sell 2× faster." }
      : { status: "pass", detail: "Listing has been AI-optimised" }),
  });

  return checks;
}
