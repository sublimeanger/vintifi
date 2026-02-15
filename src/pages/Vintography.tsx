import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { FeatureGate } from "@/components/FeatureGate";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Camera, ImageOff, Paintbrush, User as UserIcon, Sparkles,
  Loader2, Download, Wand2, RotateCcw, ChevronRight, Image as ImageIcon, Clock, RefreshCw,
  ChevronLeft,
} from "lucide-react";

// Refactored components
import { CreditBar } from "@/components/vintography/CreditBar";
import { ComparisonView } from "@/components/vintography/ComparisonView";
import { GalleryCard, type VintographyJob } from "@/components/vintography/GalleryCard";
import { QuickPresets, type Preset } from "@/components/vintography/QuickPresets";
import { BatchStrip, type BatchItem } from "@/components/vintography/BatchStrip";

type Operation = "remove_bg" | "smart_bg" | "model_shot" | "enhance";

const operations: { id: Operation; icon: typeof ImageOff; label: string; desc: string; tier: string }[] = [
  { id: "remove_bg", icon: ImageOff, label: "Remove Background", desc: "Clean white background", tier: "Free" },
  { id: "smart_bg", icon: Paintbrush, label: "Smart Background", desc: "AI-generated scene", tier: "Pro" },
  { id: "model_shot", icon: UserIcon, label: "Virtual Model", desc: "Garment on a model", tier: "Business" },
  { id: "enhance", icon: Sparkles, label: "Enhance Photo", desc: "Better lighting & clarity", tier: "Free" },
];

const bgStyles = [
  { value: "studio", label: "Studio" },
  { value: "wooden_floor", label: "Wooden Floor" },
  { value: "outdoor", label: "Outdoor" },
  { value: "marble", label: "Marble" },
  { value: "vintage", label: "Vintage" },
];

