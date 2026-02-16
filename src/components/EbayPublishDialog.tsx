import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  ExternalLink,
  Loader2,
  Image as ImageIcon,
  FileText,
  Tag,
  PoundSterling,
  Ruler,
  ShieldCheck,
} from "lucide-react";

type Listing = {
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
};

type CheckResult = {
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  icon: typeof Tag;
};

function runChecks(item: Listing): CheckResult[] {
  const checks: CheckResult[] = [];

  // Title length (eBay max 80 chars)
  const titleLen = (item.title || "").length;
  checks.push({
    label: "Title",
    icon: Tag,
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
    label: "Description",
    icon: FileText,
    ...(descLen === 0
      ? { status: "fail", detail: "Missing — listings without descriptions get far fewer bids." }
      : descLen < 50
        ? { status: "warn", detail: "Very short — consider adding more detail for eBay buyers." }
        : { status: "pass", detail: `${descLen} chars — good` }),
  });

  // Price
  checks.push({
    label: "Price",
    icon: PoundSterling,
    ...(item.current_price == null || item.current_price <= 0
      ? { status: "fail", detail: "No price set — required for eBay." }
      : { status: "pass", detail: `£${item.current_price.toFixed(2)}` }),
  });

  // Condition
  checks.push({
    label: "Condition",
    icon: ShieldCheck,
    ...(!item.condition
      ? { status: "fail", detail: "Missing — eBay requires a condition." }
      : { status: "pass", detail: item.condition }),
  });

  // Photos
  const imageCount = Array.isArray(item.images) ? (item.images as string[]).length : item.image_url ? 1 : 0;
  checks.push({
    label: "Photos",
    icon: ImageIcon,
    ...(imageCount === 0
      ? { status: "fail", detail: "No photos — eBay listings without photos rarely sell." }
      : imageCount < 3
        ? { status: "warn", detail: `Only ${imageCount} photo${imageCount > 1 ? "s" : ""} — eBay recommends 3+.` }
        : { status: "pass", detail: `${imageCount} photos` }),
  });

  // Brand
  checks.push({
    label: "Brand",
    icon: Tag,
    ...(!item.brand
      ? { status: "warn", detail: "Not set — will default to 'Unbranded' on eBay." }
      : { status: "pass", detail: item.brand }),
  });

  // Size
  checks.push({
    label: "Size",
    icon: Ruler,
    ...(!item.size
      ? { status: "warn", detail: "Not set — buyers often filter by size." }
      : { status: "pass", detail: item.size }),
  });

  // Optimisation
  checks.push({
    label: "AI Optimised",
    icon: Sparkles,
    ...(!item.last_optimised_at
      ? { status: "warn", detail: "Not optimised — AI-improved listings sell 2× faster." }
      : { status: "pass", detail: "Listing has been AI-optimised" }),
  });

  return checks;
}

const statusIcon = {
  pass: <CheckCircle2 className="w-4 h-4 text-success shrink-0" />,
  warn: <AlertTriangle className="w-4 h-4 text-warning shrink-0" />,
  fail: <XCircle className="w-4 h-4 text-destructive shrink-0" />,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: Listing;
  publishing: boolean;
  onPublish: () => void;
  onOptimise: () => void;
}

export function EbayPublishDialog({ open, onOpenChange, listing, publishing, onPublish, onOptimise }: Props) {
  const checks = runChecks(listing);
  const fails = checks.filter((c) => c.status === "fail");
  const warns = checks.filter((c) => c.status === "warn");
  const passes = checks.filter((c) => c.status === "pass");

  const hasBlockers = fails.length > 0;
  const needsOptimisation = !listing.last_optimised_at;
  const score = Math.round((passes.length / checks.length) * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5" /> eBay Readiness Check
          </DialogTitle>
          <DialogDescription>
            {hasBlockers
              ? "Some issues must be fixed before publishing."
              : warns.length > 0
                ? "Your listing is ready but could be improved."
                : "Your listing looks great — ready to publish!"}
          </DialogDescription>
        </DialogHeader>

        {/* Score bar */}
        <div className="flex items-center gap-3 px-1">
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                hasBlockers ? "bg-destructive" : warns.length > 0 ? "bg-warning" : "bg-success"
              }`}
              style={{ width: `${score}%` }}
            />
          </div>
          <span className="text-sm font-bold tabular-nums">{score}%</span>
        </div>

        {/* Checks */}
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {[...fails, ...warns, ...passes].map((check) => (
            <div key={check.label} className="flex items-start gap-2.5 py-1.5 px-1">
              {statusIcon[check.status]}
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{check.label}</p>
                <p className="text-xs text-muted-foreground">{check.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {needsOptimisation && (
            <Button variant="outline" onClick={onOptimise} className="w-full sm:w-auto">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Optimise First
            </Button>
          )}
          <Button
            onClick={onPublish}
            disabled={hasBlockers || publishing}
            className="w-full sm:w-auto"
          >
            {publishing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
            ) : (
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            )}
            {hasBlockers ? "Fix Issues First" : warns.length > 0 ? "Publish Anyway" : "Publish to eBay"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
