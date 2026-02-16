import { useState, useCallback } from "react";
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
  ImagePlus, X, Camera, Globe, Languages, ArrowRight,
  Search, ShoppingBag, Link, ExternalLink, Tag,
} from "lucide-react";
import { JourneyBanner } from "@/components/JourneyBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HealthScoreGauge } from "@/components/HealthScoreGauge";
import { UseCaseSpotlight } from "@/components/UseCaseSpotlight";
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

type TranslationEntry = {
  title: string;
  description: string;
  tags: string[];
};

type Translations = Record<string, TranslationEntry>;

const LANGUAGES = [
  { code: "fr", label: "🇫🇷 French", short: "FR" },
  { code: "de", label: "🇩🇪 German", short: "DE" },
  { code: "nl", label: "🇳🇱 Dutch", short: "NL" },
  { code: "es", label: "🇪🇸 Spanish", short: "ES" },
] as const;

export default function OptimizeListing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, session, refreshCredits } = useAuth();
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [remotePhotoUrls, setRemotePhotoUrls] = useState<string[]>([]);
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
  const [translations, setTranslations] = useState<Translations | null>(null);
  const [translating, setTranslating] = useState(false);
  const [activeTransLang, setActiveTransLang] = useState("fr");

  const itemId = searchParams.get("itemId");

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
      // Upload local photos
      for (const photo of photos) {
        const ext = photo.name.split(".").pop();
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("listing-photos")
          .upload(path, photo);
        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }
        const { data: urlData } = supabase.storage
          .from("listing-photos")
          .getPublicUrl(path);
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

      // If opened from an item, update the listing record
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

        await supabase
          .from("listings")
          .update(updatePayload)
          .eq("id", itemId)
          .eq("user_id", user.id);

        await supabase.from("item_activity").insert({
          user_id: user.id,
          listing_id: itemId,
          type: "optimised",
          payload: {
            health_score: data.health_score.overall,
            improvements: data.improvements?.length || 0,
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
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedField(null), 2000);
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
        image_url: photoPreviewUrls[0] || null,
        status: "active",
      } as any);
      if (error) throw error;
      toast.success("Saved to My Listings!");
      navigate("/listings");
    } catch (e: any) {
      toast.error("Failed to save listing");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleTranslate = async () => {
    if (!result) return;
    setTranslating(true);
    setTranslations(null);
    try {
      const { data, error } = await supabase.functions.invoke("translate-listing", {
        body: {
          title: result.optimised_title,
          description: result.optimised_description,
          tags: result.suggested_tags,
          languages: LANGUAGES.map((l) => l.code),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTranslations(data.translations);
      toast.success("Listing translated into 4 languages!");
    } catch (e: any) {
      toast.error(e.message || "Translation failed");
      console.error(e);
    } finally {
      setTranslating(false);
    }
  };

  return (
    <PageShell
      title="AI Listing Optimiser"
      subtitle="Upload photos · Get AI-optimised listings"
      maxWidth="max-w-6xl"
    >
      <FeatureGate feature="optimize_listing">
      
      <UseCaseSpotlight
        featureKey="optimize-listing"
        icon={Sparkles}
        scenario="Your listing has been up for 2 weeks with zero interest..."
        description="The title is generic, the description is thin, and you're invisible in Vinted's search results."
        outcome="The AI rewrites your title with high-traffic keywords and your views jump 4x overnight."
        tip="Upload photos too — the AI can detect brand, condition, and suggest the perfect category."
      />

      <div className={`grid gap-4 sm:gap-6 ${result ? "lg:grid-cols-2" : "max-w-2xl mx-auto"}`}>
        {/* Input Panel */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
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
                  {fetchingFromUrl ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <><ExternalLink className="w-4 h-4 mr-1" /> Fetch</>
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Paste a Vinted listing URL to auto-import photos &amp; details</p>
            </div>

            {/* Remote photos preview */}
            {remotePhotoUrls.length > 0 && (
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
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {photos.length < 4 && (
                  <label className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 active:border-primary flex flex-col items-center justify-center cursor-pointer transition-colors bg-muted/30">
                    <ImagePlus className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground mb-0.5" />
                    <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">Add</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
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

        {/* Results Panel */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 sm:space-y-4">
              {/* Health Score */}
              <Card className="p-4 sm:p-6 border-primary/10 bg-gradient-to-br from-primary/[0.03] to-transparent">
                <h2 className="font-display font-bold text-sm sm:text-lg mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  Listing Health
                </h2>
                <div className="flex justify-center">
                  <HealthScoreGauge score={result.health_score} size="lg" />
                </div>
              </Card>

              {/* Optimised Title */}
              <Card className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Optimised Title</Label>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => copyToClipboard(result.optimised_title, "title")}>
                    {copiedField === "title" ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                    {copiedField === "title" ? "Copied" : "Copy"}
                  </Button>
                </div>
                <div className="p-3 rounded-xl bg-success/5 border border-success/20">
                  <p className="text-sm font-medium">{result.optimised_title}</p>
                </div>
                {currentTitle && (
                  <div className="mt-2 p-3 rounded-xl bg-muted/50 border border-border">
                    <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider font-semibold">Original</p>
                    <p className="text-sm text-muted-foreground line-through">{currentTitle}</p>
                  </div>
                )}
              </Card>

              {/* Optimised Description */}
              <Card className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Optimised Description</Label>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => copyToClipboard(result.optimised_description, "description")}>
                    {copiedField === "description" ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                    {copiedField === "description" ? "Copied" : "Copy"}
                  </Button>
                </div>
                <div className="p-3 rounded-xl bg-success/5 border border-success/20 max-h-60 overflow-y-auto">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{result.optimised_description}</p>
                </div>
              </Card>

              {/* Tags */}
              <Card className="p-4 sm:p-6">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">Suggested Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {result.suggested_tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all py-1.5 px-3 text-xs"
                      onClick={() => copyToClipboard(tag, `tag-${tag}`)}
                    >
                      {tag}
                      {copiedField === `tag-${tag}` ? <Check className="w-3 h-3 ml-1.5" /> : <Copy className="w-3 h-3 ml-1.5 opacity-50" />}
                    </Badge>
                  ))}
                </div>
              </Card>

              {/* Detected Metadata */}
              {(result.detected_brand || result.detected_colour || result.detected_material) && (
                <Card className="p-4 sm:p-6">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">Detected Details</Label>
                  <div className="flex flex-wrap gap-2">
                    {result.detected_brand && <Badge variant="secondary"><Tag className="w-3 h-3 mr-1" />{result.detected_brand}</Badge>}
                    {result.detected_category && <Badge variant="secondary">{result.detected_category}</Badge>}
                    {result.detected_condition && <Badge variant="secondary">{result.detected_condition}</Badge>}
                    {result.detected_colour && <Badge variant="secondary">{result.detected_colour}</Badge>}
                    {result.detected_material && <Badge variant="secondary">{result.detected_material}</Badge>}
                  </div>
                </Card>
              )}

              {/* Improvements & Style */}
              {result.improvements.length > 0 && (
                <Card className="p-4 sm:p-6">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">Improvements Made</Label>
                  <ul className="space-y-2">
                    {result.improvements.map((imp, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-start gap-2.5 text-sm"
                      >
                        <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                        <span>{imp}</span>
                      </motion.li>
                    ))}
                  </ul>
                  {result.style_notes && (
                    <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/20">
                      <p className="text-[10px] font-semibold text-primary mb-1 uppercase tracking-wider">Style Notes</p>
                      <p className="text-sm leading-relaxed">{result.style_notes}</p>
                    </div>
                  )}
                </Card>
              )}

              {/* Multi-Language Translation */}
              <Card className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4 gap-2">
                  <h2 className="font-display font-bold text-xs sm:text-lg flex items-center gap-2 min-w-0">
                    <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                    <span className="truncate">Multi-Language</span>
                  </h2>
                  <Button
                    onClick={handleTranslate}
                    disabled={translating}
                    size="sm"
                    variant={translations ? "outline" : "default"}
                    className="shrink-0 h-9"
                  >
                    {translating ? (
                      <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Translating</>
                    ) : translations ? (
                      <><Languages className="w-3 h-3 mr-1" /> Redo</>
                    ) : (
                      <><Languages className="w-3 h-3 mr-1" /> Translate</>
                    )}
                  </Button>
                </div>

                {!translations && !translating && (
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Expand your reach across Vinted's 18+ European markets. Translate into French, German, Dutch & Spanish with one click.
                  </p>
                )}

                {translating && (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Translating into 4 languages...</p>
                  </div>
                )}

                {translations && !translating && (
                  <Tabs value={activeTransLang} onValueChange={setActiveTransLang}>
                    <TabsList className="w-full grid grid-cols-4 mb-4">
                      {LANGUAGES.map((lang) => (
                        <TabsTrigger key={lang.code} value={lang.code} className="text-[10px] sm:text-xs px-1">
                          {lang.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {LANGUAGES.map((lang) => {
                      const t = translations[lang.code];
                      if (!t) return null;
                      return (
                        <TabsContent key={lang.code} value={lang.code} className="space-y-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Title ({lang.short})</Label>
                              <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => copyToClipboard(t.title, `trans-title-${lang.code}`)}>
                                {copiedField === `trans-title-${lang.code}` ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                                {copiedField === `trans-title-${lang.code}` ? "Copied" : "Copy"}
                              </Button>
                            </div>
                            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                              <p className="text-sm font-medium">{t.title}</p>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Description ({lang.short})</Label>
                              <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => copyToClipboard(t.description, `trans-desc-${lang.code}`)}>
                                {copiedField === `trans-desc-${lang.code}` ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                                {copiedField === `trans-desc-${lang.code}` ? "Copied" : "Copy"}
                              </Button>
                            </div>
                            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 max-h-48 overflow-y-auto">
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{t.description}</p>
                            </div>
                          </div>

                          {t.tags?.length > 0 && (
                            <div>
                              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Tags ({lang.short})</Label>
                              <div className="flex flex-wrap gap-1.5">
                                {t.tags.map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="text-[10px] cursor-pointer hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all py-1 px-2"
                                    onClick={() => copyToClipboard(tag, `trans-tag-${lang.code}-${tag}`)}
                                  >
                                    {tag}
                                    {copiedField === `trans-tag-${lang.code}-${tag}` ? <Check className="w-2.5 h-2.5 ml-1" /> : <Copy className="w-2.5 h-2.5 ml-1 opacity-50" />}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs h-10 active:scale-95 transition-transform"
                            onClick={() => copyToClipboard(
                              `${t.title}\n\n${t.description}\n\nTags: ${t.tags?.join(", ") || ""}`,
                              `trans-all-${lang.code}`
                            )}
                          >
                            {copiedField === `trans-all-${lang.code}` ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                            Copy Full {lang.short} Listing
                          </Button>
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                )}
              </Card>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pb-2">
                {itemId ? (
                  <Button
                    onClick={() => navigate(`/items/${itemId}`)}
                    className="w-full sm:w-auto font-semibold h-12 sm:h-10 active:scale-95 transition-transform"
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Back to Item
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => navigate(`/price-check?brand=${encodeURIComponent(result.detected_brand || brand)}&category=${encodeURIComponent(result.detected_category || category)}&condition=${encodeURIComponent(result.detected_condition || condition)}`)}
                      variant="outline"
                      className="w-full sm:w-auto h-12 sm:h-10 active:scale-95 transition-transform"
                    >
                      Price Check This Item
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                    <Button onClick={handleSaveAsListing} disabled={saving} className="w-full sm:w-auto font-semibold h-12 sm:h-10 active:scale-95 transition-transform">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Save to My Listings
                    </Button>
                  </>
                )}
              </div>

              {/* Journey Banner */}
              <JourneyBanner
                title="Listing Lifecycle"
                steps={[
                  { label: "Optimise", path: "/optimize", icon: Sparkles, completed: true },
                  { label: "Enhance Photos", path: "/vintography", icon: Camera },
                  { label: "Price Check", path: `/price-check?brand=${encodeURIComponent(result.detected_brand || brand)}&category=${encodeURIComponent(result.detected_category || category)}`, icon: Search },
                  { label: "Inventory", path: "/listings", icon: ShoppingBag },
                ]}
                nextLabel="Enhance Photos"
                nextPath="/vintography"
                nextIcon={Camera}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      
      </FeatureGate>
    </PageShell>
  );
}
