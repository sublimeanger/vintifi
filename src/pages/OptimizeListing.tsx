import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  ArrowLeft, Upload, Loader2, Sparkles, Copy, Check, Save,
  ImagePlus, X, AlertCircle, Camera, Globe, Languages,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HealthScoreGauge } from "@/components/HealthScoreGauge";
import { UseCaseSpotlight } from "@/components/UseCaseSpotlight";
import { Sparkles as SparklesIcon } from "lucide-react";

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
  const { user, session, refreshCredits } = useAuth();
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [size, setSize] = useState("");
  const [condition, setCondition] = useState("");
  const [currentTitle, setCurrentTitle] = useState("");
  const [currentDescription, setCurrentDescription] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [result, setResult] = useState<OptimiseResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [translations, setTranslations] = useState<Translations | null>(null);
  const [translating, setTranslating] = useState(false);
  const [activeTransLang, setActiveTransLang] = useState("fr");

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

  const handleOptimize = async () => {
    if (!user || !session) return;
    if (photos.length === 0 && !currentTitle.trim() && !brand.trim()) {
      toast.error("Please upload photos or enter item details");
      return;
    }

    setOptimizing(true);
    setResult(null);

    try {
      // Upload photos to storage and get public URLs
      const photoUrls: string[] = [];
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
        photoUrls.push(urlData.publicUrl);
      }

      const { data, error } = await supabase.functions.invoke("optimize-listing", {
        body: {
          photoUrls,
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
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <header className="border-b border-border glass sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display font-bold text-lg">AI Listing Optimiser</h1>
            <p className="text-xs text-muted-foreground">Upload photos and get AI-optimised listings</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <UseCaseSpotlight
          featureKey="optimize-listing"
          icon={SparklesIcon}
          scenario="Your listing has been up for 2 weeks with zero interest..."
          description="The title is generic, the description is thin, and you're invisible in Vinted's search results."
          outcome="The AI rewrites your title with high-traffic keywords and your views jump 4x overnight."
          tip="Upload photos too — the AI can detect brand, condition, and suggest the perfect category."
        />
        <div className={`grid gap-6 ${result ? "lg:grid-cols-2" : "max-w-2xl mx-auto"}`}>
          {/* Input Panel */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6">
              <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                Your Item
              </h2>

              {/* Photo Upload */}
              <div className="mb-6">
                <Label className="mb-2 block">Photos (up to 4)</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {photoPreviewUrls.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted">
                      <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {photos.length < 4 && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-colors bg-muted/30">
                      <ImagePlus className="w-6 h-6 text-muted-foreground mb-1" />
                      <span className="text-[10px] text-muted-foreground">Add Photo</span>
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
              <div className="space-y-3">
                <div>
                  <Label>Current Title (optional)</Label>
                  <Input value={currentTitle} onChange={(e) => setCurrentTitle(e.target.value)} placeholder="e.g. Nike trainers size 9" />
                </div>
                <div>
                  <Label>Current Description (optional)</Label>
                  <Textarea value={currentDescription} onChange={(e) => setCurrentDescription(e.target.value)} placeholder="Paste your existing listing description..." rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Brand</Label>
                    <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Nike" />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Trainers" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Size</Label>
                    <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. UK 9" />
                  </div>
                  <div>
                    <Label>Condition</Label>
                    <Input value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="e.g. Very Good" />
                  </div>
                </div>
              </div>

              <Button onClick={handleOptimize} disabled={optimizing} className="w-full mt-6 font-semibold">
                {optimizing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Analysing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Optimise Listing
                  </>
                )}
              </Button>
            </Card>
          </motion.div>

          {/* Results Panel */}
          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, x: 0 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                {/* Health Score */}
                <Card className="p-6">
                  <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Listing Health Score
                  </h2>
                  <div className="flex justify-center mb-2">
                    <HealthScoreGauge score={result.health_score} size="lg" />
                  </div>
                </Card>

                {/* Optimised Title */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="font-display font-bold">Optimised Title</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(result.optimised_title, "title")}
                    >
                      {copiedField === "title" ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                      {copiedField === "title" ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                    <p className="text-sm font-medium">{result.optimised_title}</p>
                  </div>
                  {currentTitle && (
                    <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Original:</p>
                      <p className="text-sm text-muted-foreground line-through">{currentTitle}</p>
                    </div>
                  )}
                </Card>

                {/* Optimised Description */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="font-display font-bold">Optimised Description</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(result.optimised_description, "description")}
                    >
                      {copiedField === "description" ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                      {copiedField === "description" ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                    <p className="text-sm whitespace-pre-wrap">{result.optimised_description}</p>
                  </div>
                </Card>

                {/* Tags */}
                <Card className="p-6">
                  <Label className="font-display font-bold mb-3 block">Suggested Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {result.suggested_tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => copyToClipboard(tag, `tag-${tag}`)}
                      >
                        {tag}
                        {copiedField === `tag-${tag}` ? <Check className="w-3 h-3 ml-1" /> : <Copy className="w-3 h-3 ml-1" />}
                      </Badge>
                    ))}
                  </div>
                </Card>

                {/* Improvements & Style */}
                {result.improvements.length > 0 && (
                  <Card className="p-6">
                    <Label className="font-display font-bold mb-3 block">Improvements Made</Label>
                    <ul className="space-y-1.5">
                      {result.improvements.map((imp, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                          <span>{imp}</span>
                        </li>
                      ))}
                    </ul>
                    {result.style_notes && (
                      <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="text-xs font-medium text-primary mb-1">Style Notes</p>
                        <p className="text-sm">{result.style_notes}</p>
                      </div>
                    )}
                  </Card>
                )}

                {/* Multi-Language Translation */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display font-bold text-lg flex items-center gap-2">
                      <Globe className="w-5 h-5 text-primary" />
                      Multi-Language Listings
                    </h2>
                    <Button
                      onClick={handleTranslate}
                      disabled={translating}
                      size="sm"
                      variant={translations ? "outline" : "default"}
                    >
                      {translating ? (
                        <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Translating...</>
                      ) : translations ? (
                        <><Languages className="w-3 h-3 mr-1" /> Retranslate</>
                      ) : (
                        <><Languages className="w-3 h-3 mr-1" /> Translate to 4 Languages</>
                      )}
                    </Button>
                  </div>

                  {!translations && !translating && (
                    <p className="text-sm text-muted-foreground">
                      Expand your reach across Vinted's 18+ European markets. Translate your optimised listing into French, German, Dutch, and Spanish with one click.
                    </p>
                  )}

                  {translating && (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">Translating into French, German, Dutch &amp; Spanish...</p>
                    </div>
                  )}

                  {translations && !translating && (
                    <Tabs value={activeTransLang} onValueChange={setActiveTransLang}>
                      <TabsList className="w-full grid grid-cols-4 mb-4 overflow-x-auto">
                        {LANGUAGES.map((lang) => (
                          <TabsTrigger key={lang.code} value={lang.code} className="text-xs">
                            {lang.label}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {LANGUAGES.map((lang) => {
                        const t = translations[lang.code];
                        if (!t) return null;
                        return (
                          <TabsContent key={lang.code} value={lang.code} className="space-y-3">
                            {/* Translated Title */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <Label className="text-xs font-semibold">Title ({lang.short})</Label>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={() => copyToClipboard(t.title, `trans-title-${lang.code}`)}
                                >
                                  {copiedField === `trans-title-${lang.code}` ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                                  {copiedField === `trans-title-${lang.code}` ? "Copied" : "Copy"}
                                </Button>
                              </div>
                              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                                <p className="text-sm font-medium">{t.title}</p>
                              </div>
                            </div>

                            {/* Translated Description */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <Label className="text-xs font-semibold">Description ({lang.short})</Label>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={() => copyToClipboard(t.description, `trans-desc-${lang.code}`)}
                                >
                                  {copiedField === `trans-desc-${lang.code}` ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                                  {copiedField === `trans-desc-${lang.code}` ? "Copied" : "Copy"}
                                </Button>
                              </div>
                              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 max-h-48 overflow-y-auto">
                                <p className="text-sm whitespace-pre-wrap">{t.description}</p>
                              </div>
                            </div>

                            {/* Translated Tags */}
                            {t.tags?.length > 0 && (
                              <div>
                                <Label className="text-xs font-semibold mb-2 block">Tags ({lang.short})</Label>
                                <div className="flex flex-wrap gap-1.5">
                                  {t.tags.map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="secondary"
                                      className="text-[10px] cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                                      onClick={() => copyToClipboard(tag, `trans-tag-${lang.code}-${tag}`)}
                                    >
                                      {tag}
                                      {copiedField === `trans-tag-${lang.code}-${tag}` ? <Check className="w-2.5 h-2.5 ml-1" /> : <Copy className="w-2.5 h-2.5 ml-1" />}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Copy All */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs"
                              onClick={() => copyToClipboard(
                                `${t.title}\n\n${t.description}\n\nTags: ${t.tags?.join(", ") || ""}`,
                                `trans-all-${lang.code}`
                              )}
                            >
                              {copiedField === `trans-all-${lang.code}` ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                              Copy Full {lang.label} Listing
                            </Button>
                          </TabsContent>
                        );
                      })}
                    </Tabs>
                  )}
                </Card>

                {/* Save Button */}
                <Button onClick={handleSaveAsListing} disabled={saving} className="w-full font-semibold" size="lg">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save to My Listings
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
