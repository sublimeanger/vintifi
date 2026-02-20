import { useState, useEffect, useCallback, useRef } from "react";
import { useKeyboardVisible } from "@/hooks/useKeyboardVisible";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { PHOTO_OPERATIONS, type PhotoOperation, isAtLeastTier, type TierKey } from "@/lib/constants";
import { saveSession, loadSession, clearSession } from "@/components/vintography/vintographyReducer";
import { PageShell } from "@/components/PageShell";
import { CreditBar } from "@/components/vintography/CreditBar";
import { ComparisonView } from "@/components/vintography/ComparisonView";
import { GalleryCard, type VintographyJob } from "@/components/vintography/GalleryCard";
import { PhotoFilmstrip, type PhotoEditState } from "@/components/vintography/PhotoFilmstrip";
import { BackgroundPicker } from "@/components/vintography/BackgroundPicker";
import { ModelOptions } from "@/components/vintography/ModelOptions";
import { UpgradeModal } from "@/components/UpgradeModal";
import ImageLightbox from "@/components/ImageLightbox";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Upload, Eraser, Sun, Image as ImageIcon, User, Camera, RefreshCw,
  Lock, Download, ArrowRight, Sparkles, X, ArrowLeft, Link2, ZoomIn,
} from "lucide-react";

// ── Icon map ─────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  Eraser, Sun, Image: ImageIcon, User, Camera, RefreshCw,
};

// ── Operation labels for gallery ─────────────────────────────────────
const OP_LABELS: Record<string, string> = {
  ...Object.fromEntries(Object.entries(PHOTO_OPERATIONS).map(([k, v]) => [k, v.label])),
  // Legacy operation names from old Gemini-based system
  clean_bg: "Clean Background",
  ai_model: "AI Model",
  lifestyle_bg: "Lifestyle Background",
  enhance: "Enhance",
  mannequin: "Mannequin",
  ghost_mannequin: "Ghost Mannequin",
  flatlay: "Flat-Lay",
  selfie_shot: "Selfie Shot",
  steam: "Steam/Press",
};

