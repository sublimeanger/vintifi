import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { FeatureGate } from "@/components/FeatureGate";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Camera, ImageOff, Paintbrush, User as UserIcon, Sparkles,
  Loader2, Download, Wand2, RotateCcw, ChevronRight, Image as ImageIcon, Clock,
  RefreshCw, ChevronDown, X,
} from "lucide-react";

import { CreditBar } from "@/components/vintography/CreditBar";
import { ComparisonView } from "@/components/vintography/ComparisonView";
import { GalleryCard, type VintographyJob } from "@/components/vintography/GalleryCard";
import { BatchStrip, type BatchItem } from "@/components/vintography/BatchStrip";
import { ModelPicker } from "@/components/vintography/ModelPicker";
import { BackgroundPicker } from "@/components/vintography/BackgroundPicker";

type Operation = "clean_bg" | "lifestyle_bg" | "virtual_model" | "enhance";

const OPERATIONS: { id: Operation; icon: typeof ImageOff; label: string; desc: string }[] = [
  { id: "clean_bg", icon: ImageOff, label: "Clean Background", desc: "White or solid background" },
  { id: "lifestyle_bg", icon: Paintbrush, label: "Lifestyle", desc: "AI scene placement" },
  { id: "virtual_model", icon: UserIcon, label: "Virtual Model", desc: "Garment on a model" },
  { id: "enhance", icon: Sparkles, label: "Enhance", desc: "Fix lighting & clarity" },
];

