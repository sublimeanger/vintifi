import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Download, Loader2, CheckCircle2, AlertTriangle, Package } from "lucide-react";

type ImportResult = {
  imported: number;
  skipped: number;
  total: number;
  message: string;
  errors?: string[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const VINTED_URL_REGEX =
  /^https?:\/\/www\.vinted\.(co\.uk|fr|de|nl|es|it|pt|pl|be|at|cz|lt|se|hu|ro|sk|hr|fi|dk|bg|gr|ee|lv|lu|ie|si|no)\/(member|membre|mitglied)\/\d+/i;

export function ImportWardrobeModal({ open, onClose, onSuccess }: Props) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);

  const isValidUrl = VINTED_URL_REGEX.test(url.trim());

  const handleImport = async () => {
    if (!isValidUrl) return;

    setStatus("loading");
    setResult(null);
    setErrorMsg("");
    setElapsed(0);

    const timer = setInterval(() => setElapsed((p) => p + 1), 1000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-wardrobe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ profileUrl: url.trim() }),
        }
      );

      const data = await res.json();
      clearInterval(timer);

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error || "Import failed");
        return;
      }

      setResult(data);
      setStatus("done");

      if (data.imported > 0) {
        onSuccess();
      }
    } catch (err) {
      clearInterval(timer);
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    }
  };

  const handleClose = () => {
    if (status !== "loading") {
      setUrl("");
      setStatus("idle");
      setResult(null);
      setErrorMsg("");
      setElapsed(0);
      onClose();
    }
  };

  const progressHint =
    elapsed < 15
      ? "Connecting to Vinted…"
      : elapsed < 45
        ? "Scanning your wardrobe…"
        : elapsed < 90
          ? "Processing items…"
          : "Almost there…";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Import Vinted Wardrobe
          </DialogTitle>
          <DialogDescription>
            Paste your Vinted seller profile URL to import all your listings automatically.
          </DialogDescription>
        </DialogHeader>

        {status === "idle" && (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.vinted.co.uk/member/12345678"
                className="h-11 sm:h-10 text-base sm:text-sm"
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Find this by opening your Vinted profile and copying the URL from your browser.
              </p>
            </div>
            <Button
              onClick={handleImport}
              disabled={!isValidUrl}
              className="w-full font-semibold h-12 sm:h-10 active:scale-95 transition-transform"
            >
              <Download className="w-4 h-4 mr-2" />
              Import Wardrobe
            </Button>
          </div>
        )}

        {status === "loading" && (
          <div className="space-y-4 py-6 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
            <div>
              <p className="font-semibold text-sm">{progressHint}</p>
              <p className="text-xs text-muted-foreground mt-1">
                This can take 30–120 seconds depending on wardrobe size.
              </p>
            </div>
            <Progress value={Math.min(95, elapsed * 0.8)} className="h-2" />
            <p className="text-[10px] text-muted-foreground">{elapsed}s elapsed</p>
          </div>
        )}

        {status === "done" && result && (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
            <div>
              <p className="font-semibold text-lg">{result.message}</p>
              <div className="flex items-center justify-center gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" />
                  {result.imported} imported
                </span>
                {result.skipped > 0 && (
                  <span>{result.skipped} already existed</span>
                )}
              </div>
            </div>
            <Button onClick={handleClose} className="w-full font-semibold h-10">
              Done
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4 py-4 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
            <div>
              <p className="font-semibold">Import Failed</p>
              <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1 font-semibold h-10">
                Close
              </Button>
              <Button onClick={() => setStatus("idle")} className="flex-1 font-semibold h-10">
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
