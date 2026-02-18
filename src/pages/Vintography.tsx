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
import { BatchStrip, type BatchItem } from "@/components/vintography/BatchStrip";
import { ModelPicker } from "@/components/vintography/ModelPicker";
import { BackgroundPicker } from "@/components/vintography/BackgroundPicker";

type Operation = "clean_bg" | "lifestyle_bg" | "virtual_model" | "enhance";
type PhotorealisticTab = "ai_model" | "flatlay" | "mannequin";

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
    id: "virtual_model", icon: UserIcon, label: "Photorealistic", desc: "Model, selfie & flat-lay styles",
    detail: "Choose from selfie-style real-life shots, AI model concepts, or professional flat-lay photography",
    beforeGradient: "from-gray-200 to-gray-100",
    afterGradient: "from-rose-100/60 via-pink-50 to-purple-50/40",
  },
  {
    id: "enhance", icon: Sparkles, label: "Enhance", desc: "Pro retouch, lighting & sharpness",
    detail: "Pro retouch — fix lighting, sharpen details, boost colours to professional e-commerce standard",
    beforeGradient: "from-gray-300/80 to-gray-200/60",
    afterGradient: "from-sky-100/50 via-blue-50/30 to-indigo-50/20",
  },
];

const OP_MAP: Record<Operation, string> = {
  clean_bg: "remove_bg",
  lifestyle_bg: "smart_bg",
  virtual_model: "model_shot",
  enhance: "enhance",
};