// Map new operation IDs to edge function operation names
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
  const itemId = searchParams.get("itemId");

  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [selectedOp, setSelectedOp] = useState<Operation>("clean_bg");
  const [processing, setProcessing] = useState(false);

  // Lifestyle BG params
  const [bgStyle, setBgStyle] = useState("studio");
  // Virtual model params
  const [modelGender, setModelGender] = useState("female");
  const [modelPose, setModelPose] = useState("standing_front");
  const [modelLook, setModelLook] = useState("classic");
  const [modelBg, setModelBg] = useState("studio");

  const [gallery, setGallery] = useState<VintographyJob[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);

  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [activeBatchIndex, setActiveBatchIndex] = useState(0);

  const vintographyUsed = (credits as any)?.vintography_used ?? 0;
  const creditsLimit = credits?.credits_limit ?? 5;
  const isUnlimited = (profile as any)?.subscription_tier === "scale" || creditsLimit >= 999;

  // Load image from URL param (coming from item detail)
  useEffect(() => {
    const imageUrl = searchParams.get("image_url");
    if (imageUrl && !originalUrl) {
      setOriginalUrl(imageUrl);
      setProcessedUrl(null);
      setBatchItems([]);
    }
  }, [searchParams]);

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

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    if (!user) return;
    const fileArr = Array.from(files).slice(0, 10);
    if (fileArr.length === 1) {
      const url = await uploadFile(fileArr[0]);
      if (url) { setOriginalUrl(url); setProcessedUrl(null); setBatchItems([]); }
    } else {
      const items: BatchItem[] = fileArr.map((f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        file: f, previewUrl: URL.createObjectURL(f), uploadedUrl: null, processedUrl: null, status: "pending" as const,
      }));
      setBatchItems(items);
      setActiveBatchIndex(0);
      const url = await uploadFile(fileArr[0]);
      if (url) {
        setOriginalUrl(url); setProcessedUrl(null);
        setBatchItems((prev) => prev.map((it, i) => i === 0 ? { ...it, uploadedUrl: url, status: "pending" } : it));
      }
    }
  }, [user]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const processImage = async (imageUrl: string, operation: string, params: Record<string, string> = {}): Promise<string | null> => {
    const { data, error } = await supabase.functions.invoke("vintography", {
      body: { image_url: imageUrl, operation, parameters: params },
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
      params.gender = modelGender; params.pose = modelPose;
      params.model_look = modelLook; params.model_bg = modelBg;
    }
    return params;
  };

  const handleProcess = async () => {
    if (!originalUrl) return;
    setProcessing(true);
    try {
      const result = await processImage(originalUrl, OP_MAP[selectedOp], getParams());
      if (result) {
        setProcessedUrl(result);
        fetchGallery();
        await updateLinkedItem(result);
      }
    } catch (err: any) { toast.error(err.message || "Processing failed. Try again."); }
    finally { setProcessing(false); }
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
    for (let i = 0; i < batchItems.length; i++) {
      const item = batchItems[i];
      let url = item.uploadedUrl;
      if (!url) {
        setBatchItems((prev) => prev.map((it, idx) => idx === i ? { ...it, status: "uploading" } : it));
        try { url = await uploadFile(item.file); } catch {
          setBatchItems((prev) => prev.map((it, idx) => idx === i ? { ...it, status: "error" } : it)); continue;
        }
        if (!url) { setBatchItems((prev) => prev.map((it, idx) => idx === i ? { ...it, status: "error" } : it)); continue; }
        setBatchItems((prev) => prev.map((it, idx) => idx === i ? { ...it, uploadedUrl: url, status: "pending" } : it));
      }
      setBatchItems((prev) => prev.map((it, idx) => idx === i ? { ...it, status: "processing" } : it));
      setActiveBatchIndex(i); setOriginalUrl(url);
      try {
        const result = await processImage(url, OP_MAP[selectedOp], getParams());
        setBatchItems((prev) => prev.map((it, idx) => idx === i ? { ...it, processedUrl: result, status: result ? "done" : "error" } : it));
        if (result) setProcessedUrl(result);
      } catch {
        setBatchItems((prev) => prev.map((it, idx) => idx === i ? { ...it, status: "error" } : it));
      }
    }
    fetchGallery();
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
    for (const item of batchItems) {
      if (!item.processedUrl) continue;
      try {
        const res = await fetch(item.processedUrl); const blob = await res.blob();
        const url = URL.createObjectURL(blob); const a = document.createElement("a");
        a.href = url; a.download = `vintography-${item.id}.png`; a.click(); URL.revokeObjectURL(url);
      } catch {}
    }
  };

  const resetAll = () => {
    setOriginalUrl(null); setProcessedUrl(null); setBatchItems([]); setActiveBatchIndex(0);
  };

  return (
    <PageShell title="Photo Studio" subtitle="AI-powered photo editing for your listings" maxWidth="max-w-4xl">
      <FeatureGate feature="vintography">
        <div className="space-y-4 sm:space-y-5">
          <CreditBar used={vintographyUsed} limit={creditsLimit} unlimited={isUnlimited} />

          {!originalUrl ? (
            /* ─── Upload Zone ─── */
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card
                className="border-2 border-dashed border-primary/30 hover:border-primary/60 transition-colors cursor-pointer p-8 sm:p-12 text-center"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-base sm:text-lg">Drop your photos here</p>
                    <p className="text-sm text-muted-foreground mt-1">or tap to upload · JPG, PNG, WebP · Max 10MB</p>
                  </div>
                  <Button size="sm" className="active:scale-95 transition-transform">
                    <Camera className="w-4 h-4 mr-1.5" /> Choose Photos
                  </Button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => { if (e.target.files?.length) handleFileSelect(e.target.files); }}
                />
              </Card>
            </motion.div>
          ) : (
            /* ─── Editor ─── */
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <BatchStrip items={batchItems} activeIndex={activeBatchIndex} onSelect={handleBatchSelect}
                onRemove={handleBatchRemove} onDownloadAll={handleDownloadAll} />

              {/* 4 Operation Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {OPERATIONS.map((op) => (
                  <Card
                    key={op.id}
                    onClick={() => setSelectedOp(op.id)}
                    className={`p-3 sm:p-4 cursor-pointer transition-all active:scale-[0.97] ${
                      selectedOp === op.id
                        ? "ring-2 ring-primary border-primary/30 bg-primary/[0.04]"
                        : "hover:border-primary/20"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${
                      selectedOp === op.id ? "bg-primary/15" : "bg-muted"
                    }`}>
                      <op.icon className={`w-4 h-4 ${selectedOp === op.id ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <p className="font-semibold text-xs sm:text-sm">{op.label}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{op.desc}</p>
                  </Card>
                ))}
              </div>

              {/* Operation-specific params */}
              <AnimatePresence mode="wait">
                {selectedOp === "lifestyle_bg" && (
                  <motion.div key="bg_params" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <BackgroundPicker value={bgStyle} onChange={setBgStyle} />
                  </motion.div>
                )}
                {selectedOp === "virtual_model" && (
                  <motion.div key="model_params" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <ModelPicker
                      gender={modelGender} look={modelLook} pose={modelPose} bg={modelBg}
                      onGenderChange={setModelGender} onLookChange={setModelLook}
                      onPoseChange={setModelPose} onBgChange={setModelBg}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Preview */}
              <ComparisonView originalUrl={originalUrl} processedUrl={processedUrl} processing={processing}
                variations={[]} currentVariation={0} onVariationChange={() => {}} />

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

              {/* Item link footer */}
              {itemId && processedUrl && (
                <Card className="p-3 sm:p-4 bg-success/5 border-success/20">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Photo saved to your item</p>
                    <Button size="sm" onClick={() => navigate(`/items/${itemId}`)} className="active:scale-95 transition-transform">
                      Back to Item <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </Card>
              )}
            </motion.div>
          )}

          {/* Previous Edits Gallery */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-display font-bold text-sm sm:text-base">Previous Edits</h2>
              {gallery.length > 0 && <Badge variant="secondary" className="text-[10px]">{gallery.length}</Badge>}
            </div>
            {galleryLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
              </div>
            ) : gallery.length === 0 ? (
              <Card className="p-6 text-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Your edited photos will appear here</p>
              </Card>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {gallery.map((job) => (
                  <GalleryCard key={job.id} job={job} opLabel={opLabel(job.operation)}
                    onRestore={(j) => {
                      setOriginalUrl(j.original_url); setProcessedUrl(j.processed_url);
                    }}
                    onDelete={handleDeleteJob}
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