export default function Vintography() {
  const { user, credits, refreshCredits } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core state
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [selectedOp, setSelectedOp] = useState<Operation>("remove_bg");
  const [processing, setProcessing] = useState(false);

  // Variations / undo stack (up to 3)
  const [variations, setVariations] = useState<string[]>([]);
  const [currentVariation, setCurrentVariation] = useState(0);

  // Smart BG params
  const [bgStyle, setBgStyle] = useState("studio");
  // Model shot params
  const [modelGender, setModelGender] = useState("female");
  const [modelPose, setModelPose] = useState("standing");

  // Gallery
  const [gallery, setGallery] = useState<VintographyJob[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);

  // Batch queue
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [activeBatchIndex, setActiveBatchIndex] = useState(0);

  // Credits
  const vintographyUsed = (credits as any)?.vintography_used ?? 0;
  const creditsLimit = credits?.credits_limit ?? 5;

  // Fetch gallery
  useEffect(() => {
    if (!user) return;
    const fetchGallery = async () => {
      setGalleryLoading(true);
      const { data } = await supabase
        .from("vintography_jobs")
        .select("id, original_url, processed_url, operation, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setGallery((data as VintographyJob[]) || []);
      setGalleryLoading(false);
    };
    fetchGallery();
  }, [user, processedUrl]);

  const handleDeleteJob = async (jobId: string) => {
    const { error } = await supabase.from("vintography_jobs").delete().eq("id", jobId);
    if (error) { toast.error("Failed to delete"); return; }
    setGallery((prev) => prev.filter((j) => j.id !== jobId));
    toast.success("Deleted");
  };

  const opLabel = (op: string) => operations.find((o) => o.id === op)?.label || op;

  // File upload
  const uploadFile = async (file: File): Promise<string | null> => {
    if (!user) return null;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return null; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10MB"); return null; }

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/vintography-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const { error } = await supabase.storage.from("listing-photos").upload(path, file, {
      contentType: file.type, upsert: true,
    });
    if (error) { toast.error("Failed to upload image"); return null; }
    const { data: pub } = supabase.storage.from("listing-photos").getPublicUrl(path);
    return pub.publicUrl;
  };

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    if (!user) return;
    const fileArr = Array.from(files).slice(0, 10); // Max 10

    if (fileArr.length === 1) {
      // Single file mode
      const url = await uploadFile(fileArr[0]);
      if (url) {
        setOriginalUrl(url);
        setProcessedUrl(null);
        setVariations([]);
        setCurrentVariation(0);
        setBatchItems([]);
      }
    } else {
      // Batch mode
      const items: BatchItem[] = fileArr.map((f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        file: f,
        previewUrl: URL.createObjectURL(f),
        uploadedUrl: null,
        processedUrl: null,
        status: "pending" as const,
      }));
      setBatchItems(items);
      setActiveBatchIndex(0);
      // Upload first item and set as active
      const url = await uploadFile(fileArr[0]);
      if (url) {
        setOriginalUrl(url);
        setProcessedUrl(null);
        setVariations([]);
        setBatchItems((prev) => prev.map((it, i) => i === 0 ? { ...it, uploadedUrl: url, status: "pending" } : it));
      }
    }
  }, [user]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // Process single image
  const processImage = async (imageUrl: string, operation: string, params: Record<string, string> = {}): Promise<string | null> => {
    const { data, error } = await supabase.functions.invoke("vintography", {
      body: { image_url: imageUrl, operation, parameters: params },
    });
    if (error) throw error;
    if (data?.error) { toast.error(data.error); return null; }
    toast.success(`Done! ${data.credits_used}/${data.credits_limit} edits used this month.`);
    refreshCredits();
    return data.processed_url;
  };

  const getParams = (): Record<string, string> => {
    const params: Record<string, string> = {};
    if (selectedOp === "smart_bg") params.bg_style = bgStyle;
    if (selectedOp === "model_shot") { params.gender = modelGender; params.pose = modelPose; }
    return params;
  };

  const handleProcess = async () => {
    if (!originalUrl) return;
    setProcessing(true);
    setProcessedUrl(null);

    try {
      const result = await processImage(originalUrl, selectedOp, getParams());
      if (result) {
        setProcessedUrl(result);
        setVariations((prev) => [...prev.slice(-2), result]); // keep last 3
        setCurrentVariation(variations.length > 1 ? Math.min(variations.length, 2) : 0);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Processing failed. Try again.");
    } finally {
      setProcessing(false);
    }
  };

  // Try Again — re-run same operation for variation
  const handleTryAgain = async () => {
    if (!originalUrl) return;
    setProcessing(true);
    try {
      const result = await processImage(originalUrl, selectedOp, getParams());
      if (result) {
        const newVars = [...variations.slice(-2), result];
        setVariations(newVars);
        setCurrentVariation(newVars.length - 1);
        setProcessedUrl(result);
      }
    } catch (err: any) {
      toast.error(err.message || "Processing failed");
    } finally {
      setProcessing(false);
    }
  };

  // Navigate variations
  const handleVariationChange = (idx: number) => {
    setCurrentVariation(idx);
    setProcessedUrl(variations[idx]);
  };

  // Quick Preset handler
  const handlePreset = async (preset: Preset) => {
    if (!originalUrl) return;
    setProcessing(true);
    setProcessedUrl(null);
    try {
      let currentUrl = originalUrl;
      for (const step of preset.steps) {
        const result = await processImage(currentUrl, step.operation, step.parameters || {});
        if (!result) throw new Error("Step failed");
        currentUrl = result;
      }
      setProcessedUrl(currentUrl);
      setVariations([currentUrl]);
      setCurrentVariation(0);
    } catch (err: any) {
      toast.error(err.message || "Preset failed");
    } finally {
      setProcessing(false);
    }
  };

  // Batch: process all
  const handleBatchProcessAll = async () => {
    if (batchItems.length <= 1) return;
    for (let i = 0; i < batchItems.length; i++) {
      const item = batchItems[i];
      // Upload if needed
      let url = item.uploadedUrl;
      if (!url) {
        setBatchItems((prev) => prev.map((it, idx) => idx === i ? { ...it, status: "uploading" } : it));
        url = await uploadFile(item.file);
        if (!url) {
          setBatchItems((prev) => prev.map((it, idx) => idx === i ? { ...it, status: "error" } : it));
          continue;
        }
        setBatchItems((prev) => prev.map((it, idx) => idx === i ? { ...it, uploadedUrl: url, status: "pending" } : it));
      }
      // Process
      setBatchItems((prev) => prev.map((it, idx) => idx === i ? { ...it, status: "processing" } : it));
      setActiveBatchIndex(i);
      setOriginalUrl(url);
      setProcessedUrl(null);
      try {
        const result = await processImage(url, selectedOp, getParams());
        setBatchItems((prev) => prev.map((it, idx) => idx === i ? { ...it, processedUrl: result, status: result ? "done" : "error" } : it));
        if (result) setProcessedUrl(result);
      } catch {
        setBatchItems((prev) => prev.map((it, idx) => idx === i ? { ...it, status: "error" } : it));
      }
    }
  };

  const handleBatchSelect = (idx: number) => {
    setActiveBatchIndex(idx);
    const item = batchItems[idx];
    setOriginalUrl(item.uploadedUrl || item.previewUrl);
    setProcessedUrl(item.processedUrl);
    setVariations(item.processedUrl ? [item.processedUrl] : []);
    setCurrentVariation(0);
  };

  const handleBatchRemove = (idx: number) => {
    setBatchItems((prev) => prev.filter((_, i) => i !== idx));
    if (activeBatchIndex >= idx && activeBatchIndex > 0) setActiveBatchIndex((p) => p - 1);
  };

  const handleDownloadAll = async () => {
    for (const item of batchItems) {
      if (!item.processedUrl) continue;
      try {
        const res = await fetch(item.processedUrl);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `vintography-${item.id}.png`;
        a.click();
        URL.revokeObjectURL(url);
      } catch { /* skip */ }
    }
  };

  const handleDownload = async () => {
    if (!processedUrl) return;
    try {
      const res = await fetch(processedUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vintography-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Download failed"); }
  };

  return (
    <PageShell title="Vintography" subtitle="AI-powered photo studio for your listings">
      <FeatureGate feature="vintography">
        <div className="space-y-4 sm:space-y-6">
          {/* Credit Usage Bar */}
          <CreditBar used={vintographyUsed} limit={creditsLimit} />

          {/* Upload Area */}
          {!originalUrl ? (
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
                    <p className="text-sm text-muted-foreground mt-1">
                      or tap to upload · JPG, PNG, WebP · Max 10MB · Up to 10 photos
                    </p>
                  </div>
                  <Button size="sm" className="active:scale-95 transition-transform">
                    <Camera className="w-4 h-4 mr-1.5" /> Choose Photos
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.length) handleFileSelect(e.target.files); }}
                />
              </Card>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 sm:space-y-6">
              {/* Batch Strip */}
              <BatchStrip
                items={batchItems}
                activeIndex={activeBatchIndex}
                onSelect={handleBatchSelect}
                onRemove={handleBatchRemove}
                onDownloadAll={handleDownloadAll}
              />

              {/* Quick Presets */}
              <QuickPresets onSelect={handlePreset} disabled={processing} />

              {/* Operation Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {operations.map((op) => (
                  <Card
                    key={op.id}
                    onClick={() => { setSelectedOp(op.id); setProcessedUrl(null); setVariations([]); }}
                    className={`p-3 sm:p-4 cursor-pointer transition-all active:scale-[0.97] ${
                      selectedOp === op.id
                        ? "ring-2 ring-primary border-primary/30 bg-primary/[0.03]"
                        : "hover:border-primary/20"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        selectedOp === op.id ? "bg-primary/15" : "bg-muted"
                      }`}>
                        <op.icon className={`w-4 h-4 ${selectedOp === op.id ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{op.tier}</Badge>
                    </div>
                    <p className="font-semibold text-xs sm:text-sm">{op.label}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{op.desc}</p>
                  </Card>
                ))}
              </div>

              {/* Operation-specific params */}
              <AnimatePresence mode="wait">
                {selectedOp === "smart_bg" && (
                  <motion.div key="smart_bg_params" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <Card className="p-4">
                      <p className="text-sm font-semibold mb-2">Background Style</p>
                      <Select value={bgStyle} onValueChange={setBgStyle}>
                        <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {bgStyles.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Card>
                  </motion.div>
                )}
                {selectedOp === "model_shot" && (
                  <motion.div key="model_params" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <Card className="p-4 flex flex-col sm:flex-row gap-3">
                      <div>
                        <p className="text-sm font-semibold mb-2">Gender</p>
                        <Select value={modelGender} onValueChange={setModelGender}>
                          <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="male">Male</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <p className="text-sm font-semibold mb-2">Pose</p>
                        <Select value={modelPose} onValueChange={setModelPose}>
                          <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standing">Standing</SelectItem>
                            <SelectItem value="walking">Walking</SelectItem>
                            <SelectItem value="casual">Casual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Comparison View */}
              <ComparisonView
                originalUrl={originalUrl}
                processedUrl={processedUrl}
                processing={processing}
                variations={variations}
                currentVariation={currentVariation}
                onVariationChange={handleVariationChange}
              />

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                {batchItems.length > 1 ? (
                  <Button
                    onClick={handleBatchProcessAll}
                    disabled={processing}
                    className="flex-1 h-12 sm:h-10 font-semibold active:scale-95 transition-transform"
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                    {processing ? "Processing batch…" : `Process All ${batchItems.length} Photos`}
                  </Button>
                ) : (
                  <Button
                    onClick={handleProcess}
                    disabled={processing}
                    className="flex-1 h-12 sm:h-10 font-semibold active:scale-95 transition-transform"
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                    {processing ? "Processing…" : `Apply ${opLabel(selectedOp)}`}
                  </Button>
                )}
                {processedUrl && (
                  <>
                    <Button variant="outline" onClick={handleTryAgain} disabled={processing} className="h-12 sm:h-10 active:scale-95 transition-transform">
                      <RefreshCw className="w-4 h-4 mr-2" /> Try Again
                    </Button>
                    {variations.length > 1 && (
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={currentVariation === 0}
                          onClick={() => handleVariationChange(currentVariation - 1)}
                          className="h-12 sm:h-10 w-10"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={currentVariation === variations.length - 1}
                          onClick={() => handleVariationChange(currentVariation + 1)}
                          className="h-12 sm:h-10 w-10"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    <Button variant="outline" onClick={handleDownload} className="h-12 sm:h-10 active:scale-95 transition-transform">
                      <Download className="w-4 h-4 mr-2" /> Download
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/optimize?photo=${encodeURIComponent(processedUrl)}`)}
                      className="h-12 sm:h-10 active:scale-95 transition-transform"
                    >
                      <ChevronRight className="w-4 h-4 mr-2" /> Use in Listing
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  onClick={() => { setOriginalUrl(null); setProcessedUrl(null); setVariations([]); setBatchItems([]); }}
                  className="h-12 sm:h-10 active:scale-95 transition-transform"
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> New Photo
                </Button>
              </div>
            </motion.div>
          )}

          {/* Previous Edits Gallery */}
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-display font-bold text-base sm:text-lg">Previous Edits</h2>
              {gallery.length > 0 && <Badge variant="secondary" className="text-xs">{gallery.length}</Badge>}
            </div>

            {galleryLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
              </div>
            ) : gallery.length === 0 ? (
              <Card className="p-8 text-center">
                <ImageIcon className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Your edited photos will appear here</p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {gallery.map((job) => (
                  <GalleryCard
                    key={job.id}
                    job={job}
                    opLabel={opLabel(job.operation)}
                    onRestore={(j) => {
                      setOriginalUrl(j.original_url);
                      setProcessedUrl(j.processed_url);
                      setVariations(j.processed_url ? [j.processed_url] : []);
                      setCurrentVariation(0);
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
