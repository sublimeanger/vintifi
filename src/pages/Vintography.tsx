import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { FeatureGate } from "@/components/FeatureGate";
import { ItemPickerDialog } from "@/components/ItemPickerDialog";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import {
  Upload, Camera, ImageOff, Paintbrush, User as UserIcon, Sparkles,
  Loader2, Download, Wand2, RotateCcw, ChevronRight, Image as ImageIcon, Clock,
  RefreshCw, Coins, Package, Info, X, Plus, Check, Layers,
  Sun, Zap, Wind, Ghost, ShirtIcon, PersonStanding,
} from "lucide-react";

import { CreditBar } from "@/components/vintography/CreditBar";
import { ComparisonView, type ProcessingStep } from "@/components/vintography/ComparisonView";
import { GalleryCard, type VintographyJob } from "@/components/vintography/GalleryCard";
import { PhotoFilmstrip, type PhotoEditState } from "@/components/vintography/PhotoFilmstrip";
import { ModelPicker } from "@/components/vintography/ModelPicker";
import { BackgroundPicker } from "@/components/vintography/BackgroundPicker";

type Operation = "clean_bg" | "lifestyle_bg" | "flatlay" | "mannequin" | "ai_model" | "enhance" | "decrease";

const MANNEQUIN_TYPES = [
  { value: "headless", label: "Headless", desc: "Classic retail, no head", icon: PersonStanding },
  { value: "ghost", label: "Ghost / Invisible", desc: "Garment floats 3D", icon: Ghost },
  { value: "dress_form", label: "Dress Form", desc: "Tailor's dummy, artisanal", icon: ShirtIcon },
  { value: "half_body", label: "Half Body", desc: "Waist-up, great for tops", icon: UserIcon },
];

const MANNEQUIN_LIGHTINGS = [
  { value: "soft_studio", label: "Soft Studio", desc: "Even, clean, e-commerce", icon: Sun },
  { value: "dramatic", label: "Dramatic", desc: "Single key, editorial", icon: Zap },
  { value: "natural", label: "Natural Light", desc: "Window light, warm", icon: Wind },
];

const MANNEQUIN_BACKGROUNDS = [
  { value: "studio", label: "White Studio", desc: "Clean & minimal" },
  { value: "grey_gradient", label: "Grey Studio", desc: "Soft gradient" },
  { value: "living_room", label: "Living Room", desc: "Lifestyle warmth" },
  { value: "dressing_room", label: "Dressing Room", desc: "Rail, warm bulbs" },
  { value: "brick", label: "Brick Wall", desc: "Editorial feel" },
  { value: "flat_marble", label: "Marble Surface", desc: "Luxury aesthetic" },
  { value: "park", label: "Park / Outdoor", desc: "Natural greenery" },
];

const MODEL_SHOT_STYLES = [
  { value: "editorial", label: "Editorial", desc: "Polished campaign look" },
  { value: "natural_photo", label: "Natural Photo", desc: "Photorealistic, on-location" },
  { value: "street_style", label: "Street Style", desc: "Candid, authentic energy" },
];

const FLATLAY_STYLES = [
  { value: "minimal_white", label: "Clean White", desc: "No props, pure product focus" },
  { value: "styled_accessories", label: "With Accessories", desc: "Sunglasses, watch, wallet" },
  { value: "seasonal_props", label: "Seasonal Styled", desc: "Flowers, leaves, botanicals" },
  { value: "denim_denim", label: "Denim Surface", desc: "Indigo denim texture below" },
  { value: "wood_grain", label: "Wood Surface", desc: "Warm oak overhead shot" },
];

const OPERATIONS: {
  id: Operation;
  icon: typeof ImageOff;
  label: string;
  desc: string;
  detail: string;
  beforeGradient: string;
  afterGradient: string;
}[] = [
  {
    id: "clean_bg", icon: ImageOff, label: "Clean Background", desc: "Pure white — Vinted's favourite",
    detail: "Removes any background and replaces with pure white — the standard for Vinted listings",
    beforeGradient: "from-amber-200/60 via-stone-300/40 to-emerald-200/50",
    afterGradient: "from-white to-white",
  },
  {
    id: "lifestyle_bg", icon: Paintbrush, label: "Lifestyle Scenes", desc: "Place in a styled environment",
    detail: "Places your garment in a beautiful styled scene — living room, golden park, marble studio and more",
    beforeGradient: "from-white to-gray-100",
    afterGradient: "from-amber-100/80 via-orange-50 to-yellow-50",
  },
  {
    id: "flatlay", icon: Layers, label: "Flat-Lay Pro", desc: "Overhead editorial product shot",
    detail: "Professional overhead flat-lay photography — great for showing garment shape and detail. White, styled, or textured surface.",
    beforeGradient: "from-gray-200 to-gray-100",
    afterGradient: "from-slate-100/80 via-stone-50 to-white",
  },
  {
    id: "mannequin", icon: Package, label: "Mannequin", desc: "Headless, ghost & dress form",
    detail: "Professional retail display shots. No model needed — great for any garment type. Choose headless, ghost, dress form, or half-body.",
    beforeGradient: "from-gray-300/80 to-gray-200/60",
    afterGradient: "from-sky-50/60 via-slate-50/30 to-white",
  },
  {
    id: "enhance", icon: Sparkles, label: "Enhance", desc: "Pro retouch, lighting & sharpness",
    detail: "Pro retouch — fix lighting, sharpen details, boost colours to professional e-commerce standard",
    beforeGradient: "from-gray-300/80 to-gray-200/60",
    afterGradient: "from-sky-100/50 via-blue-50/30 to-indigo-50/20",
  },
  {
    id: "decrease", icon: Wind, label: "Steam & Press", desc: "Remove all creases, instantly",
    detail: "AI-powered crease removal — makes every garment look freshly steamed. No iron needed. Preserves fabric texture, logo, and colour perfectly.",
    beforeGradient: "from-stone-300/60 via-stone-400/40 to-stone-300/60",
    afterGradient: "from-background via-muted/30 to-background",
  },
];

const OP_MAP: Record<Operation, string> = {
  clean_bg: "remove_bg",
  lifestyle_bg: "smart_bg",
  flatlay: "flatlay_style",
  mannequin: "mannequin_shot",
  ai_model: "model_shot",
  enhance: "enhance",
  decrease: "decrease",
};

// Human-readable operation names for the ComparisonView badge
const OP_RESULT_LABEL: Record<Operation, string> = {
  clean_bg: "Background Removed",
  lifestyle_bg: "Lifestyle Scene",
  flatlay: "Flat-Lay Pro",
  mannequin: "Mannequin Shot",
  ai_model: "AI Model",
  enhance: "Enhanced",
  decrease: "Steamed",
};

