import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link2, Camera, Pencil, ArrowRight, ArrowLeft, Loader2,
  Plus, Check, Sparkles, Package, Upload, X, Zap, Info, ImageIcon,
} from "lucide-react";
import { ensureDisplayableImages } from "@/lib/convertHeic";

type EntryMethod = "url" | "photo" | "manual";

type WizardData = {
  method: EntryMethod | null;
  url: string;
  photos: File[];
  photoUrls: string[];
  title: string;
  brand: string;
  category: string;
  size: string;
  condition: string;
  colour: string;
  material: string;
  description: string;
  currentPrice: string;
  purchasePrice: string;
  seller_notes: string;
};

const initialData: WizardData = {
  method: null,
  url: "",
  photos: [],
  photoUrls: [],
  title: "",
  brand: "",
  category: "",
  size: "",
  condition: "",
  colour: "",
  material: "",
  description: "",
  currentPrice: "",
  purchasePrice: "",
  seller_notes: "",
};

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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  listingCount: number;
  listingLimit: number;
};

export function NewItemWizard({ open, onOpenChange, onCreated, listingCount, listingLimit }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoSectionRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<WizardData>(initialData);
  const [step, setStep] = useState<"method" | "input" | "details" | "done">("method");
  const [saving, setSaving] = useState(false);
  const [createdItemId, setCreatedItemId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [showPhotoNudge, setShowPhotoNudge] = useState(false);

  const update = (partial: Partial<WizardData>) => setData(prev => ({ ...prev, ...partial }));

  const reset = () => {
    setData(initialData);
    setStep("method");
    setCreatedItemId(null);
    setShowPhotoNudge(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const uploadPhotos = async (files: File[]): Promise<string[]> => {
    if (!user) return [];
    setUploading(true);
    const converted = await ensureDisplayableImages(files.slice(0, 5));
    const urls: string[] = [];
    for (const file of converted) {
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
    const rawFiles = Array.from(e.target.files || []).slice(0, 5 - data.photoUrls.length);
    if (rawFiles.length === 0) return;
    const files = await ensureDisplayableImages(rawFiles);
    const newFiles = [...data.photos, ...files];
    const newUrls = [...data.photoUrls, ...files.map(f => URL.createObjectURL(f))];
    update({ photos: newFiles, photoUrls: newUrls });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (idx: number) => {
    update({
      photos: data.photos.filter((_, i) => i !== idx),
      photoUrls: data.photoUrls.filter((_, i) => i !== idx),
    });
  };

  const swapToMain = (idx: number) => {
    if (idx === 0) return;
    const newUrls = [...data.photoUrls];
    const newPhotos = [...data.photos];
    [newUrls[0], newUrls[idx]] = [newUrls[idx], newUrls[0]];
    if (newPhotos.length > idx) {
      [newPhotos[0], newPhotos[idx]] = [newPhotos[idx], newPhotos[0]];
    }
    update({ photoUrls: newUrls, photos: newPhotos });
  };

  const handleMethodSelect = (method: EntryMethod) => {
    update({ method });
    if (method === "manual") {
      setStep("details");
    } else {
      setStep("input");
    }
  };

  const scrapeVintedUrl = async (vintedUrl: string) => {
    setScraping(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("scrape-vinted-url", {
        body: { url: vintedUrl },
      });
      if (error) throw error;
      if (result && !result.error) {
        const prefill: Partial<WizardData> = {};
        if (result.title) prefill.title = result.title;
        if (result.brand) prefill.brand = result.brand;
        if (result.category) prefill.category = result.category;
        if (result.size) prefill.size = result.size;
        if (result.condition) prefill.condition = result.condition;
        if (result.colour) prefill.colour = result.colour;
        if (result.material) prefill.material = result.material;
        if (result.description) prefill.description = result.description;
        if (result.price != null) prefill.currentPrice = String(result.price);
        if (Array.isArray(result.photos) && result.photos.length > 0) {
          prefill.photoUrls = result.photos.filter((u: string) => typeof u === "string" && u.startsWith("http"));
        }
        update(prefill);
        toast.success("Listing details imported!");
      }
    } catch (err: any) {
      console.error("Scrape error:", err);
      toast.info("Couldn't auto-detect details — fill them in manually");
    } finally {
      setScraping(false);
    }
  };

  const handleInputNext = async () => {
    if (data.method === "url" && !data.url.trim()) {
      toast.error("Paste a Vinted URL to continue");
      return;
    }
    if (data.method === "photo" && data.photos.length === 0) {
      toast.error("Upload at least one photo");
      return;
    }
    if (data.method === "url" && data.url.includes("vinted")) {
      await scrapeVintedUrl(data.url.trim());
    }
    setStep("details");
  };

  const executeSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let uploadedUrls: string[] = [];
      if (data.photos.length > 0) {
        uploadedUrls = await uploadPhotos(data.photos);
      }

      const scrapedUrls = data.photoUrls.filter(u => u.startsWith("http") && !u.startsWith("blob:"));
      const allImages = [...new Set([...uploadedUrls, ...scrapedUrls])];

      const { data: inserted, error } = await supabase.from("listings").insert({
        user_id: user.id,
        title: data.title.trim(),
        description: data.description.trim() || null,
        brand: data.brand.trim() || null,
        category: data.category.trim() || null,
        size: data.size.trim() || null,
        condition: data.condition || null,
        colour: data.colour.trim() || null,
        material: data.material.trim() || null,
        current_price: data.currentPrice ? parseFloat(data.currentPrice) : null,
        purchase_price: data.purchasePrice ? parseFloat(data.purchasePrice) : null,
        vinted_url: data.url.trim() || null,
        image_url: allImages[0] || null,
        images: allImages.length > 0 ? allImages : [],
        status: "active",
        source_type: data.method === "url" ? "vinted_url" : data.method === "photo" ? "photo_upload" : "manual",
        source_meta: data.seller_notes.trim() ? { seller_notes: data.seller_notes.trim() } : {},
      }).select("id").single();

      if (error) throw error;

      setCreatedItemId(inserted.id);
      setStep("done");
      onCreated();
      toast.success("Item added to your inventory!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!data.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!data.condition) {
      toast.error("Condition is required");
      return;
    }
    if (data.purchasePrice === "") {
      toast.error("Purchase price is required (enter 0 if free)");
      return;
    }
    if (listingCount >= listingLimit) {
      toast.error("Listing limit reached — upgrade to add more");
      return;
    }

    // Check if no photos — show nudge dialog
    const hasPhotos = data.photoUrls.length > 0 || data.photos.length > 0;
    if (!hasPhotos) {
      setShowPhotoNudge(true);
      return;
    }

    await executeSave();
  };

  const slideVariants = {
    enter: { opacity: 0, x: 20 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  const hasAnyPhotos = data.photoUrls.length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg max-h-[92dvh] flex flex-col p-0 gap-0 mt-[env(safe-area-inset-top)]">
          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-background border-b px-4 pt-4 pb-3 rounded-t-lg shrink-0">
            <DialogHeader>
              <DialogTitle className="font-display text-base">
                {step === "method" && "Add New Item"}
                {step === "input" && (data.method === "url" ? "Paste Vinted URL" : "Upload Photos")}
                {step === "details" && "Item Details"}
                {step === "done" && "Item Created!"}
              </DialogTitle>
            </DialogHeader>

            {/* Progress dots */}
            {step !== "done" && (
              <div className="flex items-center justify-center gap-2 pt-2">
                {["method", "input", "details"].map((s) => {
                  const steps = data.method === "manual" ? ["method", "details"] : ["method", "input", "details"];
                  const currentIdx = steps.indexOf(step);
                  const thisIdx = steps.indexOf(s);
                  if (thisIdx === -1) return null;
                  return (
                    <div key={s} className={`w-2 h-2 rounded-full transition-colors ${thisIdx <= currentIdx ? "bg-primary" : "bg-muted"}`} />
                  );
                })}
              </div>
            )}
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">

          <AnimatePresence mode="wait">
            {/* ═══ STEP 1: METHOD ═══ */}
            {step === "method" && (
              <motion.div key="method" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.15 }} className="space-y-2 pt-2">
                <p className="text-xs text-muted-foreground">How would you like to add your item?</p>

                <Card
                  onClick={() => handleMethodSelect("url")}
                  className="p-3.5 cursor-pointer hover:border-primary/40 transition-colors active:scale-[0.98] touch-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Link2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">Paste Vinted URL</p>
                      <p className="text-[11px] text-muted-foreground">Auto-fill details from any listing</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">Fastest</Badge>
                  </div>
                </Card>

                <Card
                  onClick={() => handleMethodSelect("photo")}
                  className="p-3.5 cursor-pointer hover:border-primary/40 transition-colors active:scale-[0.98] touch-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      <Camera className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">Upload Photos</p>
                      <p className="text-[11px] text-muted-foreground">Add photos and fill in the details</p>
                    </div>
                  </div>
                </Card>

                <Card
                  onClick={() => handleMethodSelect("manual")}
                  className="p-3.5 cursor-pointer hover:border-primary/40 transition-colors active:scale-[0.98] touch-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <Pencil className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">Manual Entry</p>
                      <p className="text-[11px] text-muted-foreground">Enter all details yourself</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* ═══ STEP 2: INPUT (URL or Photo) ═══ */}
            {step === "input" && (
              <motion.div key="input" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.15 }} className="space-y-4 pt-2">
                {data.method === "url" && (
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vinted Listing URL</Label>
                    <Input
                      value={data.url}
                      onChange={(e) => update({ url: e.target.value })}
                      placeholder="https://www.vinted.co.uk/items/..."
                      className="h-12 text-base"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      Paste the URL of any Vinted listing — yours or one you want to track.
                    </p>
                  </div>
                )}

                {data.method === "photo" && (
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Item Photos</Label>

                    {data.photoUrls.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {data.photoUrls.map((url, i) => (
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
                        {data.photoUrls.length < 5 && (
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
                        <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP · Max 10MB · Up to 5</p>
                      </Card>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                    accept="image/*,.heic,.heif"
                      multiple
                      className="hidden"
                      onChange={handlePhotoSelect}
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep("method")} disabled={scraping} className="h-12 min-w-[80px] active:scale-95 transition-transform touch-card">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button onClick={handleInputNext} disabled={scraping} className="flex-1 h-12 font-semibold active:scale-95 transition-transform touch-card">
                    {scraping ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Detecting details...</>
                    ) : (
                      <>Continue <ArrowRight className="w-4 h-4 ml-1.5" /></>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ═══ STEP 3: DETAILS ═══ */}
            {step === "details" && (
              <motion.div key="details" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.15 }} className="space-y-3 pt-1">

                {/* ── Guided Photo Upload Section ── */}
                <div ref={photoSectionRef} className="space-y-3">
                  <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Photos</Label>

                  {/* Main Photo */}
                  {hasAnyPhotos ? (
                    <div className="space-y-2">
                      {/* Primary photo — large */}
                      <div className="relative aspect-[4/3] sm:aspect-[4/3] max-h-[200px] sm:max-h-none rounded-xl overflow-hidden bg-muted border-2 border-primary/20">
                        <img src={data.photoUrls[0]} alt="Main photo" className="w-full h-full object-contain" />
                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                          <Badge className="text-[9px] font-bold">Main Photo</Badge>
                        </div>
                        <button
                          onClick={() => removePhoto(0)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Guidance tip */}
                      <div className="flex items-start gap-2 px-1">
                        <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          This photo is used by Photo Studio for model shots and background removal. A clear, full-front view gives the best results.
                        </p>
                      </div>

                      {/* Additional photos strip */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-muted-foreground font-medium">Extra angles (optional)</p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {data.photoUrls.slice(1).map((url, i) => (
                            <div key={i + 1} className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0 border group">
                              <img src={url} alt="" className="w-full h-full object-cover" />
                              <button
                                onClick={() => removePhoto(i + 1)}
                                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => swapToMain(i + 1)}
                                className="absolute bottom-0.5 left-0.5 bg-background/80 text-[8px] font-semibold px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                Set main
                              </button>
                            </div>
                          ))}
                          {data.photoUrls.length < 5 && (
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center hover:border-primary/40 transition-colors shrink-0"
                            >
                              <Plus className="w-4 h-4 text-muted-foreground" />
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">Back view, label/tag, detail close-ups, or flaws. These help buyers but aren't used for AI editing.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Card
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-primary/20 hover:border-primary/40 cursor-pointer p-4 text-center transition-colors touch-card"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">Add Main Photo</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Full front view, laid flat or on a hanger — neckline to hem</p>
                          </div>
                        </div>
                      </Card>

                      {/* Photo guidance card */}
                      <div className="flex items-start gap-2 rounded-lg bg-primary/[0.04] border border-primary/10 p-2.5">
                        <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          <span className="font-semibold text-foreground">For best AI results:</span> Upload a full, flat-lay or hanger shot showing the entire garment. Close-ups, folded shots, or partial views won't work well for model shots or background removal.
                        </p>
                      </div>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.heic,.heif"
                    multiple
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title *</Label>
                  <Input
                    value={data.title}
                    onChange={(e) => update({ title: e.target.value })}
                    placeholder="e.g. Nike Air Force 1 White UK 9"
                    className="h-11 text-base sm:text-sm"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Brand</Label>
                    <Input
                      value={data.brand}
                      onChange={(e) => update({ brand: e.target.value })}
                      placeholder="e.g. Nike"
                      className="h-11 sm:h-10 text-base sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Size</Label>
                    <Input
                      value={data.size}
                      onChange={(e) => update({ size: e.target.value })}
                      placeholder="e.g. UK 9 / M / 12"
                      className="h-11 sm:h-10 text-base sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
                    <select
                      value={data.category}
                      onChange={(e) => update({ category: e.target.value })}
                      className="w-full h-11 sm:h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="">Select...</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Condition *</Label>
                    <select
                      value={data.condition}
                      onChange={(e) => update({ condition: e.target.value })}
                      className="w-full h-11 sm:h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="">Select...</option>
                      {conditions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Colour</Label>
                    <Input
                      value={data.colour}
                      onChange={(e) => update({ colour: e.target.value })}
                      placeholder="e.g. Black"
                      className="h-11 sm:h-10 text-base sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Material</Label>
                    <Input
                      value={data.material}
                      onChange={(e) => update({ material: e.target.value })}
                      placeholder="e.g. Cotton"
                      className="h-11 sm:h-10 text-base sm:text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
                  <Textarea
                    value={data.description}
                    onChange={(e) => update({ description: e.target.value })}
                    placeholder="Describe your item (optional — AI can generate this later)"
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>

                {/* Seller notes / defect disclosure */}
                <div className="space-y-1">
                  <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Anything the buyer should know?
                    <span className="text-[10px] font-normal text-muted-foreground ml-1">(optional)</span>
                  </Label>
                  <Textarea
                    value={data.seller_notes}
                    onChange={(e) => update({ seller_notes: e.target.value })}
                    placeholder="e.g. Small bobble on the back, faded slightly on the left shoulder, tiny mark on the inside collar. Leave blank if none."
                    rows={2}
                    className="text-sm resize-none"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Honest disclosures build trust. The AI will weave these naturally into the description.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Listing Price (£)</Label>
                    <Input
                      value={data.currentPrice}
                      onChange={(e) => update({ currentPrice: e.target.value })}
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      className="h-11 sm:h-10 text-base sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Purchase Price (£) *</Label>
                    <Input
                      value={data.purchasePrice}
                      onChange={(e) => update({ purchasePrice: e.target.value })}
                      placeholder="What you paid"
                      type="number"
                      step="0.01"
                      className="h-11 sm:h-10 text-base sm:text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1 pb-1 sticky bottom-0 bg-background">
                  <Button
                    variant="outline"
                    onClick={() => setStep(data.method === "manual" ? "method" : "input")}
                    className="h-12 min-w-[80px] active:scale-95 transition-transform touch-card"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving || uploading}
                    className="flex-1 h-12 font-semibold active:scale-95 transition-transform touch-card"
                  >
                    {saving || uploading ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {uploading ? "Uploading..." : "Saving..."}</>
                    ) : (
                      <><Plus className="w-4 h-4 mr-1.5" /> Add Item</>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ═══ STEP 4: DONE ═══ */}
            {step === "done" && (
              <motion.div key="done" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.15 }} className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mx-auto">
                  <Check className="w-7 h-7 text-success" />
                </div>
                <div>
                  <p className="font-display font-bold text-lg">{data.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">Added to your inventory</p>
                </div>

                <div className="flex flex-col gap-2">
                  {createdItemId && (
                    <Button
                      onClick={() => { handleClose(false); navigate(`/items/${createdItemId}`); }}
                      className="w-full h-12 font-semibold active:scale-95 transition-transform touch-card"
                    >
                      <Package className="w-4 h-4 mr-2" /> View Item
                    </Button>
                  )}
                  {createdItemId && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleClose(false);
                        const params = new URLSearchParams();
                        params.set("itemId", createdItemId);
                        if (data.brand) params.set("brand", data.brand);
                        if (data.category) params.set("category", data.category);
                        if (data.condition) params.set("condition", data.condition);
                        if (data.size) params.set("size", data.size);
                        if (data.title) params.set("title", data.title);
                        if (data.purchasePrice) params.set("purchasePrice", String(data.purchasePrice));
                        if (data.url) params.set("url", data.url);
                        navigate(`/price-check?${params.toString()}`);
                      }}
                      className="w-full h-12 active:scale-95 transition-transform touch-card"
                    >
                      <Zap className="w-4 h-4 mr-2" /> Run Price Check
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={reset}
                    className="w-full h-12 active:scale-95 transition-transform text-muted-foreground touch-card"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Another Item
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>{/* end scrollable body */}
        </DialogContent>
      </Dialog>

      {/* No-photos nudge dialog */}
      <AlertDialog open={showPhotoNudge} onOpenChange={setShowPhotoNudge}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No photos added</AlertDialogTitle>
            <AlertDialogDescription>
              Photos are needed for Photo Studio (model shots, background removal) and help your listing sell faster. Add at least one clear, full-front photo for best results.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowPhotoNudge(false);
                executeSave();
              }}
            >
              Skip for now
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowPhotoNudge(false);
                setTimeout(() => photoSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
              }}
            >
              <ImageIcon className="w-4 h-4 mr-1.5" /> Add Photos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
