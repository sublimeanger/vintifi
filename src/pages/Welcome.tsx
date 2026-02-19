import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Camera, Link2, ArrowRight, Sparkles, Gift } from "lucide-react";
import { toast } from "sonner";

export default function Welcome() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    // Store the photo URL temporarily so SellWizard can pick it up
    sessionStorage.setItem("welcome_photo_url", objectUrl);
    sessionStorage.setItem("welcome_photo_name", file.name);
    navigate("/sell");
  };

  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const val = (e.target as HTMLInputElement).value.trim();
      if (val) navigate(`/sell?prefill_url=${encodeURIComponent(val)}`);
    }
  };

  const handleUrlSubmit = () => {
    const input = document.querySelector<HTMLInputElement>('input[placeholder*="Vinted listing URL"]');
    const val = input?.value.trim();
    if (val) navigate(`/sell?prefill_url=${encodeURIComponent(val)}`);
    else toast.error("Please paste a Vinted listing URL");
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4 py-6">
      <Card className="w-full max-w-md p-5 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-5"
        >
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Getting started
              </span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold leading-tight">
              Welcome to Vintifi! 🎉
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1.5">
              Your first item is on us. Let's make it look amazing.
            </p>
          </div>

          {/* Free pass callout */}
          <div className="flex items-center gap-3 rounded-xl bg-success/10 border border-success/20 p-3.5">
            <Gift className="w-5 h-5 text-success shrink-0" />
            <p className="text-xs sm:text-sm font-medium text-foreground">
              First item completely free — AI photos, listing & pricing included.
            </p>
          </div>

          {/* Primary CTA: Upload photo */}
          <div className="space-y-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-3 rounded-xl border-2 border-primary/30 hover:border-primary/60 bg-primary/[0.03] hover:bg-primary/[0.06] transition-all p-4 text-left group active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <Camera className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Upload a photo</p>
                <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, WebP — AI transforms it instantly</p>
              </div>
              <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Secondary: Paste Vinted URL */}
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-muted-foreground font-medium px-2">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="url"
                  placeholder="Paste Vinted listing URL..."
                  className="w-full h-11 pl-9 pr-3 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  onKeyDown={handleUrlKeyDown}
                />
              </div>
              <Button
                onClick={handleUrlSubmit}
                className="h-11 px-4 font-semibold shrink-0 active:scale-95 transition-transform"
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Skip link */}
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center flex items-center justify-center gap-1.5 py-1 min-h-[40px] active:scale-95"
          >
            Skip for now — go to Dashboard <ArrowRight className="w-3 h-3" />
          </button>
        </motion.div>
      </Card>
    </div>
  );
}