export default function Vintography() {
  const { user, profile, credits, refreshCredits } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const itemId = searchParams.get("itemId");

  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [selectedOp, setSelectedOp] = useState<Operation>("clean_bg");
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>(null);

  // Lifestyle BG params
  const [bgStyle, setBgStyle] = useState("studio_white");
  // Virtual model params
  const [modelGender, setModelGender] = useState("female");
  const [modelPose, setModelPose] = useState("standing_front");
  const [modelLook, setModelLook] = useState("classic");
  const [modelBg, setModelBg] = useState("studio");
  // Photorealistic sub-mode
  const [photoTab, setPhotoTab] = useState<PhotorealisticTab>("ai_model");
  const [flatlayStyle, setFlatlayStyle] = useState("minimal_white");
  // AI Model shot style & full-body toggle
  const [modelShotStyle, setModelShotStyle] = useState("editorial");
  const [modelFullBody, setModelFullBody] = useState(true);
  // Mannequin params
  const [mannequinType, setMannequinType] = useState("headless");
  const [mannequinLighting, setMannequinLighting] = useState("soft_studio");

  const [gallery, setGallery] = useState<VintographyJob[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);

  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [activeBatchIndex, setActiveBatchIndex] = useState(0);

  // Explicit save-to-item state
  const [savedToItem, setSavedToItem] = useState(false);
  const [savingToItem, setSavingToItem] = useState(false);
  const [resultReady, setResultReady] = useState(false);

  const vintographyUsed = (credits as any)?.vintography_used ?? 0;
  const creditsLimit = credits?.credits_limit ?? 5;
  const isUnlimited = (profile as any)?.subscription_tier === "scale" || creditsLimit >= 999;

  // Load image from URL param
  useEffect(() => {
    const imageUrl = searchParams.get("image_url");
    if (imageUrl && !originalUrl) {
      setOriginalUrl(imageUrl);
      setProcessedUrl(null);
      setBatchItems([]);
    }
  }, [searchParams]);

  // Sprint 1: Fetch item photos from DB when itemId is present
  const [itemData, setItemData] = useState<{ last_optimised_at: string | null } | null>(null);
  const [linkedItemTitle, setLinkedItemTitle] = useState<string>("");
  const [garmentContext, setGarmentContext] = useState("");
  useEffect(() => {
    if (!itemId || !user) return;
    (async () => {
      const { data } = await supabase
        .from("listings")
        .select("image_url, images, last_optimised_at, title, brand, category, description, size, condition")
        .eq("id", itemId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data) return;
      setItemData({ last_optimised_at: data.last_optimised_at });
      setLinkedItemTitle(data.title || "");
      // Auto-populate garment context from item metadata
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
      if (urls.length === 0) return;
      if (urls.length === 1) {
        setOriginalUrl(urls[0]);
        setProcessedUrl(null);
        setBatchItems([]);
      } else {
        // Multiple photos: set first as active, rest in batch
        setOriginalUrl(urls[0]);
        setProcessedUrl(null);
        const items: BatchItem[] = urls.map((u, i) => ({
          id: `item-${i}-${Date.now()}`,
          file: null as any,
          previewUrl: u,
          uploadedUrl: u,
          processedUrl: null,
          status: "pending" as const,
        }));
        setBatchItems(items);
        setActiveBatchIndex(0);
      }
    })();
  }, [itemId, user]);

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

  const updateLinkedItem = async (newProcessedUrl: string) => {
    if (!itemId || !user) return;
    try {
      const { data: listing } = await supabase
        .from("listings").select("images").eq("id", itemId).eq("user_id", user.id).maybeSingle();
      const existingImages = Array.isArray(listing?.images) ? (listing.images as string[]) : [];
      const updatedImages = [...existingImages, newProcessedUrl];
      await supabase.from("listings").update({
        last_photo_edit_at: new Date().toISOString(),
        images: updatedImages as any,
        image_url: existingImages.length === 0 ? newProcessedUrl : undefined,
      }).eq("id", itemId).eq("user_id", user.id);
      await supabase.from("item_activity").insert({
        user_id: user.id, listing_id: itemId, type: "photo_edited",
        payload: { operation: selectedOp, processed_url: newProcessedUrl },
      });
      // Show clear confirmation with link back to item photos tab
      toast.success(linkedItemTitle ? `Photo saved to "${linkedItemTitle}"` : "Photo saved to your item", {
        description: "Tap to view it in the Photos tab",
        action: {
          label: "View Photos",
          onClick: () => navigate(`/items/${itemId}?tab=photos`),
        },
        duration: 6000,
      });
    } catch (err) { console.error("Failed to update linked item:", err); }
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

  // ── Batch: upload ALL files in parallel on selection ──
  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    if (!user) return;
    const fileArr = Array.from(files).slice(0, 10);
    if (fileArr.length === 1) {
      const url = await uploadFile(fileArr[0]);
      if (url) { setOriginalUrl(url); setProcessedUrl(null); setBatchItems([]); }
    } else {
      const items: BatchItem[] = fileArr.map((f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        file: f, previewUrl: URL.createObjectURL(f), uploadedUrl: null, processedUrl: null, status: "uploading" as const,
      }));
      setBatchItems(items);
      setActiveBatchIndex(0);

      // Upload all in parallel
      const results = await Promise.allSettled(fileArr.map((f) => uploadFile(f)));
      const updatedItems = items.map((item, i) => {
        const result = results[i];
        if (result.status === "fulfilled" && result.value) {
          return { ...item, uploadedUrl: result.value, status: "pending" as const };
        }
        return { ...item, status: "error" as const };
      });
      setBatchItems(updatedItems);

      // Set first successful as active
      const firstOk = updatedItems.find(it => it.status === "pending");
      if (firstOk) {
        setOriginalUrl(firstOk.uploadedUrl);
        setProcessedUrl(null);
      }
    }
  }, [user]);

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
    toast.success(isUnlimited ? "Edit complete!" : "Done! −1 credit used");
    refreshCredits();
    return data.processed_url;
  };

  const getParams = (): Record<string, string> => {
    const params: Record<string, string> = {};
    if (selectedOp === "lifestyle_bg") params.bg_style = bgStyle;
    if (selectedOp === "virtual_model") {
      if (photoTab === "flatlay") {
        params.flatlay_style = flatlayStyle;
      } else if (photoTab === "mannequin") {
        params.mannequin_type = mannequinType;
        params.lighting_style = mannequinLighting;
        params.model_bg = modelBg;
      } else {
        // ai_model
        params.gender = modelGender;
        params.pose = modelPose;
        params.model_look = modelLook;
        params.model_bg = modelBg;
        params.shot_style = modelShotStyle;
        params.full_body = modelFullBody ? "true" : "false";
      }
    }
    return params;
  };

  // Resolve actual edge function operation based on sub-mode
  const getOperation = (): string => {
    if (selectedOp === "virtual_model") {
      if (photoTab === "flatlay") return "flatlay_style";
      if (photoTab === "mannequin") return "mannequin_shot";
      return "model_shot";
    }
    return OP_MAP[selectedOp];
  };

  const handleProcess = async () => {
    if (!originalUrl) return;
    setProcessing(true);
    setProcessingStep("uploading");
    try {
      // Simulate step progression while the edge function works
      setTimeout(() => setProcessingStep("analysing"), 800);
      setTimeout(() => setProcessingStep("generating"), 3000);
      setTimeout(() => setProcessingStep("finalising"), 7000);

      const result = await processImage(originalUrl, getOperation(), getParams());
      if (result) {
        setProcessedUrl(result);
        setSavedToItem(false);
        setResultReady(true);
        fetchGallery();
        // Scroll to result preview so user sees it
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 200);
        // Clear highlight after 3s
        setTimeout(() => setResultReady(false), 3000);
      }
    } catch (err: any) { toast.error(err.message || "Processing failed. Try again."); }
    finally { setProcessing(false); setProcessingStep(null); }
  };

  const handleSaveToItem = async () => {
    if (!processedUrl || !itemId) return;
    setSavingToItem(true);
    await updateLinkedItem(processedUrl);
    setSavedToItem(true);
    setSavingToItem(false);
  };

  const handleDownload = async () => {
    if (!processedUrl) return;
    try {
      const res = await fetch(processedUrl); const blob = await res.blob();
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = `vintography-${Date.now()}.png`; a.click(); URL.revokeObjectURL(url);
    } catch { toast.error("Download failed"); }
  };

  const handleBatchProcessAll = async () => {
    if (batchItems.length <= 1) return;
    setProcessing(true);
    let doneCount = 0;
    for (let i = 0; i < batchItems.length; i++) {
      const item = batchItems[i];
      const url = item.uploadedUrl;
      if (!url || item.status === "error") {
        setBatchItems((prev) => prev.map((it, idx) => idx === i ? { ...it, status: "error" } : it));
        continue;
      }
      setBatchItems((prev) => prev.map((it, idx) => idx === i ? { ...it, status: "processing" } : it));
      setActiveBatchIndex(i); setOriginalUrl(url); setProcessedUrl(null);
      setProcessingStep("analysing");
      try {
        const result = await processImage(url, getOperation(), getParams());
        setBatchItems((prev) => prev.map((it, idx) => idx === i ? { ...it, processedUrl: result, status: result ? "done" : "error" } : it));
        if (result) { setProcessedUrl(result); doneCount++; }
      } catch {
        setBatchItems((prev) => prev.map((it, idx) => idx === i ? { ...it, status: "error" } : it));
      }
    }
    setProcessing(false); setProcessingStep(null);
    fetchGallery();
    toast.success(`${doneCount}/${batchItems.length} photos processed successfully`);
  };

  const handleBatchSelect = (idx: number) => {
    setActiveBatchIndex(idx);
    const item = batchItems[idx];
    setOriginalUrl(item.uploadedUrl || item.previewUrl);
    setProcessedUrl(item.processedUrl);
  };

  const handleBatchRemove = (idx: number) => {
    setBatchItems((prev) => prev.filter((_, i) => i !== idx));
    if (activeBatchIndex >= idx && activeBatchIndex > 0) setActiveBatchIndex((p) => p - 1);
  };

  const handleDownloadAll = async () => {
    const downloadable = batchItems.filter(i => i.processedUrl);
    if (downloadable.length === 0) return;
    for (let i = 0; i < downloadable.length; i++) {
      toast.info(`Downloading ${i + 1} of ${downloadable.length}…`);
      try {
        const res = await fetch(downloadable[i].processedUrl!);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `vintography-${downloadable[i].id}.png`;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        await new Promise(r => setTimeout(r, 400));
      } catch {}
    }
    toast.success("All downloads complete");
  };

  const handleUseAsInput = (job: VintographyJob) => {
    const url = job.processed_url || job.original_url;
    setOriginalUrl(url);
    setProcessedUrl(null);
    setBatchItems([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetAll = () => {
    setOriginalUrl(null); setProcessedUrl(null); setBatchItems([]); setActiveBatchIndex(0); setProcessingStep(null);
  };

  const returnTo = searchParams.get("returnTo");
  const fromWizard = returnTo === "/sell";

  return (
    <PageShell
      title="Photo Studio"
      subtitle={itemId && linkedItemTitle ? `Editing photos for: ${linkedItemTitle}` : "AI-powered photo editing for your listings"}
      maxWidth="max-w-4xl"
    >
      {/* Back navigation — Wizard takes priority over item back-link */}
      {fromWizard ? (
        <div className="mb-3 -mt-1">
          <button
            onClick={() => navigate("/sell")}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
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
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {linkedItemTitle}
          </button>
        </div>
      ) : null}
      <FeatureGate feature="vintography">
        <div className="space-y-3 sm:space-y-5">
          <CreditBar used={vintographyUsed} limit={creditsLimit} unlimited={isUnlimited} />

          {/* Photo quality guidance banner — FIX 11: use localStorage so dismiss persists across sessions */}
          {!localStorage.getItem("vintography_guidance_dismissed") && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 rounded-lg bg-primary/[0.04] border border-primary/10 p-2.5 sm:p-3"
            >
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">Best results</span> with a full, flat-lay or hanger shot showing the entire garment. Close-ups, folded shots, or partial views may produce unexpected results.
                </p>
              </div>
              <button
                onClick={() => {
                  localStorage.setItem("vintography_guidance_dismissed", "1");
                  // Force re-render
                  setProcessedUrl(prev => prev);
                }}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}

          {!originalUrl ? (
            /* ─── Upload Zone ─── */
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card
                className="border-2 border-dashed border-primary/30 hover:border-primary/60 transition-colors cursor-pointer p-6 sm:p-12 text-center"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center gap-2.5 sm:gap-3">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Upload className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-sm sm:text-lg">Drop your photos here</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">or tap to upload · JPG, PNG, WebP · Max 10MB</p>
                  </div>
                  <Button size="sm" className="h-11 sm:h-9 active:scale-95 transition-transform">
                    <Camera className="w-4 h-4 mr-1.5" /> Choose Photos
                  </Button>
                  {!itemId && (
                    <div className="mt-2">
                      <ItemPickerDialog onSelect={(picked) => {
                        navigate(`/vintography?itemId=${picked.id}`, { replace: true });
                      }}>
                        <button className="text-xs text-primary hover:underline font-medium">
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
            /* ─── Editor ─── */
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 sm:space-y-4">
              <BatchStrip items={batchItems} activeIndex={activeBatchIndex} onSelect={handleBatchSelect}
                onRemove={handleBatchRemove} onDownloadAll={handleDownloadAll} />

              {/* 4 Operation Cards with visual previews */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3">
                {OPERATIONS.map((op) => {
                  const isSelected = selectedOp === op.id;
                  return (
                    <Card
                      key={op.id}
                      onClick={() => setSelectedOp(op.id)}
                      className={`p-2.5 sm:p-4 cursor-pointer transition-all active:scale-[0.97] ${
                        isSelected
                          ? "ring-2 ring-primary border-primary/30 bg-primary/[0.04]"
                          : "hover:border-primary/20"
                      }`}
                    >
                      {/* Before/After preview strip */}
                      <div className="flex gap-1 mb-1.5 sm:mb-2">
                        <div className={`flex-1 h-6 sm:h-8 rounded bg-gradient-to-br ${op.beforeGradient} border border-border/50`} />
                        <div className="flex items-center">
                          <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/60" />
                        </div>
                        <div className={`flex-1 h-6 sm:h-8 rounded bg-gradient-to-br ${op.afterGradient} border border-border/50`} />
                      </div>

                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <p className="font-semibold text-xs sm:text-sm">{op.label}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">{op.desc}</p>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 shrink-0 mt-0.5">
                          <Badge variant="secondary" className="text-[8px] px-1 py-0">
                            <Coins className="w-2 h-2 mr-0.5" />1
                          </Badge>
                          {op.id === "virtual_model" && (
                            <Badge variant="outline" className="text-[7px] px-1 py-0 text-primary border-primary/40">
                              New ✦
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Expanded detail on selection */}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed"
                          >
                            {op.detail}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </Card>
                  );
                })}
              </div>

              {/* Garment description input for context-sensitive operations */}
              {(selectedOp === "virtual_model" || selectedOp === "lifestyle_bg") && (
                <Card className="p-2.5 sm:p-3 space-y-1.5 sm:space-y-2">
                  {/* Operation-specific photo quality warning */}
                  <div className="flex items-start gap-2 rounded-md bg-warning/[0.06] border border-warning/15 p-1.5 sm:p-2">
                    <Info className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Make sure your photo shows the <span className="font-semibold text-foreground">full garment</span> (front view, neckline to hem). Folded or cropped photos won't work well for {selectedOp === "virtual_model" ? "model shots" : "lifestyle scenes"}.
                    </p>
                  </div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Describe your item {itemId ? "(auto-filled)" : "(optional)"}
                  </label>
                  <input
                    type="text"
                    value={garmentContext}
                    onChange={(e) => setGarmentContext(e.target.value)}
                    placeholder="e.g. Black Nike crewneck sweatshirt, size M"
                    className="flex h-11 sm:h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base sm:text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <p className="text-[10px] text-muted-foreground">Helps the AI reproduce your garment accurately</p>
                </Card>
              )}

              {/* Operation-specific params */}
              <AnimatePresence mode="wait">
                {selectedOp === "lifestyle_bg" && (
                  <motion.div key="bg_params" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <BackgroundPicker value={bgStyle} onChange={setBgStyle} />
                  </motion.div>
                )}
                {selectedOp === "virtual_model" && (
                  <motion.div key="model_params" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <Card className="p-4 space-y-3">
                      {/* Sub-mode tab strip */}
                      <Tabs value={photoTab} onValueChange={(v) => setPhotoTab(v as PhotorealisticTab)}>
                        <TabsList className="w-full grid grid-cols-3">
                          <TabsTrigger value="ai_model" className="text-xs gap-1">
                            <UserIcon className="w-3 h-3" /> AI Model
                          </TabsTrigger>
                          <TabsTrigger value="flatlay" className="text-xs gap-1">
                            <Layers className="w-3 h-3" /> Flat-Lay Pro
                          </TabsTrigger>
                          <TabsTrigger value="mannequin" className="text-xs gap-1">
                            <Package className="w-3 h-3" /> Mannequin
                          </TabsTrigger>
                        </TabsList>

                        {/* AI Model */}
                        <TabsContent value="ai_model" className="mt-3 space-y-3">
                          {/* Shot Style selector */}
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Shot Style</p>
                            <div className="grid grid-cols-3 gap-1.5">
                              {MODEL_SHOT_STYLES.map((s) => {
                                const sel = modelShotStyle === s.value;
                                return (
                                  <motion.button
                                    key={s.value}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setModelShotStyle(s.value)}
                                    className={`flex flex-col items-center gap-1 rounded-xl p-2.5 border text-center transition-all ${
                                      sel ? "border-primary bg-primary/[0.06] ring-1 ring-primary/30" : "border-border hover:border-primary/20 bg-background"
                                    }`}
                                  >
                                    <span className={`text-[11px] font-semibold leading-tight ${sel ? "text-primary" : "text-foreground"}`}>{s.label}</span>
                                    <span className="text-[9px] text-muted-foreground leading-tight">{s.desc}</span>
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>
                          {/* Full garment toggle */}
                          <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5">
                            <div>
                              <p className="text-xs font-semibold">Always show full garment</p>
                              <p className="text-[10px] text-muted-foreground">Guarantees neckline-to-hem visibility</p>
                            </div>
                            <Switch checked={modelFullBody} onCheckedChange={setModelFullBody} />
                          </div>
                          <ModelPicker
                            gender={modelGender} look={modelLook} pose={modelPose} bg={modelBg}
                            onGenderChange={setModelGender} onLookChange={setModelLook}
                            onPoseChange={setModelPose} onBgChange={setModelBg}
                          />
                        </TabsContent>

                        {/* Flat-Lay Pro */}
                        <TabsContent value="flatlay" className="mt-3">
                          <p className="text-[10px] text-muted-foreground mb-2.5 leading-relaxed">
                            Professional overhead flat-lay photography. Great for showing garment shape and detail.
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {FLATLAY_STYLES.map((style) => {
                              const selected = flatlayStyle === style.value;
                              return (
                                <motion.button
                                  key={style.value}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => setFlatlayStyle(style.value)}
                                  className={`flex flex-col items-start gap-0.5 rounded-xl p-3 border text-left transition-all ${
                                    selected ? "border-primary ring-1 ring-primary/30 bg-primary/[0.04]" : "border-border hover:border-primary/20"
                                  }`}
                                >
                                  <span className={`text-[11px] font-semibold ${selected ? "text-primary" : "text-foreground"}`}>{style.label}</span>
                                  <span className="text-[9px] text-muted-foreground">{style.desc}</span>
                                </motion.button>
                              );
                            })}
                          </div>
                        </TabsContent>

                        {/* Mannequin */}
                        <TabsContent value="mannequin" className="mt-3 space-y-4">
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            Professional retail display shots. No model needed — great for any garment type.
                          </p>
                          {/* Mannequin Type */}
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Mannequin Type</p>
                            <div className="grid grid-cols-2 gap-1.5">
                              {MANNEQUIN_TYPES.map((mt) => {
                                const sel = mannequinType === mt.value;
                                return (
                                  <motion.button
                                    key={mt.value}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setMannequinType(mt.value)}
                                    className={`flex flex-col items-start gap-1 rounded-xl p-3 border text-left transition-all ${
                                      sel ? "border-primary bg-primary/[0.06] ring-1 ring-primary/30" : "border-border hover:border-primary/20 bg-background"
                                    }`}
                                  >
                                    <mt.icon className={`w-4 h-4 ${sel ? "text-primary" : "text-muted-foreground"}`} />
                                    <span className={`text-[11px] font-semibold ${sel ? "text-primary" : "text-foreground"}`}>{mt.label}</span>
                                    <span className="text-[9px] text-muted-foreground leading-tight">{mt.desc}</span>
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>
                          {/* Lighting */}
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Lighting Style</p>
                            <div className="grid grid-cols-3 gap-1.5">
                              {MANNEQUIN_LIGHTINGS.map((ml) => {
                                const sel = mannequinLighting === ml.value;
                                return (
                                  <motion.button
                                    key={ml.value}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setMannequinLighting(ml.value)}
                                    className={`flex flex-col items-center gap-1 rounded-xl p-2.5 border text-center transition-all ${
                                      sel ? "border-primary bg-primary/[0.06] ring-1 ring-primary/30" : "border-border hover:border-primary/20 bg-background"
                                    }`}
                                  >
                                    <ml.icon className={`w-4 h-4 ${sel ? "text-primary" : "text-muted-foreground"}`} />
                                    <span className={`text-[11px] font-semibold leading-tight ${sel ? "text-primary" : "text-foreground"}`}>{ml.label}</span>
                                    <span className="text-[9px] text-muted-foreground leading-tight">{ml.desc}</span>
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>
                          {/* Background — reuse modelBg */}
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Background / Setting</p>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                              {MANNEQUIN_BACKGROUNDS.map((mbg) => {
                                const sel = modelBg === mbg.value;
                                return (
                                  <motion.button
                                    key={mbg.value}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setModelBg(mbg.value)}
                                    className={`flex flex-col items-center gap-1 rounded-xl p-2.5 border text-center transition-all ${
                                      sel ? "border-primary bg-primary/[0.06] ring-1 ring-primary/30" : "border-border hover:border-primary/20 bg-background"
                                    }`}
                                  >
                                    <span className={`text-[11px] font-semibold leading-tight ${sel ? "text-primary" : "text-foreground"}`}>{mbg.label}</span>
                                    <span className="text-[9px] text-muted-foreground leading-tight">{mbg.desc}</span>
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Preview */}
              <div
                ref={resultRef}
                className={`rounded-xl transition-all duration-700 ${resultReady ? "ring-2 ring-success ring-offset-2 shadow-lg shadow-success/20" : ""}`}
              >
                <ComparisonView
                  originalUrl={originalUrl} processedUrl={processedUrl}
                  processing={processing} processingStep={processingStep}
                  operationId={selectedOp}
                  variations={[]} currentVariation={0} onVariationChange={() => {}}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                {batchItems.length > 1 ? (
                  <Button onClick={handleBatchProcessAll} disabled={processing}
                    className="flex-1 h-12 sm:h-11 font-semibold active:scale-95 transition-transform">
                    {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                    {processing ? "Processing…" : `Process All ${batchItems.length} Photos`}
                  </Button>
                ) : (
                  <Button onClick={handleProcess} disabled={processing}
                    className="flex-1 h-12 sm:h-11 font-semibold active:scale-95 transition-transform">
                    {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                    {processing ? "Processing…" : `Apply ${OPERATIONS.find(o => o.id === selectedOp)?.label}`}
                  </Button>
                )}
                {processedUrl && (
                  <>
                    {itemId && (
                      <Button
                        onClick={handleSaveToItem}
                        disabled={savedToItem || savingToItem}
                        className={`flex-1 sm:flex-none h-12 sm:h-11 font-semibold active:scale-95 transition-all ${
                          savedToItem
                            ? "bg-success/90 text-success-foreground hover:bg-success/80"
                            : "bg-success text-success-foreground hover:bg-success/90"
                        }`}
                      >
                        {savingToItem ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : savedToItem ? (
                          <Check className="w-4 h-4 mr-2" />
                        ) : (
                          <ImageIcon className="w-4 h-4 mr-2" />
                        )}
                        {savedToItem ? "Saved to item ✓" : `Save to ${linkedItemTitle || "item"}`}
                      </Button>
                    )}
                    <Button variant="outline" onClick={handleProcess} disabled={processing} className="h-12 sm:h-11 active:scale-95 transition-transform">
                      <RefreshCw className="w-4 h-4 mr-2" /> Try Again
                    </Button>
                    <Button variant="outline" onClick={handleDownload} className="h-12 sm:h-11 active:scale-95 transition-transform">
                      <Download className="w-4 h-4 mr-2" /> Download
                    </Button>
                  </>
                )}
                <Button variant="ghost" onClick={resetAll} className="h-12 sm:h-11 active:scale-95 transition-transform">
                  <RotateCcw className="w-4 h-4 mr-2" /> New Photo
                </Button>
              </div>

              {/* Sprint 2: Next Steps after processing */}
              {processedUrl && (
                <Card className="p-3 sm:p-5 border-primary/20 bg-gradient-to-br from-primary/[0.04] to-transparent">
                  <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 sm:mb-3">Next Steps</p>
                  {itemId ? (
                    itemData?.last_optimised_at ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-success">Your item is ready!</p>
                          <p className="text-xs text-muted-foreground">View your Vinted-Ready Pack with copy & download.</p>
                        </div>
                        <Button size="sm" onClick={() => navigate(`/items/${itemId}`)} className="shrink-0">
                          <Package className="w-3.5 h-3.5 mr-1.5" /> View Pack
                          <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">Next: Optimise Your Listing</p>
                          <p className="text-xs text-muted-foreground">Generate a perfect title, description & hashtags.</p>
                        </div>
                        <Button size="sm" onClick={() => navigate(`/optimize?itemId=${itemId}`)} className="shrink-0">
                          <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Optimise
                          <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">Add to Your Inventory</p>
                        <p className="text-xs text-muted-foreground">Create an item with this photo and continue the workflow.</p>
                      </div>
                      <Button size="sm" onClick={() => navigate("/listings")} className="shrink-0">
                        <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Item
                      </Button>
                    </div>
                  )}
                </Card>
              )}
            </motion.div>
          )}

          {/* Previous Edits Gallery */}
          <div className="mt-4 sm:mt-6">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
              <h2 className="font-display font-bold text-xs sm:text-base">Previous Edits</h2>
              {gallery.length > 0 && <Badge variant="secondary" className="text-[9px] sm:text-[10px]">{gallery.length}</Badge>}
            </div>
            {galleryLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
              </div>
            ) : gallery.length === 0 ? (
              <Card className="p-4 sm:p-6 text-center">
                <ImageIcon className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground/40 mx-auto mb-1.5 sm:mb-2" />
                <p className="text-xs sm:text-sm text-muted-foreground">Your edited photos will appear here</p>
              </Card>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {gallery.map((job) => (
                  <GalleryCard key={job.id} job={job} opLabel={opLabel(job.operation)}
                    onRestore={(j) => {
                      setOriginalUrl(j.original_url); setProcessedUrl(j.processed_url);
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
