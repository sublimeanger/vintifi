import { FileText, Download, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

const docs = [
  {
    title: "System Brief",
    description: "Comprehensive platform overview. All features, flows, tech stack, architecture, and the full sell wizard journey.",
    file: "/vintifi-consultant-brief.md",
    filename: "vintifi-consultant-brief.md",
    meta: "Markdown · ~900 lines · Confidential",
    icon: FileText,
  },
  {
    title: "Platform Audit",
    description: "Full platform audit covering all features, DB schema, edge functions, RLS policies, and improvement recommendations.",
    file: "/vintifi-platform-audit.md",
    filename: "vintifi-platform-audit.md",
    meta: "Markdown · ~767 lines · Confidential",
    icon: FileText,
  },
  {
    title: "Token Economics & API Cost Audit",
    description: "Full breakdown of API costs per action vs what we charge. Margin analysis, risk scenarios, and identified billing gaps.",
    file: "/vintifi-economics-audit.md",
    filename: "vintifi-economics-audit.md",
    meta: "Markdown · ~280 lines · Confidential",
    icon: BarChart3,
  },
];

export default function BriefDownload() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="font-display font-bold text-2xl text-foreground">Vintifi Consultant Docs</h1>
          <p className="text-sm text-muted-foreground">Internal documents for consultant review. Not linked from the main app.</p>
        </div>

        <div className="space-y-4">
          {docs.map((doc) => {
            const Icon = doc.icon;
            return (
              <div key={doc.file} className="bg-card border border-border rounded-xl p-5 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h2 className="font-semibold text-foreground text-sm">{doc.title}</h2>
                    <p className="text-xs text-muted-foreground leading-relaxed">{doc.description}</p>
                  </div>
                </div>
                <a href={doc.file} download={doc.filename}>
                  <Button className="w-full gap-2" size="sm">
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </Button>
                </a>
                <p className="text-xs text-muted-foreground text-center">{doc.meta}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
