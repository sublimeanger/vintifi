import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BriefDownload() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <FileText className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display font-bold text-2xl text-foreground">Vintifi System Brief</h1>
          <p className="text-sm text-muted-foreground">Comprehensive platform overview prepared for consultant review. Covers all features, flows, tech stack, and architecture.</p>
        </div>
        <div className="space-y-3">
          <a href="/vintifi-consultant-brief.md" download="vintifi-consultant-brief.md">
            <Button className="w-full gap-2" size="lg">
              <Download className="w-4 h-4" />
              Download System Brief
            </Button>
          </a>
          <p className="text-xs text-muted-foreground">Markdown · ~900 lines · Confidential</p>
        </div>
      </div>
    </div>
  );
}
