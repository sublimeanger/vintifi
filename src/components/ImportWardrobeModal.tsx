import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import {
  Download,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Package,
  Upload,
  FileSpreadsheet,
} from "lucide-react";

type CsvRow = Record<string, string>;

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

const CSV_TEMPLATE = `Title,Brand,Category,Size,Condition,Price,Purchase Price,Vinted URL
"Nike Air Force 1","Nike","Trainers","UK 9","Good","25.00","12.00","https://www.vinted.co.uk/items/123456"`;

const COLUMN_MAP: Record<string, string> = {
  title: "title",
  Title: "title",
  brand: "brand",
  Brand: "brand",
  category: "category",
  Category: "category",
  size: "size",
  Size: "size",
  condition: "condition",
  Condition: "condition",
  price: "price",
  Price: "price",
  "current_price": "price",
  "Purchase Price": "purchase_price",
  "purchase_price": "purchase_price",
  "Vinted URL": "vinted_url",
  "vinted_url": "vinted_url",
  url: "vinted_url",
  URL: "vinted_url",
};

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseRow(lines[0]);
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i]);
    const row: CsvRow = {};
    headers.forEach((h, idx) => {
      const mapped = COLUMN_MAP[h.trim()] || h.trim();
      row[mapped] = values[idx]?.trim() || "";
    });
    if (row.title) rows.push(row);
  }
  return rows;
}

function parseRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function ImportWardrobeModal({ open, onClose, onSuccess }: Props) {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [status, setStatus] = useState<"idle" | "preview" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv") && !file.type.includes("csv") && !file.type.includes("text")) {
      setErrorMsg("Please upload a .csv file");
      setStatus("error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        setErrorMsg("No valid rows found. Make sure your CSV has a header row and at least one data row with a Title.");
        setStatus("error");
        return;
      }
      setRows(parsed);
      setStatus("preview");
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleImport = async () => {
    setStatus("loading");
    setResult(null);
    setErrorMsg("");

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
          body: JSON.stringify({ items: rows }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error || "Import failed");
        return;
      }

      setResult(data);
      setStatus("done");
      if (data.imported > 0) onSuccess();
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    }
  };

  const handleClose = () => {
    if (status !== "loading") {
      setRows([]);
      setStatus("idle");
      setResult(null);
      setErrorMsg("");
      setDragActive(false);
      onClose();
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vintedge-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const previewRows = rows.slice(0, 5);
  const previewCols = ["title", "brand", "category", "size", "condition", "price"];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Import Listings (CSV)
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk-import your listings. Download the template to get started.
          </DialogDescription>
        </DialogHeader>

        {status === "idle" && (
          <div className="space-y-4 pt-2">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold text-sm">
                {dragActive ? "Drop your CSV here" : "Drag & drop your CSV, or click to browse"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports .csv files with Title, Brand, Category, Size, Condition, Price columns
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>

            <Button variant="outline" onClick={downloadTemplate} className="w-full font-semibold h-10">
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>
          </div>
        )}

        {status === "preview" && (
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      {previewCols.map((col) => (
                        <th key={col} className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider text-muted-foreground">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className="border-t border-border/50">
                        {previewCols.map((col) => (
                          <td key={col} className="px-2 py-1.5 truncate max-w-[120px]">
                            {row[col] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Showing {previewRows.length} of {rows.length} rows
            </p>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setRows([]); setStatus("idle"); }} className="flex-1 font-semibold h-10">
                Back
              </Button>
              <Button onClick={handleImport} className="flex-1 font-semibold h-10">
                <Upload className="w-4 h-4 mr-2" />
                Import {rows.length} Item{rows.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}

        {status === "loading" && (
          <div className="space-y-4 py-6 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
            <div>
              <p className="font-semibold text-sm">Importing {rows.length} items…</p>
              <p className="text-xs text-muted-foreground mt-1">
                This should only take a few seconds.
              </p>
            </div>
            <Progress value={60} className="h-2" />
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
                  <span>{result.skipped} skipped</span>
                )}
              </div>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-3 text-xs text-destructive text-left max-h-24 overflow-y-auto bg-destructive/5 rounded-lg p-2">
                  {result.errors.map((e, i) => (
                    <p key={i}>{e}</p>
                  ))}
                </div>
              )}
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
              <Button onClick={() => { setRows([]); setStatus("idle"); }} className="flex-1 font-semibold h-10">
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