export default function Vintography() {
  const { user, profile, credits, refreshCredits } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addPhotoInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const itemId = searchParams.get("itemId");

  // ─── Core photo state ───
  // activePhotoUrl: the URL currently loaded in the editing workspace
  // itemPhotos: ordered list of all listing photo URLs (for filmstrip)
  // photoEditStates: per-URL edit state (edited result, saved flag, op applied)
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [itemPhotos, setItemPhotos] = useState<string[]>([]);
  const [photoEditStates, setPhotoEditStates] = useState<Record<string, PhotoEditState>>({});

  const [selectedOp, setSelectedOp] = useState<Operation>("clean_bg");
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>(null);

  // Lifestyle BG params
  const [bgStyle, setBgStyle] = useState("studio_white");
  // AI Model params
  const [modelGender, setModelGender] = useState("female");
  const [modelPose, setModelPose] = useState("standing_front");
  const [modelLook, setModelLook] = useState("classic");
  const [modelBg, setModelBg] = useState("studio");
  const [flatlayStyle, setFlatlayStyle] = useState("minimal_white");
  // AI Model shot style & full-body toggle
  const [modelShotStyle, setModelShotStyle] = useState("editorial");
  const [modelFullBody, setModelFullBody] = useState(true);
  // Mannequin params
  const [mannequinType, setMannequinType] = useState("headless");
  const [mannequinLighting, setMannequinLighting] = useState("soft_studio");
  // Decrease (Steam & Press) params
  const [decreaseIntensity, setDecreaseIntensity] = useState<"light" | "standard" | "deep">("standard");

  const [gallery, setGallery] = useState<VintographyJob[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);

  // Chained second operation
  const [secondaryOp, setSecondaryOp] = useState<Operation | null>(null);

  // Saving state
  const [savingToItem, setSavingToItem] = useState(false);
  const [resultReady, setResultReady] = useState(false);

  // Item metadata
  const [itemData, setItemData] = useState<{ last_optimised_at: string | null } | null>(null);
  const [linkedItemTitle, setLinkedItemTitle] = useState<string>("");
  const [garmentContext, setGarmentContext] = useState("");

  const totalUsed = credits
    ? (credits.price_checks_used + credits.optimizations_used + credits.vintography_used)
    : 0;
  const creditsLimit = credits?.credits_limit ?? 5;
  const isUnlimited = (profile as any)?.subscription_tier === "scale" || creditsLimit >= 999;

  // ─── Computed: the "working" URL for ComparisonView original slot ───
  // Always show the original (unedited) version in ComparisonView's left/before side
  const workingOriginalUrl = activePhotoUrl;

  // Current active photo's saved edit (to restore when switching back)
  const activeEditState = activePhotoUrl ? photoEditStates[activePhotoUrl] : null;

  // ─── Unified effect: handles image_url param + itemId loading (fixes race condition) ───
  useEffect(() => {
    if (!user) return;

    const imageUrl = searchParams.get("image_url");
    const paramItemId = searchParams.get("itemId");

    const fetchItemPhotos = async (id: string, pinUrl: string | null) => {
      const { data } = await supabase
        .from("listings")
        .select("image_url, images, last_optimised_at, title, brand, category, description, size, condition")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!data) return;

      setItemData({ last_optimised_at: data.last_optimised_at });
      setLinkedItemTitle(data.title || "");

      const parts = [data.brand, data.title, data.category, data.size ? `size ${data.size}` : null, data.condition].filter(Boolean);
      if (parts.length > 0) setGarmentContext(parts.join(", "));

      const urls: string[] = [];
      if (data.image_url) urls.push(data.image_url);
      if (Array.isArray(data.images)) {
        for (const img of data.images) {
          const u = typeof img === "string" ? img : (img as any)?.url;
          if (u && !urls.includes(u)) urls.push(u);
        }
      }

      setItemPhotos(urls);

      if (urls.length === 0) {
        // No photos yet — show upload zone
        setActivePhotoUrl(null);
        setProcessedUrl(null);
        return;
      }

      // If deep-linked to specific photo, pin it; otherwise default to first
      const targetUrl = pinUrl && urls.includes(pinUrl) ? pinUrl : (pinUrl || urls[0]);
      setActivePhotoUrl(targetUrl);
      setProcessedUrl(null);
    };

    if (imageUrl) {
      // Deep-linked to specific photo — set it as active immediately
      setActivePhotoUrl(imageUrl);
      setProcessedUrl(null);
      // Also load all item photos for filmstrip context (non-blocking)
      if (paramItemId) fetchItemPhotos(paramItemId, imageUrl);
    } else if (paramItemId) {
      // Load item photos, default first as active
      fetchItemPhotos(paramItemId, null);
    }
  }, [searchParams, user]);

  const fetchGallery = useCallback(async () => {
    if (!user) return;
    try {
      setGalleryLoading(true);
      const { data } = await supabase
        .from("vintography_jobs")
        .select("id, original_url, processed_url, operation, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setGallery((data as VintographyJob[]) || []);
    } catch {} finally { setGalleryLoading(false); }
  }, [user]);

  useEffect(() => { fetchGallery(); }, [fetchGallery]);

  const handleDeleteJob = async (jobId: string) => {
    const { error } = await supabase.from("vintography_jobs").delete().eq("id", jobId);
    if (error) { toast.error("Failed to delete"); return; }
    setGallery((prev) => prev.filter((j) => j.id !== jobId));
    toast.success("Deleted");
  };

  const opLabel = (op: string) => {
    const found = OPERATIONS.find((o) => OP_MAP[o.id] === op || o.id === op);
    return found?.label || op;
  };

  // ─── Replace a specific photo URL in a listing (instead of appending) ───
  const replaceListingPhoto = async (listingId: string, oldUrl: string, newUrl: string) => {
    const { data } = await supabase
      .from("listings")
      .select("image_url, images")
      .eq("id", listingId)
      .eq("user_id", user!.id)
      .maybeSingle();

    if (!data) return;

    const isPrimary = data.image_url === oldUrl;
    const rawImages = Array.isArray(data.images) ? (data.images as string[]) : [];
    const newImages = rawImages.map((u) => (u === oldUrl ? newUrl : u));

    await supabase.from("listings").update({
      image_url: isPrimary ? newUrl : data.image_url,
      images: newImages as any,
      last_photo_edit_at: new Date().toISOString(),
    }).eq("id", listingId).eq("user_id", user!.id);
  };

  // ─── Append a new photo to a listing (add alongside) ───
  const appendListingPhoto = async (newUrl: string) => {
    if (!itemId || !user) return;
    const { data: listing } = await supabase
      .from("listings").select("images, image_url").eq("id", itemId).eq("user_id", user.id).maybeSingle();
    const existingImages = Array.isArray(listing?.images) ? (listing.images as string[]) : [];
    const updatedImages = [...existingImages, newUrl];
    await supabase.from("listings").update({
      last_photo_edit_at: new Date().toISOString(),
      images: updatedImages as any,
      image_url: existingImages.length === 0 ? newUrl : listing?.image_url,
    }).eq("id", itemId).eq("user_id", user.id);
  };

  // ─── Save to item: replace (default) or add alongside ───
  const handleSaveToItem = async (mode: "replace" | "add") => {
    if (!processedUrl || !itemId || !activePhotoUrl) return;
    setSavingToItem(true);

    try {
      if (mode === "replace") {
        await replaceListingPhoto(itemId, activePhotoUrl, processedUrl);

        // Update filmstrip to show edited version in thumbnail
        setItemPhotos((prev) => prev.map((u) => (u === activePhotoUrl ? processedUrl : u)));

        // Now working on the processed (replaced) version
        const prevUrl = activePhotoUrl;
        setActivePhotoUrl(processedUrl);
        setPhotoEditStates((prev) => ({
          ...prev,
          [prevUrl]: { ...prev[prevUrl], savedToItem: true },
          [processedUrl]: { editedUrl: null, savedToItem: false, operationApplied: null },
        }));

        toast.success("Photo replaced in your listing", {
          description: "The original has been swapped with the enhanced version",
          action: { label: "View Photos", onClick: () => navigate(`/items/${itemId}?tab=photos`) },
          duration: 5000,
        });
      } else {
        await appendListingPhoto(processedUrl);
        // Update filmstrip to add the new photo
        setItemPhotos((prev) => [...prev, processedUrl]);
        setPhotoEditStates((prev) => ({
          ...prev,
          [activePhotoUrl]: { ...prev[activePhotoUrl], savedToItem: true },
        }));

        toast.success("Photo added to your listing", {
          description: "Both the original and enhanced version are now in your listing",
          action: { label: "View Photos", onClick: () => navigate(`/items/${itemId}?tab=photos`) },
          duration: 5000,
        });
      }

      // Log activity
      await supabase.from("item_activity").insert({
        user_id: user!.id,
        listing_id: itemId,
        type: "photo_edited",
        payload: { operation: selectedOp, processed_url: processedUrl, mode },
      });
    } catch (err) {
      console.error("Failed to save photo to item:", err);
      toast.error("Failed to save photo");
    } finally {
      setSavingToItem(false);
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!user) return null;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return null; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10MB"); return null; }
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/vintography-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const { error } = await supabase.storage.from("listing-photos").upload(path, file, { contentType: file.type, upsert: true });
    if (error) { toast.error("Failed to upload image"); return null; }
    const { data: pub } = supabase.storage.from("listing-photos").getPublicUrl(path);
    return pub.publicUrl;
  };

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    if (!user) return;
    const fileArr = Array.from(files).slice(0, 10);
    if (fileArr.length === 1) {
      const url = await uploadFile(fileArr[0]);
      if (url) {
        setActivePhotoUrl(url);
        setProcessedUrl(null);
        setItemPhotos([]);
        setPhotoEditStates({});
      }
    } else {
      // Multiple files uploaded standalone (no itemId) — treat as independent photos
      const uploaded: string[] = [];
      for (const f of fileArr) {
        const url = await uploadFile(f);
        if (url) uploaded.push(url);
      }
      if (uploaded.length > 0) {
        setItemPhotos(uploaded);
        setActivePhotoUrl(uploaded[0]);
        setProcessedUrl(null);
        setPhotoEditStates({});
      }
    }
  }, [user]);

  // Handle "Add Photo" from filmstrip + button (only when itemId present)
  const handleAddPhoto = useCallback(async (files: FileList | null) => {
    if (!files || !user || !itemId) return;
    const file = files[0];
    const url = await uploadFile(file);
    if (!url) return;
    // Append to listing
    await appendListingPhoto(url);
    setItemPhotos((prev) => [...prev, url]);
    setActivePhotoUrl(url);
    setProcessedUrl(null);
    toast.success("Photo added to listing");
  }, [user, itemId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const processImage = async (imageUrl: string, operation: string, params: Record<string, string> = {}): Promise<string | null> => {
    const { data, error } = await supabase.functions.invoke("vintography", {
      body: { image_url: imageUrl, operation, parameters: params, garment_context: garmentContext || undefined },
    });
    if (error) throw error;
    if (data?.error) { toast.error(data.error); return null; }
    const deducted = data?.credits_deducted ?? 1;
    toast.success(isUnlimited ? "Edit complete!" : `Done! −${deducted} credit${deducted !== 1 ? "s" : ""} used`);
    refreshCredits();
    return data.processed_url;
  };

  const getParams = (): Record<string, string> => {
    const params: Record<string, string> = {};
    if (selectedOp === "lifestyle_bg") params.bg_style = bgStyle;
    if (selectedOp === "decrease") params.intensity = decreaseIntensity;
    if (selectedOp === "flatlay") {
      params.flatlay_style = flatlayStyle;
    } else if (selectedOp === "mannequin") {
      params.mannequin_type = mannequinType;
      params.lighting_style = mannequinLighting;
      params.model_bg = modelBg;
    } else if (selectedOp === "ai_model") {
      params.gender = modelGender;
      params.pose = modelPose;
      params.model_look = modelLook;
      params.model_bg = modelBg;
      params.shot_style = modelShotStyle;
      params.full_body = modelFullBody ? "true" : "false";
    }
    return params;
  };

  const getOperation = (): string => {
    return OP_MAP[selectedOp];
  };

  const getOperationLabel = (): string => {
    if (selectedOp === "clean_bg") return "Removing background...";
    if (selectedOp === "enhance") return "Enhancing photo...";
    if (selectedOp === "decrease") return "Steaming & pressing garment...";
    if (selectedOp === "lifestyle_bg") return "Creating lifestyle scene...";
    if (selectedOp === "flatlay") return "Creating flat-lay shot...";
    if (selectedOp === "mannequin") {
      const typeLabel = MANNEQUIN_TYPES.find(t => t.value === mannequinType)?.label || "mannequin";
      return `Placing garment on ${typeLabel} mannequin...`;
    }
    if (selectedOp === "ai_model") return "Generating AI model shot...";
    return "Processing...";
  };

  const isFlashOp = (): boolean => {
    if (selectedOp === "clean_bg" || selectedOp === "enhance" || selectedOp === "decrease") return true;
    if (selectedOp === "lifestyle_bg" || selectedOp === "flatlay" || selectedOp === "mannequin") return true;
    return false; // ai_model uses Pro model
  };

  const handleProcess = async () => {
    if (!activePhotoUrl) return;
    setProcessing(true);
    setProcessingStep("uploading");
    try {
      if (isFlashOp()) {
        setTimeout(() => setProcessingStep("analysing"), 500);
        setTimeout(() => setProcessingStep("generating"), 2000);
        setTimeout(() => setProcessingStep("finalising"), 8000);
      } else {
        setTimeout(() => setProcessingStep("analysing"), 800);
        setTimeout(() => setProcessingStep("generating"), 4000);
        setTimeout(() => setProcessingStep("finalising"), 20000);
      }

      // Step 1: primary operation
      const step1Result = await processImage(activePhotoUrl, getOperation(), getParams());
      if (!step1Result) return;

      let finalResult = step1Result;

      // Step 2: optional chained operation
      if (secondaryOp) {
        toast.info(`Step 1 done — now applying ${OPERATIONS.find(o => o.id === secondaryOp)?.label}...`, { duration: 2500 });
        setProcessingStep("generating");

        // Build params for the secondary op (simple ops — no sub-params needed)
        const secondaryParams: Record<string, string> = {};
        if (secondaryOp === "decrease") secondaryParams.intensity = decreaseIntensity;

        const step2Op = OP_MAP[secondaryOp];
        const step2Result = await processImage(step1Result, step2Op, secondaryParams);
        if (step2Result) finalResult = step2Result;
      }

      setProcessedUrl(finalResult);
      setResultReady(true);
      fetchGallery();

      // Store per-photo edit state
      setPhotoEditStates((prev) => ({
        ...prev,
        [activePhotoUrl]: {
          editedUrl: finalResult,
          savedToItem: false,
          operationApplied: selectedOp,
        },
      }));

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
      setTimeout(() => setResultReady(false), 3000);
    } catch (err: any) { toast.error(err.message || "Processing failed. Try again."); }
    finally { setProcessing(false); setProcessingStep(null); }
  };

  // Switch active photo in filmstrip — restores that photo's edit state
  const handleFilmstripSelect = (url: string) => {
    setActivePhotoUrl(url);
    const editState = photoEditStates[url];
    if (editState?.editedUrl) {
      setProcessedUrl(editState.editedUrl);
    } else {
      setProcessedUrl(null);
    }
  };

  const handleDownload = async () => {
    if (!processedUrl) return;
    try {
      const res = await fetch(processedUrl); const blob = await res.blob();
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = `vintography-${Date.now()}.png`; a.click(); URL.revokeObjectURL(url);
    } catch { toast.error("Download failed"); }
  };

  const handleUseAsInput = (job: VintographyJob) => {
    const url = job.processed_url || job.original_url;
    setActivePhotoUrl(url);
    setProcessedUrl(null);
    setItemPhotos([]);
    setPhotoEditStates({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetAll = () => {
    setActivePhotoUrl(null);
    setProcessedUrl(null);
    setItemPhotos([]);
    setPhotoEditStates({});
    setProcessingStep(null);
  };

  const returnTo = searchParams.get("returnTo");
  const fromWizard = returnTo === "/sell";

  // Whether we have a linked item with photos to show (filmstrip mode)
  const hasFilmstrip = itemId && itemPhotos.length > 0;

  // Count of edited photos in this session
  const editedCount = Object.values(photoEditStates).filter((s) => s.editedUrl !== null).length;
  const savedCount = Object.values(photoEditStates).filter((s) => s.savedToItem).length;

  // The current active photo's saved state (drives button state)
  const activePhotoSaved = activePhotoUrl ? photoEditStates[activePhotoUrl]?.savedToItem === true : false;

  // ─── Generate button shared component ───
  const GenerateButton = () => {
    const isAiModel = selectedOp === "ai_model";
    const primaryCredits = isAiModel ? 4 : 1;
    const secondaryCredits = secondaryOp ? (secondaryOp === "ai_model" ? 4 : 1) : 0;
    const totalCredits = primaryCredits + secondaryCredits;
    const label = secondaryOp
      ? `Apply both effects · ${totalCredits} credit${totalCredits !== 1 ? "s" : ""}`
      : isAiModel
        ? "Generate · 4 credits"
        : `Apply ${OPERATIONS.find(o => o.id === selectedOp)?.label || ""}`;
    return (
      <Button
        onClick={handleProcess}
        disabled={processing || !activePhotoUrl}
        className="w-full h-12 lg:h-11 font-semibold text-sm lg:text-base active:scale-95 transition-transform"
      >
        {processing ? <Loader2 className="w-4 h-4 lg:w-5 lg:h-5 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />}
        {processing ? getOperationLabel() : label}
      </Button>
    );
  };

  return (
    <PageShell
      title="Photo Studio"
      subtitle={itemId && linkedItemTitle ? `Editing photos for: ${linkedItemTitle}` : "AI-powered photo editing for your listings"}
      maxWidth="max-w-5xl"
    >
      {/* Back navigation */}
      {fromWizard ? (
        <div className="mb-3 -mt-1">
          <button
            onClick={() => navigate("/sell")}
            className="inline-flex items-center gap-1.5 text-xs lg:text-sm font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Sell Wizard
          </button>
        </div>
      ) : itemId && linkedItemTitle ? (
        <div className="mb-3 -mt-1">
          <button
            onClick={() => navigate(`/items/${itemId}?tab=photos`)}
            className="flex items-center gap-1.5 text-xs lg:text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {linkedItemTitle}
          </button>
        </div>
      ) : null}

      <FeatureGate feature="vintography">
        <div className="space-y-3 sm:space-y-4 lg:space-y-5">
          <CreditBar used={totalUsed} limit={creditsLimit} unlimited={isUnlimited} />

          {/* Guidance banner */}
          {!localStorage.getItem("vintography_guidance_dismissed") && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5 rounded-xl bg-primary/[0.04] border border-primary/10 p-3 lg:p-4"
            >
              <Info className="w-4 h-4 lg:w-5 lg:h-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs lg:text-sm text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">Best results</span> with a full, flat-lay or hanger shot showing the entire garment. Close-ups, folded shots, or partial views may produce unexpected results.
                </p>
              </div>
              <button
                onClick={() => {
                  localStorage.setItem("vintography_guidance_dismissed", "1");
                  setProcessedUrl(prev => prev);
                }}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* ─── No active photo: show upload zone ─── */}
          {!activePhotoUrl ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card
                className="border-2 border-dashed border-primary/30 hover:border-primary/60 transition-colors cursor-pointer p-8 sm:p-12 lg:p-20 text-center"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center gap-3 sm:gap-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-2xl lg:rounded-3xl bg-primary/10 flex items-center justify-center">
                    <Upload className="w-7 h-7 sm:w-9 sm:h-9 lg:w-11 lg:h-11 text-primary" />
                  </div>
                  <div>
                    {itemId && linkedItemTitle ? (
                      <>
                        <p className="font-display font-bold text-base sm:text-xl lg:text-2xl">No photos yet</p>
                        <p className="text-xs sm:text-sm lg:text-base text-muted-foreground mt-1">
                          Upload the first photo for <span className="font-semibold text-foreground">{linkedItemTitle}</span>
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-display font-bold text-base sm:text-xl lg:text-2xl">Drop your photos here</p>
                        <p className="text-xs sm:text-sm lg:text-base text-muted-foreground mt-1">or tap to upload · JPG, PNG, WebP · Max 10MB</p>
                      </>
                    )}
                  </div>
                  <Button size="lg" className="h-12 lg:h-14 px-8 lg:px-10 text-sm lg:text-base active:scale-95 transition-transform">
                    <Camera className="w-4 h-4 lg:w-5 lg:h-5 mr-2" /> Choose Photos
                  </Button>
                  {!itemId && (
                    <div className="mt-1">
                      <ItemPickerDialog onSelect={(picked) => {
                        navigate(`/vintography?itemId=${picked.id}`, { replace: true });
                      }}>
                        <button className="text-sm text-primary hover:underline font-medium">
                          or pick from your items
                        </button>
                      </ItemPickerDialog>
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => { if (e.target.files?.length) handleFileSelect(e.target.files); }}
                />
              </Card>
            </motion.div>
          ) : (
            /* ─── Editor: Two-column on desktop ─── */
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-[440px_1fr] lg:gap-6 lg:items-start">

                {/* ── LEFT PANEL: Operation config ── */}
                <div className="space-y-3 lg:space-y-4">

                  {/* Standard Operation Cards (2x2 grid) — 1 credit each */}
                  <div className="grid grid-cols-2 gap-2 lg:gap-3">
                    {OPERATIONS.filter(op => op.id !== "decrease" && op.id !== "ai_model").map((op) => {
                      const isSelected = selectedOp === op.id;
                      return (
                        <Card
                          key={op.id}
                          onClick={() => setSelectedOp(op.id)}
                          className={`p-3 lg:p-4 cursor-pointer transition-all active:scale-[0.97] ${
                            isSelected
                              ? "ring-2 ring-primary border-primary/30 bg-primary/[0.04]"
                              : "hover:border-primary/20"
                          }`}
                        >
                          {/* Before/After preview strip */}
                          <div className="flex gap-1 mb-2 lg:mb-2.5">
                            <div className={`flex-1 h-7 lg:h-10 rounded bg-gradient-to-br ${op.beforeGradient} border border-border/50`} />
                            <div className="flex items-center">
                              <ChevronRight className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-muted-foreground/60" />
                            </div>
                            <div className={`flex-1 h-7 lg:h-10 rounded bg-gradient-to-br ${op.afterGradient} border border-border/50`} />
                          </div>

                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <p className="font-semibold text-xs lg:text-sm leading-tight">{op.label}</p>
                              <p className="text-[10px] lg:text-xs text-muted-foreground mt-0.5">{op.desc}</p>
                            </div>
                            <Badge variant="secondary" className="text-[8px] lg:text-[10px] px-1 py-0 shrink-0 mt-0.5">
                              <Coins className="w-2 h-2 lg:w-2.5 lg:h-2.5 mr-0.5" />1
                            </Badge>
                          </div>

                          <AnimatePresence>
                            {isSelected && (
                              <motion.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="text-[10px] lg:text-xs text-muted-foreground mt-2 leading-relaxed"
                              >
                                {op.detail}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Steam & Press — full-width finishing tool card */}
                  {(() => {
                    const op = OPERATIONS.find(o => o.id === "decrease")!;
                    const isSelected = selectedOp === "decrease";
                    return (
                      <Card
                        onClick={() => setSelectedOp("decrease")}
                        className={`p-3 lg:p-4 cursor-pointer transition-all active:scale-[0.97] ${
                          isSelected
                            ? "ring-2 ring-primary border-primary/30 bg-primary/[0.04]"
                            : "hover:border-primary/20"
                        }`}
                      >
                        <div className="flex items-center gap-3 lg:gap-4">
                          {/* Wide before/after strip */}
                          <div className="flex gap-1 items-center shrink-0 w-32 lg:w-44">
                            <div
                              className="flex-1 h-10 lg:h-12 rounded border border-border/50"
                              style={{
                                background: "repeating-linear-gradient(135deg, hsl(var(--muted)) 0px, hsl(var(--muted)) 2px, hsl(var(--muted-foreground) / 0.15) 2px, hsl(var(--muted-foreground) / 0.15) 6px, hsl(var(--muted)) 6px, hsl(var(--muted)) 10px, hsl(var(--muted-foreground) / 0.08) 10px, hsl(var(--muted-foreground) / 0.08) 12px)",
                              }}
                            />
                            <ChevronRight className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-muted-foreground/60 shrink-0" />
                            <div className="flex-1 h-10 lg:h-12 rounded bg-gradient-to-br from-background via-muted/30 to-background border border-primary/20" />
                          </div>

                          {/* Label + detail */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <Wind className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-primary shrink-0" />
                              <p className="font-semibold text-xs lg:text-sm leading-tight">{op.label}</p>
                            </div>
                            <p className="text-[10px] lg:text-xs text-muted-foreground">{op.desc}</p>
                            <AnimatePresence>
                              {isSelected && (
                                <motion.p
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="text-[10px] lg:text-xs text-muted-foreground mt-1 leading-relaxed"
                                >
                                  {op.detail}
                                </motion.p>
                              )}
                            </AnimatePresence>
                          </div>

                          <Badge variant="secondary" className="text-[8px] lg:text-[10px] px-1 py-0 shrink-0 self-start mt-0.5">
                            <Coins className="w-2 h-2 lg:w-2.5 lg:h-2.5 mr-0.5" />1
                          </Badge>
                        </div>
                      </Card>
                    );
                  })()}

                  {/* ─── PREMIUM AI FEATURE SECTION ─── */}
                  <div className="space-y-2">
                    {/* Divider with label */}
                    <div className="flex items-center gap-2 pt-1">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[10px] lg:text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Premium AI Feature</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>

                    {/* AI Model Shot card — premium styling */}
                    {(() => {
                      const isSelected = selectedOp === "ai_model";
                      return (
                        <Card
                          onClick={() => setSelectedOp("ai_model")}
                          className={`cursor-pointer transition-all active:scale-[0.97] overflow-hidden ${
                            isSelected
                              ? "ring-2 ring-primary border-primary/40"
                              : "hover:border-primary/30 border-primary/20"
                          }`}
                          style={{
                            background: isSelected
                              ? "linear-gradient(135deg, hsl(var(--primary) / 0.07) 0%, hsl(280 70% 60% / 0.04) 100%)"
                              : "linear-gradient(135deg, hsl(var(--primary) / 0.03) 0%, hsl(280 70% 60% / 0.02) 100%)",
                          }}
                        >
                          <div className="p-3 lg:p-4">
                            {/* Header row */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                  <UserIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-bold text-xs lg:text-sm leading-tight">AI Model Shot</p>
                                  <p className="text-[10px] lg:text-xs text-muted-foreground">Photorealistic human wearing your garment</p>
                                </div>
                              </div>
                              <Badge className="text-[8px] lg:text-[10px] px-1.5 py-0.5 shrink-0 bg-primary text-primary-foreground">
                                <Coins className="w-2 h-2 lg:w-2.5 lg:h-2.5 mr-0.5" />4 credits
                              </Badge>
                            </div>

                            {/* Use cases */}
                            <div className="space-y-1 mb-2">
                              <p className="text-[10px] lg:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Best for:</p>
                              <ul className="space-y-0.5">
                                {[
                                  "Designer & premium items (£30+) — justify the asking price",
                                  "Items where fit & drape are the selling point",
                                  "Hero photo in your listing's first position",
                                  "Brands buyers want to see worn — Nike, Levi's, Ralph Lauren",
                                ].map((point, i) => (
                                  <li key={i} className="flex items-start gap-1.5">
                                    <span className="text-primary shrink-0 mt-0.5 text-[10px]">✦</span>
                                    <span className="text-[10px] lg:text-xs text-muted-foreground leading-relaxed">{point}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Credit note */}
                            <div className="flex items-center gap-1.5 rounded-lg bg-primary/[0.05] border border-primary/15 px-2.5 py-1.5">
                               <Sparkles className="w-3 h-3 text-primary shrink-0" />
                               <p className="text-[10px] lg:text-xs text-muted-foreground leading-relaxed">
                                 Powered by our most advanced AI model.
                               </p>
                            </div>
                          </div>
                        </Card>
                      );
                    })()}
                  </div>

                  {/* Garment description input — shown for ops that need it */}
                  {(selectedOp === "ai_model" || selectedOp === "mannequin" || selectedOp === "lifestyle_bg") && (
                    <Card className="p-3 lg:p-4 space-y-2 lg:space-y-3">
                      <div className="flex items-start gap-2 rounded-lg bg-warning/[0.06] border border-warning/15 p-2 lg:p-2.5">
                        <Info className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-warning shrink-0 mt-0.5" />
                        <p className="text-[10px] lg:text-xs text-muted-foreground leading-relaxed">
                          Make sure your photo shows the <span className="font-semibold text-foreground">full garment</span> (front view, neckline to hem). Folded or cropped photos won't work well for {selectedOp === "lifestyle_bg" ? "lifestyle scenes" : "photorealistic shots"}.
                        </p>
                      </div>
                      <label className="text-[10px] lg:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Describe your item {itemId ? "(auto-filled)" : "(optional)"}
                      </label>
                      <input
                        type="text"
                        value={garmentContext}
                        onChange={(e) => setGarmentContext(e.target.value)}
                        placeholder="e.g. Black Nike crewneck sweatshirt, size M"
                        className="flex h-11 lg:h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-base lg:text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                      <p className="text-[10px] lg:text-xs text-muted-foreground">Helps the AI reproduce your garment accurately</p>
                    </Card>
                  )}

                  {/* Operation-specific params */}
                  <AnimatePresence mode="wait">
                    {selectedOp === "decrease" && (
                      <motion.div key="decrease_params" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        <Card className="p-4 lg:p-5 space-y-3 lg:space-y-4">
                          <div className="flex items-center gap-2">
                            <Wind className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
                            <p className="text-sm lg:text-base font-semibold">Press Intensity</p>
                          </div>
                          <div className="grid grid-cols-3 gap-2 lg:gap-2.5">
                            {([
                              { value: "light", label: "Light Press", sub: "Sharp packing lines only" },
                              { value: "standard", label: "Steam", sub: "All storage creases gone" },
                              { value: "deep", label: "Deep Press", sub: "Showroom perfect" },
                            ] as const).map((opt) => {
                              const sel = decreaseIntensity === opt.value;
                              return (
                                <motion.button
                                  key={opt.value}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => setDecreaseIntensity(opt.value)}
                                  className={`flex flex-col items-center gap-1 lg:gap-1.5 rounded-xl p-2.5 lg:p-3.5 border text-center transition-all ${
                                    sel ? "border-primary bg-primary/[0.06] ring-1 ring-primary/30" : "border-border hover:border-primary/20 bg-background"
                                  }`}
                                >
                                  <span className={`text-[11px] lg:text-xs font-semibold leading-tight ${sel ? "text-primary" : "text-foreground"}`}>{opt.label}</span>
                                  <span className="text-[9px] lg:text-[10px] text-muted-foreground leading-tight">{opt.sub}</span>
                                </motion.button>
                              );
                            })}
                          </div>
                          <p className="text-[10px] lg:text-xs text-muted-foreground leading-relaxed">
                            {decreaseIntensity === "light" && "Gentle only — removes sharp packing lines, preserves natural fabric drape."}
                            {decreaseIntensity === "standard" && "All storage creases removed. Looks professionally steamed."}
                            {decreaseIntensity === "deep" && "Brand new look. Immaculate — every wrinkle eliminated."}
                          </p>
                        </Card>
                      </motion.div>
                    )}
                    {selectedOp === "lifestyle_bg" && (
                      <motion.div key="bg_params" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        <BackgroundPicker value={bgStyle} onChange={setBgStyle} />
                      </motion.div>
                    )}
                    {selectedOp === "flatlay" && (
                      <motion.div key="flatlay_params" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        <Card className="p-3 lg:p-5 space-y-3">
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
                            <p className="text-sm lg:text-base font-semibold">Flat-Lay Style</p>
                          </div>
                          <p className="text-[10px] lg:text-xs text-muted-foreground leading-relaxed">
                            Professional overhead flat-lay photography. Great for showing garment shape and detail.
                          </p>
                          <div className="grid grid-cols-1 gap-2">
                            {FLATLAY_STYLES.map((style) => {
                              const sel = flatlayStyle === style.value;
                              return (
                                <motion.button
                                  key={style.value}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => setFlatlayStyle(style.value)}
                                  className={`flex flex-col items-start gap-0.5 rounded-xl p-3 lg:p-3.5 border text-left transition-all ${
                                    sel ? "border-primary ring-1 ring-primary/30 bg-primary/[0.04]" : "border-border hover:border-primary/20"
                                  }`}
                                >
                                  <span className={`text-xs lg:text-sm font-semibold ${sel ? "text-primary" : "text-foreground"}`}>{style.label}</span>
                                  <span className="text-[10px] lg:text-xs text-muted-foreground">{style.desc}</span>
                                </motion.button>
                              );
                            })}
                          </div>
                        </Card>
                      </motion.div>
                    )}
                    {selectedOp === "mannequin" && (
                      <motion.div key="mannequin_params" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        <Card className="p-3 lg:p-5 space-y-4 lg:space-y-5">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
                            <p className="text-sm lg:text-base font-semibold">Mannequin Options</p>
                          </div>
                          {/* Mannequin Type */}
                          <div>
                            <p className="text-[10px] lg:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Mannequin Type</p>
                            <div className="grid grid-cols-2 gap-1.5 lg:gap-2">
                              {MANNEQUIN_TYPES.map((mt) => {
                                const sel = mannequinType === mt.value;
                                return (
                                  <motion.button
                                    key={mt.value}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setMannequinType(mt.value)}
                                    className={`flex flex-col items-start gap-1 lg:gap-1.5 rounded-xl p-3 lg:p-4 border text-left transition-all ${
                                      sel ? "border-primary bg-primary/[0.06] ring-1 ring-primary/30" : "border-border hover:border-primary/20 bg-background"
                                    }`}
                                  >
                                    <mt.icon className={`w-4 h-4 lg:w-5 lg:h-5 ${sel ? "text-primary" : "text-muted-foreground"}`} />
                                    <span className={`text-xs lg:text-sm font-semibold ${sel ? "text-primary" : "text-foreground"}`}>{mt.label}</span>
                                    <span className="text-[10px] lg:text-xs text-muted-foreground leading-tight">{mt.desc}</span>
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>
                          {/* Lighting */}
                          <div>
                            <p className="text-[10px] lg:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Lighting Style</p>
                            <div className="grid grid-cols-3 gap-1.5 lg:gap-2">
                              {MANNEQUIN_LIGHTINGS.map((ml) => {
                                const sel = mannequinLighting === ml.value;
                                return (
                                  <motion.button
                                    key={ml.value}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setMannequinLighting(ml.value)}
                                    className={`flex flex-col items-center gap-1 lg:gap-1.5 rounded-xl p-2.5 lg:p-3.5 border text-center transition-all ${
                                      sel ? "border-primary bg-primary/[0.06] ring-1 ring-primary/30" : "border-border hover:border-primary/20 bg-background"
                                    }`}
                                  >
                                    <ml.icon className={`w-4 h-4 lg:w-5 lg:h-5 ${sel ? "text-primary" : "text-muted-foreground"}`} />
                                    <span className={`text-[11px] lg:text-xs font-semibold leading-tight ${sel ? "text-primary" : "text-foreground"}`}>{ml.label}</span>
                                    <span className="text-[9px] lg:text-[10px] text-muted-foreground leading-tight">{ml.desc}</span>
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>
                          {/* Background */}
                          <div>
                            <p className="text-[10px] lg:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Background / Setting</p>
                            <div className="grid grid-cols-3 gap-1.5 lg:gap-2">
                              {MANNEQUIN_BACKGROUNDS.map((mbg) => {
                                const sel = modelBg === mbg.value;
                                return (
                                  <motion.button
                                    key={mbg.value}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setModelBg(mbg.value)}
                                    className={`flex flex-col items-center gap-1 rounded-xl p-2.5 lg:p-3 border text-center transition-all ${
                                      sel ? "border-primary bg-primary/[0.06] ring-1 ring-primary/30" : "border-border hover:border-primary/20 bg-background"
                                    }`}
                                  >
                                    <span className={`text-[11px] lg:text-xs font-semibold leading-tight ${sel ? "text-primary" : "text-foreground"}`}>{mbg.label}</span>
                                    <span className="text-[9px] lg:text-[10px] text-muted-foreground leading-tight">{mbg.desc}</span>
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    )}
                    {selectedOp === "ai_model" && (
                      <motion.div key="ai_model_params" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        <div className="space-y-3">
                          {/* Shot Style */}
                          <Card className="p-3 lg:p-4 space-y-2.5">
                            <p className="text-[10px] lg:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Shot Style</p>
                            <div className="grid grid-cols-3 gap-1.5 lg:gap-2">
                              {MODEL_SHOT_STYLES.map((s) => {
                                const sel = modelShotStyle === s.value;
                                return (
                                  <motion.button
                                    key={s.value}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setModelShotStyle(s.value)}
                                    className={`flex flex-col items-center gap-1 lg:gap-1.5 rounded-xl p-2.5 lg:p-3.5 border text-center transition-all ${
                                      sel ? "border-primary bg-primary/[0.06] ring-1 ring-primary/30" : "border-border hover:border-primary/20 bg-background"
                                    }`}
                                  >
                                    <span className={`text-[11px] lg:text-xs font-semibold leading-tight ${sel ? "text-primary" : "text-foreground"}`}>{s.label}</span>
                                    <span className="text-[9px] lg:text-[10px] text-muted-foreground leading-tight">{s.desc}</span>
                                  </motion.button>
                                );
                              })}
                            </div>
                          </Card>
                          {/* Full garment toggle */}
                          <Card className="px-3 lg:px-4 py-2.5 lg:py-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs lg:text-sm font-semibold">Always show full garment</p>
                                <p className="text-[10px] lg:text-xs text-muted-foreground">Guarantees neckline-to-hem visibility</p>
                              </div>
                              <Switch checked={modelFullBody} onCheckedChange={setModelFullBody} />
                            </div>
                          </Card>
                          <ModelPicker
                            gender={modelGender} look={modelLook} pose={modelPose} bg={modelBg}
                            onGenderChange={setModelGender} onLookChange={setModelLook}
                            onPoseChange={setModelPose} onBgChange={setModelBg}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ─── Chain a second effect ─── */}
                  {selectedOp !== "ai_model" && (
                    <Card className="p-3 lg:p-4 space-y-2.5 border-dashed border-primary/20 bg-primary/[0.02]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5 text-primary" />
                          <p className="text-xs lg:text-sm font-semibold">Add a second effect</p>
                        </div>
                        {secondaryOp && (
                          <button
                            onClick={() => setSecondaryOp(null)}
                            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                          >
                            <X className="w-3 h-3" /> Remove
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] lg:text-xs text-muted-foreground leading-relaxed">
                        Chain a second edit — applied automatically after the first. Perfect for <span className="font-medium text-foreground">Steam → Clean BG</span> or <span className="font-medium text-foreground">Clean BG → Enhance</span>.
                      </p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {OPERATIONS.filter(op => op.id !== selectedOp && op.id !== "ai_model").map((op) => {
                          const sel = secondaryOp === op.id;
                          return (
                            <motion.button
                              key={op.id}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setSecondaryOp(sel ? null : op.id)}
                              className={`flex flex-col items-center gap-1 rounded-lg p-2 border text-center transition-all text-[10px] font-medium leading-tight ${
                                sel
                                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                                  : "border-border hover:border-primary/30 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <op.icon className={`w-3.5 h-3.5 ${sel ? "text-primary" : "text-muted-foreground"}`} />
                              {op.label}
                            </motion.button>
                          );
                        })}
                      </div>
                      {secondaryOp && (
                        <div className="flex items-center gap-1.5 rounded-lg bg-primary/[0.05] border border-primary/15 px-2.5 py-1.5">
                          <Check className="w-3 h-3 text-primary shrink-0" />
                          <p className="text-[10px] text-muted-foreground">
                            Will apply <span className="font-medium text-foreground">{OPERATIONS.find(o => o.id === selectedOp)?.label}</span> → then <span className="font-medium text-foreground">{OPERATIONS.find(o => o.id === secondaryOp)?.label}</span> automatically
                          </p>
                        </div>
                      )}
                    </Card>
                  )}

                  {/* Generate button — desktop only in left panel */}
                  <div className="hidden lg:block">
                    <GenerateButton />
                  </div>
                </div>

                {/* ── RIGHT PANEL: Photo filmstrip + Preview + Actions ── */}
                <div className="lg:sticky lg:top-6 space-y-3 lg:space-y-4">

                  {/* PhotoFilmstrip — at the TOP of the right panel, above preview */}
                  {hasFilmstrip && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                      <Card className="p-3 lg:p-4">
                        <PhotoFilmstrip
                          photos={itemPhotos}
                          activeUrl={activePhotoUrl}
                          editStates={photoEditStates}
                          itemId={itemId}
                          onSelect={handleFilmstripSelect}
                          onAddPhoto={() => addPhotoInputRef.current?.click()}
                        />
                        {editedCount > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border">
                            {savedCount > 0
                              ? `${savedCount} of ${editedCount} edits saved to listing`
                              : `${editedCount} photo${editedCount > 1 ? "s" : ""} edited — tap Save to apply`}
                          </p>
                        )}
                      </Card>
                      {/* Hidden file input for + add photo */}
                      <input
                        ref={addPhotoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleAddPhoto(e.target.files)}
                      />
                    </motion.div>
                  )}

                  {/* Non-item multi-photo filmstrip (standalone upload of multiple files) */}
                  {!itemId && itemPhotos.length > 1 && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                      <Card className="p-3 lg:p-4">
                        <PhotoFilmstrip
                          photos={itemPhotos}
                          activeUrl={activePhotoUrl}
                          editStates={photoEditStates}
                          itemId={null}
                          onSelect={handleFilmstripSelect}
                        />
                      </Card>
                    </motion.div>
                  )}

                  {/* Preview */}
                  <div
                    ref={resultRef}
                    className={`rounded-xl transition-all duration-700 ${resultReady ? "ring-2 ring-success ring-offset-2 shadow-lg shadow-success/20" : ""}`}
                  >
                    <ComparisonView
                      originalUrl={workingOriginalUrl!}
                      processedUrl={processedUrl}
                      processing={processing}
                      processingStep={processingStep}
                      operationId={selectedOp}
                      resultLabel={OP_RESULT_LABEL[selectedOp]}
                      variations={[]} currentVariation={0} onVariationChange={() => {}}
                    />
                  </div>

                  {/* Mobile: generate button below preview */}
                  <div className="lg:hidden">
                    <GenerateButton />
                  </div>

                  {/* ─── Action buttons after processing ─── */}
                  {processedUrl && (
                    <div className="space-y-2">
                      {/* Save to Item — replace vs add alongside */}
                      {itemId && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleSaveToItem("replace")}
                            disabled={activePhotoSaved || savingToItem}
                            className={`flex-1 h-10 lg:h-11 text-sm font-semibold active:scale-95 transition-all ${
                              activePhotoSaved
                                ? "bg-success/90 text-success-foreground hover:bg-success/80"
                                : "bg-success text-success-foreground hover:bg-success/90"
                            }`}
                          >
                            {savingToItem ? (
                              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                            ) : activePhotoSaved ? (
                              <Check className="w-4 h-4 mr-1.5" />
                            ) : (
                              <ImageIcon className="w-4 h-4 mr-1.5" />
                            )}
                            {activePhotoSaved ? "Saved ✓" : "Replace Original"}
                          </Button>
                          {!activePhotoSaved && (
                            <Button
                              variant="outline"
                              onClick={() => handleSaveToItem("add")}
                              disabled={savingToItem}
                              className="h-10 lg:h-11 text-sm active:scale-95 transition-transform px-3"
                            >
                              <Plus className="w-4 h-4 mr-1.5" />
                              Add Alongside
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Secondary actions row */}
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={handleProcess} disabled={processing} className="h-10 lg:h-11 text-sm active:scale-95 transition-transform">
                          <RefreshCw className="w-4 h-4 mr-1.5" /> Try Again
                        </Button>
                        <Button variant="outline" onClick={handleDownload} className="h-10 lg:h-11 text-sm active:scale-95 transition-transform">
                          <Download className="w-4 h-4 mr-1.5" /> Download
                        </Button>
                        <Button variant="ghost" onClick={resetAll} className="h-10 lg:h-11 text-sm active:scale-95 transition-transform">
                          <RotateCcw className="w-4 h-4 mr-1.5" /> New Photo
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* New Photo button when no result yet */}
                  {!processedUrl && (
                    <Button variant="ghost" onClick={resetAll} className="w-full h-10 text-sm active:scale-95 transition-transform">
                      <RotateCcw className="w-4 h-4 mr-1.5" /> New Photo
                    </Button>
                  )}

                  {/* Next Steps after processing */}
                  {processedUrl && (
                    <Card className="p-3 lg:p-5 border-primary/20 bg-gradient-to-br from-primary/[0.04] to-transparent">
                      <p className="text-[10px] lg:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 lg:mb-3">Next Steps</p>
                      {itemId ? (
                        hasFilmstrip && editedCount > 0 ? (
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm lg:text-base font-semibold">
                                {itemPhotos.length} photos · {editedCount} enhanced
                              </p>
                              <p className="text-xs lg:text-sm text-muted-foreground">
                                {savedCount < editedCount
                                  ? `Save your ${editedCount - savedCount} remaining edit${editedCount - savedCount > 1 ? "s" : ""} above, then view your item`
                                  : "All edits saved — your listing is ready"}
                              </p>
                            </div>
                            <Button size="sm" onClick={() => navigate(`/items/${itemId}?tab=photos`)} className="shrink-0 lg:h-10 lg:px-4">
                              <ImageIcon className="w-3.5 h-3.5 mr-1.5" /> View Photos
                              <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </div>
                        ) : itemData?.last_optimised_at ? (
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm lg:text-base font-semibold text-success">Your item is ready!</p>
                              <p className="text-xs lg:text-sm text-muted-foreground">View your Vinted-Ready Pack with copy & download.</p>
                            </div>
                            <Button size="sm" onClick={() => navigate(`/items/${itemId}`)} className="shrink-0 lg:h-10 lg:px-4">
                              <Package className="w-3.5 h-3.5 mr-1.5" /> View Pack
                              <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm lg:text-base font-semibold">Next: Optimise Your Listing</p>
                              <p className="text-xs lg:text-sm text-muted-foreground">Generate a perfect title, description & hashtags.</p>
                            </div>
                            <Button size="sm" onClick={() => navigate(`/optimize?itemId=${itemId}`)} className="shrink-0 lg:h-10 lg:px-4">
                              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Optimise
                              <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </div>
                        )
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm lg:text-base font-semibold">Add to Your Inventory</p>
                            <p className="text-xs lg:text-sm text-muted-foreground">Create an item with this photo and continue the workflow.</p>
                          </div>
                          <Button size="sm" onClick={() => navigate("/listings")} className="shrink-0 lg:h-10 lg:px-4">
                            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Item
                          </Button>
                        </div>
                      )}
                    </Card>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Previous Edits Gallery */}
          <div className="mt-4 lg:mt-8">
            <div className="flex items-center gap-2 mb-3 lg:mb-4">
              <Clock className="w-4 h-4 lg:w-5 lg:h-5 text-muted-foreground" />
              <h2 className="font-display font-bold text-sm lg:text-lg">Previous Edits</h2>
              {gallery.length > 0 && (
                <Badge variant="secondary" className="text-[10px] lg:text-xs">{gallery.length}</Badge>
              )}
            </div>
            {galleryLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 lg:gap-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
              </div>
            ) : gallery.length === 0 ? (
              <Card className="p-6 lg:p-10 text-center">
                <ImageIcon className="w-8 h-8 lg:w-10 lg:h-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm lg:text-base text-muted-foreground">Your edited photos will appear here</p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 lg:gap-3">
                {gallery.map((job) => (
                  <GalleryCard key={job.id} job={job} opLabel={opLabel(job.operation)}
                    onRestore={(j) => {
                      setActivePhotoUrl(j.original_url);
                      setProcessedUrl(j.processed_url);
                      setItemPhotos([]);
                      setPhotoEditStates({});
                    }}
                    onDelete={handleDeleteJob}
                    onUseAsInput={handleUseAsInput}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </FeatureGate>
    </PageShell>
  );
}
