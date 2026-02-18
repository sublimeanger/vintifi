import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { HealthScoreMini } from "@/components/HealthScoreGauge";
import { VintedReadyPack } from "@/components/VintedReadyPack";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Check, ChevronRight, ChevronLeft, Loader2, Copy,
  Search, Sparkles, ImageIcon, Package, ExternalLink,
  AlertCircle, Camera, Rocket, PoundSterling,
} from "lucide-react";

/* ─── Types ─── */
type Listing = {
  id: string;
  title: string;
  description: string | null;
  optimised_title: string | null;
  optimised_description: string | null;
  brand: string | null;
  category: string | null;
  size: string | null;
  condition: string | null;
  status: string;
  current_price: number | null;
  recommended_price: number | null;
  purchase_price: number | null;
  sale_price: number | null;
  health_score: number | null;
  image_url: string | null;
  images: unknown;
  vinted_url: string | null;
  last_price_check_at: string | null;
  last_optimised_at: string | null;
  last_photo_edit_at: string | null;
  colour: string | null;
  material: string | null;
  shipping_cost: number | null;
};

type StepStatus = "pending" | "loading" | "done" | "skipped";

interface ListingWizardProps {
  item: Listing;
  isOpen: boolean;
  onClose: () => void;
  onItemUpdate: (item: Listing) => void;
}

/* ─── Step definitions ─── */
const STEPS = [
  { id: 1, label: "Details",  shortLabel: "Details",  icon: Package },
  { id: 2, label: "Price",    shortLabel: "Price",    icon: Search },
  { id: 3, label: "Optimise", shortLabel: "Optimise", icon: Sparkles },
  { id: 4, label: "Photos",   shortLabel: "Photos",   icon: Camera },
  { id: 5, label: "Pack ✓",   shortLabel: "Pack",     icon: Rocket },
] as const;

