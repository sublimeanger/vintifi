import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Camera, Loader2, RefreshCw } from "lucide-react";

type Operation = "put_on_model" | "virtual_tryon" | "swap_model";

type ModelParams = {
  gender?: string;
  pose?: string;
  ethnicity?: string;
};

type Props = {
  operation: Operation;
  value: ModelParams;
  onChange: (params: ModelParams) => void;
  selfieUrl?: string;
  onSelfieUpload?: (url: string) => void;
};

const POSES = ["Front Standing", "Angled", "Walking"] as const;
const ETHNICITIES = ["Auto", "Light skin", "Medium skin", "Dark skin", "East Asian", "South Asian"] as const;

export function ModelOptions({ operation, value, onChange, selfieUrl, onSelfieUpload }: Props) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const gender = value.gender || "Female";
  const pose = value.pose || "Front Standing";
  const ethnicity = value.ethnicity || "Auto";

  const set = (patch: Partial<ModelParams>) => onChange({ ...value, ...patch });

  const handleSelfieFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !onSelfieUpload) return;
    if (fileRef.current) fileRef.current.value = "";

    setUploading(true);
    try {
      let uploadFile = file;

      // HEIC conversion
      if (file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif")) {
        toast.info("Converting HEIC photo...");
        const heic2any = (await import("heic2any")).default;
        const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
        uploadFile = new File([blob as Blob], file.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg"), { type: "image/jpeg" });
      }

      const ext = uploadFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/selfies/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("vintography").upload(path, uploadFile, {
        contentType: uploadFile.type,
        upsert: true,
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("vintography").getPublicUrl(path);
      onSelfieUpload(pub.publicUrl);
      toast.success("Selfie uploaded");
    } catch (err: any) {
      toast.error("Upload failed — try again");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* GENDER — always shown */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Gender</p>
        <div className="flex gap-2">
          {(["Female", "Male"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => set({ gender: g })}
              className={`flex-1 rounded-xl border-2 px-3 min-h-[44px] text-xs font-semibold transition-all active:scale-[0.97] ${
                gender === g
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* POSE — put_on_model only */}
      {operation === "put_on_model" && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Pose</p>
          <div className="grid grid-cols-3 gap-1.5">
            {POSES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => set({ pose: p })}
                className={`rounded-lg border px-2 py-2 text-[11px] font-semibold transition-all active:scale-[0.97] ${
                  pose === p
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ETHNICITY — swap_model only */}
      {operation === "swap_model" && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Model Appearance</p>
          <div className="flex flex-wrap gap-1.5">
            {ETHNICITIES.map((eth) => (
              <button
                key={eth}
                type="button"
                onClick={() => set({ ethnicity: eth })}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-all active:scale-95 ${
                  ethnicity === eth
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                {eth}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SELFIE UPLOAD — virtual_tryon only */}
      {operation === "virtual_tryon" && onSelfieUpload && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Your Photo</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.heic,.heif"
            className="hidden"
            onChange={handleSelfieFile}
          />

          {selfieUrl ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-2">
              <img
                src={selfieUrl}
                alt="Your selfie"
                className="w-12 h-12 rounded-lg object-cover shrink-0 border border-border"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">Photo uploaded</p>
                <p className="text-[10px] text-muted-foreground">Front-facing works best</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 h-7 text-[11px] gap-1"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <RefreshCw className="w-3 h-3" /> Change
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/50 bg-muted/10 hover:bg-primary/[0.03] transition-all p-5 text-center active:scale-[0.98]"
            >
              {uploading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Uploading…</span>
                </div>
              ) : (
                <>
                  <Camera className="w-6 h-6 text-primary mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-foreground">Upload your selfie</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Front-facing photo works best</p>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
