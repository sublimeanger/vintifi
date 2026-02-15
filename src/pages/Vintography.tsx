import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { FeatureGate } from "@/components/FeatureGate";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Camera, ImageOff, Paintbrush, User as UserIcon, Sparkles,
  Loader2, Download, Wand2, RotateCcw, ChevronRight, Image as ImageIcon,
} from "lucide-react";

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
  const { user, refreshCredits } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [selectedOp, setSelectedOp] = useState<Operation>("remove_bg");
  const [processing, setProcessing] = useState(false);
  const [sliderValue, setSliderValue] = useState([50]);

  // Smart BG params
  const [bgStyle, setBgStyle] = useState("studio");
  // Model shot params
  const [modelGender, setModelGender] = useState("female");
  const [modelPose, setModelPose] = useState("standing");

  const handleFileSelect = useCallback(async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }

    // Upload to listing-photos bucket first
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/vintography-${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("listing-photos").upload(path, file, {
      contentType: file.type,
      upsert: true,
    });

    if (error) {
      toast.error("Failed to upload image");
      console.error(error);
      return;
    }

    const { data: pub } = supabase.storage.from("listing-photos").getPublicUrl(path);
    setOriginalUrl(pub.publicUrl);
    setProcessedUrl(null);
  }, [user]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleProcess = async () => {
    if (!originalUrl) return;
    setProcessing(true);
    setProcessedUrl(null);

    const params: Record<string, string> = {};
    if (selectedOp === "smart_bg") params.bg_style = bgStyle;
    if (selectedOp === "model_shot") {
      params.gender = modelGender;
      params.pose = modelPose;
    }

    try {
      const { data, error } = await supabase.functions.invoke("vintography", {
        body: { image_url: originalUrl, operation: selectedOp, parameters: params },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setProcessedUrl(data.processed_url);
      toast.success(`Done! ${data.credits_used}/${data.credits_limit} edits used this month.`);
      refreshCredits();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Processing failed. Try again.");
    } finally {
      setProcessing(false);
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
    } catch {
      toast.error("Download failed");
    }
  };

  const clipPercent = sliderValue[0];

  return (
    <PageShell title="Vintography" subtitle="AI-powered photo studio for your listings">
      <FeatureGate feature="vintography">
        <div className="space-y-4 sm:space-y-6">
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
                    <p className="font-display font-bold text-base sm:text-lg">
                      Drop your photo here
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      or tap to upload · JPG, PNG, WebP · Max 10MB
                    </p>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" className="active:scale-95 transition-transform">
                      <Camera className="w-4 h-4 mr-1.5" /> Choose Photo
                    </Button>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                />
              </Card>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 sm:space-y-6">
              {/* Operation Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {operations.map((op) => (
                  <Card
                    key={op.id}
                    onClick={() => { setSelectedOp(op.id); setProcessedUrl(null); }}
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
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                        {op.tier}
                      </Badge>
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
                          {bgStyles.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
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

              {/* Before / After */}
              <Card className="overflow-hidden">
                <div className="relative w-full" style={{ aspectRatio: "4/5", maxHeight: 500 }}>
                  {/* Original (full) */}
                  <img
                    src={originalUrl}
                    alt="Original"
                    className="absolute inset-0 w-full h-full object-contain bg-muted/30"
                  />
                  {/* Processed overlay with clip */}
                  {processedUrl && (
                    <div
                      className="absolute inset-0"
                      style={{ clipPath: `inset(0 ${100 - clipPercent}% 0 0)` }}
                    >
                      <img
                        src={processedUrl}
                        alt="Processed"
                        className="w-full h-full object-contain bg-background"
                      />
                    </div>
                  )}
                  {/* Slider line */}
                  {processedUrl && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
                      style={{ left: `${clipPercent}%` }}
                    >
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                        <ChevronRight className="w-4 h-4 text-primary-foreground -ml-0.5" />
                        <ChevronRight className="w-4 h-4 text-primary-foreground -ml-3 rotate-180" />
                      </div>
                    </div>
                  )}
                  {/* Labels */}
                  <div className="absolute top-3 left-3 z-10">
                    <Badge variant="secondary" className="text-[10px] bg-background/80 backdrop-blur-sm">Original</Badge>
                  </div>
                  {processedUrl && (
                    <div className="absolute top-3 right-3 z-10">
                      <Badge className="text-[10px] bg-primary/90 backdrop-blur-sm">Enhanced</Badge>
                    </div>
                  )}
                  {/* Processing overlay */}
                  {processing && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                      <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
                      <p className="font-semibold text-sm">AI is working its magic…</p>
                      <p className="text-xs text-muted-foreground">This usually takes 5–10 seconds</p>
                    </div>
                  )}
                </div>
                {/* Comparison slider control */}
                {processedUrl && (
                  <div className="px-4 py-3 border-t border-border">
                    <Slider
                      value={sliderValue}
                      onValueChange={setSliderValue}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>
                )}
              </Card>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleProcess}
                  disabled={processing}
                  className="flex-1 h-12 sm:h-10 font-semibold active:scale-95 transition-transform"
                >
                  {processing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-2" />
                  )}
                  {processing ? "Processing…" : `Apply ${operations.find((o) => o.id === selectedOp)?.label}`}
                </Button>
                {processedUrl && (
                  <>
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
                  onClick={() => { setOriginalUrl(null); setProcessedUrl(null); }}
                  className="h-12 sm:h-10 active:scale-95 transition-transform"
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> New Photo
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </FeatureGate>
    </PageShell>
  );
}