/* ─── Small helpers ─── */
function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded border transition-all ${
        copied
          ? "border-success/40 bg-success/10 text-success"
          : "border-border bg-muted/50 text-muted-foreground hover:text-foreground"
      }`}
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success(`${label ?? "Text"} copied`);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function FieldRow({
  label, value, editing, inputNode, onEdit,
}: {
  label: string; value: string | null; editing: boolean;
  inputNode: React.ReactNode; onEdit: () => void;
}) {
  const filled = !!value;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border last:border-0">
      <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
        filled ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
      }`}>
        {filled ? <Check className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-0.5">{label}</p>
        {editing ? inputNode : (
          <button
            className="w-full text-left text-sm font-medium text-foreground hover:text-primary transition-colors"
            onClick={onEdit}
          >
            {value || <span className="text-muted-foreground italic text-xs">Tap to add…</span>}
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   WIZARD COMPONENT
═══════════════════════════════════════════════════════════ */
export function ListingWizard({ item, isOpen, onClose, onItemUpdate }: ListingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const [stepStatus, setStepStatus] = useState<Record<number, StepStatus>>({
    1: "pending", 2: "pending", 3: "pending", 4: "pending", 5: "pending",
  });
  const [localItem, setLocalItem] = useState<Listing>(item);

  // Step 1 edit state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState({
    title: item.title || "",
    brand: item.brand || "",
    category: item.category || "",
    condition: item.condition || "",
    current_price: item.current_price != null ? String(item.current_price) : "",
  });

  // Step 2 price state
  const [priceResult, setPriceResult] = useState<{
    recommended_price: number | null;
    price_range_low: number | null;
    price_range_high: number | null;
    confidence_score: number | null;
    ai_insights: string | null;
  } | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceAccepted, setPriceAccepted] = useState(false);
  const [customPriceInput, setCustomPriceInput] = useState("");
  const [acceptingCustom, setAcceptingCustom] = useState(false);

  // Step 3 optimise state
  const [optimiseResult, setOptimiseResult] = useState<{
    optimised_title: string;
    optimised_description: string;
    health_score: number;
  } | null>(null);
  const [optimiseLoading, setOptimiseLoading] = useState(false);
  const [optimiseSaved, setOptimiseSaved] = useState(false);

  // Step 4 photos state
  const [photoPolling, setPhotoPolling] = useState(false);
  const [photoDone, setPhotoDone] = useState(false);
  const photoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPhotoEditRef = useRef<string | null>(item.last_photo_edit_at);

  // Step 5 listed state
  const [vintedUrlInput, setVintedUrlInput] = useState("");
  const [markingListed, setMarkingListed] = useState(false);

  /* ── Sync localItem when parent item changes ── */
  useEffect(() => {
    setLocalItem(item);
  }, [item]);

  /* ── Reset when wizard opens ── */
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setDirection(1);
      setStepStatus({ 1: "pending", 2: "pending", 3: "pending", 4: "pending", 5: "pending" });
      setEditingField(null);
      setFieldValues({
        title: item.title || "",
        brand: item.brand || "",
        category: item.category || "",
        condition: item.condition || "",
        current_price: item.current_price != null ? String(item.current_price) : "",
      });
      setPriceResult(null);
      setPriceAccepted(false);
      setOptimiseResult(null);
      setOptimiseSaved(false);
      setPhotoPolling(false);
      setPhotoDone(false);
      setVintedUrlInput("");
      lastPhotoEditRef.current = item.last_photo_edit_at;
    }
  }, [isOpen]);

  /* ── Auto-trigger price check on entering step 2 ── */
  useEffect(() => {
    if (currentStep === 2 && !priceResult && !priceLoading) {
      runPriceCheck();
    }
  }, [currentStep]);

  /* ── Auto-trigger optimise on entering step 3 ── */
  useEffect(() => {
    if (currentStep === 3 && !optimiseResult && !optimiseLoading) {
      runOptimise();
    }
  }, [currentStep]);

  /* ── Cleanup photo polling on unmount / close ── */
  useEffect(() => {
    return () => {
      if (photoIntervalRef.current) clearInterval(photoIntervalRef.current);
    };
  }, []);

  /* ─── Navigation helpers ─── */
  const canAdvance = (): boolean => {
    if (currentStep === 1) return !!(fieldValues.title && fieldValues.condition);
    if (currentStep === 2) return priceAccepted;
    if (currentStep === 3) return optimiseSaved;
    if (currentStep === 4) return photoDone || stepStatus[4] === "skipped";
    return true;
  };

  const advanceBlockedReason = (): string => {
    if (currentStep === 1 && !fieldValues.title) return "Add a title to continue";
    if (currentStep === 1 && !fieldValues.condition) return "Set the condition to continue";
    if (currentStep === 2 && !priceAccepted) return "Accept the price to continue";
    if (currentStep === 3 && !optimiseSaved) return "Save the optimised listing to continue";
    if (currentStep === 4 && !photoDone && stepStatus[4] !== "skipped") return "Enhance or skip photos to continue";
    return "";
  };

  const goNext = () => {
    if (!canAdvance()) return;
    setStepStatus((s) => ({ ...s, [currentStep]: "done" }));
    setDirection(1);
    setCurrentStep((s) => Math.min(5, s + 1));
  };

  const goBack = () => {
    setDirection(-1);
    setCurrentStep((s) => Math.max(1, s - 1));
  };

  /* ─── Save field to DB ─── */
  const saveField = async (field: string, value: string) => {
    const numericFields = ["current_price"];
    const payload: Record<string, unknown> = numericFields.includes(field)
      ? { [field]: parseFloat(value) || null }
      : { [field]: value || null };

    const { error } = await supabase.from("listings").update(payload).eq("id", localItem.id);
    if (error) { toast.error("Couldn't save change"); return; }

    const updated = { ...localItem, ...payload } as Listing;
    setLocalItem(updated);
    onItemUpdate(updated);
    setFieldValues((fv) => ({ ...fv, [field]: value }));
    toast.success(`${field.replace("_", " ")} saved`);
  };

  /* ─── Step 2: Price check ─── */
  const runPriceCheck = async () => {
    setPriceLoading(true);
    setStepStatus((s) => ({ ...s, 2: "loading" }));
    try {
      const { data, error } = await supabase.functions.invoke("price-check", {
        body: {
          itemId: localItem.id,
          brand: localItem.brand || fieldValues.brand,
          category: localItem.category || fieldValues.category,
          condition: localItem.condition || fieldValues.condition,
          title: localItem.title || fieldValues.title,
          size: localItem.size,
          currentPrice: localItem.current_price,
        },
      });
      if (error) throw error;
      setPriceResult({
        recommended_price: data?.recommended_price ?? null,
        price_range_low: data?.price_range_low ?? null,
        price_range_high: data?.price_range_high ?? null,
        confidence_score: data?.confidence_score ?? null,
        ai_insights: data?.ai_insights ?? null,
      });
      setStepStatus((s) => ({ ...s, 2: "pending" }));
    } catch {
      toast.error("Price check failed — try again");
      setStepStatus((s) => ({ ...s, 2: "pending" }));
    } finally {
      setPriceLoading(false);
    }
  };

  const acceptPrice = async (customPrice?: number) => {
    const price = customPrice ?? priceResult?.recommended_price;
    if (!price) return;
    await supabase.from("listings").update({
      current_price: price,
      recommended_price: price,
      last_price_check_at: new Date().toISOString(),
    }).eq("id", localItem.id);
    const updated = { ...localItem, current_price: price, recommended_price: price, last_price_check_at: new Date().toISOString() };
    setLocalItem(updated);
    onItemUpdate(updated);
    setPriceAccepted(true);
    toast.success(`Price set to £${price.toFixed(2)}`);
  };

  /* ─── Step 3: Optimise ─── */
  const runOptimise = async () => {
    setOptimiseLoading(true);
    setStepStatus((s) => ({ ...s, 3: "loading" }));
    try {
      const { data, error } = await supabase.functions.invoke("optimize-listing", {
        body: {
          itemId: localItem.id,
          title: localItem.title || fieldValues.title,
          description: localItem.description,
          brand: localItem.brand || fieldValues.brand,
          category: localItem.category || fieldValues.category,
          size: localItem.size,
          condition: localItem.condition || fieldValues.condition,
          colour: localItem.colour,
          material: localItem.material,
        },
      });
      if (error) throw error;
      setOptimiseResult({
        optimised_title: data?.optimised_title || "",
        optimised_description: data?.optimised_description || "",
        health_score: typeof data?.health_score === "object" ? (data.health_score?.overall ?? 0) : (data?.health_score ?? 0),
      });
      setStepStatus((s) => ({ ...s, 3: "pending" }));
    } catch {
      toast.error("Optimisation failed — try again");
      setStepStatus((s) => ({ ...s, 3: "pending" }));
    } finally {
      setOptimiseLoading(false);
    }
  };

  const saveOptimised = async () => {
    if (!optimiseResult) return;
    const now = new Date().toISOString();
    await supabase.from("listings").update({
      optimised_title: optimiseResult.optimised_title,
      optimised_description: optimiseResult.optimised_description,
      health_score: optimiseResult.health_score,
      last_optimised_at: now,
    }).eq("id", localItem.id);
    const updated = {
      ...localItem,
      optimised_title: optimiseResult.optimised_title,
      optimised_description: optimiseResult.optimised_description,
      health_score: optimiseResult.health_score,
      last_optimised_at: now,
    };
    setLocalItem(updated);
    onItemUpdate(updated);
    setOptimiseSaved(true);
    toast.success("Optimised listing saved!");
  };

  /* ─── Step 4: Photo polling ─── */
  const startPhotoPolling = useCallback(() => {
    setPhotoPolling(true);
    lastPhotoEditRef.current = localItem.last_photo_edit_at;

    photoIntervalRef.current = setInterval(async () => {
      const { data } = await supabase
        .from("listings")
        .select("last_photo_edit_at")
        .eq("id", localItem.id)
        .single();

      if (data?.last_photo_edit_at && data.last_photo_edit_at !== lastPhotoEditRef.current) {
        clearInterval(photoIntervalRef.current!);
        setPhotoPolling(false);
        setPhotoDone(true);
        setStepStatus((s) => ({ ...s, 4: "done" }));
        const updated = { ...localItem, last_photo_edit_at: data.last_photo_edit_at };
        setLocalItem(updated);
        onItemUpdate(updated);
        toast.success("Photo enhancement detected — moving on!");
        setTimeout(() => goNext(), 800);
      }
    }, 5000);
  }, [localItem]);

  const skipPhotos = () => {
    if (photoIntervalRef.current) clearInterval(photoIntervalRef.current);
    setPhotoPolling(false);
    setStepStatus((s) => ({ ...s, 4: "skipped" }));
    goNext();
  };

  /* ─── Step 5: Mark as listed ─── */
  const markAsListed = async () => {
    if (!vintedUrlInput.trim()) return;
    setMarkingListed(true);
    await supabase.from("listings").update({ vinted_url: vintedUrlInput.trim() }).eq("id", localItem.id);
    const updated = { ...localItem, vinted_url: vintedUrlInput.trim() };
    setLocalItem(updated);
    onItemUpdate(updated);
    setMarkingListed(false);
    toast.success("🎉 Item marked as listed on Vinted!");
    setTimeout(() => onClose(), 1200);
  };

  /* ─── Progress bar component ─── */
  const ProgressBar = () => (
    <div className="flex items-center justify-between gap-1 px-1 py-3 border-b border-border">
      {STEPS.map((step, i) => {
        const status = stepStatus[step.id];
        const isCurrent = currentStep === step.id;
        const isDone = status === "done" || (step.id < currentStep);
        const isSkipped = status === "skipped";
        return (
          <div key={step.id} className="flex items-center flex-1 gap-1">
            <div className="flex flex-col items-center gap-0.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                isDone
                  ? "bg-success text-success-foreground"
                  : isSkipped
                  ? "bg-warning/20 text-warning border border-warning/40"
                  : isCurrent
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                  : "bg-muted text-muted-foreground"
              }`}>
                {isDone ? <Check className="w-3.5 h-3.5" /> : step.id}
              </div>
              <span className={`text-[9px] font-medium hidden sm:block ${
                isCurrent ? "text-primary" : isDone ? "text-success" : "text-muted-foreground"
              }`}>
                {step.shortLabel}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mb-3 transition-all ${
                isDone ? "bg-success/60" : "bg-border"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );

  /* ─── Step content slides ─── */
  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  /* ═══ STEP 1: DETAILS ═══ */
  const Step1 = () => {
    const [localValues, setLocalValues] = useState(fieldValues);
    const [saving, setSaving] = useState<string | null>(null);

    const handleSave = async (field: string) => {
      setSaving(field);
      await saveField(field, localValues[field as keyof typeof localValues]);
      setSaving(null);
      setEditingField(null);
    };

    const filledCount = Object.values(fieldValues).filter(Boolean).length;
    const totalFields = 5;
    const allFilled = filledCount === totalFields;

    return (
      <div className="space-y-4">
        {/* Item photo + confidence chip */}
        <div className="flex items-start gap-3">
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted border border-border shrink-0">
            {localItem.image_url ? (
              <img src={localItem.image_url} alt={localItem.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold mb-1 truncate">{localItem.title}</p>
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold ${
              allFilled
                ? "bg-success/10 text-success border border-success/25"
                : "bg-warning/10 text-warning border border-warning/25"
            }`}>
              {allFilled
                ? <><Check className="w-3 h-3" /> AI has what it needs ✓</>
                : <><AlertCircle className="w-3 h-3" /> {totalFields - filledCount} field{totalFields - filledCount !== 1 ? "s" : ""} missing — fill for better results</>
              }
            </div>
          </div>
        </div>

        {/* Editable field checklist */}
        <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
          {[
            { key: "title", label: "Title", multiline: false },
            { key: "brand", label: "Brand", multiline: false },
            { key: "category", label: "Category", multiline: false },
            { key: "condition", label: "Condition", multiline: false },
            { key: "current_price", label: "Price (£)", multiline: false },
          ].map(({ key, label, multiline }) => (
            <FieldRow
              key={key}
              label={label}
              value={fieldValues[key as keyof typeof fieldValues]}
              editing={editingField === key}
              onEdit={() => {
                setLocalValues(fieldValues);
                setEditingField(key);
              }}
              inputNode={
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    autoFocus
                    value={localValues[key as keyof typeof localValues]}
                    onChange={(e) => setLocalValues((v) => ({ ...v, [key]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave(key);
                      if (e.key === "Escape") setEditingField(null);
                    }}
                    className="h-8 text-xs flex-1"
                    placeholder={`Enter ${label.toLowerCase()}…`}
                  />
                  <Button
                    size="sm"
                    className="h-8 text-xs px-3"
                    onClick={() => handleSave(key)}
                    disabled={saving === key}
                  >
                    {saving === key ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      </div>
    );
  };

  /* ═══ STEP 2: PRICE CHECK ═══ */
  const Step2 = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {priceLoading ? "Analysing market prices…" : priceResult ? "Market analysis complete" : "Ready to price check"}
        </p>
        {!priceLoading && priceResult && (
          <button
            className="text-[10px] text-primary hover:underline"
            onClick={() => { setPriceResult(null); setPriceAccepted(false); runPriceCheck(); }}
          >
            Re-run
          </button>
        )}
      </div>

      {priceLoading && (
        <div className="py-10 flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs">Checking Vinted, eBay & Depop…</p>
        </div>
      )}

      {priceResult && !priceLoading && (
        <div className="space-y-3">
          {/* Recommended price hero */}
          <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-center">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Recommended Price</p>
            <p className="text-4xl font-display font-bold text-success">
              £{priceResult.recommended_price?.toFixed(2) ?? "—"}
            </p>
            {priceResult.confidence_score != null && (
              <p className="text-xs text-muted-foreground mt-1">
                {priceResult.confidence_score}% confidence
              </p>
            )}
          </div>

          {/* Market range bar */}
          {priceResult.price_range_low != null && priceResult.price_range_high != null && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Market Range</p>
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span>£{priceResult.price_range_low.toFixed(0)}</span>
                <span className="text-muted-foreground">—</span>
                <span>£{priceResult.price_range_high.toFixed(0)}</span>
              </div>
              <div className="relative h-1.5 rounded-full bg-border overflow-hidden">
                {(() => {
                  const low = priceResult.price_range_low!;
                  const high = priceResult.price_range_high!;
                  const rec = priceResult.recommended_price ?? (low + high) / 2;
                  const pct = ((rec - low) / (high - low)) * 100;
                  return (
                    <>
                      <div className="h-full rounded-full bg-gradient-to-r from-warning/60 via-success to-success/60" style={{ width: "100%" }} />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white border-2 border-success shadow-sm"
                        style={{ left: `calc(${Math.max(5, Math.min(95, pct))}% - 5px)` }}
                      />
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* AI insight (first 2 lines) */}
          {priceResult.ai_insights && (
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {priceResult.ai_insights}
              </p>
            </div>
          )}

          {/* Accept button */}
          {!priceAccepted ? (
            <div className="space-y-3">
              <Button
                className="w-full h-11 font-semibold bg-success hover:bg-success/90 text-success-foreground active:scale-[0.98]"
                onClick={() => acceptPrice()}
                disabled={!priceResult.recommended_price}
              >
                <Check className="w-4 h-4 mr-2" />
                Use £{priceResult.recommended_price?.toFixed(2)} — AI suggested
              </Button>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground font-medium">or set your own price</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    value={customPriceInput}
                    onChange={(e) => setCustomPriceInput(e.target.value)}
                    placeholder="12.00"
                    className="pl-8 h-11 text-base"
                    inputMode="decimal"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customPriceInput) acceptPrice(parseFloat(customPriceInput));
                    }}
                  />
                </div>
                <Button
                  variant="outline"
                  className="h-11 px-4 font-semibold"
                  disabled={!customPriceInput || parseFloat(customPriceInput) <= 0 || acceptingCustom}
                  onClick={async () => {
                    const v = parseFloat(customPriceInput);
                    if (isNaN(v) || v <= 0) return;
                    setAcceptingCustom(true);
                    await acceptPrice(v);
                    setAcceptingCustom(false);
                  }}
                >
                  {acceptingCustom ? <Loader2 className="w-4 h-4 animate-spin" /> : "Use this"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/25 text-success text-sm font-semibold">
              <Check className="w-4 h-4 shrink-0" />
              Price locked at £{localItem.current_price?.toFixed(2)} — ready to continue!
            </div>
          )}
        </div>
      )}
    </div>
  );

  /* ═══ STEP 3: OPTIMISE ═══ */
  const Step3 = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {optimiseLoading ? "Generating SEO-optimised copy…" : optimiseResult ? "Optimisation complete" : "Starting optimisation…"}
        </p>
        {!optimiseLoading && optimiseResult && !optimiseSaved && (
          <button
            className="text-[10px] text-primary hover:underline"
            onClick={() => { setOptimiseResult(null); setOptimiseSaved(false); runOptimise(); }}
          >
            Re-generate
          </button>
        )}
      </div>

      {optimiseLoading && (
        <div className="py-10 flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs">AI is crafting your listing…</p>
        </div>
      )}

      {optimiseResult && !optimiseLoading && (
        <div className="space-y-3">
          {/* Health score */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
            <HealthScoreMini score={optimiseResult.health_score} />
            <div>
              <p className="text-xs font-semibold">Health Score: {optimiseResult.health_score}/100</p>
              <p className="text-[10px] text-muted-foreground">
                {optimiseResult.health_score >= 80 ? "Excellent — ready to post!" : optimiseResult.health_score >= 60 ? "Good — above average" : "Needs improvement"}
              </p>
            </div>
          </div>

          {/* Optimised title */}
          <div className="rounded-lg border border-border bg-background p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Optimised Title</p>
              <CopyBtn text={optimiseResult.optimised_title} label="Title" />
            </div>
            <p className="text-sm font-semibold leading-snug">{optimiseResult.optimised_title}</p>
          </div>

          {/* Optimised description */}
          <div className="rounded-lg border border-border bg-background p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Optimised Description</p>
              <CopyBtn text={optimiseResult.optimised_description} label="Description" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-h-32 overflow-y-auto scrollbar-hide whitespace-pre-wrap">
              {optimiseResult.optimised_description}
            </p>
          </div>

          {/* Save button */}
          {!optimiseSaved ? (
            <Button
              className="w-full h-11 font-semibold active:scale-[0.98]"
              onClick={saveOptimised}
            >
              <Check className="w-4 h-4 mr-2" />
              Save optimised listing & continue
            </Button>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/25 text-success text-sm font-semibold">
              <Check className="w-4 h-4 shrink-0" />
              Optimised listing saved — ready to continue!
            </div>
          )}
        </div>
      )}
    </div>
  );

  /* ═══ STEP 4: PHOTOS ═══ */
  const Step4 = () => {
    const hasPhotos = !!(localItem.image_url || (Array.isArray(localItem.images) && (localItem.images as string[]).length > 0));
    const photoUrl = localItem.image_url || (Array.isArray(localItem.images) && (localItem.images as string[])[0]) || null;

    return (
      <div className="space-y-4">
        {!hasPhotos && (
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Camera className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold mb-1">No photos yet</p>
              <p className="text-xs text-muted-foreground">Add your primary photo first so AI can enhance it in Photo Studio.</p>
            </div>
          </div>
        )}

        {hasPhotos && (
          <div className="space-y-3">
            {/* Primary photo preview */}
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
              <div className="w-14 h-14 rounded-lg overflow-hidden border border-border shrink-0">
                {photoUrl && (
                  <img src={typeof photoUrl === "string" ? photoUrl : ""} alt="Primary" className="w-full h-full object-cover" />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold">Primary photo ready</p>
                <p className="text-[10px] text-muted-foreground">Open Photo Studio to enhance it with AI backgrounds, models & more.</p>
              </div>
            </div>

            {photoPolling ? (
              <div className="py-6 flex flex-col items-center gap-3 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs font-medium">Waiting for Photo Studio…</p>
                <p className="text-[10px] text-muted-foreground">Return here when you're done — I'll detect it automatically.</p>
                <button className="text-xs text-muted-foreground underline" onClick={skipPhotos}>
                  Done, continue without waiting
                </button>
              </div>
            ) : (
              <>
                <Button
                  className="w-full h-11 font-semibold active:scale-[0.98]"
                  onClick={() => {
                    const photoStudioUrl = `/vintography?itemId=${localItem.id}${photoUrl ? `&image_url=${encodeURIComponent(typeof photoUrl === "string" ? photoUrl : "")}` : ""}`;
                    window.open(photoStudioUrl, "_blank", "noopener,noreferrer");
                    startPhotoPolling();
                  }}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Open Photo Studio →
                </Button>

                {photoDone && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/25 text-success text-sm font-semibold">
                    <Check className="w-4 h-4 shrink-0" />
                    Photo enhancement saved!
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <button
          className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={skipPhotos}
        >
          Skip for now — I'll enhance photos later
        </button>
      </div>
    );
  };

  /* ═══ STEP 5: VINTED-READY PACK ═══ */
  const Step5 = () => (
    <div className="space-y-4">
      {/* Celebration header */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center py-2"
      >
        <div className="text-3xl mb-1">🎉</div>
        <h3 className="font-display font-bold text-lg">You're ready to list!</h3>
        <p className="text-xs text-muted-foreground">Copy everything below and paste into Vinted.</p>
      </motion.div>

      {/* VintedReadyPack rendered inline */}
      <VintedReadyPack
        item={localItem}
        onOptimise={() => setCurrentStep(3)}
        onPhotoStudio={() => setCurrentStep(4)}
      />

      {/* Open Vinted button */}
      <Button
        variant="outline"
        className="w-full h-11 font-semibold border-primary/30 text-primary hover:bg-primary/5"
        asChild
      >
        <a href="https://www.vinted.co.uk/items/new" target="_blank" rel="noopener noreferrer">
          <ExternalLink className="w-4 h-4 mr-2" />
          Open Vinted & list this now
        </a>
      </Button>

      {/* Mark as listed */}
      {!localItem.vinted_url ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Once listed, paste your Vinted URL here to complete your workflow:</p>
          <div className="flex gap-2">
            <Input
              value={vintedUrlInput}
              onChange={(e) => setVintedUrlInput(e.target.value)}
              placeholder="https://www.vinted.co.uk/items/…"
              className="h-10 text-xs"
            />
            <Button
              className="h-10 shrink-0 bg-success hover:bg-success/90 text-success-foreground font-semibold active:scale-[0.97]"
              onClick={markAsListed}
              disabled={!vintedUrlInput.trim() || markingListed}
            >
              {markingListed ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Done
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/25 text-success text-sm font-semibold">
          <Check className="w-4 h-4 shrink-0" />
          Listed on Vinted — great work!
        </div>
      )}
    </div>
  );

  const STEP_COMPONENTS: Record<number, React.ComponentType> = {
    1: Step1,
    2: Step2,
    3: Step3,
    4: Step4,
    5: Step5,
  };

  const StepContent = STEP_COMPONENTS[currentStep] || Step1;

  const blockedReason = advanceBlockedReason();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg p-0 flex flex-col overflow-hidden"
      >
        {/* ── Header ── */}
        <SheetHeader className="px-4 pt-4 pb-0 shrink-0">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-primary shrink-0" />
            <SheetTitle className="text-sm font-display font-bold">Get Ready to List</SheetTitle>
            <span className="ml-auto text-[10px] text-muted-foreground font-medium">
              Step {currentStep} of {STEPS.length}
            </span>
          </div>
        </SheetHeader>

        {/* ── Progress bar ── */}
        <div className="px-4 shrink-0">
          <ProgressBar />
        </div>

        {/* ── Step title ── */}
        <div className="px-4 pt-3 pb-1 shrink-0">
          <h2 className="font-display font-bold text-base">
            {currentStep === 1 && "① Review Details"}
            {currentStep === 2 && "② Price Check"}
            {currentStep === 3 && "③ Optimise Listing"}
            {currentStep === 4 && "④ Photo Studio"}
            {currentStep === 5 && "⑤ Vinted-Ready Pack"}
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {currentStep === 1 && "Check your item details are complete — AI tools need these to work well."}
            {currentStep === 2 && "AI is checking live market prices across Vinted, eBay & Depop."}
            {currentStep === 3 && "AI is generating a keyword-rich title and compelling description."}
            {currentStep === 4 && "Enhance your photos with AI backgrounds, flat-lay or model shots."}
            {currentStep === 5 && "Your pack is ready — copy and paste into Vinted in seconds."}
          </p>
        </div>

        {/* ── Scrollable step content ── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-hide">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              <StepContent />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Sticky footer nav ── */}
        <div className="px-4 py-4 border-t border-border bg-background/95 backdrop-blur-sm shrink-0 space-y-2">
          {blockedReason && (
            <p className="text-[10px] text-muted-foreground text-center">{blockedReason}</p>
          )}
          <div className="flex gap-2">
            {currentStep > 1 && currentStep < 5 && (
              <Button variant="outline" className="h-11" onClick={goBack}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
            {currentStep < 5 && (
              <Button
                className="flex-1 h-11 font-semibold active:scale-[0.98] transition-transform"
                onClick={goNext}
                disabled={!canAdvance()}
              >
                {currentStep === 4 ? "View My Pack" : "Continue"}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            {currentStep === 5 && (
              <Button variant="outline" className="flex-1 h-11" onClick={onClose}>
                Close Wizard
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
