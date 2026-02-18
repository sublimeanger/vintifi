import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HealthScoreMini } from "@/components/HealthScoreGauge";
import { VintedReadyPack } from "@/components/VintedReadyPack";
import {
  Check, ChevronLeft, Loader2, Copy, Search, Sparkles, ImageIcon,
  Camera, Rocket, PoundSterling, Link2, Pencil, Upload, Plus, X,
  ArrowRight, Package, AlertCircle, ExternalLink, RotateCcw,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ─── Types ───
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
type EntryMethod = "url" | "photo" | "manual";

// ─── 5 clean steps (ghost "Details" step removed) ───
const STEPS = [
  { id: 1, label: "Add Item",  shortLabel: "Add",      icon: Plus },
  { id: 2, label: "Price",     shortLabel: "Price",     icon: Search },
  { id: 3, label: "Optimise",  shortLabel: "Optimise",  icon: Sparkles },
  { id: 4, label: "Photos",    shortLabel: "Photos",    icon: Camera },
  { id: 5, label: "Pack ✓",    shortLabel: "Pack",      icon: Rocket },
] as const;

const conditions = [
  { value: "new_with_tags", label: "New with tags" },
  { value: "new_without_tags", label: "New without tags" },
  { value: "very_good", label: "Very good" },
  { value: "good", label: "Good" },
  { value: "satisfactory", label: "Satisfactory" },
];

const categories = [
  "Tops", "T-shirts", "Shirts", "Hoodies", "Sweatshirts", "Jumpers", "Jackets", "Coats",
  "Jeans", "Trousers", "Shorts", "Skirts", "Dresses",
  "Shoes", "Trainers", "Boots", "Sandals",
  "Bags", "Accessories", "Jewellery", "Watches",
  "Sportswear", "Vintage", "Other",
];

// ─── Helper: Copy button ───
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

// ─── Progress bar (5 steps) ───
function ProgressBar({ currentStep, stepStatus }: { currentStep: number; stepStatus: Record<number, StepStatus> }) {
  const currentStepData = STEPS.find((s) => s.id === currentStep);
  return (
    <div className="border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-0.5 sm:gap-1 px-3 pt-2.5 pb-1">
        {STEPS.map((step, i) => {
          const status = stepStatus[step.id];
          const isCurrent = currentStep === step.id;
          const isDone = status === "done" || step.id < currentStep;
          const isSkipped = status === "skipped";
          return (
            <div key={step.id} className="flex items-center flex-1 gap-0.5">
              <div className="flex flex-col items-center gap-0.5 min-w-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shrink-0 ${
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
                <span className={`text-[8px] sm:text-[9px] font-medium hidden sm:block truncate max-w-[44px] text-center ${
                  isCurrent ? "text-primary" : isDone ? "text-success" : "text-muted-foreground"
                }`}>
                  {step.shortLabel}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mb-3 sm:mb-4 transition-all mx-0.5 ${isDone ? "bg-success/60" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>
      {/* Always-visible step label for mobile */}
      <p className="text-center text-[10px] text-muted-foreground pb-2 sm:hidden">
        Step {currentStep} of {STEPS.length}
        {currentStepData ? ` — ${currentStepData.label.replace(" ✓", "")}` : ""}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════
// SELL WIZARD PAGE
// ═══════════════════════════════════════
export default function SellWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  // 5 steps now
  const [stepStatus, setStepStatus] = useState<Record<number, StepStatus>>({
    1: "pending", 2: "pending", 3: "pending", 4: "pending", 5: "pending",
  });

  // Step 1 — Add Item
  const [entryMethod, setEntryMethod] = useState<EntryMethod | null>(null);
  const [vintedUrl, setVintedUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Item form data
  const [form, setForm] = useState({
    title: "", brand: "", category: "", size: "", condition: "",
    colour: "", material: "", description: "", currentPrice: "", purchasePrice: "",
  });

  // Created item — set after step 1 saves to DB
  const [createdItem, setCreatedItem] = useState<Listing | null>(null);

  // Step 2 — Price (was step 3)
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

  // Step 3 — Optimise (was step 4)
  const [optimiseResult, setOptimiseResult] = useState<{
    optimised_title: string;
    optimised_description: string;
    health_score: number;
  } | null>(null);
  const [optimiseLoading, setOptimiseLoading] = useState(false);
  const [optimiseSaved, setOptimiseSaved] = useState(false);

  // Step 4 — Photos (was step 5)
  const [photoPolling, setPhotoPolling] = useState(false);
  const [photoDone, setPhotoDone] = useState(false);
  const photoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPhotoEditRef = useRef<string | null>(null);

  // Step 5 — Pack (was step 6)
  const [vintedUrlInput, setVintedUrlInput] = useState("");
  const [markingListed, setMarkingListed] = useState(false);

  // ─── Reset wizard for "Sell another item" ───
  const resetWizard = () => {
    setCurrentStep(1);
    setDirection(-1);
    setStepStatus({ 1: "pending", 2: "pending", 3: "pending", 4: "pending", 5: "pending" });
    setEntryMethod(null);
    setVintedUrl("");
    setScraping(false);
    setPhotoFiles([]);
    setPhotoUrls([]);
    setUploading(false);
    setCreating(false);
    setForm({ title: "", brand: "", category: "", size: "", condition: "", colour: "", material: "", description: "", currentPrice: "", purchasePrice: "" });
    setCreatedItem(null);
    setPriceResult(null);
    setPriceLoading(false);
    setPriceAccepted(false);
    setCustomPriceInput("");
    setAcceptingCustom(false);
    setOptimiseResult(null);
    setOptimiseLoading(false);
    setOptimiseSaved(false);
    if (photoIntervalRef.current) clearInterval(photoIntervalRef.current);
    setPhotoPolling(false);
    setPhotoDone(false);
    lastPhotoEditRef.current = null;
    setVintedUrlInput("");
    setMarkingListed(false);
  };

  // ─── Navigation ───
  const canAdvance = (): boolean => {
    if (currentStep === 1) return !!entryMethod;
    if (currentStep === 2) return priceAccepted;
    if (currentStep === 3) return optimiseSaved;
    if (currentStep === 4) return photoDone || stepStatus[4] === "skipped";
    return true;
  };

  const advanceBlockedReason = (): string => {
    if (currentStep === 1 && !entryMethod) return "Choose how to add your item";
    if (currentStep === 2 && !priceAccepted) return "Accept a price to continue";
    if (currentStep === 3 && !optimiseSaved) return "Save optimised listing to continue";
    if (currentStep === 4 && !photoDone && stepStatus[4] !== "skipped") return "Enhance or skip photos";
    return "";
  };

  const goNext = useCallback(() => {
    if (!canAdvance()) return;
    setStepStatus((s) => ({ ...s, [currentStep]: "done" }));
    setDirection(1);
    setCurrentStep((s) => Math.min(5, s + 1));
  }, [currentStep, canAdvance]);

  const goBack = () => {
    setDirection(-1);
    // On step 2 (price), back goes to step 1
    setCurrentStep((s) => Math.max(1, s - 1));
  };

  // ─── Auto-fire price check on entering step 2 ───
  useEffect(() => {
    if (currentStep === 2 && !priceResult && !priceLoading && createdItem) {
      runPriceCheck();
    }
  }, [currentStep]);

  // ─── Auto-fire optimise on entering step 3 ───
  useEffect(() => {
    if (currentStep === 3 && !optimiseResult && !optimiseLoading && createdItem) {
      runOptimise();
    }
  }, [currentStep]);

  // ─── Cleanup polling ───
  useEffect(() => {
    return () => {
      if (photoIntervalRef.current) clearInterval(photoIntervalRef.current);
    };
  }, []);

  // ─── Re-entry detection: when user returns to /sell at step 4 ───
  // If they went to Photo Studio and came back, polling was killed — so on
  // mount (or whenever step becomes 4 with a createdItem), immediately
  // query the DB. If a photo edit happened since we stored lastPhotoEditRef,
  // auto-advance. Otherwise restart polling so it works going forward.
  useEffect(() => {
    if (currentStep !== 4 || !createdItem || photoDone) return;

    let cancelled = false;

    const checkOnEntry = async () => {
      const { data } = await supabase
        .from("listings")
        .select("last_photo_edit_at, image_url")
        .eq("id", createdItem.id)
        .single();

      if (cancelled) return;

      if (data?.last_photo_edit_at && data.last_photo_edit_at !== lastPhotoEditRef.current) {
        // Photo was edited while away — auto-advance
        clearInterval(photoIntervalRef.current!);
        setPhotoPolling(false);
        setPhotoDone(true);
        setStepStatus((s) => ({ ...s, 4: "done" }));
        setCreatedItem((prev) =>
          prev
            ? { ...prev, last_photo_edit_at: data.last_photo_edit_at, image_url: data.image_url ?? prev.image_url }
            : prev
        );
        toast.success("Photo enhancement detected — advancing!");
        setTimeout(() => {
          setDirection(1);
          setCurrentStep(5);
        }, 600);
      } else if (!photoPolling) {
        // No edit yet — (re)start polling so it keeps working
        startPhotoPolling();
      }
    };

    checkOnEntry();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, createdItem?.id]);

  // ─── Step 1: Photo upload ───
  const uploadPhotos = async (files: File[]): Promise<string[]> => {
    if (!user) return [];
    setUploading(true);
    const urls: string[] = [];
    for (const file of files.slice(0, 5)) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 10 * 1024 * 1024) continue;
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const { error } = await supabase.storage.from("listing-photos").upload(path, file, { contentType: file.type, upsert: true });
      if (!error) {
        const { data: pub } = supabase.storage.from("listing-photos").getPublicUrl(path);
        urls.push(pub.publicUrl);
      }
    }
    setUploading(false);
    return urls;
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 5 - photoUrls.length);
    if (files.length === 0) return;
    setPhotoFiles((prev) => [...prev, ...files]);
    setPhotoUrls((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (idx: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
    setPhotoUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  // ─── Scrape Vinted URL ───
  const scrapeVintedUrl = async (url: string) => {
    setScraping(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("scrape-vinted-url", { body: { url } });
      if (error) throw error;
      if (result && !result.error) {
        setForm((f) => ({
          ...f,
          title: result.title || f.title,
          brand: result.brand || f.brand,
          category: result.category || f.category,
          size: result.size || f.size,
          condition: result.condition || f.condition,
          colour: result.colour || f.colour,
          material: result.material || f.material,
          description: result.description || f.description,
          currentPrice: result.price != null ? String(result.price) : f.currentPrice,
        }));
        if (Array.isArray(result.photos) && result.photos.length > 0) {
          setPhotoUrls(result.photos.filter((u: string) => typeof u === "string" && u.startsWith("http")));
        }
        toast.success("Listing details imported!");
      }
    } catch {
      toast.info("Couldn't auto-detect details — fill them in manually");
    } finally {
      setScraping(false);
    }
  };

  // ─── Create item in DB (end of step 1) ───
  const createItem = async () => {
    if (!user) return;
    setCreating(true);
    try {
      let uploadedUrls: string[] = [];
      if (photoFiles.length > 0) {
        uploadedUrls = await uploadPhotos(photoFiles);
      }
      const scrapedUrls = photoUrls.filter((u) => u.startsWith("http") && !u.startsWith("blob:"));
      const allImages = [...new Set([...uploadedUrls, ...scrapedUrls])];

      const { data: inserted, error } = await supabase.from("listings").insert({
        user_id: user.id,
        title: form.title.trim() || (entryMethod === "url" ? "Imported item" : "New item"),
        description: form.description.trim() || null,
        brand: form.brand.trim() || null,
        category: form.category.trim() || null,
        size: form.size.trim() || null,
        condition: form.condition || null,
        colour: form.colour.trim() || null,
        material: form.material.trim() || null,
        current_price: form.currentPrice ? parseFloat(form.currentPrice) : null,
        purchase_price: form.purchasePrice ? parseFloat(form.purchasePrice) : null,
        vinted_url: entryMethod === "url" ? vintedUrl.trim() || null : null,
        image_url: allImages[0] || null,
        images: allImages.length > 0 ? allImages : [],
        status: "active",
        source_type: entryMethod === "url" ? "vinted_url" : entryMethod === "photo" ? "photo_upload" : "manual",
      }).select("*").single();

      if (error) throw error;
      setCreatedItem(inserted as unknown as Listing);
      lastPhotoEditRef.current = (inserted as any).last_photo_edit_at;
      toast.success("Item created — let's set the price!");
      // Advance to step 2 (price) directly
      setStepStatus((s) => ({ ...s, 1: "done" }));
      setDirection(1);
      setCurrentStep(2);
    } catch (err: any) {
      toast.error(err.message || "Failed to create item");
    } finally {
      setCreating(false);
    }
  };

  // ─── Step 2: Price check ───
  const runPriceCheck = async () => {
    if (!createdItem) return;
    setPriceLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("price-check", {
        body: {
          itemId: createdItem.id,
          brand: createdItem.brand || form.brand,
          category: createdItem.category || form.category,
          condition: createdItem.condition || form.condition,
          title: createdItem.title || form.title,
          size: createdItem.size || form.size,
          currentPrice: createdItem.current_price,
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
    } catch {
      toast.error("Price check failed — try again");
    } finally {
      setPriceLoading(false);
    }
  };

  const acceptPrice = async (customPrice?: number) => {
    if (!createdItem) return;
    const price = customPrice ?? priceResult?.recommended_price;
    if (!price) return;
    await supabase.from("listings").update({
      current_price: price,
      recommended_price: price,
      last_price_check_at: new Date().toISOString(),
    }).eq("id", createdItem.id);
    setCreatedItem((prev) => prev ? { ...prev, current_price: price, recommended_price: price } : prev);
    setPriceAccepted(true);
    toast.success(`Price set to £${price.toFixed(2)}`);
  };

  // ─── Step 3: Optimise ───
  const runOptimise = async () => {
    if (!createdItem) return;
    setOptimiseLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("optimize-listing", {
        body: {
          itemId: createdItem.id,
          title: createdItem.title,
          description: createdItem.description,
          brand: createdItem.brand,
          category: createdItem.category,
          size: createdItem.size,
          condition: createdItem.condition,
          colour: createdItem.colour,
          material: createdItem.material,
        },
      });
      if (error) throw error;
      setOptimiseResult({
        optimised_title: data?.optimised_title || "",
        optimised_description: data?.optimised_description || "",
        health_score: typeof data?.health_score === "object" ? (data.health_score?.overall ?? 0) : (data?.health_score ?? 0),
      });
    } catch {
      toast.error("Optimisation failed — try again");
    } finally {
      setOptimiseLoading(false);
    }
  };

  const saveOptimised = async () => {
    if (!optimiseResult || !createdItem) return;
    const now = new Date().toISOString();
    await supabase.from("listings").update({
      optimised_title: optimiseResult.optimised_title,
      optimised_description: optimiseResult.optimised_description,
      health_score: optimiseResult.health_score,
      last_optimised_at: now,
    }).eq("id", createdItem.id);
    setCreatedItem((prev) => prev ? {
      ...prev,
      optimised_title: optimiseResult.optimised_title,
      optimised_description: optimiseResult.optimised_description,
      health_score: optimiseResult.health_score,
      last_optimised_at: now,
    } : prev);
    setOptimiseSaved(true);
    toast.success("Optimised listing saved!");
  };

  // ─── Step 4: Photo polling ───
  const startPhotoPolling = useCallback(() => {
    if (!createdItem) return;
    setPhotoPolling(true);
    photoIntervalRef.current = setInterval(async () => {
      const { data } = await supabase
        .from("listings").select("last_photo_edit_at").eq("id", createdItem.id).single();
      if (data?.last_photo_edit_at && data.last_photo_edit_at !== lastPhotoEditRef.current) {
        clearInterval(photoIntervalRef.current!);
        setPhotoPolling(false);
        setPhotoDone(true);
        setStepStatus((s) => ({ ...s, 4: "done" }));
        setCreatedItem((prev) => prev ? { ...prev, last_photo_edit_at: data.last_photo_edit_at } : prev);
        toast.success("Photo enhancement detected!");
        setTimeout(() => goNext(), 800);
      }
    }, 5000);
  }, [createdItem, goNext]);

  const skipPhotos = () => {
    if (photoIntervalRef.current) clearInterval(photoIntervalRef.current);
    setPhotoPolling(false);
    setStepStatus((s) => ({ ...s, 4: "skipped" }));
    setDirection(1);
    setCurrentStep(5);
  };

  // ─── Step 5: Mark as listed ───
  const markAsListed = async () => {
    if (!vintedUrlInput.trim() || !createdItem) return;
    setMarkingListed(true);
    await supabase.from("listings").update({ vinted_url: vintedUrlInput.trim() }).eq("id", createdItem.id);
    setMarkingListed(false);
    toast.success("🎉 Item marked as listed on Vinted!");
    setTimeout(() => navigate(`/items/${createdItem.id}`), 1000);
  };

  // ─── Slide variants ───
  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  // ═══════════════════════════════════
  // STEP CONTENT
  // ═══════════════════════════════════

  /* ═══ STEP 1: ADD ITEM ═══ */
  const renderStep1 = () => {
    if (!entryMethod) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">How would you like to add your item?</p>
          {[
            { method: "url" as EntryMethod, icon: Link2, label: "Paste Vinted URL", sub: "Auto-fill details from any listing", badge: "Fastest", color: "bg-primary/10 text-primary" },
            { method: "photo" as EntryMethod, icon: Camera, label: "Upload Photos", sub: "Add photos and fill in details", badge: null, color: "bg-accent/10 text-accent" },
            { method: "manual" as EntryMethod, icon: Pencil, label: "Manual Entry", sub: "Enter all details yourself", badge: null, color: "bg-muted text-muted-foreground" },
          ].map(({ method, icon: Icon, label, sub, badge, color }) => (
            <Card
              key={method}
              onClick={() => setEntryMethod(method)}
              className="p-4 cursor-pointer hover:border-primary/40 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-[11px] text-muted-foreground">{sub}</p>
                </div>
                {badge && <Badge variant="secondary" className="text-[10px] shrink-0">{badge}</Badge>}
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </Card>
          ))}
        </div>
      );
    }

    if (entryMethod === "url") {
      return (
        <div className="space-y-4">
          <button onClick={() => setEntryMethod(null)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ChevronLeft className="w-3 h-3" /> Back
          </button>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vinted Listing URL</Label>
            <Input
              value={vintedUrl}
              onChange={(e) => setVintedUrl(e.target.value)}
              placeholder="https://www.vinted.co.uk/items/..."
              className="h-12 text-base"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">Paste any Vinted URL — we'll import the details automatically.</p>
          </div>
          <Button
            className="w-full"
            disabled={!vintedUrl.trim() || scraping}
            onClick={async () => {
              if (vintedUrl.includes("vinted")) await scrapeVintedUrl(vintedUrl.trim());
            }}
          >
            {scraping ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing…</> : "Import & Review Details"}
          </Button>
          {form.title && renderDetailsForm()}
        </div>
      );
    }

    if (entryMethod === "photo") {
      return (
        <div className="space-y-4">
          <button onClick={() => setEntryMethod(null)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ChevronLeft className="w-3 h-3" /> Back
          </button>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Item Photos</Label>
          {photoUrls.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {photoUrls.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {photoUrls.length < 5 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center hover:border-primary/40 transition-colors"
                >
                  <Plus className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
            </div>
          ) : (
            <Card
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-primary/20 hover:border-primary/40 cursor-pointer p-8 text-center transition-colors"
            >
              <Upload className="w-8 h-8 text-primary/50 mx-auto mb-2" />
              <p className="text-sm font-medium">Tap to upload photos</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG · Max 10MB · Up to 5</p>
            </Card>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
          {photoUrls.length > 0 && renderDetailsForm()}
        </div>
      );
    }

    // Manual entry
    return (
      <div className="space-y-4">
        <button onClick={() => setEntryMethod(null)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> Back
        </button>
        {renderDetailsForm()}
      </div>
    );
  };

  /* Details form shared between all entry methods */
  const renderDetailsForm = () => (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title *</Label>
        <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Nike Air Force 1 White Trainers" className="text-base" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Condition *</Label>
          <Select value={form.condition} onValueChange={(v) => setForm((f) => ({ ...f, condition: v }))}>
            <SelectTrigger className="h-10"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>{conditions.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
          <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
            <SelectTrigger className="h-10"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Brand</Label>
          <Input value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} placeholder="Nike, Zara…" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Size</Label>
          <Input value={form.size} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))} placeholder="M, 10, XL…" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sell Price (£)</Label>
          <Input type="number" value={form.currentPrice} onChange={(e) => setForm((f) => ({ ...f, currentPrice: e.target.value }))} placeholder="0.00" inputMode="decimal" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cost Price (£)</Label>
          <Input type="number" value={form.purchasePrice} onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))} placeholder="0.00" inputMode="decimal" />
        </div>
      </div>
      <Button
        className="w-full h-11 font-semibold mt-2"
        disabled={!form.title || !form.condition || creating || uploading}
        onClick={createItem}
      >
        {creating || uploading
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating item…</>
          : <>Create Item & Set Price <ArrowRight className="w-4 h-4 ml-1.5" /></>}
      </Button>
    </div>
  );

  /* ═══ STEP 2: PRICE CHECK ═══ */
  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {priceLoading ? "Analysing market prices…" : priceResult ? "Market analysis complete" : "Ready to analyse"}
        </p>
        {!priceLoading && priceResult && (
          <button className="text-[10px] text-primary hover:underline" onClick={() => { setPriceResult(null); setPriceAccepted(false); runPriceCheck(); }}>
            Re-run
          </button>
        )}
      </div>

      {priceLoading && (
        <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
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
              <p className="text-xs text-muted-foreground mt-1">{priceResult.confidence_score}% confidence</p>
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

          {/* AI insight */}
          {priceResult.ai_insights && (
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{priceResult.ai_insights}</p>
            </div>
          )}

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
              Price locked at £{createdItem?.current_price?.toFixed(2)} — ready to continue!
            </div>
          )}
        </div>
      )}

      {/* Edit details escape hatch */}
      {createdItem && (
        <p className="text-center text-[10px] text-muted-foreground pt-1">
          Need to fix a typo?{" "}
          <button
            className="underline hover:text-foreground transition-colors"
            onClick={() => window.open(`/items/${createdItem.id}`, "_blank")}
          >
            Edit item details
          </button>
        </p>
      )}
    </div>
  );

  /* ═══ STEP 3: OPTIMISE ═══ */
  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {optimiseLoading ? "Generating SEO-optimised copy…" : optimiseResult ? "Optimisation complete" : "Starting optimisation…"}
        </p>
        {!optimiseLoading && optimiseResult && !optimiseSaved && (
          <button className="text-[10px] text-primary hover:underline" onClick={() => { setOptimiseResult(null); runOptimise(); }}>
            Re-generate
          </button>
        )}
      </div>

      {optimiseLoading && (
        <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs">AI is crafting your listing…</p>
        </div>
      )}

      {optimiseResult && !optimiseLoading && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
            <HealthScoreMini score={optimiseResult.health_score} />
            <div>
              <p className="text-xs font-semibold">Health Score: {optimiseResult.health_score}/100</p>
              <p className="text-[10px] text-muted-foreground">
                {optimiseResult.health_score >= 80 ? "Excellent — ready to post!" : optimiseResult.health_score >= 60 ? "Good — above average" : "Needs improvement"}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Optimised Title</p>
              <CopyBtn text={optimiseResult.optimised_title} label="Title" />
            </div>
            <p className="text-sm font-semibold leading-snug">{optimiseResult.optimised_title}</p>
          </div>

          <div className="rounded-lg border border-border bg-background p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Optimised Description</p>
              <CopyBtn text={optimiseResult.optimised_description} label="Description" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-5">{optimiseResult.optimised_description}</p>
          </div>

          {!optimiseSaved ? (
            <Button className="w-full h-11 font-semibold" onClick={saveOptimised}>
              <Check className="w-4 h-4 mr-2" /> Save optimised listing
            </Button>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/25 text-success text-sm font-semibold">
              <Check className="w-4 h-4 shrink-0" /> Optimised listing saved — looking great!
            </div>
          )}
        </div>
      )}
    </div>
  );

  /* ═══ STEP 4: PHOTOS ═══ */
  const renderStep4 = () => (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Enhance your photos with AI for better click-through rates.</p>

      {/* Full-width portrait image preview — motivates photo enhancement */}
      {createdItem?.image_url ? (
        <div className="relative w-full max-w-[220px] mx-auto aspect-[4/5] rounded-xl overflow-hidden bg-muted border border-border shadow-sm">
          <img src={createdItem.image_url} alt="" className="w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
            <p className="text-white text-[10px] font-medium truncate">{createdItem.title}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
          No photo uploaded — Photo Studio works best with an item photo.
        </div>
      )}

      {!photoDone && !photoPolling && (
        <div className="space-y-2">
          <Button
            className="w-full h-11 font-semibold"
            onClick={() => {
              if (createdItem) {
                // Navigate in-app to keep mobile context; polling detects the save
                navigate(`/vintography?itemId=${createdItem.id}&image_url=${encodeURIComponent(createdItem.image_url || "")}&returnTo=/sell`);
                startPhotoPolling();
              }
            }}
          >
            <ImageIcon className="w-4 h-4 mr-2" /> Open Photo Studio
          </Button>
          <Button variant="ghost" size="sm" className="w-full text-muted-foreground text-xs" onClick={skipPhotos}>
            Skip for now
          </Button>
        </div>
      )}

      {photoPolling && (
        <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
          <div>
            <p className="text-xs font-semibold">Waiting for Photo Studio…</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Return here once you've saved an enhanced photo.</p>
          </div>
          <Button variant="ghost" size="sm" className="ml-auto text-xs shrink-0" onClick={() => { clearInterval(photoIntervalRef.current!); setPhotoPolling(false); }}>
            Cancel
          </Button>
        </div>
      )}

      {photoPolling && (
        <Button variant="outline" className="w-full h-11 font-semibold" onClick={skipPhotos}>
          I'm done — Continue
        </Button>
      )}

      {photoDone && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/25 text-success text-sm font-semibold">
          <Check className="w-4 h-4 shrink-0" /> Photo enhancement saved — great work!
        </div>
      )}
    </div>
  );

  /* ═══ STEP 5: PACK READY ═══ */
  const renderStep5 = () => {
    const healthScore = createdItem?.health_score;
    const showFallback = !createdItem?.last_optimised_at || (healthScore != null && healthScore < 60);

    return (
      <div className="space-y-4">
        {/* Animated celebration header */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
          className="text-center py-2"
        >
          <div className="text-3xl mb-2">🎉</div>
          <h3 className="font-display font-bold text-lg">You're ready to list!</h3>
          <p className="text-xs text-muted-foreground mt-1">Your Vinted-Ready Pack is complete. Copy the details below and list it now.</p>
        </motion.div>

        {createdItem && !showFallback && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.3 }}
          >
            <VintedReadyPack
              item={createdItem as any}
              onOptimise={() => setCurrentStep(3)}
              onPhotoStudio={() => setCurrentStep(4)}
            />
          </motion.div>
        )}

        {/* Fallback when health score is too low or not optimised */}
        {showFallback && createdItem && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.3 }}
            className="space-y-3"
          >
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-warning">Listing score below 60</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Go back to Optimise for a better score, or copy these details manually.</p>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Title</p>
                <CopyBtn text={createdItem.optimised_title || createdItem.title} label="Title" />
              </div>
              <p className="text-sm font-semibold leading-snug">{createdItem.optimised_title || createdItem.title}</p>
            </div>
            {(createdItem.optimised_description || createdItem.description) && (
              <div className="rounded-lg border border-border bg-background p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Description</p>
                  <CopyBtn text={createdItem.optimised_description || createdItem.description || ""} label="Description" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-6">{createdItem.optimised_description || createdItem.description}</p>
              </div>
            )}
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setCurrentStep(3)}>
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Re-run Optimise for a better score
            </Button>
          </motion.div>
        )}

        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
          <p className="text-xs font-semibold">Listed on Vinted? Paste the URL to track it:</p>
          <div className="flex gap-2">
            <Input
              value={vintedUrlInput}
              onChange={(e) => setVintedUrlInput(e.target.value)}
              placeholder="https://www.vinted.co.uk/items/..."
              className="flex-1 text-sm"
            />
            <Button
              size="sm"
              className="shrink-0 font-semibold"
              onClick={markAsListed}
              disabled={!vintedUrlInput.trim() || markingListed}
            >
              {markingListed ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mark Listed"}
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-11 font-semibold"
            onClick={() => {
              if (!createdItem) return;
              toast.success("🎉 Listing complete — here's your item!");
              navigate(`/items/${createdItem.id}`);
            }}
          >
            View Item
          </Button>
          <Button
            className="flex-1 h-11 font-semibold"
            onClick={() => window.open("https://www.vinted.co.uk/items/new", "_blank")}
          >
            List on Vinted <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>

        {/* "Sell another item" reset link */}
        <div className="text-center pt-1">
          <button
            onClick={resetWizard}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Start a new listing
          </button>
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return null;
    }
  };

  // Step title and subtitle for the header
  const stepMeta: Record<number, { title: string; sub: string }> = {
    1: { title: "Add your item", sub: "Choose how to add the item — we'll guide you through the rest." },
    2: { title: "Price it right", sub: "AI analyses live market data to find your ideal price." },
    3: { title: "Optimise your listing", sub: "AI writes an SEO-optimised title and description." },
    4: { title: "Enhance your photos", sub: "AI-enhanced photos get up to 3× more views." },
    5: { title: "Vinted-Ready Pack", sub: "Everything you need to list this item, right here." },
  };

  const showFooterNav = currentStep !== 1 && currentStep !== 5;
  const blocked = advanceBlockedReason();

  // Truncated item title for header (shown from step 2 onwards)
  const headerItemTitle = createdItem
    ? createdItem.title.length > 22
      ? createdItem.title.slice(0, 22) + "…"
      : createdItem.title
    : null;

  // ═══════════════════════════════════
  // RENDER
  // ═══════════════════════════════════
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Header ── */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border flex items-center gap-3 px-4 h-14 shrink-0">
        <button
          onClick={() => navigate("/listings")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Items
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <Rocket className="w-4 h-4 text-primary" />
          {headerItemTitle && currentStep > 1 ? (
            <span className="font-display font-bold text-sm truncate max-w-[160px]">{headerItemTitle}</span>
          ) : (
            <span className="font-display font-bold text-sm">Sell Wizard</span>
          )}
        </div>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground shrink-0">
          {currentStep > 1 ? `Step ${currentStep} of ${STEPS.length}` : ""}
        </span>
      </div>

      {/* ── Progress bar ── */}
      <ProgressBar currentStep={currentStep} stepStatus={stepStatus} />

      {/* ── Step content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6 pb-32">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {/* Step header */}
              <div className="mb-5">
                <h2 className="font-display font-bold text-xl">
                  {stepMeta[currentStep]?.title}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stepMeta[currentStep]?.sub}
                </p>
              </div>

              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Sticky footer nav (not on step 1 or 5) ── */}
      {showFooterNav && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border px-4 pt-3 pb-4 space-y-1.5">
          <div className="flex gap-3">
            {/* Hide back button when it would lead nowhere useful (step 2 goes to step 1 which is fine) */}
            {currentStep > 1 && (
              <Button variant="outline" className="h-12 px-5 font-semibold" onClick={goBack}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
            <Button
              className="flex-1 h-12 font-semibold"
              disabled={!canAdvance()}
              onClick={goNext}
            >
              Continue <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
          {/* Blocked reason shown as helper below button — never inside button */}
          {blocked && (
            <p className="text-center text-[11px] text-muted-foreground">{blocked}</p>
          )}
        </div>
      )}
    </div>
  );
}
