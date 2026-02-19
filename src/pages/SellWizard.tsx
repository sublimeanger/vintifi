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
  ArrowRight, Package, AlertCircle, ExternalLink, RotateCcw, Home,
  Share2, MessageCircle,
} from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
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

// ─── 5 clean steps — v3 order: Add → Photos → Optimise → Price → Pack ───
const STEPS = [
  { id: 1, label: "Add Item",  shortLabel: "Add",      icon: Plus },
  { id: 2, label: "Photos",    shortLabel: "Photos",    icon: Camera },
  { id: 3, label: "Optimise",  shortLabel: "Optimise",  icon: Sparkles },
  { id: 4, label: "Price",     shortLabel: "Price",     icon: Search },
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
      className={`inline-flex items-center gap-1 text-[10px] lg:text-xs font-medium px-2 py-0.5 rounded border transition-all ${
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
      <div className="flex items-center justify-between gap-0.5 sm:gap-1 px-3 lg:px-8 pt-2.5 lg:pt-3 pb-1 lg:pb-2">
        {STEPS.map((step, i) => {
          const status = stepStatus[step.id];
          const isCurrent = currentStep === step.id;
          const isDone = status === "done" || step.id < currentStep;
          const isSkipped = status === "skipped";
          return (
            <div key={step.id} className="flex items-center flex-1 gap-0.5">
              <div className="flex flex-col items-center gap-0.5 min-w-0">
                <div className={`w-7 h-7 lg:w-10 lg:h-10 rounded-full flex items-center justify-center text-[10px] lg:text-sm font-bold transition-all shrink-0 ${
                  isDone
                    ? "bg-success text-success-foreground"
                    : isSkipped
                    ? "bg-warning/20 text-warning border border-warning/40"
                    : isCurrent
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {isDone ? <Check className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> : step.id}
                </div>
                <span className={`text-[8px] sm:text-[9px] lg:text-xs font-medium hidden sm:block truncate max-w-[44px] lg:max-w-[60px] text-center ${
                  isCurrent ? "text-primary" : isDone ? "text-success" : "text-muted-foreground"
                }`}>
                  {step.shortLabel}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px lg:h-0.5 mb-3 sm:mb-4 transition-all mx-0.5 ${isDone || isCurrent ? "bg-success/60" : "bg-border"}`} />
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
  const { user, credits, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived credit state for nudge banners
  const isUnlimitedUser = (credits?.credits_limit ?? 0) >= 999999;
  const creditsRemaining = isUnlimitedUser
    ? Infinity
    : credits
    ? Math.max(0, credits.credits_limit - (credits.price_checks_used + credits.optimizations_used + credits.vintography_used))
    : Infinity;
  const isFreeUser = (profile?.subscription_tier || "free") === "free";

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
  // Track whether a URL import was done with no condition returned — to show pulsing ring
  const [urlImportedNoCondition, setUrlImportedNoCondition] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  // Colour auto-detection state
  const [colourDetecting, setColourDetecting] = useState(false);

  // Item form data
  const [form, setForm] = useState({
    title: "", brand: "", category: "", size: "", condition: "",
    colour: "", material: "", description: "", currentPrice: "", purchasePrice: "",
    seller_notes: "",
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
    title_score?: number;
    description_score?: number;
    photo_score?: number;
    completeness_score?: number;
    seller_notes_disclosed?: boolean;
  } | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [insightsExpanded, setInsightsExpanded] = useState(false);
  const [optimiseLoading, setOptimiseLoading] = useState(false);
  const [optimiseSaved, setOptimiseSaved] = useState(false);

  // Step 2 — Photos (v3 reorder)
  const [photoPolling, setPhotoPolling] = useState(false);
  const [photoDone, setPhotoDone] = useState(false);
  const photoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPhotoEditRef = useRef<string | null>(null);
  // Tracks whether user has clicked "Open Photo Studio" — polling only starts after that
  const hasNavigatedToPhotoStudioRef = useRef(false);
  // Quick inline remove-background state
  const [quickBgProcessing, setQuickBgProcessing] = useState(false);
  const [quickBgResult, setQuickBgResult] = useState<string | null>(null);
  // Original image URL captured when entering Step 2 — used for before/after in Pack
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  // Step 5 — Pack
  const [vintedUrlInput, setVintedUrlInput] = useState("");
  const [markingListed, setMarkingListed] = useState(false);

  // ─── Session restore: on mount, check if we were mid-wizard going to Photo Studio ───
  // Persist item id + step to sessionStorage before navigating away
  useEffect(() => {
    // Write version flag on every mount so analytics can identify v3 sessions
    sessionStorage.setItem("sell_wizard_version", "v3");

    const savedItemId = sessionStorage.getItem("sell_wizard_item_id");
    const savedStep = sessionStorage.getItem("sell_wizard_step");
    const savedVersion = sessionStorage.getItem("sell_wizard_version");
    if (!savedItemId || !savedStep || !user) return;

    // Version guard: if restoring an old pre-v3 session that saved step "4" (old Photos step),
    // clear it and start fresh to avoid landing on wrong content.
    const parsedStep = parseInt(savedStep, 10);
    if (parsedStep === 4 && savedVersion !== "v3") {
      sessionStorage.removeItem("sell_wizard_item_id");
      sessionStorage.removeItem("sell_wizard_step");
      return;
    }

    // Clear the session keys immediately so a hard refresh doesn't loop
    sessionStorage.removeItem("sell_wizard_item_id");
    sessionStorage.removeItem("sell_wizard_step");

    // Re-fetch the item and restore wizard to Photos step (step 2 in v3)
    supabase
      .from("listings")
      .select("*")
      .eq("id", savedItemId)
      .eq("user_id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return;
        const item = data as unknown as Listing;
        setCreatedItem(item);
        lastPhotoEditRef.current = item.last_photo_edit_at;
        // User navigated away to Photo Studio, so polling should start on re-entry
        hasNavigatedToPhotoStudioRef.current = true;
        // Only step 1 is confirmed done when returning from Photo Studio (step 2)
        setStepStatus((s) => ({ ...s, 1: "done" }));
        setOptimiseSaved(!!item.last_optimised_at);
        setDirection(1);
        setCurrentStep(parsedStep || 2);
        toast.info("Welcome back! Resuming where you left off.");
      });
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ─── Reset wizard for "Sell another item" ───
  const resetWizard = async () => {
    // Mark first-item-free pass as used whenever the wizard resets from Step 5
    // (covers "Sell another item" click without entering Vinted URL)
    if (currentStep === 5 && profile?.first_item_pass_used === false && user) {
      await supabase.from("profiles").update({ first_item_pass_used: true }).eq("user_id", user.id);
    }
    setCurrentStep(1);
    setDirection(1);
    setStepStatus({ 1: "pending", 2: "pending", 3: "pending", 4: "pending", 5: "pending" });
    setEntryMethod(null);
    setVintedUrl("");
    setScraping(false);
    setPhotoFiles([]);
    setPhotoUrls([]);
    setUploading(false);
    setCreating(false);
    setForm({ title: "", brand: "", category: "", size: "", condition: "", colour: "", material: "", description: "", currentPrice: "", purchasePrice: "", seller_notes: "" });
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
    hasNavigatedToPhotoStudioRef.current = false;
    setQuickBgProcessing(false);
    setQuickBgResult(null);
    setOriginalImageUrl(null);
    setVintedUrlInput("");
    setMarkingListed(false);
    // Clear session storage when resetting
    sessionStorage.removeItem("sell_wizard_item_id");
    sessionStorage.removeItem("sell_wizard_step");
  };

  // ─── Navigation ───
  // FIX 1: wrap canAdvance in useCallback to prevent stale closures in goNext and startPhotoPolling
  const canAdvance = useCallback((): boolean => {
    // Step 1 always manages its own button; never allow footer to advance from step 1
    if (currentStep === 1) return false;
    // v3 order: Step 2 = Photos, Step 3 = Optimise, Step 4 = Price
    if (currentStep === 2) return photoDone || stepStatus[2] === "skipped";
    if (currentStep === 3) return optimiseSaved;
    if (currentStep === 4) return priceAccepted;
    return true;
  }, [currentStep, priceAccepted, optimiseSaved, photoDone, stepStatus]);

  const advanceBlockedReason = (): string => {
    if (currentStep === 1 && !entryMethod) return "Choose how to add your item";
    // v3 order: Step 2 = Photos, Step 3 = Optimise, Step 4 = Price
    if (currentStep === 2 && !photoDone && stepStatus[2] !== "skipped" && !photoPolling) return "Enhance or skip photos";
    if (currentStep === 3 && !optimiseSaved) return "Save optimised listing to continue";
    if (currentStep === 4 && !priceAccepted) return "Accept a price to continue";
    return "";
  };

  // Helper to scroll the wizard content to top
  const scrollToTop = () => {
    // FIX 8: scroll to top on step advance
    setTimeout(() => {
      const el = document.getElementById("sell-wizard-scroll");
      if (el) el.scrollTop = 0;
    }, 50);
  };

  const goNext = useCallback(() => {
    if (!canAdvance()) return;
    setStepStatus((s) => ({ ...s, [currentStep]: "done" }));
    setDirection(1);
    setCurrentStep((s) => Math.min(5, s + 1));
    scrollToTop();
  }, [currentStep, canAdvance]);

  const goBack = () => {
    setDirection(-1);
    setCurrentStep((s) => Math.max(1, s - 1));
    scrollToTop();
  };

  // ─── Capture original image URL on entering Step 2 (Photos) — once only ───
  useEffect(() => {
    if (currentStep === 2 && createdItem?.image_url && !originalImageUrl) {
      setOriginalImageUrl(createdItem.image_url);
    }
  }, [currentStep, createdItem?.image_url]);

  // ─── Auto-fire optimise on entering step 3 ───
  useEffect(() => {
    if (currentStep === 3 && !optimiseResult && !optimiseLoading && createdItem) {
      runOptimise();
    }
  }, [currentStep]);

  // ─── Auto-fire price check on entering step 4 (v3: Price is step 4) ───
  useEffect(() => {
    if (currentStep === 4 && !priceResult && !priceLoading && createdItem) {
      runPriceCheck();
    }
  }, [currentStep]);

  // ─── Set milestone flags when Pack step is reached ───
  useEffect(() => {
    if (currentStep === 5 && createdItem && user) {
      // FIX 8 (Bug 8): Only set first-listing flag once using a sentinel key
      if (!localStorage.getItem("vintifi_first_listing_seen")) {
        localStorage.setItem("vintifi_first_listing_complete", "1");
        localStorage.setItem("vintifi_first_listing_seen", "1");
      }

      // Check if this is the 5th listing
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "active")
        .then(({ count }) => {
          if (count === 5) {
            localStorage.setItem("vintifi_five_listings_complete", "1");
          }
        });
    }
  }, [currentStep, createdItem]);

  // ─── Cleanup polling ───
  useEffect(() => {
    return () => {
      if (photoIntervalRef.current) clearInterval(photoIntervalRef.current);
    };
  }, []);

  // ─── Re-entry detection: when user returns to /sell at step 2 (Photos in v3) ───
  useEffect(() => {
    if (currentStep !== 2 || !createdItem || photoDone) return;

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
        setStepStatus((s) => ({ ...s, 2: "done" }));
        setCreatedItem((prev) =>
          prev
            ? { ...prev, last_photo_edit_at: data.last_photo_edit_at, image_url: data.image_url ?? prev.image_url }
            : prev
        );
        toast.success("Photo enhancement detected — advancing!");
        setTimeout(() => {
          setDirection(1);
          setCurrentStep(3);
        }, 600);
      } else if (!photoPolling && hasNavigatedToPhotoStudioRef.current) {
        // No edit yet, but user has been to Photo Studio — (re)start polling
        startPhotoPolling();
      }
      // If hasNavigatedToPhotoStudioRef.current is false, user just arrived at step 2
      // for the first time — show the "Open Photo Studio" button, don't auto-poll.
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
    const objectUrls = files.map((f) => URL.createObjectURL(f));
    setPhotoFiles((prev) => [...prev, ...files]);
    setPhotoUrls((prev) => [...prev, ...objectUrls]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    // Trigger background colour detection from first uploaded photo if colour is blank
    if (!form.colour && objectUrls.length > 0) {
      detectColourFromPhoto(objectUrls[0]);
    }
  };

  // ─── Background colour auto-detection from photo ───
  const detectColourFromPhoto = async (photoUrl: string) => {
    if (form.colour) return; // Already has a colour — don't overwrite
    setColourDetecting(true);
    try {
      // Upload the file first if it's a blob URL so the edge function can access it
      const firstFileIdx = photoUrls.length; // index of new photo in photoFiles
      const fileToUpload = photoFiles[firstFileIdx] || null;
      let accessibleUrl = photoUrl;
      if (photoUrl.startsWith("blob:") && user && fileToUpload) {
        const ext = fileToUpload.name.split(".").pop() || "jpg";
        const path = `${user.id}/colour-detect-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("listing-photos").upload(path, fileToUpload, { contentType: fileToUpload.type, upsert: true });
        if (!error) {
          const { data: pub } = supabase.storage.from("listing-photos").getPublicUrl(path);
          accessibleUrl = pub.publicUrl;
        }
      }
      const { data } = await supabase.functions.invoke("optimize-listing", {
        body: { photoUrls: [accessibleUrl], detectColourOnly: true },
      });
      if (data?.detected_colour) {
        setForm((f) => {
          // Only auto-fill if still blank (user may have typed meanwhile)
          if (f.colour) return f;
          return { ...f, colour: data.detected_colour };
        });
        toast.success(`Colour detected: ${data.detected_colour}`, { duration: 2500 });
      }
    } catch {
      // Silent fail — colour detection is best-effort
    } finally {
      setColourDetecting(false);
    }
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
        const importedCondition = result.condition || "";
        setForm((f) => ({
          ...f,
          title: result.title || f.title,
          brand: result.brand || f.brand,
          category: result.category || f.category,
          size: result.size || f.size,
          condition: importedCondition || f.condition,
          colour: result.colour || f.colour,
          material: result.material || f.material,
          description: result.description || f.description,
          currentPrice: result.price != null ? String(result.price) : f.currentPrice,
        }));
        // Flag if condition is empty after import — triggers pulsing ring
        setUrlImportedNoCondition(!importedCondition);
        if (Array.isArray(result.photos) && result.photos.length > 0) {
          setPhotoUrls(result.photos.filter((u: string) => typeof u === "string" && u.startsWith("http")));
        }
        toast.success(importedCondition ? "Listing details imported!" : "Listing imported — please verify the Condition field");
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
    // FIX Gap 1: guard against duplicate item creation (e.g. Back from step 2 then re-click)
    if (createdItem) {
      setStepStatus((s) => ({ ...s, 1: "done" }));
      setDirection(1);
      setCurrentStep(2);
      scrollToTop();
      return;
    }
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
        source_meta: form.seller_notes.trim() ? { seller_notes: form.seller_notes.trim() } : {},
      }).select("*").single();

      if (error) throw error;
      setCreatedItem(inserted as unknown as Listing);
      lastPhotoEditRef.current = (inserted as any).last_photo_edit_at;
      // v3: set wizard version flag when item is created
      sessionStorage.setItem("sell_wizard_version", "v3");
      toast.success("Item created — let's enhance your photos!");
      // Advance to step 2 (Photos in v3)
      setStepStatus((s) => ({ ...s, 1: "done" }));
      setDirection(1);
      setCurrentStep(2);
      scrollToTop();
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
          sell_wizard: true,
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
      const storedNotes = (createdItem as any)?.source_meta?.seller_notes || "";
      const { data, error } = await supabase.functions.invoke("optimize-listing", {
        body: {
          itemId: createdItem.id,
          currentTitle: createdItem.title,
          currentDescription: createdItem.description,
          brand: createdItem.brand,
          category: createdItem.category,
          size: createdItem.size,
          condition: createdItem.condition,
          colour: createdItem.colour || form.colour,
          material: createdItem.material,
          seller_notes: form.seller_notes.trim() || storedNotes,
          sell_wizard: true,
        },
      });
      if (error) throw error;
      const hs = data?.health_score;
      const overall = typeof hs === "object" ? (hs?.overall ?? 0) : (hs ?? 0);
      setOptimiseResult({
        optimised_title: data?.optimised_title || "",
        optimised_description: data?.optimised_description || "",
        health_score: overall,
        title_score: typeof hs === "object" ? (hs?.title_score ?? undefined) : undefined,
        description_score: typeof hs === "object" ? (hs?.description_score ?? undefined) : undefined,
        photo_score: typeof hs === "object" ? (hs?.photo_score ?? undefined) : undefined,
        completeness_score: typeof hs === "object" ? (hs?.completeness_score ?? undefined) : undefined,
        seller_notes_disclosed: data?.seller_notes_disclosed,
      });
      setDescExpanded(false);
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

  // ─── Step 2 (Photos): Photo polling ───
  // Always clear any existing interval before starting a new one
  const startPhotoPolling = useCallback(() => {
    if (!createdItem) return;
    // Kill any previous interval first (prevents ghost polls and double-starts)
    if (photoIntervalRef.current) clearInterval(photoIntervalRef.current);
    setPhotoPolling(true);
    photoIntervalRef.current = setInterval(async () => {
      const { data } = await supabase
        .from("listings").select("last_photo_edit_at, image_url").eq("id", createdItem.id).single();
      if (data?.last_photo_edit_at && data.last_photo_edit_at !== lastPhotoEditRef.current) {
        clearInterval(photoIntervalRef.current!);
        setPhotoPolling(false);
        setPhotoDone(true);
        setStepStatus((s) => ({ ...s, 2: "done" }));
        setCreatedItem((prev) => prev ? { ...prev, last_photo_edit_at: data.last_photo_edit_at, image_url: data.image_url ?? prev.image_url } : prev);
        toast.success("Photo enhancement detected!");
        setTimeout(() => goNext(), 800);
      }
    }, 5000);
  }, [createdItem, goNext]);

  const skipPhotos = () => {
    if (photoIntervalRef.current) clearInterval(photoIntervalRef.current);
    setPhotoPolling(false);
    // v3: Photos is step 2, skip marks step 2 as skipped and goes to step 3
    setStepStatus((s) => ({ ...s, 2: "skipped" }));
    setDirection(1);
    setCurrentStep(3);
    scrollToTop();
  };

  // ─── Quick inline Remove Background (Step 2) ───
  const runQuickRemoveBg = async () => {
    if (!createdItem?.image_url || quickBgProcessing) return;
    setQuickBgProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("vintography", {
        body: { operation: "remove_bg", image_url: createdItem.image_url, itemId: createdItem.id, sell_wizard: true },
      });
      if (error) throw error;
      const processedUrl = data?.processed_url || data?.url;
      if (!processedUrl) throw new Error("No processed image returned");
      setQuickBgResult(processedUrl);
      // Update the createdItem image_url locally
      setCreatedItem((prev) => prev ? { ...prev, image_url: processedUrl } : prev);
      // Mark photo step as done
      setPhotoDone(true);
      setStepStatus((s) => ({ ...s, 2: "done" }));
      toast.success("Background removed!");
    } catch (err: any) {
      toast.error(err.message || "Remove background failed — try again or open Photo Studio");
    } finally {
      setQuickBgProcessing(false);
    }
  };

  // ─── Step 5: Mark as listed — also marks first_item_pass as used ───
  const markAsListed = async () => {
    if (!vintedUrlInput.trim() || !createdItem) return;
    setMarkingListed(true);
    await supabase.from("listings").update({ vinted_url: vintedUrlInput.trim() }).eq("id", createdItem.id);
    // Mark first-item-free pass as used on wizard completion
    if (profile?.first_item_pass_used === false) {
      await supabase.from("profiles").update({ first_item_pass_used: true }).eq("user_id", user!.id);
    }
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
        <div className="space-y-3 lg:space-y-4">
          {/* Polish 4: removed redundant "How would you like to add your item?" — heading already says it */}
          {[
            { method: "url" as EntryMethod, icon: Link2, label: "Paste Vinted URL", sub: "Auto-fill details from any listing", badge: "Fastest", color: "bg-primary/10 text-primary" },
            { method: "photo" as EntryMethod, icon: Camera, label: "Upload Photos", sub: "Add photos and fill in details", badge: null, color: "bg-accent/10 text-accent" },
            { method: "manual" as EntryMethod, icon: Pencil, label: "Manual Entry", sub: "Enter all details yourself", badge: null, color: "bg-muted text-muted-foreground" },
          ].map(({ method, icon: Icon, label, sub, badge, color }) => (
            <Card
              key={method}
              onClick={() => setEntryMethod(method)}
              className="p-4 lg:p-6 cursor-pointer hover:border-primary/40 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 lg:gap-4">
                <div className={`w-10 h-10 lg:w-14 lg:h-14 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="w-5 h-5 lg:w-6 lg:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm lg:text-base">{label}</p>
                  <p className="text-[11px] lg:text-sm text-muted-foreground">{sub}</p>
                </div>
                {badge && <Badge variant="secondary" className="text-[10px] shrink-0">{badge}</Badge>}
                <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5 text-muted-foreground" />
              </div>
            </Card>
          ))}
        </div>
      );
    }

    // Bug 2 & 3: helper for back button + breadcrumb badge
    const methodLabel = entryMethod === "url" ? "🔗 Paste URL" : entryMethod === "photo" ? "📷 Upload Photos" : "✏️ Manual Entry";

    if (entryMethod === "url") {
      return (
        <div className="space-y-4">
          {/* Bug 2: proper ghost Button with icon; Bug 3: breadcrumb badge */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground -ml-2" onClick={() => setEntryMethod(null)}>
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            <Badge variant="secondary" className="text-[10px] font-medium">{methodLabel}</Badge>
          </div>
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
          {/* Bug 2 & 3 */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground -ml-2" onClick={() => setEntryMethod(null)}>
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            <Badge variant="secondary" className="text-[10px] font-medium">{methodLabel}</Badge>
          </div>
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
        {/* Bug 2 & 3 */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground -ml-2" onClick={() => setEntryMethod(null)}>
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          <Badge variant="secondary" className="text-[10px] font-medium">{methodLabel}</Badge>
        </div>
        {renderDetailsForm()}
      </div>
    );
  };

  /* Details form shared between all entry methods */
  const renderDetailsForm = () => (
    <div className="space-y-3 lg:space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title *</Label>
        <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Nike Air Force 1 White Trainers" className="text-base" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            Condition *
            {urlImportedNoCondition && !form.condition && (
              <span className="text-[10px] font-normal" style={{ color: "hsl(38 92% 50%)" }}>— please verify</span>
            )}
          </Label>
          <Select value={form.condition} onValueChange={(v) => { setForm((f) => ({ ...f, condition: v })); setUrlImportedNoCondition(false); }}>
          <SelectTrigger
              className="h-10 lg:h-12"
              style={urlImportedNoCondition && !form.condition ? {
                boxShadow: "0 0 0 2px hsl(38 92% 50% / 0.7)",
                borderColor: "hsl(38 92% 50% / 0.5)",
                animation: "condition-pulse 1.8s ease-in-out infinite",
              } : undefined}
            >
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>{conditions.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
          <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
            <SelectTrigger className="h-10 lg:h-12"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Brand</Label>
          {/* Polish 2: h-12 on lg to match Select height */}
          <Input value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} placeholder="Nike, Zara…" className="h-10 lg:h-12" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Size</Label>
          <Input value={form.size} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))} placeholder="M, 10, XL…" className="h-10 lg:h-12" />
        </div>
      </div>
      {/* Colour field with chip selector */}
      {(() => {
        const colourNeedsAttention = photoUrls.length > 0 && !form.colour && !colourDetecting;
        const COLOUR_CHIPS = ["Black","White","Grey","Navy","Blue","Green","Red","Pink","Brown","Beige","Cream","Purple","Yellow","Orange","Multi"];
        return (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              Colour
              <span className="text-[10px] font-normal text-muted-foreground">(helps AI accuracy)</span>
              {colourDetecting && <span className="text-[10px] font-normal" style={{ color: "hsl(38 92% 50%)" }}>— detecting…</span>}
            </Label>
            {/* Colour chip row */}
            <div className="flex gap-1.5 flex-wrap">
              {COLOUR_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, colour: f.colour === chip ? "" : chip }))}
                  className={`px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-full text-[11px] lg:text-xs font-medium border transition-all ${
                    form.colour === chip
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/60 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
            {/* Text input for custom colour override */}
            <Input
              value={form.colour}
              onChange={(e) => setForm((f) => ({ ...f, colour: e.target.value }))}
              placeholder={colourDetecting ? "Detecting from photo…" : "Or type a colour (e.g. Burgundy)"}
              disabled={colourDetecting}
              style={colourNeedsAttention ? {
                boxShadow: "0 0 0 2px hsl(38 92% 50% / 0.7)",
                borderColor: "hsl(38 92% 50% / 0.5)",
                animation: "condition-pulse 1.8s ease-in-out infinite",
              } : undefined}
            />
            {colourNeedsAttention && (
              <p className="text-[10px]" style={{ color: "hsl(38 92% 50%)" }}>
                Colour helps the AI write an accurate title — select a chip or type it above
              </p>
            )}
          </div>
        );
      })()}
      {/* Seller notes / defect disclosure */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Anything the buyer should know?
          <span className="text-[10px] font-normal text-muted-foreground ml-1">(optional)</span>
        </Label>
        <Textarea
          value={form.seller_notes}
          onChange={(e) => setForm((f) => ({ ...f, seller_notes: e.target.value }))}
          placeholder="e.g. Small bobble on the back, faded slightly on the left shoulder, tiny mark on the inside collar — these things happen with worn items. Leave blank if none."
          rows={2}
          className="text-sm resize-none"
        />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Honest disclosures build trust with buyers and protect you from disputes. The AI will weave these naturally into the description.
        </p>
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
      {/* Bug 4: sticky mobile CTA — fixed on mobile, normal on desktop */}
      {/* Add pb-20 sm:pb-0 to the form so content isn't hidden behind the sticky bar */}
      <div className="pb-20 sm:pb-0" />
      {createdItem ? (
        <div className="sm:static fixed bottom-0 left-0 right-0 z-30 sm:z-auto bg-background/95 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none px-4 sm:px-0 pb-[env(safe-area-inset-bottom)] sm:pb-0 pt-3 sm:pt-0 border-t border-border sm:border-0 mt-2">
          <Button
            className="w-full h-11 lg:h-12 font-semibold lg:text-base"
            onClick={() => {
              setStepStatus((s) => ({ ...s, 1: "done" }));
              setDirection(1);
              setCurrentStep(2);
              scrollToTop();
            }}
          >
            Continue to Photos <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      ) : (
        <div className="sm:static fixed bottom-0 left-0 right-0 z-30 sm:z-auto bg-background/95 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none px-4 sm:px-0 pb-[env(safe-area-inset-bottom)] sm:pb-0 pt-3 sm:pt-0 border-t border-border sm:border-0 mt-2">
          <Button
            className="w-full h-11 lg:h-12 font-semibold lg:text-base"
            disabled={!form.title || !form.condition || creating || uploading}
            onClick={createItem}
          >
            {creating || uploading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating item…</>
              : <>Create Item & Set Price <ArrowRight className="w-4 h-4 ml-1.5" /></>}
          </Button>
        </div>
      )}
    </div>
  );

  /* ═══ STEP 2: PHOTOS (v3) ═══ */
  const renderStep2 = () => (
    <div className="space-y-4">
      <p className="text-xs lg:text-sm text-muted-foreground">Enhance your photos with AI for better click-through rates.</p>

      {/* Full-width portrait image preview — motivates photo enhancement */}
      {createdItem?.image_url ? (
        <div className="space-y-3">
          {/* Before/after inline view when Quick Remove BG has run */}
          {quickBgResult && originalImageUrl ? (
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Before", url: originalImageUrl },
                { label: "After", url: quickBgResult },
              ].map(({ label, url }) => (
                <div key={label} className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
                  <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-muted border border-border">
                    <img src={url} alt={label} className="w-full h-full object-cover" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="relative w-full max-w-[220px] lg:max-w-[320px] mx-auto aspect-[4/5] rounded-xl overflow-hidden bg-muted border border-border shadow-sm">
              <img src={createdItem.image_url} alt="" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-white text-[10px] lg:text-xs font-medium truncate">{createdItem.title}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
          No photo uploaded — Photo Studio works best with an item photo.
        </div>
      )}

      {!photoDone && !photoPolling && (
        <div className="space-y-2">
          {/* Quick Remove Background — only when item has a photo and hasn't run yet */}
          {createdItem?.image_url && !quickBgResult && (
            <Button
              variant="outline"
              className="w-full h-11 lg:h-12 font-semibold gap-2 border-primary/30 text-primary hover:bg-primary/5"
              disabled={quickBgProcessing}
              onClick={runQuickRemoveBg}
            >
              {quickBgProcessing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Removing background…</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Quick Remove Background</>
              )}
            </Button>
          )}
          <Button
            className="w-full h-11 lg:h-12 font-semibold"
            onClick={() => {
              if (createdItem) {
                // Mark that user has intentionally gone to Photo Studio
                // so the re-entry useEffect knows to start polling on return
                hasNavigatedToPhotoStudioRef.current = true;
                sessionStorage.setItem("sell_wizard_item_id", createdItem.id);
                sessionStorage.setItem("sell_wizard_step", "2");
                navigate(`/vintography?itemId=${createdItem.id}&image_url=${encodeURIComponent(createdItem.image_url || "")}&returnTo=/sell`);
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
        <Button className="w-full h-11 font-semibold" onClick={skipPhotos}>
          I'm done — Continue <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      )}

      {photoDone && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/25 text-success text-sm font-semibold">
          <Check className="w-4 h-4 shrink-0" /> Photo enhancement saved — great work!
        </div>
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
        {/* Bug 6: proper ghost button with icon */}
        {!optimiseLoading && optimiseResult && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={() => {
              setOptimiseSaved(false);
              setOptimiseResult(null);
              runOptimise();
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Re-generate
          </Button>
        )}
      </div>

      {/* Bug 5: skeleton loading instead of bare spinner */}
      {optimiseLoading && (
        <div className="space-y-3 animate-pulse">
          <div className="rounded-lg border bg-muted/40 h-24 lg:h-32" />
          <div className="rounded-lg border bg-muted/30 h-16 lg:h-20" />
          <div className="rounded-lg border bg-muted/20 h-32 lg:h-40" />
        </div>
      )}

      {optimiseResult && !optimiseLoading && (
        <div className="space-y-3">
          {/* Health score card with breakdown info */}
          <div className="rounded-lg border border-border bg-muted/20 p-3 lg:p-5 space-y-2">
            <div className="flex items-center gap-3">
              <HealthScoreMini score={optimiseResult.health_score} />
              <div className="flex-1 min-w-0">
                <p className="text-xs lg:text-sm font-semibold">
                  Health Score: {optimiseResult.health_score}/100
                </p>
                <p className="text-[10px] lg:text-xs text-muted-foreground">
                  {optimiseResult.health_score >= 80
                    ? "Excellent — ready to post!"
                    : optimiseResult.health_score >= 60
                    ? "Good — above average"
                    : "Needs improvement — see tips below"}
                </p>
              </div>
            </div>
            {/* Score breakdown explanation */}
            <div className="grid grid-cols-4 gap-1 pt-1 border-t border-border/50">
              {[
                { label: "Title", pts: optimiseResult.title_score ?? 25, max: 25 },
                { label: "Desc", pts: optimiseResult.description_score ?? 25, max: 25 },
                { label: "Photos", pts: optimiseResult.photo_score ?? "?", max: 25 },
                { label: "Details", pts: optimiseResult.completeness_score ?? "?", max: 25 },
              ].map(({ label, pts, max }) => (
                <div key={label} className="text-center">
                  <p className="text-[9px] lg:text-xs text-muted-foreground font-medium">{label}</p>
                  <p className={`text-[9px] lg:text-xs font-bold ${typeof pts === "number" && pts < max ? "text-warning" : "text-success"}`}>{pts}/{max}</p>
                </div>
              ))}
            </div>
            {optimiseResult.health_score < 60 && (
              <p className="text-[10px] text-warning bg-warning/10 border border-warning/20 rounded px-2 py-1.5 leading-relaxed">
                💡 Score is low because photos haven't been enhanced yet. Complete Photo Studio in the next step to unlock full points.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-background p-3 lg:p-5 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] lg:text-xs uppercase tracking-wider font-semibold text-muted-foreground">Optimised Title</p>
              <CopyBtn text={optimiseResult.optimised_title} label="Title" />
            </div>
            <p className="text-sm lg:text-base font-semibold leading-snug">{optimiseResult.optimised_title}</p>
          </div>

          <div className="rounded-lg border border-border bg-background p-3 lg:p-5 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] lg:text-xs uppercase tracking-wider font-semibold text-muted-foreground">Optimised Description</p>
              <CopyBtn text={optimiseResult.optimised_description} label="Description" />
            </div>
            <p className={`text-xs lg:text-sm text-muted-foreground leading-relaxed ${descExpanded ? "" : "line-clamp-5"}`}>{optimiseResult.optimised_description}</p>
            {optimiseResult.optimised_description.length > 300 && (
              <button onClick={() => setDescExpanded(v => !v)} className="text-[10px] lg:text-xs text-primary hover:underline mt-1">
                {descExpanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>

          {!optimiseSaved ? (
            <Button className="w-full h-11 lg:h-12 font-semibold" onClick={saveOptimised}>
              <Check className="w-4 h-4 mr-2" /> Save optimised listing
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/25 text-success text-sm font-semibold">
                <Check className="w-4 h-4 shrink-0" />
                {optimiseResult.health_score >= 80
                  ? "Saved — your listing looks excellent!"
                  : optimiseResult.health_score >= 60
                  ? "Saved — good listing, photos will boost it further."
                  : "Saved — enhance photos next to improve the score."}
              </div>
              {/* Free user conversion banner — shown after optimise credit consumed */}
              {isFreeUser && !isUnlimitedUser && creditsRemaining === 0 && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <span className="text-base shrink-0">🎯</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground mb-0.5">You've completed your free item!</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">
                      Upgrade to Pro for 50 credits/month — sell more, earn more.
                    </p>
                    <Button
                      size="sm"
                      className="h-8 text-xs font-semibold"
                      onClick={() => navigate("/settings?tab=billing")}
                    >
                      Upgrade to Pro →
                    </Button>
                  </div>
                </div>
              )}
              {/* Disclosure confirmation */}
              {form.seller_notes.trim() && (
                optimiseResult.seller_notes_disclosed === false ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-warning/10 border border-warning/25 text-warning text-xs font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    We couldn't confirm your notes were included — please review the description before saving.
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/8 border border-primary/15 text-primary text-xs font-medium">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    Your item notes were included in the description
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  /* ═══ STEP 4: PRICE CHECK (v3) ═══ */
  const renderStep4 = () => (
    <div className="space-y-4">
      {/* Free tier credit nudge — shown after price check used a credit */}
      {isFreeUser && !isUnlimitedUser && priceAccepted && creditsRemaining <= 1 && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-warning/10 border border-warning/30">
          <span className="text-base shrink-0">💡</span>
          <p className="text-xs text-foreground leading-relaxed">
            This used 1 of your 3 free credits.{" "}
            <button
              className="font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity text-primary"
              onClick={() => navigate("/settings?tab=billing")}
            >
              Upgrade for unlimited checks.
            </button>
          </p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {priceLoading ? "Analysing market prices…" : priceResult ? "Market analysis complete" : "Ready to analyse"}
        </p>
        {!priceLoading && priceResult && (
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => { setPriceResult(null); setPriceAccepted(false); runPriceCheck(); }}>
            <RotateCcw className="w-3.5 h-3.5" /> Re-run
          </Button>
        )}
      </div>

      {/* Skeleton loading */}
      {priceLoading && (
        <div className="space-y-3 animate-pulse">
          <div className="rounded-xl border bg-muted/40 h-32 lg:h-44" />
          <div className="rounded-lg border bg-muted/30 h-20 lg:h-24" />
          <div className="rounded-lg border bg-muted/20 h-16 lg:h-20" />
        </div>
      )}

      {priceResult && !priceLoading && (
        <div className="space-y-3">
          {/* Recommended price hero */}
          <div className="rounded-xl border border-success/30 bg-success/5 p-4 lg:p-8 text-center">
            <p className="text-[10px] lg:text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">Recommended Price</p>
            <p className="text-4xl lg:text-6xl font-display font-bold text-success">
              £{priceResult.recommended_price?.toFixed(2) ?? "—"}
            </p>
            {priceResult.confidence_score != null && (
              <p className="text-xs lg:text-sm text-muted-foreground mt-1">{priceResult.confidence_score}% confidence</p>
            )}
          </div>

          {/* Market range bar */}
          {priceResult.price_range_low != null && priceResult.price_range_high != null && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 lg:p-5">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Market Range</p>
              <div className="flex items-center justify-between text-xs lg:text-sm font-bold mb-1.5">
                <span>£{priceResult.price_range_low.toFixed(0)}</span>
                <span className="text-muted-foreground">—</span>
                <span>£{priceResult.price_range_high.toFixed(0)}</span>
              </div>
              <div className="relative h-2 lg:h-3 rounded-full bg-border">
                {(() => {
                  const low = priceResult.price_range_low!;
                  const high = priceResult.price_range_high!;
                  const rec = priceResult.recommended_price ?? (low + high) / 2;
                  const rawPct = high === low ? 50 : ((rec - low) / (high - low)) * 100;
                  const pct = Math.max(5, Math.min(95, rawPct));
                  return (
                    <>
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-warning/60 via-success to-success/60" />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 lg:w-5 lg:h-5 rounded-full bg-white border-2 border-success shadow-md z-10"
                        style={{ left: `${pct}%`, transform: `translateX(-50%) translateY(-50%)` }}
                      />
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* AI insight */}
          {priceResult.ai_insights && (
            <div className="rounded-lg border border-border bg-background p-3 lg:p-5 space-y-1.5">
              <p className={`text-xs lg:text-sm text-muted-foreground leading-relaxed ${insightsExpanded ? "" : "line-clamp-3"}`}>
                {priceResult.ai_insights}
              </p>
              {priceResult.ai_insights.length > 240 && (
                <button
                  onClick={() => setInsightsExpanded((v) => !v)}
                  className="text-[10px] lg:text-xs font-medium text-primary hover:underline"
                >
                  {insightsExpanded ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          )}

          {!priceAccepted ? (
            <div className="space-y-3">
              <Button
                className="w-full h-11 lg:h-12 font-semibold bg-success hover:bg-success/90 text-success-foreground active:scale-[0.98]"
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
                    placeholder={form.currentPrice || "0.00"}
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
          <div className="text-3xl lg:text-5xl mb-2">🎉</div>
          <h3 className="font-display font-bold text-lg lg:text-2xl">You're ready to list!</h3>
          <p className="text-xs lg:text-sm text-muted-foreground mt-1">Your Vinted-Ready Pack is complete. Copy the details below and list it now.</p>
        </motion.div>

        {/* Before/After photo comparison — shown when user enhanced a photo in Step 2 */}
        {createdItem?.last_photo_edit_at && originalImageUrl && createdItem.image_url !== originalImageUrl && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.3 }}
            className="rounded-xl border border-border bg-muted/20 p-3 lg:p-4 space-y-2"
          >
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Photo Enhancement</p>
            <div className="grid grid-cols-2 gap-2">
              {[{ label: "Before", url: originalImageUrl }, { label: "After", url: createdItem.image_url! }].map(({ label, url }) => (
                <div key={label} className="space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
                  <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-muted border border-border">
                    <img src={url} alt={label} className="w-full h-full object-cover" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Profit Estimate card — only when both prices are known */}
        {createdItem?.purchase_price && createdItem?.current_price && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
            className="rounded-xl border border-border bg-muted/30 p-4 lg:p-6"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Profit Estimate</p>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Cost Price</span>
                <span>£{createdItem.purchase_price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Sell Price</span>
                <span>£{createdItem.current_price.toFixed(2)}</span>
              </div>
              {(() => {
                const netProfit = createdItem.current_price * 0.95 - createdItem.purchase_price;
                const marginPct = createdItem.purchase_price > 0
                  ? Math.round((netProfit / createdItem.purchase_price) * 100)
                  : null;
                const isNeg = netProfit < 0;
                return (
                  <div className={`border-t border-border mt-2 pt-2 flex justify-between items-center font-bold ${isNeg ? "text-destructive" : "text-success"}`}>
                    <span>Est. Net Profit</span>
                    <div className="flex items-center gap-2">
                      <span>£{netProfit.toFixed(2)}</span>
                      {marginPct !== null && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                          isNeg
                            ? "bg-destructive/10 border-destructive/30 text-destructive"
                            : "bg-success/10 border-success/30 text-success"
                        }`}>
                          {isNeg ? "" : "+"}{marginPct}% margin
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}

        {createdItem && !showFallback && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.3 }}
          >
            <VintedReadyPack
              item={createdItem as any}
              onOptimise={() => setCurrentStep(3)}
              onPhotoStudio={() => setCurrentStep(2)}
            />
          </motion.div>
        )}

        {/* Bug 8: Softer "tip" tone instead of jarring warning banner */}
        {showFallback && createdItem && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.3 }}
            className="space-y-3"
          >
            <div className="rounded-lg border border-border bg-muted/50 p-3 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-foreground">Tip: boost your listing score</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Re-run the Optimiser or add enhanced photos to boost your listing score before going live.</p>
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

        <div className="rounded-xl border border-border bg-muted/30 p-4 lg:p-6 space-y-2">
          <p className="text-xs lg:text-sm font-semibold">Listed on Vinted? Paste the URL to track it:</p>
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

        {/* Share row: WhatsApp + clipboard */}
        {createdItem && (() => {
          const displayTitle = createdItem.optimised_title || createdItem.title;
          const displayDesc = createdItem.optimised_description || createdItem.description || "";
          const shareText = [displayTitle, displayDesc].filter(Boolean).join("\n\n");
          const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
          return (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-11 lg:h-12 font-semibold gap-2"
                onClick={() => {
                  navigator.clipboard.writeText(shareText);
                  toast.success("Listing copied — paste into Vinted!");
                }}
              >
                <Copy className="w-4 h-4" /> Copy to clipboard
              </Button>
              <Button
                variant="outline"
                className="h-11 lg:h-12 px-4 font-semibold gap-2 border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#25D366]"
                asChild
              >
                <a href={waUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </a>
              </Button>
            </div>
          );
        })()}

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-11 lg:h-12 font-semibold"
            disabled={markingListed}
            onClick={() => {
              if (!createdItem) return;
              toast.success("🎉 Listing complete — here's your item!");
              navigate(`/items/${createdItem.id}`);
            }}
          >
            View Item
          </Button>
          <Button
            className="flex-1 h-11 lg:h-12 font-semibold"
            onClick={() => window.open("https://www.vinted.co.uk/items/new", "_blank")}
          >
            List on Vinted <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>

        {/* "Sell another item" — proper button, not a tiny link */}
        <Button
          variant="ghost"
          className="w-full h-10 text-sm text-muted-foreground hover:text-foreground font-medium gap-2"
          onClick={resetWizard}
        >
          <RotateCcw className="w-3.5 h-3.5" /> Sell another item
        </Button>
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

  // Step title and subtitle for the header — v3 order
  const stepMeta: Record<number, { title: string; sub: string }> = {
    1: entryMethod
      ? { title: "Item details", sub: "Fill in the fields below — the AI uses these to price and optimise your listing." }
      : { title: "Add your item", sub: "Choose how to add the item — we'll guide you through the rest." },
    2: { title: "Enhance your photos", sub: "AI-enhanced photos get up to 3× more views." },
    3: { title: "Optimise your listing", sub: "AI writes an SEO-optimised title and description." },
    4: { title: "Price it right", sub: "AI analyses live market data to find your ideal price." },
    5: { title: "Vinted-Ready Pack", sub: "Everything you need to list this item, right here." },
  };

  const showFooterNav = currentStep !== 1 && currentStep !== 5;
  // Bug 7: only use large bottom padding when footer nav is visible
  const scrollPadding = showFooterNav ? "pb-32 lg:pb-36" : "pb-8 lg:pb-16";
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
    <TooltipProvider>
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Header ── */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border flex items-center gap-3 px-4 lg:px-8 h-14 lg:h-16 shrink-0">
        {/* Bug 10: Home icon → Dashboard with ESC tooltip on desktop */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="hidden lg:block text-xs">
            Press Esc to exit wizard
          </TooltipContent>
        </Tooltip>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <Rocket className="w-4 h-4 text-primary" />
          {headerItemTitle && currentStep > 1 ? (
            <span className="font-display font-bold text-sm lg:text-base truncate max-w-[160px] lg:max-w-[260px]">{headerItemTitle}</span>
          ) : (
            <span className="font-display font-bold text-sm lg:text-base">Sell Wizard</span>
          )}
        </div>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground shrink-0">
          {currentStep > 1 ? `Step ${currentStep} of ${STEPS.length}` : ""}
        </span>
      </div>

      {/* ── Progress bar ── */}
      <ProgressBar currentStep={currentStep} stepStatus={stepStatus} />

      {/* ── Step content ── FIX 8: id for scroll-to-top targeting */}
      <div id="sell-wizard-scroll" className="flex-1 overflow-y-auto">
        <div className={`max-w-lg lg:max-w-2xl mx-auto px-4 lg:px-8 py-6 lg:py-10 ${scrollPadding}`}>
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
              <div className="mb-5 lg:mb-8">
                <h2 className="font-display font-bold text-xl lg:text-3xl">
                  {stepMeta[currentStep]?.title}
                </h2>
                <p className="text-xs lg:text-sm text-muted-foreground mt-0.5">
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
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border px-4 lg:px-8 pt-3 lg:pt-4 pb-4 lg:pb-6 space-y-1.5">
          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button variant="outline" className="h-12 lg:h-14 px-5 lg:px-8 font-semibold" onClick={goBack}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
            <Button
              className="flex-1 h-12 lg:h-14 font-semibold lg:text-base"
              disabled={!canAdvance() && !(currentStep === 2 && photoPolling)}
              onClick={currentStep === 2 && photoPolling && !photoDone ? skipPhotos : goNext}
            >
              Continue <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
          {/* Blocked reason shown as helper below button — never inside button */}
          {blocked && (
            <p className="text-center text-[11px] lg:text-xs text-muted-foreground">{blocked}</p>
          )}
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}