export default function Vintography() {
  usePageMeta("Photo Studio — Vintifi", "AI-powered photo editing for resellers");

  const { user, profile, credits, refreshCredits } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get("itemId");
  const preselectedOp = searchParams.get("op") as PhotoOperation | null;
  const imageUrlParam = searchParams.get("image_url");
  const returnTo = searchParams.get("returnTo");

  // ── Core state ─────────────────────────────────────────────────────
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(imageUrlParam || null);
  const [selectedOp, setSelectedOp] = useState<PhotoOperation | null>(preselectedOp && PHOTO_OPERATIONS[preselectedOp] ? preselectedOp : null);
  const [opParams, setOpParams] = useState<Record<string, string>>({});
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingElapsed, setProcessingElapsed] = useState(0);
  const processingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [resultPhoto, setResultPhoto] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const [gallery, setGallery] = useState<VintographyJob[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);

  // Item-linked state
  const [itemPhotos, setItemPhotos] = useState<string[]>([]);
  const [editStates, setEditStates] = useState<Record<string, PhotoEditState>>({});

  // Vinted import state
  const [vintedUrl, setVintedUrl] = useState("");
  const [importingFromVinted, setImportingFromVinted] = useState(false);
  const [importedItemId, setImportedItemId] = useState<string | null>(null);

  // Upgrade modal
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);
  const [upgradeTier, setUpgradeTier] = useState<string | undefined>(undefined);

  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const configPanelRef = useRef<HTMLDivElement>(null);
  const keyboardVisible = useKeyboardVisible();

  // ── Derived values ─────────────────────────────────────────────────
  const effectiveItemId = itemId || importedItemId;
  const userTier = (profile?.subscription_tier || "free") as TierKey;
  const totalUsed = credits ? credits.price_checks_used + credits.optimizations_used + credits.vintography_used : 0;
  const creditsRemaining = credits ? credits.credits_limit - totalUsed : 0;
  const unlimited = (credits?.credits_limit ?? 0) >= 999999;
  const selectedOpConfig = selectedOp ? PHOTO_OPERATIONS[selectedOp] : null;

  // ── Load item photos ───────────────────────────────────────────────
  useEffect(() => {
    if (!effectiveItemId || !user) return;
    (async () => {
      const { data } = await supabase
        .from("listings")
        .select("images, image_url")
        .eq("id", effectiveItemId)
        .eq("user_id", user.id)
        .single();
      if (data) {
        const imgs = Array.isArray(data.images) ? (data.images as string[]) : [];
        const all = data.image_url && !imgs.includes(data.image_url) ? [data.image_url, ...imgs] : imgs;
        setItemPhotos(all.filter(Boolean));
        if (all.length > 0 && !selectedPhoto) setSelectedPhoto(all[0]);
      }
    })();
  }, [effectiveItemId, user]);

  // ── Restore session ────────────────────────────────────────────────
  useEffect(() => {
    if (selectedPhoto || preselectedOp || imageUrlParam) return;
    const session = loadSession();
    if (session.photo) setSelectedPhoto(session.photo);
    if (session.operation) setSelectedOp(session.operation);
    if (session.result) setResultPhoto(session.result);
  }, []);

  // ── Load gallery ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      setGalleryLoading(true);
      const { data } = await supabase
        .from("vintography_jobs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12);
      setGallery((data as VintographyJob[]) || []);
      setGalleryLoading(false);
    })();
  }, [user]);

  // ── Photo upload handler ───────────────────────────────────────────
  const handleFileUpload = useCallback(async (file: File, isSelfie = false) => {
    if (!user) return;

    // HEIC conversion
    let processedFile = file;
    if (file.name.toLowerCase().match(/\.hei[cf]$/)) {
      toast.info("Converting HEIC photo...");
      try {
        const heic2any = (await import("heic2any" as string)).default;
        const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
        processedFile = new File([blob as Blob], file.name.replace(/\.hei[cf]$/i, ".jpg"), { type: "image/jpeg" });
      } catch {
        toast.error("HEIC conversion failed, using original");
      }
    }

    const ext = processedFile.name.split(".").pop() || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from("vintography").upload(path, processedFile, {
      contentType: processedFile.type,
      upsert: true,
    });

    if (error) {
      toast.error("Upload failed");
      return;
    }

    const { data: urlData } = supabase.storage.from("vintography").getPublicUrl(path);
    const url = urlData.publicUrl;

    if (isSelfie) {
      setSelfiePhoto(url);
    } else {
      setSelectedPhoto(url);
      setResultPhoto(null);
    }
  }, [user]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/") || file?.name.match(/\.hei[cf]$/i)) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) handleFileUpload(file);
      }
    }
  }, [handleFileUpload]);

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  // ── Vinted import handler ──────────────────────────────────────────
  const handleVintedImport = async () => {
    if (!vintedUrl.trim() || !user || importingFromVinted) return;

    const url = vintedUrl.trim();
    if (!url.includes("vinted.")) {
      toast.error("Please paste a valid Vinted listing URL");
      return;
    }

    setImportingFromVinted(true);

    try {
      const { data: result, error } = await supabase.functions.invoke("scrape-vinted-url", {
        body: { url },
      });

      if (error) throw error;
      if (!result || result.error) throw new Error(result?.error || "Failed to scrape listing");

      const photos: string[] = Array.isArray(result.photos)
        ? result.photos.filter((u: string) => typeof u === "string" && u.startsWith("http"))
        : [];

      if (photos.length === 0) {
        toast.error("No photos found in that listing");
        return;
      }

      // Create a listing in DB so "Save to Listing" works
      const { data: inserted, error: insertError } = await supabase.from("listings").insert({
        user_id: user.id,
        title: result.title || "Imported from Vinted",
        brand: result.brand || null,
        category: result.category || null,
        size: result.size || null,
        condition: result.condition || null,
        description: result.description || null,
        current_price: result.price || null,
        images: photos,
        image_url: photos[0],
        vinted_url: url,
        source_type: "vinted_url",
      }).select("id").single();

      if (insertError) throw insertError;

      const newItemId = inserted.id;
      setImportedItemId(newItemId);
      setItemPhotos(photos);
      setSelectedPhoto(photos[0]);
      setResultPhoto(null);
      setVintedUrl("");

      toast.success(`${photos.length} photo${photos.length > 1 ? "s" : ""} imported from Vinted!`, {
        description: result.title || undefined,
      });

      // Scroll to show imported photos in filmstrip, then down to operation grid
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 300);
    } catch (err: any) {
      console.error("Vinted import failed:", err);
      toast.error("Couldn't import listing — check the URL and try again");
    } finally {
      setImportingFromVinted(false);
    }
  };

  // ── Operation selection ────────────────────────────────────────────
  const handleSelectOp = (op: PhotoOperation) => {
    const config = PHOTO_OPERATIONS[op];
    if (!isAtLeastTier(userTier, config.tier)) {
      setUpgradeReason(`${config.label} requires the ${config.tier.charAt(0).toUpperCase() + config.tier.slice(1)} plan.`);
      setUpgradeTier(config.tier);
      setUpgradeOpen(true);
      return;
    }
    setSelectedOp(op);
    setOpParams({});
    setResultPhoto(null);

    // Auto-scroll to config panel on mobile for ops that have options
    const hasConfig = op === "put_on_model" || op === "virtual_tryon" || op === "swap_model" || op === "ai_background";
    if (hasConfig && window.innerWidth < 1024) {
      // Wait for AnimatePresence to mount + framer-motion height animation to finish
      setTimeout(() => {
        configPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 450);

      // After config renders, scroll back slightly so user sees both the photo and the config
      setTimeout(() => {
        const preview = document.querySelector("[data-photo-preview]");
        if (preview && window.innerWidth < 1024) {
          const rect = preview.getBoundingClientRect();
          if (rect.top < -50) {
            window.scrollBy({ top: rect.top - 20, behavior: "smooth" });
          }
        }
      }, 800);
    }
  };

  // ── Process ────────────────────────────────────────────────────────
  const handleProcess = async () => {
    if (!selectedPhoto || !selectedOp || !user) return;

    if (selectedOp === "virtual_tryon" && !selfiePhoto) {
      toast.error("Please upload a selfie first");
      return;
    }

    const cost = PHOTO_OPERATIONS[selectedOp].credits;
    if (!unlimited && creditsRemaining < cost) {
      setUpgradeReason(`This operation costs ${cost} credit${cost > 1 ? "s" : ""}. You have ${creditsRemaining} remaining.`);
      setUpgradeOpen(true);
      return;
    }

    setIsProcessing(true);
    setProcessingElapsed(0);
    processingTimerRef.current = setInterval(() => setProcessingElapsed((s) => s + 1), 1000);

    try {
      const { data, error } = await supabase.functions.invoke("photo-studio", {
        body: {
          image_url: selectedPhoto,
          operation: selectedOp,
          parameters: opParams,
          selfie_url: selfiePhoto,
          sell_wizard: !!effectiveItemId,
        },
      });

      if (error) throw error;
      if (data?.error) {
        const errMsg: string = data.error;
        if (data.upgrade_required || errMsg.toLowerCase().includes("credit")) {
          toast.error(errMsg);
          setUpgradeReason(errMsg);
          setUpgradeOpen(true);
        } else if (errMsg.toLowerCase().includes("requires") && errMsg.toLowerCase().includes("plan")) {
          toast.error("Requires Starter plan");
          setUpgradeReason("Requires Starter plan");
          setUpgradeTier("starter");
          setUpgradeOpen(true);
        } else if (errMsg.toLowerCase().includes("timeout") || errMsg.toLowerCase().includes("timed out")) {
          toast.error("Taking longer than expected. Please try again.");
        } else {
          toast.error("Something went wrong. Credits not charged. Please try again.");
        }
        return;
      }

      if (data?.processed_url) {
        setResultPhoto(data.processed_url);
        toast.success(`${selectedOpConfig?.label || "Edit"} complete!`, { duration: 2000 });
        try { navigator?.vibrate?.([10, 30, 15]); } catch {}
        refreshCredits();
        setGallery((prev) => [{
          id: data.job_id,
          original_url: selectedPhoto,
          processed_url: data.processed_url,
          operation: selectedOp,
          status: "completed",
          created_at: new Date().toISOString(),
        }, ...prev].slice(0, 12));

        saveSession({ photo: selectedPhoto, result: data.processed_url, operation: selectedOp });
        if (effectiveItemId) {
          setEditStates((prev) => ({
            ...prev,
            [selectedPhoto!]: {
              editedUrl: data.processed_url,
              savedToItem: false,
              operationApplied: selectedOp,
            },
          }));
        }

        // Scroll to result with smooth reveal
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 250);

        // After user admires the result, gently nudge to show chain suggestions exist
        setTimeout(() => {
          const chainSection = document.querySelector("[data-chain-suggestions]");
          if (chainSection && window.innerWidth < 1024) {
            chainSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        }, 2500);
      }
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.toLowerCase().includes("timeout")) {
        toast.error("Taking longer than expected. Please try again.");
      } else {
        toast.error("Something went wrong. Credits not charged. Please try again.");
      }
    } finally {
      setIsProcessing(false);
      setProcessingElapsed(0);
      if (processingTimerRef.current) clearInterval(processingTimerRef.current);
    }
  };

  // ── Download (saves to camera roll on mobile via Share API) ────────
  const handleDownload = async () => {
    if (!resultPhoto) return;
    try {
      const res = await fetch(resultPhoto);
      const blob = await res.blob();
      const fileName = `vintifi-${selectedOp}-${Date.now()}.png`;
      const file = new File([blob], fileName, { type: blob.type || "image/png" });

      // On mobile, use Web Share API → native share sheet → "Save Image"
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName });
        return;
      }

      // Fallback: standard download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      // User cancelled the share sheet — not an error
      if (err?.name === "AbortError") return;
      toast.error("Download failed");
    }
  };

  // ── Save to item ───────────────────────────────────────────────────
  const handleSaveToItem = async () => {
    if (!resultPhoto || !effectiveItemId || !user) return;
    const { data: listing } = await supabase
      .from("listings")
      .select("images")
      .eq("id", effectiveItemId)
      .single();
    const existing = Array.isArray(listing?.images) ? (listing.images as string[]) : [];

    // Replace the original with the enhanced version at the same position (not append)
    const sourceIndex = selectedPhoto ? existing.indexOf(selectedPhoto) : -1;
    let updatedImages: string[];
    if (sourceIndex >= 0) {
      updatedImages = [...existing];
      updatedImages[sourceIndex] = resultPhoto;
    } else {
      updatedImages = [...existing, resultPhoto];
    }

    const isFirstPhoto = sourceIndex === 0;
    const updateData: Record<string, unknown> = {
      images: updatedImages,
      last_photo_edit_at: new Date().toISOString(),
    };
    if (isFirstPhoto) {
      updateData.image_url = resultPhoto;
    }

    await supabase.from("listings").update(updateData).eq("id", effectiveItemId);
    toast.success(sourceIndex >= 0 ? "Photo replaced in listing" : "Photo saved to listing");
    if (selectedPhoto) {
      setEditStates((prev) => ({
        ...prev,
        [selectedPhoto]: { ...prev[selectedPhoto], savedToItem: true },
      }));
    }
  };

  // ── Gallery actions ────────────────────────────────────────────────
  const handleGalleryRestore = (job: VintographyJob) => {
    if (job.original_url) { setPhotoLoading(true); setSelectedPhoto(job.original_url); }
    if (job.processed_url) setResultPhoto(job.processed_url);
    if (job.operation && PHOTO_OPERATIONS[job.operation as PhotoOperation]) {
      setSelectedOp(job.operation as PhotoOperation);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGalleryUseAsInput = (job: VintographyJob) => {
    setPhotoLoading(true);
    setSelectedPhoto(job.processed_url || job.original_url);
    setResultPhoto(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGalleryDelete = async (id: string) => {
    await supabase.from("vintography_jobs").delete().eq("id", id);
    setGallery((prev) => prev.filter((j) => j.id !== id));
    toast.success("Deleted");
  };

  // ── Edit again ─────────────────────────────────────────────────────
  const handleEditAgain = () => {
    setResultPhoto(null);
    clearSession();
  };

  // ── Render config panel ────────────────────────────────────────────
  const renderConfig = () => {
    if (!selectedOp) return null;

    switch (selectedOp) {
      case "remove_bg":
      case "sell_ready":
      case "studio_shadow":
        return null;

      case "ai_background":
        return (
          <BackgroundPicker
            value={opParams.bg_prompt || ""}
            onChange={(prompt) => setOpParams({ ...opParams, bg_prompt: prompt })}
          />
        );

      case "put_on_model":
      case "swap_model":
        return (
          <ModelOptions
            operation={selectedOp}
            value={{
              gender: opParams.gender || "female",
              pose: opParams.pose,
              ethnicity: opParams.ethnicity,
            }}
            onChange={(params) => setOpParams({ ...opParams, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, (v || "").toLowerCase()])) })}
          />
        );

      case "virtual_tryon":
        return (
          <ModelOptions
            operation="virtual_tryon"
            value={{ gender: opParams.gender || "female" }}
            onChange={(params) => setOpParams({ ...opParams, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, (v || "").toLowerCase()])) })}
            selfieUrl={selfiePhoto || undefined}
            onSelfieUpload={(url) => setSelfiePhoto(url)}
          />
        );

      default:
        return null;
    }
  };

  const canProcess = selectedPhoto && selectedOp && !isProcessing &&
    (selectedOp !== "virtual_tryon" || selfiePhoto);

  const processButtonText = selectedOpConfig
    ? `${selectedOpConfig.label} — ${selectedOpConfig.credits} Credit${selectedOpConfig.credits > 1 ? "s" : ""}`
    : "Select an Operation";

  return (
    <PageShell title="Photo Studio" maxWidth="3xl">
      {/* Credit bar */}
      <div className="sticky top-[52px] lg:top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-border/40 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2.5 lg:mx-0 lg:px-0">
        <div className="flex items-center justify-between">
          <CreditBar used={totalUsed} limit={credits?.credits_limit ?? 5} unlimited={unlimited} loading={!credits} />
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-primary h-7"
            onClick={() => { setUpgradeReason(null); setUpgradeOpen(true); }}
          >
            Top up
          </Button>
        </div>
      </div>

      {returnTo && (
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground mt-2" onClick={() => navigate(returnTo)}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
      )}

      <div className="space-y-6 pt-4 pb-32 lg:pb-8">
        {/* Item photo filmstrip */}
        {effectiveItemId && itemPhotos.length > 0 && (
          <div className="space-y-2">
            <PhotoFilmstrip
              photos={itemPhotos}
              activeUrl={selectedPhoto}
              editStates={editStates}
              itemId={effectiveItemId}
              onSelect={(url) => { setPhotoLoading(true); setSelectedPhoto(url); setResultPhoto(null); }}
            />
            {importedItemId && !itemId && (
              <p className="text-[10px] text-muted-foreground text-center">
                Imported from Vinted · {itemPhotos.length} photo{itemPhotos.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}

        {/* Result area */}
        <AnimatePresence>
          {resultPhoto && selectedPhoto && (
            <motion.div
              ref={resultRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative overflow-hidden rounded-2xl"
            >
              {/* One-time sparkle sweep */}
              <div className="absolute inset-0 sparkle-sweep pointer-events-none z-10" />
              <ComparisonView
                originalUrl={selectedPhoto}
                processedUrl={resultPhoto}
                processing={false}
                operationId={selectedOp || undefined}
                resultLabel={selectedOpConfig?.label}
                variations={[resultPhoto]}
                currentVariation={0}
                onVariationChange={() => {}}
              />
              <div className="flex flex-wrap gap-2 mt-3">
                <Button variant="outline" onClick={handleDownload} className="flex-1 h-11 sm:h-9 text-sm font-semibold rounded-xl active:scale-[0.97] transition-transform">
                  <Download className="w-4 h-4 mr-1.5" /> Download
                </Button>
                {effectiveItemId && (
                  <Button onClick={handleSaveToItem} className="flex-1 h-11 sm:h-9 text-sm font-bold rounded-xl active:scale-[0.97] transition-transform">
                    Save to Listing
                  </Button>
                )}
                <Button variant="ghost" onClick={handleEditAgain} className="h-11 sm:h-9 text-sm rounded-xl active:scale-[0.97] transition-transform">
                  <RefreshCw className="w-4 h-4 mr-1.5" /> Edit Again
                </Button>
              </div>

              {/* Chain next — suggest logical next operations */}
              {(() => {
                const CHAIN_SUGGESTIONS: Record<string, { op: PhotoOperation; label: string; description: string }[]> = {
                  remove_bg: [
                    { op: "put_on_model", label: "Put on Model", description: "Generate a model wearing this item" },
                  ],
                  sell_ready: [
                    { op: "put_on_model", label: "Put on Model", description: "Generate a model wearing this item" },
                  ],
                  studio_shadow: [
                    { op: "put_on_model", label: "Put on Model", description: "Generate a model wearing this item" },
                  ],
                  ai_background: [
                    { op: "put_on_model", label: "Put on Model", description: "Now try it on a model" },
                  ],
                  put_on_model: [
                    { op: "remove_bg", label: "Remove Background", description: "Clean up the background on this result" },
                    { op: "swap_model", label: "Swap Model", description: "Try a different model look" },
                  ],
                  swap_model: [
                    { op: "remove_bg", label: "Remove Background", description: "Clean up the background on this result" },
                  ],
                  virtual_tryon: [
                    { op: "remove_bg", label: "Remove Background", description: "Clean up the background on this result" },
                  ],
                };

                const suggestions = selectedOp ? (CHAIN_SUGGESTIONS[selectedOp] || []) : [];
                const available = suggestions.filter((s) => isAtLeastTier(userTier, PHOTO_OPERATIONS[s.op].tier) && !(PHOTO_OPERATIONS[s.op] as any).comingSoon);
                const locked = suggestions.filter((s) => !isAtLeastTier(userTier, PHOTO_OPERATIONS[s.op].tier) || !!(PHOTO_OPERATIONS[s.op] as any).comingSoon);

                if (suggestions.length === 0) return null;

                return (
                  <div data-chain-suggestions className="mt-4 space-y-2">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Continue editing</p>
                    <div className="grid grid-cols-1 gap-2">
                      {available.map((s) => (
                        <button
                          key={s.op}
                          className="w-full rounded-xl border border-border bg-card p-3.5 sm:p-3 min-h-[52px] text-left transition-all active:scale-[0.98] hover:border-primary/30 hover:shadow-sm flex items-center gap-3"
                          onClick={() => {
                            setSelectedPhoto(resultPhoto);
                            setResultPhoto(null);
                            setSelectedOp(s.op);
                            setOpParams({});
                            clearSession();
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          <div className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <ArrowRight className="w-5 h-5 sm:w-4 sm:h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">{s.label}</p>
                            <p className="text-[11px] text-muted-foreground">{s.description}</p>
                          </div>
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {PHOTO_OPERATIONS[s.op].credits} cr
                          </Badge>
                        </button>
                      ))}
                      {locked.map((s) => (
                        <button
                          key={s.op}
                          className="w-full rounded-xl border border-border bg-muted/20 p-3.5 sm:p-3 min-h-[52px] text-left opacity-60 flex items-center gap-3"
                          onClick={() => {
                            setUpgradeReason(`${s.label} requires the ${PHOTO_OPERATIONS[s.op].tier} plan.`);
                            setUpgradeTier(PHOTO_OPERATIONS[s.op].tier);
                            setUpgradeOpen(true);
                          }}
                        >
                          <div className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                            <Lock className="w-5 h-5 sm:w-4 sm:h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-muted-foreground">{s.label}</p>
                            <p className="text-[11px] text-muted-foreground/60">{s.description}</p>
                          </div>
                          <Badge variant="outline" className="text-[9px] shrink-0">
                            {PHOTO_OPERATIONS[s.op].tier.charAt(0).toUpperCase() + PHOTO_OPERATIONS[s.op].tier.slice(1)}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Photo upload zone */}
        {!resultPhoto && (
          <div
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary"); }}
            onDragLeave={(e) => e.currentTarget.classList.remove("border-primary")}
            onDrop={(e) => { e.currentTarget.classList.remove("border-primary"); handleFileDrop(e); }}
          >
            {selectedPhoto ? (
              <div data-photo-preview className="relative rounded-2xl overflow-hidden border border-border bg-muted/30">
                {isProcessing && (
                  <div className="absolute inset-0 z-10 bg-background/70 backdrop-blur-[6px] flex flex-col items-center justify-center gap-3">
                    <motion.div
                      className="absolute inset-0 rounded-2xl ring-2 ring-primary/40 pointer-events-none"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                      animate={{ scale: [1, 1.08, 1], rotate: [0, 4, -4, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Sparkles className="w-8 h-8 text-primary" />
                    </motion.div>
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={processingElapsed < 5 ? "analysing" : processingElapsed < 12 ? "generating" : "finalising"}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="text-sm font-semibold text-foreground"
                      >
                        {processingElapsed < 5 ? "Analysing…" : processingElapsed < 12 ? "Generating…" : "Finalising…"}
                      </motion.p>
                    </AnimatePresence>
                    <p className="text-xs text-muted-foreground tabular-nums">{processingElapsed}s</p>
                    {processingElapsed >= 30 && (
                      <p className="text-xs text-muted-foreground/80 animate-fade-in">Still working on this one…</p>
                    )}
                    <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        style={{ width: "40%" }}
                      />
                    </div>
                  </div>
                )}
                {photoLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-[5]">
                    <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                  </div>
                )}
                <img
                  src={selectedPhoto}
                  alt="Selected photo"
                  className={`w-full max-h-[300px] lg:max-h-[400px] object-contain cursor-pointer transition-opacity duration-200 ${photoLoading ? "opacity-0" : "opacity-100"}`}
                  onClick={() => { if (!isProcessing) setLightboxOpen(true); }}
                  onLoad={() => setPhotoLoading(false)}
                />
                {!isProcessing && (
                  <button
                    className="absolute bottom-3 left-3 w-9 h-9 rounded-xl bg-background/80 backdrop-blur-sm border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:scale-95 sm:hidden"
                    onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
                    aria-label="Zoom photo"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute bottom-3 right-3 text-xs shadow-md"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Change photo"
                >
                  Change Photo
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Vinted Import — the hero feature */}
                <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/[0.06] via-primary/[0.02] to-transparent p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 sm:w-11 sm:h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                      <Link2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Import from Vinted</p>
                      <p className="text-[11px] text-muted-foreground leading-snug">Paste a listing URL to import all photos for enhancement</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      placeholder="https://www.vinted.co.uk/items/..."
                      value={vintedUrl}
                      onChange={(e) => setVintedUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleVintedImport(); }}
                      className="flex-1 h-11 text-sm rounded-xl"
                      disabled={importingFromVinted}
                    />
                    <Button
                      className="h-11 px-5 font-semibold shrink-0 rounded-xl active:scale-[0.97] transition-transform"
                      onClick={handleVintedImport}
                      disabled={!vintedUrl.trim() || importingFromVinted}
                    >
                      {importingFromVinted ? (
                        <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Importing…</>
                      ) : (
                        "Import"
                      )}
                    </Button>
                  </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Standard upload zone */}
                <label
                  className="flex flex-col items-center justify-center gap-3 p-6 lg:p-10 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 bg-muted/10 hover:bg-primary/[0.03] cursor-pointer transition-all text-center min-h-[160px] lg:min-h-[200px]"
                  role="button"
                  tabIndex={0}
                  aria-label="Upload a photo"
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
                >
                  <div className="w-16 h-16 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Upload className="w-7 h-7 sm:w-6 sm:h-6 text-primary/60" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Upload a photo</p>
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">or drag & drop · paste from clipboard</p>
                    <p className="text-xs text-muted-foreground mt-0.5 sm:hidden">from gallery or paste from clipboard</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.heic,.heif"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f);
                      e.target.value = "";
                    }}
                  />
                </label>

                {/* Mobile camera capture option */}
                <div className="flex gap-2 sm:hidden">
                  <Button
                    variant="outline"
                    className="flex-1 h-11 rounded-xl active:scale-[0.97] transition-transform"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="w-4 h-4 mr-1.5" /> Gallery
                  </Button>
                  <label className="flex-1">
                    <Button
                      variant="outline"
                      className="w-full h-11 rounded-xl active:scale-[0.97] transition-transform"
                      asChild
                    >
                      <span>
                        <Camera className="w-4 h-4 mr-1.5" /> Camera
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileUpload(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
            )}
            {/* Hidden file input for "Change Photo" button */}
            {selectedPhoto && (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.heic,.heif"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                  e.target.value = "";
                }}
              />
            )}
          </div>
        )}

        {/* Operation grid */}
        {!resultPhoto && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Choose Effect</h3>
              {selectedPhoto && <p className="text-[10px] text-muted-foreground">Tap to select</p>}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3" role="radiogroup" aria-label="Photo effects">
              {(Object.entries(PHOTO_OPERATIONS) as [PhotoOperation, typeof PHOTO_OPERATIONS[PhotoOperation]][]).map(([key, op]) => {
                const Icon = ICON_MAP[op.icon] || Sparkles;
                const isLocked = !isAtLeastTier(userTier, op.tier);
                const isComingSoon = !!(op as any).comingSoon;
                const isSelected = selectedOp === key;
                const isDisabled = !selectedPhoto && !isLocked;

                return (
                  <Card
                    key={key}
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={`${op.label} — ${op.credits} credit${op.credits > 1 ? "s" : ""}${isLocked ? `, requires ${op.tier} plan` : ""}${isComingSoon ? ", coming soon" : ""}`}
                    tabIndex={isDisabled ? -1 : 0}
                    onClick={() => {
                      if (isComingSoon) {
                        toast(`${op.label} is coming soon!`, { description: op.description });
                        return;
                      }
                      if (!isDisabled) handleSelectOp(key);
                    }}
                    onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !isDisabled && !isComingSoon) { e.preventDefault(); handleSelectOp(key); } }}
                    className={`relative p-3 sm:p-3.5 cursor-pointer transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 overflow-hidden active:scale-[0.97] ${
                      isSelected
                        ? "border-primary bg-primary/[0.04] shadow-sm ring-1 ring-primary/20"
                        : isComingSoon
                        ? "opacity-40 cursor-default"
                        : isLocked
                        ? "opacity-60 hover:opacity-80"
                        : isDisabled
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:border-primary/30 hover:shadow-sm"
                    }`}
                  >
                    {isSelected && <div className="absolute top-0 left-0 right-0 h-[3px] sm:h-0.5 rounded-b-full bg-gradient-to-r from-primary via-accent to-primary" />}
                    <div className="flex items-start justify-between mb-2">
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${
                        isSelected ? "bg-primary/15" : "bg-muted"
                      }`}>
                        {isComingSoon ? (
                          <Sparkles className="w-4 h-4 text-muted-foreground/40" />
                        ) : isLocked ? (
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        )}
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-[9px] sm:text-[10px] px-1.5 py-0 ${isSelected ? "bg-primary/10 text-primary" : ""}`}
                      >
                        {op.credits} cr
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className={`text-[13px] sm:text-sm font-semibold ${isComingSoon ? "text-muted-foreground" : isSelected ? "text-primary" : "text-foreground"}`}>
                        {op.label}
                      </p>
                      {isComingSoon && (
                        <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0">Coming Soon</span>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-snug line-clamp-2">{op.description}</p>
                    {isComingSoon ? (
                      <Badge className="absolute top-2 right-2 text-[8px] py-0 px-1.5 bg-muted text-muted-foreground border-0">
                        Soon
                      </Badge>
                    ) : isLocked && (
                      <Badge variant="outline" className="absolute top-2 right-2 text-[9px] py-0 border-muted-foreground/30">
                        {op.tier.charAt(0).toUpperCase() + op.tier.slice(1)}
                      </Badge>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Config panel */}
        {!resultPhoto && (() => {
          const configContent = renderConfig();
          return (
            <div ref={configPanelRef}>
              <AnimatePresence mode="wait">
                {selectedOp && selectedPhoto && configContent && (
                  <motion.div
                    key={selectedOp}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <Card className="p-4">
                      {configContent}
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })()}

        {/* Process button — desktop inline */}
        {!resultPhoto && selectedOp && selectedPhoto && (
          <div className="hidden lg:block">
          <Button
            size="lg"
            className="w-full h-12 text-sm font-semibold"
            disabled={!canProcess}
            onClick={handleProcess}
            aria-busy={isProcessing}
            aria-label={isProcessing ? "Processing photo" : processButtonText}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…
              </>
            ) : (
              <>
                {(() => {
                  const Icon = selectedOpConfig ? (ICON_MAP[selectedOpConfig.icon] || Sparkles) : ArrowRight;
                  return <Icon className="w-4 h-4 mr-2" />;
                })()}
                {processButtonText}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Gallery */}
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Recent Edits</h3>
            {gallery.length > 0 && (
              <p className="text-[10px] text-muted-foreground">{gallery.length} edit{gallery.length > 1 ? "s" : ""}</p>
            )}
          </div>
          {galleryLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className={`aspect-[4/5] rounded-xl ${i >= 2 ? "hidden sm:block" : ""}`} />
              ))}
            </div>
          ) : gallery.length === 0 ? (
            <Card className="p-6 sm:p-8 text-center border-dashed border-2 border-border/60">
              <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-3">
                <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">No edits yet</p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">Your photo transformations will appear here</p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {gallery.map((job) => (
                <GalleryCard
                  key={job.id}
                  job={job}
                  opLabel={OP_LABELS[job.operation] || job.operation}
                  onRestore={handleGalleryRestore}
                  onDelete={handleGalleryDelete}
                  onUseAsInput={handleGalleryUseAsInput}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile sticky process button */}
      {!resultPhoto && selectedOp && selectedPhoto && (
        <div className={`fixed bottom-20 left-3 right-3 z-40 lg:hidden transition-all duration-200 ${keyboardVisible ? "translate-y-[200%] opacity-0 pointer-events-none" : ""}`}>
          <Button
            size="lg"
            className={`w-full h-14 rounded-2xl font-bold text-base shadow-coral shadow-lg active:scale-[0.97] transition-all ${canProcess && !resultPhoto ? "cta-breathe" : ""}`}
            disabled={!canProcess}
            onClick={handleProcess}
            aria-busy={isProcessing}
            aria-label={isProcessing ? "Processing photo" : processButtonText}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…
              </>
            ) : (
              <>
                {(() => {
                  const Icon = selectedOpConfig ? (ICON_MAP[selectedOpConfig.icon] || Sparkles) : ArrowRight;
                  return <Icon className="w-4 h-4 mr-2" />;
                })()}
                {processButtonText}
              </>
            )}
          </Button>
        </div>
      )}

      {selectedPhoto && (
        <ImageLightbox
          images={[selectedPhoto]}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={upgradeReason}
        tierRequired={upgradeTier}
        showCredits
      />
    </PageShell>
  );
}
