import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Sparkles, Copy, Check, Save,
  ImagePlus, X, Camera, Link, ExternalLink, Tag, ChevronDown,
  ClipboardCopy, Download, Package,
} from "lucide-react";
import { HealthScoreGauge } from "@/components/HealthScoreGauge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PageShell } from "@/components/PageShell";
import { FeatureGate } from "@/components/FeatureGate";

type HealthScore = {
  overall: number;
  title_score: number;
  description_score: number;
  photo_score: number;
  completeness_score: number;
  title_feedback: string;
  description_feedback: string;
  photo_feedback: string;
  completeness_feedback: string;
};

type OptimiseResult = {
  optimised_title: string;
  optimised_description: string;
  hashtags: string[];
  suggested_tags: string[];
  detected_brand: string;
  detected_category: string;
  detected_condition: string;
  detected_colour: string;
  detected_material: string;
  health_score: HealthScore;
  improvements: string[];
  style_notes: string;
};

export default function OptimizeListing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, session, profile, credits, refreshCredits } = useAuth();
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [remotePhotoUrls, setRemotePhotoUrls] = useState<string[]>([]);
  const [loadingItemPhotos, setLoadingItemPhotos] = useState(false);
  const [vintedUrl, setVintedUrl] = useState(searchParams.get("vintedUrl") || "");
  const [fetchingFromUrl, setFetchingFromUrl] = useState(false);
  const [brand, setBrand] = useState(searchParams.get("brand") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [size, setSize] = useState(searchParams.get("size") || "");
  const [condition, setCondition] = useState(searchParams.get("condition") || "");
  const [currentTitle, setCurrentTitle] = useState(searchParams.get("title") || "");
  const [currentDescription, setCurrentDescription] = useState(searchParams.get("description") || "");
  const [optimizing, setOptimizing] = useState(false);
  const [result, setResult] = useState<OptimiseResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const resultsRef = useCallback((node: HTMLDivElement | null) => {
    if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const itemId = searchParams.get("itemId");

  // Fetch existing photos from DB when opened from an item detail page
  useEffect(() => {
    if (!itemId) return;
    setLoadingItemPhotos(true);
    (async () => {
      const { data } = await supabase
        .from("listings")
        .select("image_url, images")
        .eq("id", itemId)
        .maybeSingle();
      if (!data) { setLoadingItemPhotos(false); return; }
      const urls: string[] = [];
      if (data.image_url) urls.push(data.image_url);
      if (Array.isArray(data.images)) {
        for (const img of data.images) {
          const u = typeof img === "string" ? img : (img as any)?.url;
          if (u && !urls.includes(u)) urls.push(u);
        }
      }
      if (urls.length > 0) setRemotePhotoUrls(urls);
      setLoadingItemPhotos(false);
    })();
  }, [itemId]);

  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 4) {
      toast.error("Maximum 4 photos allowed");
      return;
    }
    const newPhotos = [...photos, ...files].slice(0, 4);
    setPhotos(newPhotos);
    setPhotoPreviewUrls(newPhotos.map((f) => URL.createObjectURL(f)));
  }, [photos]);

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    setPhotoPreviewUrls(newPhotos.map((f) => URL.createObjectURL(f)));
  };

  const handleFetchFromVintedUrl = async () => {
    if (!vintedUrl.trim() || !vintedUrl.includes("vinted")) {
      toast.error("Enter a valid Vinted listing URL");
      return;
    }
    setFetchingFromUrl(true);
    try {
      const { data, error } = await supabase.functions.invoke("optimize-listing", {
        body: { vintedUrl: vintedUrl.trim(), fetchOnly: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.photos && data.photos.length > 0) {
        setRemotePhotoUrls(data.photos);
        toast.success(`Found ${data.photos.length} photo(s) from listing`);
      }
      if (data?.title) setCurrentTitle(data.title);
      if (data?.brand) setBrand(data.brand);
      if (data?.description) setCurrentDescription(data.description);
      if (data?.category) setCategory(data.category);
      if (data?.size) setSize(data.size);
      if (data?.condition) setCondition(data.condition);
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch listing details");
    } finally {
      setFetchingFromUrl(false);
    }
  };

  const handleOptimize = async () => {
    if (!user || !session) return;
    const allPhotoUrls = [...remotePhotoUrls];
    if (photos.length === 0 && allPhotoUrls.length === 0 && !currentTitle.trim() && !brand.trim()) {
      toast.error("Please upload photos or enter item details");
      return;
    }

    setOptimizing(true);
    setResult(null);

    try {
      for (const photo of photos) {
        const ext = photo.name.split(".").pop();
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("listing-photos").upload(path, photo);
        if (uploadError) { console.error("Upload error:", uploadError); continue; }
        const { data: urlData } = supabase.storage.from("listing-photos").getPublicUrl(path);
        allPhotoUrls.push(urlData.publicUrl);
      }

      const { data, error } = await supabase.functions.invoke("optimize-listing", {
        body: {
          photoUrls: allPhotoUrls,
          brand: brand.trim() || undefined,
          category: category.trim() || undefined,
          size: size.trim() || undefined,
          condition: condition.trim() || undefined,
          currentTitle: currentTitle.trim() || undefined,
          currentDescription: currentDescription.trim() || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data as OptimiseResult);
      refreshCredits();
      toast.success("Listing optimised!");
      const isUnlimited = profile?.subscription_tier === "scale" || (credits?.credits_limit ?? 0) >= 999;
      if (!isUnlimited) toast("−1 credit used", { duration: 2000 });

      if (itemId && data?.health_score) {
        const updatePayload: Record<string, any> = {
          health_score: data.health_score.overall,
          last_optimised_at: new Date().toISOString(),
          title: data.optimised_title,
          description: data.optimised_description,
        };
        if (data.detected_brand) updatePayload.brand = data.detected_brand;
        if (data.detected_category) updatePayload.category = data.detected_category;
        if (data.detected_condition) updatePayload.condition = data.detected_condition;
        if (data.detected_colour) updatePayload.colour = data.detected_colour;
        if (data.detected_material) updatePayload.material = data.detected_material;

        await supabase.from("listings").update(updatePayload).eq("id", itemId).eq("user_id", user.id);
        await supabase.from("item_activity").insert({
          user_id: user.id,
          listing_id: itemId,
          type: "optimised",
          payload: {
            health_score: data.health_score.overall,
            improvements: data.improvements || [],
            suggested_tags: data.suggested_tags || [],
            hashtags: data.hashtags || [],
            optimised_title: data.optimised_title,
            optimised_description: data.optimised_description,
          },
        });
      }
    } catch (e: any) {
      toast.error(e.message || "Optimisation failed");
      console.error(e);
    } finally {
      setOptimizing(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copied!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyAll = async () => {
    if (!result) return;
    const hashtagStr = (result.hashtags || []).join(" ");
    const fullText = `${result.optimised_title}\n\n${result.optimised_description}${hashtagStr ? `\n\n${hashtagStr}` : ""}`;
    await copyToClipboard(fullText, "all");
    toast.success("Full listing copied — paste into Vinted!");
  };

  const handleSaveAsListing = async () => {
    if (!result || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("listings").insert({
        user_id: user.id,
        title: result.optimised_title,
        description: result.optimised_description,
        brand: result.detected_brand || brand || null,
        category: result.detected_category || category || null,
        condition: result.detected_condition || condition || null,
        colour: result.detected_colour || null,
        material: result.detected_material || null,
        size: size || null,
        health_score: result.health_score.overall,
        image_url: remotePhotoUrls[0] || null,
        status: "active",
      } as any);
      if (error) throw error;
      toast.success("Saved to My Items!");
      navigate("/listings");
    } catch (e: any) {
      toast.error("Failed to save listing");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const allPhotos = [...remotePhotoUrls, ...photoPreviewUrls];

  return (
    <PageShell title="AI Listing Optimiser" subtitle="Create the perfect Vinted listing" maxWidth="max-w-6xl">
      <FeatureGate feature="optimize_listing">

      {/* If we have a result, show the Vinted-Ready Pack */}
      {result ? (
        <motion.div ref={resultsRef} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 max-w-3xl mx-auto">
          
          {/* Master Copy All Button */}
          <Card className="p-4 sm:p-5 border-primary/30 bg-gradient-to-br from-primary/[0.04] to-transparent">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display font-bold text-base sm:text-lg">Your Vinted-Ready Pack</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Everything below is ready to copy and paste directly into Vinted.</p>
              </div>
              <HealthScoreGauge score={result.health_score} compact size="sm" />
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button onClick={handleCopyAll} className="font-semibold h-11 active:scale-95 transition-transform flex-1 sm:flex-none">
                {copiedField === "all" ? <Check className="w-4 h-4 mr-2" /> : <ClipboardCopy className="w-4 h-4 mr-2" />}
                {copiedField === "all" ? "Copied!" : "Copy Full Listing"}
              </Button>
              {!itemId && (
                <Button variant="outline" onClick={handleSaveAsListing} disabled={saving} className="h-11 active:scale-95 transition-transform">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save to Items
                </Button>
              )}
              {itemId && (
                <Button variant="outline" onClick={() => navigate(`/vintography?itemId=${itemId}`)} className="h-11 active:scale-95 transition-transform">
                  <Camera className="w-4 h-4 mr-2" />
                  Enhance Photos
                </Button>
              )}
            </div>
          </Card>

          {/* Title */}
          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</Label>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyToClipboard(result.optimised_title, "title")}>
                {copiedField === "title" ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                {copiedField === "title" ? "Copied" : "Copy"}
              </Button>
            </div>
            <div className="p-3 rounded-lg bg-success/5 border border-success/20">
              <p className="text-sm sm:text-base font-medium">{result.optimised_title}</p>
            </div>
          </Card>

          {/* Description */}
          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyToClipboard(result.optimised_description, "description")}>
                {copiedField === "description" ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                {copiedField === "description" ? "Copied" : "Copy"}
              </Button>
            </div>
            <div className="p-3 rounded-lg bg-success/5 border border-success/20 max-h-72 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{result.optimised_description}</p>
            </div>
          </Card>

          {/* Hashtags */}
          {result.hashtags && result.hashtags.length > 0 && (
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hashtags</Label>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyToClipboard(result.hashtags.join(" "), "hashtags")}>
                  {copiedField === "hashtags" ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                  {copiedField === "hashtags" ? "Copied" : "Copy All"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.hashtags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all py-1.5 px-2.5 text-xs"
                    onClick={() => copyToClipboard(tag, `ht-${tag}`)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Photos */}
          {allPhotos.length > 0 && (
            <Card className="p-4 sm:p-5">
              <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">Photos</Label>
              <div className="grid grid-cols-4 gap-2">
                {allPhotos.slice(0, 4).map((url, i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              {itemId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 h-9 text-xs active:scale-95 transition-transform"
                  onClick={() => navigate(`/vintography?itemId=${itemId}`)}
                >
                  <Camera className="w-3.5 h-3.5 mr-1.5" />
                  Enhance these photos in Photo Studio
                </Button>
              )}
            </Card>
          )}

          {/* More Details (collapsible) */}
          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 w-full py-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className={`w-4 h-4 transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
                Details &amp; Feedback
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3">
              {(result.detected_brand || result.detected_colour || result.detected_material) && (
                <Card className="p-4">
                  <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">Detected</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {result.detected_brand && <Badge variant="secondary"><Tag className="w-3 h-3 mr-1" />{result.detected_brand}</Badge>}
                    {result.detected_category && <Badge variant="secondary">{result.detected_category}</Badge>}
                    {result.detected_condition && <Badge variant="secondary">{result.detected_condition}</Badge>}
                    {result.detected_colour && <Badge variant="secondary">{result.detected_colour}</Badge>}
                    {result.detected_material && <Badge variant="secondary">{result.detected_material}</Badge>}
                  </div>
                </Card>
              )}
              {result.improvements.length > 0 && (
                <Card className="p-4">
                  <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">Improvements Made</Label>
                  <ul className="space-y-1.5">
                    {result.improvements.map((imp, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              {result.style_notes && (
                <Card className="p-4">
                  <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Style Notes</Label>
                  <p className="text-sm leading-relaxed">{result.style_notes}</p>
                </Card>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Start Over */}
          <div className="text-center pt-2 pb-4">
            <Button variant="ghost" size="sm" onClick={() => setResult(null)} className="text-xs text-muted-foreground">
              ← Optimise another item
            </Button>
          </div>
        </motion.div>
      ) : (
        /* Input Form */
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
          <Card className="p-4 sm:p-6 border-border/50">
            <h2 className="font-display font-bold text-sm sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Your Item
            </h2>

            {/* Vinted URL Import */}
            <div className="mb-4 sm:mb-5">
              <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                <Link className="w-3 h-3 inline mr-1" />
                Import from Vinted URL
              </Label>
              <div className="flex gap-2">
                <Input
                  value={vintedUrl}
                  onChange={(e) => setVintedUrl(e.target.value)}
                  placeholder="https://www.vinted.co.uk/items/..."
                  className="h-11 sm:h-10 text-base sm:text-sm flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleFetchFromVintedUrl}
                  disabled={fetchingFromUrl || !vintedUrl.trim()}
                  className="h-11 sm:h-10 shrink-0 active:scale-95 transition-transform"
                >
                  {fetchingFromUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ExternalLink className="w-4 h-4 mr-1" /> Fetch</>}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Paste a Vinted listing URL to auto-import photos &amp; details</p>
            </div>

            {loadingItemPhotos && (
              <div className="mb-4 sm:mb-5">
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  {[1, 2, 3].map(i => <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />)}
                </div>
              </div>
            )}

            {!loadingItemPhotos && remotePhotoUrls.length > 0 && (
              <div className="mb-4 sm:mb-5">
                <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-success mb-2 block">
                  ✓ Imported Photos ({remotePhotoUrls.length})
                </Label>
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  {remotePhotoUrls.map((url, i) => (
                    <div key={`remote-${i}`} className="relative aspect-square rounded-xl overflow-hidden border-2 border-success/30 bg-muted">
                      <img src={url} alt={`Imported ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setRemotePhotoUrls(prev => prev.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center active:scale-90 transition-transform"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Photo Upload */}
            <div className="mb-4 sm:mb-5">
              <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                {remotePhotoUrls.length > 0 ? "Add More Photos" : "Photos (up to 4)"}
              </Label>
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {photoPreviewUrls.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted">
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center active:scale-90 transition-transform">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {photos.length < 4 && (
                  <label className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 active:border-primary flex flex-col items-center justify-center cursor-pointer transition-colors bg-muted/30">
                    <ImagePlus className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground mb-0.5" />
                    <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">Add</span>
                    <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* Item Details */}
            <div className="space-y-2.5 sm:space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Title</Label>
                <Input value={currentTitle} onChange={(e) => setCurrentTitle(e.target.value)} placeholder="e.g. Nike trainers size 9" className="h-11 sm:h-10 text-base sm:text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Description</Label>
                <Textarea value={currentDescription} onChange={(e) => setCurrentDescription(e.target.value)} placeholder="Paste your existing listing description..." rows={3} className="text-base sm:text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Brand</Label>
                  <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Nike" className="h-11 sm:h-10 text-base sm:text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
                  <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Trainers" className="h-11 sm:h-10 text-base sm:text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Size</Label>
                  <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. UK 9" className="h-11 sm:h-10 text-base sm:text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Condition</Label>
                  <Input value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="e.g. Very Good" className="h-11 sm:h-10 text-base sm:text-sm" />
                </div>
              </div>
            </div>

            <Button onClick={handleOptimize} disabled={optimizing} className="w-full mt-4 sm:mt-5 font-semibold h-12 sm:h-11 active:scale-95 transition-transform">
              {optimizing ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Analysing with AI...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Optimise Listing</>
              )}
            </Button>
          </Card>
        </motion.div>
      )}

      </FeatureGate>
    </PageShell>
  );
}
