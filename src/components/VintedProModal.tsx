import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface VintedProModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
}

export function VintedProModal({ open, onOpenChange, onConnected }: VintedProModalProps) {
  const [accessKey, setAccessKey] = useState("");
  const [signingKey, setSigningKey] = useState("");
  const [showAccess, setShowAccess] = useState(false);
  const [showSigning, setShowSigning] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!accessKey.trim() || !signingKey.trim()) {
      toast.error("Both keys are required");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("connect-vinted-pro", {
        body: { action: "validate_and_save", access_key: accessKey.trim(), signing_key: signingKey.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Vinted Pro connected successfully!");
      setAccessKey("");
      setSigningKey("");
      onOpenChange(false);
      onConnected();
    } catch (err: any) {
      toast.error(err.message || "Failed to validate credentials");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Connect Vinted Pro
          </DialogTitle>
          <DialogDescription>
            Paste your API credentials from the{" "}
            <a
              href="https://vinted.co.uk/pro/integrations"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Vinted Pro Integrations Portal
            </a>
            . Your keys are stored securely and never exposed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="access-key">Access Key</Label>
            <div className="relative">
              <Input
                id="access-key"
                type={showAccess ? "text" : "password"}
                placeholder="vpi_..."
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowAccess(!showAccess)}
              >
                {showAccess ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signing-key">Signing Key</Label>
            <div className="relative">
              <Input
                id="signing-key"
                type={showSigning ? "text" : "password"}
                placeholder="vps_..."
                value={signingKey}
                onChange={(e) => setSigningKey(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowSigning(!showSigning)}
              >
                {showSigning ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
            Validate & Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
