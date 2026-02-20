import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { PHOTO_OPERATIONS, type PhotoOperation, isAtLeastTier, type TierKey } from "@/lib/constants";
import { PageShell } from "@/components/PageShell";
import { CreditBar } from "@/components/vintography/CreditBar";
import { ComparisonView } from "@/components/vintography/ComparisonView";
import { GalleryCard, type VintographyJob } from "@/components/vintography/GalleryCard";
import { PhotoFilmstrip, type PhotoEditState } from "@/components/vintography/PhotoFilmstrip";
import { BackgroundPicker } from "@/components/vintography/BackgroundPicker";
import { ModelOptions } from "@/components/vintography/ModelOptions";
import { UpgradeModal } from "@/components/UpgradeModal";
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
  Lock, Download, ArrowRight, Sparkles, X, ArrowLeft,
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
  const resultRef = useRef<HTMLDivElement>(null);
  const [gallery, setGallery] = useState<VintographyJob[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);

  // Item-linked state
  const [itemPhotos, setItemPhotos] = useState<string[]>([]);
  const [editStates, setEditStates] = useState<Record<string, PhotoEditState>>({});

  // Upgrade modal
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);
  const [upgradeTier, setUpgradeTier] = useState<string | undefined>(undefined);

  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  // ── Derived values ─────────────────────────────────────────────────
  const userTier = (profile?.subscription_tier || "free") as TierKey;
  const totalUsed = credits ? credits.price_checks_used + credits.optimizations_used + credits.vintography_used : 0;
  const creditsRemaining = credits ? credits.credits_limit - totalUsed : 0;
  const unlimited = (credits?.credits_limit ?? 0) >= 999999;
  const selectedOpConfig = selectedOp ? PHOTO_OPERATIONS[selectedOp] : null;

  // ── Load item photos ───────────────────────────────────────────────
  useEffect(() => {
    if (!itemId || !user) return;
    (async () => {
      const { data } = await supabase
        .from("listings")
        .select("images, image_url")
        .eq("id", itemId)
        .eq("user_id", user.id)
        .single();
      if (data) {
        const imgs = Array.isArray(data.images) ? (data.images as string[]) : [];
        const all = data.image_url && !imgs.includes(data.image_url) ? [data.image_url, ...imgs] : imgs;
        setItemPhotos(all.filter(Boolean));
        if (all.length > 0 && !selectedPhoto) setSelectedPhoto(all[0]);
      }
    })();
  }, [itemId, user]);

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
          sell_wizard: !!itemId,
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
        refreshCredits();
        setGallery((prev) => [{
          id: data.job_id,
          original_url: selectedPhoto,
          processed_url: data.processed_url,
          operation: selectedOp,
          status: "completed",
          created_at: new Date().toISOString(),
        }, ...prev].slice(0, 12));

        if (itemId) {
          setEditStates((prev) => ({
            ...prev,
            [selectedPhoto!]: {
              editedUrl: data.processed_url,
              savedToItem: false,
              operationApplied: selectedOp,
            },
          }));
        }

        // Auto-scroll to result on mobile
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
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

  // ── Download ───────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!resultPhoto) return;
    try {
      const res = await fetch(resultPhoto);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vintifi-${selectedOp}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed");
    }
  };

  // ── Save to item ───────────────────────────────────────────────────
  const handleSaveToItem = async () => {
    if (!resultPhoto || !itemId || !user) return;
    const { data: listing } = await supabase
      .from("listings")
      .select("images")
      .eq("id", itemId)
      .single();
    const existing = Array.isArray(listing?.images) ? (listing.images as string[]) : [];
    await supabase
      .from("listings")
      .update({ images: [...existing, resultPhoto], last_photo_edit_at: new Date().toISOString() })
      .eq("id", itemId);
    toast.success("Photo saved to listing");
    if (selectedPhoto) {
      setEditStates((prev) => ({
        ...prev,
        [selectedPhoto]: { ...prev[selectedPhoto], savedToItem: true },
      }));
    }
  };

  // ── Gallery actions ────────────────────────────────────────────────
  const handleGalleryRestore = (job: VintographyJob) => {
    if (job.original_url) setSelectedPhoto(job.original_url);
    if (job.processed_url) setResultPhoto(job.processed_url);
    if (job.operation && PHOTO_OPERATIONS[job.operation as PhotoOperation]) {
      setSelectedOp(job.operation as PhotoOperation);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGalleryUseAsInput = (job: VintographyJob) => {
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
  };

  // ── Render config panel ────────────────────────────────────────────
  const renderConfig = () => {
    if (!selectedOp) return null;

    switch (selectedOp) {
      case "remove_bg":
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

  const isComingSoonOp = selectedOp && 'comingSoon' in PHOTO_OPERATIONS[selectedOp] && (PHOTO_OPERATIONS[selectedOp] as any).comingSoon;
  const canProcess = selectedPhoto && selectedOp && !isProcessing && !isComingSoonOp &&
    (selectedOp !== "virtual_tryon" || selfiePhoto);

  const processButtonText = selectedOpConfig
    ? `${selectedOpConfig.label} — ${selectedOpConfig.credits} Credit${selectedOpConfig.credits > 1 ? "s" : ""}`
    : "Select an Operation";

  return (
    <PageShell title="Photo Studio" maxWidth="3xl">
      {/* Credit bar */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border -mx-4 px-4 py-2.5 lg:-mx-6 lg:px-6">
        <div className="flex items-center justify-between">
          <CreditBar used={totalUsed} limit={credits?.credits_limit ?? 5} unlimited={unlimited} />
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
        {itemId && itemPhotos.length > 0 && (
          <PhotoFilmstrip
            photos={itemPhotos}
            activeUrl={selectedPhoto}
            editStates={editStates}
            itemId={itemId}
            onSelect={(url) => { setSelectedPhoto(url); setResultPhoto(null); }}
          />
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
            >
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
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={handleDownload} className="flex-1">
                  <Download className="w-4 h-4 mr-1.5" /> Download
                </Button>
                {itemId && (
                  <Button size="sm" onClick={handleSaveToItem} className="flex-1">
                    Save to Listing
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={handleEditAgain}>
                  <RefreshCw className="w-4 h-4 mr-1.5" /> Edit Again
                </Button>
              </div>
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
              <div className="relative rounded-2xl overflow-hidden border border-border bg-muted/30">
                {isProcessing && (
                  <div className="absolute inset-0 z-10 bg-background/70 backdrop-blur-[6px] flex flex-col items-center justify-center gap-3">
                    <motion.div
                      animate={{ scale: [1, 1.08, 1], rotate: [0, 4, -4, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Sparkles className="w-8 h-8 text-primary" />
                    </motion.div>
                    <p className="text-sm font-semibold text-foreground">Transforming your photo…</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedOp === "remove_bg" || selectedOp === "studio_shadow"
                        ? "~3 seconds"
                        : "~10–15 seconds"}
                    </p>
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
                <img
                  src={selectedPhoto}
                  alt="Selected photo"
                  className="w-full max-h-[300px] lg:max-h-[400px] object-contain"
                />
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
              <label
                className="flex flex-col items-center justify-center gap-4 p-8 lg:p-12 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-primary/[0.02] cursor-pointer transition-colors text-center"
                role="button"
                tabIndex={0}
                aria-label="Upload a photo"
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Camera className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="text-base font-bold text-foreground">Upload a photo to get started</p>
                  <p className="text-xs text-muted-foreground mt-1">Drag & drop, paste, or tap to upload</p>
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
            <h3 className="text-sm font-semibold text-foreground">Choose Effect</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5" role="radiogroup" aria-label="Photo effects">
              {(Object.entries(PHOTO_OPERATIONS) as [PhotoOperation, typeof PHOTO_OPERATIONS[PhotoOperation]][]).map(([key, op]) => {
                const Icon = ICON_MAP[op.icon] || Sparkles;
                const isLocked = !isAtLeastTier(userTier, op.tier);
                const isComingSoon = 'comingSoon' in op && (op as any).comingSoon === true;
                const isSelected = selectedOp === key;
                const isDisabled = !selectedPhoto && !isLocked;

                return (
                  <Card
                    key={key}
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={`${op.label} — ${op.credits} credit${op.credits > 1 ? "s" : ""}${isLocked ? `, requires ${op.tier} plan` : ""}${isComingSoon ? ", coming soon" : ""}`}
                    tabIndex={isDisabled || isComingSoon ? -1 : 0}
                    onClick={() => !isDisabled && !isComingSoon && handleSelectOp(key)}
                    onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !isDisabled && !isComingSoon) { e.preventDefault(); handleSelectOp(key); } }}
                    className={`relative p-3.5 cursor-pointer transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                      isSelected
                        ? "border-primary bg-primary/[0.04] shadow-sm ring-1 ring-primary/20"
                        : isComingSoon
                        ? "opacity-60 cursor-not-allowed"
                        : isLocked
                        ? "opacity-60 hover:opacity-80"
                        : isDisabled
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:border-primary/30 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isSelected ? "bg-primary/15" : "bg-muted"
                      }`}>
                        {isLocked ? (
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        )}
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 ${isSelected ? "bg-primary/10 text-primary" : ""}`}
                      >
                        {op.credits} cr
                      </Badge>
                    </div>
                    <p className={`text-sm font-semibold mb-0.5 ${isSelected ? "text-primary" : "text-foreground"}`}>
                      {op.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-snug">{op.description}</p>
                    {isComingSoon && (
                      <Badge variant="outline" className="absolute top-2 right-2 text-[9px] py-0 border-primary/30 text-primary">
                        Coming Soon
                      </Badge>
                    )}
                    {isLocked && !isComingSoon && (
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
                <ArrowRight className="w-4 h-4 mr-2" /> {processButtonText}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Gallery */}
        <div className="space-y-3 pt-4">
          <h3 className="text-sm font-semibold text-foreground">Recent Edits</h3>
          {galleryLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
              ))}
            </div>
          ) : gallery.length === 0 ? (
            <Card className="p-8 text-center">
              <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Your edited photos will appear here</p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
        <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-50 p-3 bg-background/95 backdrop-blur-sm border-t border-border lg:hidden">
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
                <ArrowRight className="w-4 h-4 mr-2" /> {processButtonText}
              </>
            )}
          </Button>
        </div>
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
