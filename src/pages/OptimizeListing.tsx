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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Sparkles, Copy, Check, Save,
  ImagePlus, X, Camera, Link, ExternalLink, Tag, ChevronDown,
  ClipboardCopy, Download, Package, ArrowRight,
} from "lucide-react";
import { HealthScoreGauge } from "@/components/HealthScoreGauge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PageShell } from "@/components/PageShell";
import { FeatureGate } from "@/components/FeatureGate";
import { ItemPickerDialog } from "@/components/ItemPickerDialog";

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
  const [colour, setColour] = useState(searchParams.get("colour") || "");
  const [material, setMaterial] = useState(searchParams.get("material") || "");
  const [currentTitle, setCurrentTitle] = useState(searchParams.get("title") || "");
  const [currentDescription, setCurrentDescription] = useState(searchParams.get("description") || "");
  const [optimizing, setOptimizing] = useState(false);
  const [result, setResult] = useState<OptimiseResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [manualFieldsOpen, setManualFieldsOpen] = useState(false);
  const [autoStartReady, setAutoStartReady] = useState(false);
  const resultsRef = useCallback((node: HTMLDivElement | null) => {
    if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const itemId = searchParams.get("itemId");

  // Auto-expand manual fields if pre-populated from params (not URL mode)
  useEffect(() => {
    if (!vintedUrl && (brand || category || currentTitle)) {
      setManualFieldsOpen(true);
    }
  }, []);

  // Sprint 7: Auto-start when arriving from ItemDetail with photos loaded
  useEffect(() => {
    if (!itemId || !user || result || optimizing) return;
    // Wait for photos to load, then mark as ready
    if (remotePhotoUrls.length > 0 && !autoStartReady) {
      setAutoStartReady(true);
    }
  }, [itemId, remotePhotoUrls, user, result, optimizing]);

  // Fetch existing photos AND metadata from DB when opened from an item detail page
  useEffect(() => {
    if (!itemId) return;
    setLoadingItemPhotos(true);
    (async () => {
      const { data } = await supabase
        .from("listings")
        .select("image_url, images, size, colour, material, condition, brand, category, title, description")
        .eq("id", itemId)
        .maybeSingle();
      if (!data) { setLoadingItemPhotos(false); return; }
      // Populate metadata from DB if not already set via search params
      if (data.size && !size) setSize(data.size);
      if (data.colour && !colour) setColour(data.colour);
      if (data.material && !material) setMaterial(data.material);
      if (data.brand && !brand) setBrand(data.brand);
      if (data.category && !category) setCategory(data.category);
      if (data.condition && !condition) setCondition(data.condition);
      if (data.title && !currentTitle) setCurrentTitle(data.title);
      if (data.description && !currentDescription) setCurrentDescription(data.description);
      // Photos
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
          colour: colour.trim() || undefined,
          material: material.trim() || undefined,
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
          optimised_title: data.optimised_title,
          optimised_description: data.optimised_description,
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
      // Navigate to the newly created item — fetch it first
      const { data: newItems } = await supabase
        .from("listings")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (newItems && newItems.length > 0) {
        navigate(`/items/${newItems[0].id}`);
      } else {
        navigate("/listings");
      }
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

      {/* Loading Skeleton */}
      {optimizing && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 max-w-3xl mx-auto">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-72" />
              </div>
              <Skeleton className="w-14 h-14 rounded-full" />
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
          </Card>
          <Card className="p-5 sm:p-6">
            <Skeleton className="h-3 w-12 mb-3" />
            <Skeleton className="h-6 w-full rounded-lg" />
          </Card>
          <Card className="p-5 sm:p-6">
            <Skeleton className="h-3 w-20 mb-3" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </Card>
          <Card className="p-5 sm:p-6">
            <Skeleton className="h-3 w-16 mb-3" />
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-20 rounded-full" />
              ))}
            </div>
          </Card>
          <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Analysing with AI…</span>
          </div>
        </motion.div>
      )}

      {/* If we have a result, show the Vinted-Ready Pack */}
      {result && !optimizing ? (
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
              <Button variant="outline" onClick={() => navigate(itemId ? `/vintography?itemId=${itemId}` : `/vintography`)} className="h-11 active:scale-95 transition-transform">
                <Camera className="w-4 h-4 mr-2" />
                Enhance Photos
              </Button>
            </div>
          </Card>

          {/* Health Score Breakdown — prominent */}
          {result.health_score && (
            <Card className="p-4 sm:p-5">
              <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">Health Score Breakdown</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Title", score: result.health_score.title_score, feedback: result.health_score.title_feedback },
                  { label: "Description", score: result.health_score.description_score, feedback: result.health_score.description_feedback },
                  { label: "Photos", score: result.health_score.photo_score, feedback: result.health_score.photo_feedback },
                  { label: "Completeness", score: result.health_score.completeness_score, feedback: result.health_score.completeness_feedback },
                ].map((item) => (
                  <div key={item.label} className="text-center p-3 rounded-xl bg-muted/40 border border-border">
                    <p className={`font-display text-2xl font-extrabold ${
                      item.score >= 80 ? "text-success" : item.score >= 60 ? "text-accent" : "text-destructive"
                    }`}>{item.score}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">{item.label}</p>
                    {item.feedback && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{item.feedback}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}

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
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3 h-9 text-xs active:scale-95 transition-transform"
                onClick={() => navigate(itemId ? `/vintography?itemId=${itemId}` : `/vintography`)}
              >
                <Camera className="w-3.5 h-3.5 mr-1.5" />
                Enhance these photos in Photo Studio
              </Button>
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

          {/* Next Step CTA */}
          {itemId && (
            <Card className="p-4 sm:p-5 border-primary/20 bg-primary/[0.03]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Next: Enhance Your Photos</p>
                  <p className="text-xs text-muted-foreground">Make your photos stand out with AI background removal & enhancement</p>
                </div>
                <Button onClick={() => navigate(`/vintography?itemId=${itemId}`)} className="shrink-0">
                  <Camera className="w-4 h-4 mr-1.5" /> Photo Studio
                </Button>
              </div>
            </Card>
          )}

          {/* Start Over */}
          <div className="text-center pt-2 pb-4">
            <Button variant="ghost" size="sm" onClick={() => setResult(null)} className="text-xs text-muted-foreground">
              ← Optimise another item
            </Button>
          </div>
        </motion.div>
      ) : !optimizing ? (
        /* Sprint 7: Auto-start card when item context is ready */
        autoStartReady && itemId ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
            <Card className="p-5 sm:p-6 border-primary/20 bg-gradient-to-br from-primary/[0.04] to-transparent text-center">
              {remotePhotoUrls[0] && (
                <div className="w-20 h-20 rounded-xl overflow-hidden border border-border bg-muted mx-auto mb-4">
                  <img src={remotePhotoUrls[0]} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <p className="font-display font-bold text-base sm:text-lg mb-1">{currentTitle || brand || "Your Item"}</p>
              <p className="text-xs text-muted-foreground mb-4">{[brand, category, size].filter(Boolean).join(" · ") || "Ready to optimise"}</p>
              <p className="text-sm text-muted-foreground mb-4">{remotePhotoUrls.length} photo{remotePhotoUrls.length !== 1 ? "s" : ""} loaded from your item</p>
              <Button onClick={handleOptimize} className="h-12 sm:h-11 font-semibold px-8 active:scale-95 transition-transform">
                <Sparkles className="w-4 h-4 mr-2" /> Optimise Now
              </Button>
              <div className="mt-3">
                <button onClick={() => setAutoStartReady(false)} className="text-xs text-muted-foreground hover:underline">
                  Edit details manually instead
                </button>
              </div>
            </Card>
          </motion.div>
        ) : (
        /* Input Form — URL-first with collapsible manual fields */
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
          <Card className="p-4 sm:p-6 border-border/50">
            {/* Vinted URL Import — hero input */}
            <div className="mb-5 sm:mb-6">
              <h2 className="font-display font-bold text-sm sm:text-lg mb-3 flex items-center gap-2">
                <Link className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Import from Vinted URL
              </h2>
              <div className="flex gap-2">
                <Input
                  value={vintedUrl}
                  onChange={(e) => setVintedUrl(e.target.value)}
                  placeholder="https://www.vinted.co.uk/items/..."
                  className="h-12 sm:h-11 text-base sm:text-sm flex-1"
                  autoFocus={!itemId && !brand}
                />
                <Button
                  variant="outline"
                  onClick={handleFetchFromVintedUrl}
                  disabled={fetchingFromUrl || !vintedUrl.trim()}
                  className="h-12 sm:h-11 shrink-0 active:scale-95 transition-transform"
                >
                  {fetchingFromUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ExternalLink className="w-4 h-4 mr-1" /> Fetch</>}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">Paste a Vinted listing URL to auto-import photos &amp; details</p>
              {/* Sprint 6: Pick from items */}
              {!itemId && (
                <div className="mt-1.5">
                  <ItemPickerDialog onSelect={(picked) => {
                    const params = new URLSearchParams({ itemId: picked.id });
                    if (picked.title) params.set("title", picked.title);
                    if (picked.brand) params.set("brand", picked.brand);
                    if (picked.category) params.set("category", picked.category);
                    if (picked.condition) params.set("condition", picked.condition);
                    if (picked.size) params.set("size", picked.size!);
                    if ((picked as any).colour) params.set("colour", (picked as any).colour);
                    if ((picked as any).material) params.set("material", (picked as any).material);
                    // Navigate with replace and reset state instead of reloading
                    navigate(`/optimize?${params.toString()}`, { replace: true });
                    setResult(null);
                    setPhotos([]);
                    setPhotoPreviewUrls([]);
                    setRemotePhotoUrls([]);
                    setCurrentTitle(picked.title || "");
                    setBrand(picked.brand || "");
                    setCategory(picked.category || "");
                    setCondition(picked.condition || "");
                    setSize(picked.size || "");
                    setColour((picked as any).colour || "");
                    setMaterial((picked as any).material || "");
                    setVintedUrl("");
                    setAutoStartReady(false);
                  }}>
                    <button className="text-xs text-primary hover:underline font-medium">
                      or pick from your items
                    </button>
                  </ItemPickerDialog>
                </div>
              )}
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

            {/* Collapsible Manual Fields */}
            <Collapsible open={manualFieldsOpen} onOpenChange={setManualFieldsOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 w-full py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors mb-2">
                  <ChevronDown className={`w-4 h-4 transition-transform ${manualFieldsOpen ? "rotate-180" : ""}`} />
                  {manualFieldsOpen ? "Hide Details" : "Add details manually"}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2.5 sm:space-y-3">
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
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Colour</Label>
                    <Input value={colour} onChange={(e) => setColour(e.target.value)} placeholder="e.g. Black" className="h-11 sm:h-10 text-base sm:text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Material</Label>
                    <Input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="e.g. Cotton" className="h-11 sm:h-10 text-base sm:text-sm" />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Button onClick={handleOptimize} disabled={optimizing} className="w-full mt-4 sm:mt-5 font-semibold h-12 sm:h-11 active:scale-95 transition-transform">
              <Sparkles className="w-4 h-4 mr-2" /> Optimise Listing
            </Button>
          </Card>
        </motion.div>
        )
      ) : null}

      </FeatureGate>
    </PageShell>
  );
}
