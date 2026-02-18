import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Loader2, Sparkles, Copy, Check, Save,
  Camera, Tag, ChevronDown,
  ClipboardCopy, Package, ArrowRight, Plus,
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
  const [remotePhotoUrls, setRemotePhotoUrls] = useState<string[]>([]);
  const [loadingItemPhotos, setLoadingItemPhotos] = useState(false);
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [autoStartReady, setAutoStartReady] = useState(false);
  const resultsRef = useCallback((node: HTMLDivElement | null) => {
    if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const itemId = searchParams.get("itemId");

  // Auto-start when arriving from ItemDetail with photos loaded
  useEffect(() => {
    if (!itemId || !user || result || optimizing) return;
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
      if (data.size && !size) setSize(data.size);
      if (data.colour && !colour) setColour(data.colour);
      if (data.material && !material) setMaterial(data.material);
      if (data.brand && !brand) setBrand(data.brand);
      if (data.category && !category) setCategory(data.category);
      if (data.condition && !condition) setCondition(data.condition);
      if (data.title && !currentTitle) setCurrentTitle(data.title);
      if (data.description && !currentDescription) setCurrentDescription(data.description);
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

  const handleOptimize = async () => {
    if (!user || !session) return;
    const allPhotoUrls = [...remotePhotoUrls];
    if (allPhotoUrls.length === 0 && !currentTitle.trim() && !brand.trim()) {
      toast.error("This item needs photos or details before optimising");
      return;
    }

    setOptimizing(true);
    setResult(null);

    try {
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

      // Milestone: first AI optimisation ever
      if (!localStorage.getItem("vintifi_first_optimisation_seen")) {
        localStorage.setItem("vintifi_first_optimisation", "1");
        localStorage.setItem("vintifi_first_optimisation_seen", "1");
      }

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

  const allPhotos = [...remotePhotoUrls];

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
        <motion.div ref={resultsRef} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-2.5 sm:space-y-4 max-w-3xl mx-auto">
          
          {/* Master Copy All Button */}
          <Card className="p-3 sm:p-5 border-primary/30 bg-gradient-to-br from-primary/[0.04] to-transparent">
            <div className="flex items-start gap-2.5 sm:gap-4">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display font-bold text-sm sm:text-lg">Vinted-Ready Pack</h2>
                <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5">Copy & paste directly into Vinted.</p>
              </div>
              <HealthScoreGauge score={result.health_score} compact size="sm" />
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3 sm:mt-4">
              <Button onClick={handleCopyAll} className="font-semibold h-11 sm:h-11 active:scale-95 transition-transform touch-card flex-1 sm:flex-none">
                {copiedField === "all" ? <Check className="w-4 h-4 mr-1.5" /> : <ClipboardCopy className="w-4 h-4 mr-1.5" />}
                {copiedField === "all" ? "Copied!" : "Copy Full Listing"}
              </Button>
              {itemId && (
                <Button variant="outline" onClick={() => navigate(`/vintography?itemId=${itemId}`)} className="h-11 active:scale-95 transition-transform touch-card">
                  <Camera className="w-4 h-4 mr-1.5" />
                  Photos
                </Button>
              )}
            </div>
          </Card>

          {/* Health Score Breakdown */}
          {result.health_score && (
            <Card className="p-3 sm:p-5">
              <Label className="text-[9px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 sm:mb-3 block">Health Score</Label>
              <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
                {[
                  { label: "Title", score: result.health_score.title_score, feedback: result.health_score.title_feedback },
                  { label: "Desc", score: result.health_score.description_score, feedback: result.health_score.description_feedback },
                  { label: "Photos", score: result.health_score.photo_score, feedback: result.health_score.photo_feedback },
                  { label: "Complete", score: result.health_score.completeness_score, feedback: result.health_score.completeness_feedback },
                ].map((item) => (
                  <div key={item.label} className="text-center p-2 sm:p-3 rounded-xl bg-muted/40 border border-border">
                    <p className={`font-display text-lg sm:text-2xl font-extrabold ${
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
          <Card className="p-3 sm:p-5">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <Label className="text-[9px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</Label>
              <Button variant="ghost" size="sm" className="h-8 text-xs active:scale-95 touch-card" onClick={() => copyToClipboard(result.optimised_title, "title")}>
                {copiedField === "title" ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                {copiedField === "title" ? "Copied" : "Copy"}
              </Button>
            </div>
            <div className="p-2.5 sm:p-3 rounded-lg bg-success/5 border border-success/20">
              <p className="text-sm sm:text-base font-medium">{result.optimised_title}</p>
            </div>
          </Card>

          {/* Description */}
          <Card className="p-3 sm:p-5">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <Label className="text-[9px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
              <Button variant="ghost" size="sm" className="h-8 text-xs active:scale-95 touch-card" onClick={() => copyToClipboard(result.optimised_description, "description")}>
                {copiedField === "description" ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                {copiedField === "description" ? "Copied" : "Copy"}
              </Button>
            </div>
            <div className="p-2.5 sm:p-3 rounded-lg bg-success/5 border border-success/20 max-h-56 sm:max-h-72 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{result.optimised_description}</p>
            </div>
          </Card>

          {/* Hashtags */}
          {result.hashtags && result.hashtags.length > 0 && (
            <Card className="p-3 sm:p-5">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <Label className="text-[9px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hashtags</Label>
                <Button variant="ghost" size="sm" className="h-8 text-xs active:scale-95 touch-card" onClick={() => copyToClipboard(result.hashtags.join(" "), "hashtags")}>
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
            <Card className="p-3 sm:p-5">
              <Label className="text-[9px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 sm:mb-3 block">Photos</Label>
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
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

          {/* Next Step CTA */}
          {itemId && (
            <Card className="p-3 sm:p-5 border-primary/20 bg-primary/[0.03]">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold truncate">Next: Enhance Photos</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">AI background removal & enhancement</p>
                </div>
                <Button size="sm" onClick={() => navigate(`/vintography?itemId=${itemId}`)} className="shrink-0 h-9 active:scale-95 touch-card">
                  <Camera className="w-3.5 h-3.5 mr-1" /> Photos
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
        /* Auto-start card when item context is ready */
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
            </Card>
          </motion.div>
        ) : itemId && loadingItemPhotos ? (
          /* Loading item data */
          <div className="max-w-2xl mx-auto">
            <Card className="p-6 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading item data…</p>
            </Card>
          </div>
        ) : !itemId ? (
          /* No itemId — prompt to pick or add an item */
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto">
            <Card className="p-8 sm:p-10 text-center border-border/50">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <h2 className="font-display font-bold text-lg sm:text-xl mb-2">Pick an item to optimise</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Select an item from your inventory to generate an AI-optimised title, description, and hashtags.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <ItemPickerDialog onSelect={(picked) => {
                  const params = new URLSearchParams({ itemId: picked.id });
                  navigate(`/optimize?${params.toString()}`, { replace: true });
                }}>
                  <Button variant="outline" className="h-12 sm:h-11 px-6 active:scale-95 transition-transform">
                    <Package className="w-4 h-4 mr-2" />
                    Pick from My Items
                  </Button>
                </ItemPickerDialog>
                <Button onClick={() => navigate("/listings")} className="h-12 sm:h-11 px-6 active:scale-95 transition-transform">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Item
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : (
          /* itemId present but no photos loaded yet and not loading — show optimise button */
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
            <Card className="p-5 sm:p-6 border-primary/20 bg-gradient-to-br from-primary/[0.04] to-transparent text-center">
              <p className="font-display font-bold text-base sm:text-lg mb-1">{currentTitle || brand || "Your Item"}</p>
              <p className="text-xs text-muted-foreground mb-4">{[brand, category, size].filter(Boolean).join(" · ") || "Ready to optimise"}</p>
              <Button onClick={handleOptimize} className="h-12 sm:h-11 font-semibold px-8 active:scale-95 transition-transform">
                <Sparkles className="w-4 h-4 mr-2" /> Optimise Now
              </Button>
            </Card>
          </motion.div>
        )
      ) : null}

      </FeatureGate>
    </PageShell>
  );
}
