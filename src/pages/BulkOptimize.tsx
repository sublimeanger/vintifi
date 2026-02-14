import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Download, Upload, Loader2, Sparkles, Check, X,
  AlertCircle, ChevronDown, ChevronUp, Copy, Save, FileSpreadsheet,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";

const CSV_TEMPLATE = `title,brand,category,size,condition,description,purchase_price
"Nike Air Max 90",Nike,Trainers,UK 9,Very Good,"Original Nike trainers, barely worn",25
"Carhartt WIP Hoodie",Carhartt WIP,Hoodies,M,Good,"Classic logo hoodie",15`;

const REQUIRED_COLUMNS = ["title"];
const ALL_COLUMNS = ["title", "brand", "category", "size", "condition", "description", "purchase_price"];
const MAX_ITEMS = 50;

type ParsedRow = Record<string, string>;

type OptimiseResult = {
  optimised_title: string;
  optimised_description: string;
  suggested_tags: string[];
  detected_brand: string;
  detected_category: string;
  detected_condition: string;
  health_score: {
    overall: number;
    title_score: number;
    description_score: number;
    photo_score: number;
    completeness_score: number;
  };
  improvements: string[];
  style_notes: string;
};

type BulkItem = {
  original: ParsedRow;
  status: "pending" | "processing" | "done" | "error" | "saved";
  result?: OptimiseResult;
  error?: string;
};

function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "\n" && !inQuotes) {
      lines.push(current.replace(/\r$/, ""));
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current.replace(/\r$/, ""));

  if (lines.length < 2) return { headers: [], rows: [] };

  const splitLine = (line: string): string[] => {
    const result: string[] = [];
    let field = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (q && line[i + 1] === '"') { field += '"'; i++; }
        else q = !q;
      } else if (c === "," && !q) {
        result.push(field.trim());
        field = "";
      } else {
        field += c;
      }
    }
    result.push(field.trim());
    return result;
  };

  const headers = splitLine(lines[0]).map((h) => h.toLowerCase().trim());
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = splitLine(lines[i]);
    const row: ParsedRow = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ""; });
    rows.push(row);
  }
  return { headers, rows };
}

function getHealthColor(score: number) {
  if (score >= 80) return "text-success border-success/30 bg-success/10";
  if (score >= 60) return "text-accent border-accent/30 bg-accent/10";
  if (score >= 40) return "text-orange-500 border-orange-500/30 bg-orange-500/10";
  return "text-destructive border-destructive/30 bg-destructive/10";
}

export default function BulkOptimize() {
  const navigate = useNavigate();
  const { user, refreshCredits } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<BulkItem[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [savingAll, setSavingAll] = useState(false);
  const [abortRef] = useState<{ current: boolean }>({ current: false });

  const phase = items.length === 0
    ? "upload"
    : items.some((i) => i.status === "done" || i.status === "error" || i.status === "saved")
    ? "results"
    : "preview";

  const handleDownloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vintifi-bulk-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a .csv file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers, rows } = parseCSV(text);

      const errors: string[] = [];
      const missingCols = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
      if (missingCols.length) errors.push(`Missing required column(s): ${missingCols.join(", ")}`);
      if (rows.length === 0) errors.push("No data rows found");
      if (rows.length > MAX_ITEMS) errors.push(`Maximum ${MAX_ITEMS} items per batch. Your file has ${rows.length} items.`);

      setValidationErrors(errors);
      if (errors.length === 0) {
        setItems(rows.slice(0, MAX_ITEMS).map((r) => ({ original: r, status: "pending" })));
        setProcessedCount(0);
        setExpandedRows(new Set());
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-uploaded
    e.target.value = "";
  }, []);

  const handleOptimiseAll = async () => {
    if (!user) return;
    setProcessing(true);
    abortRef.current = false;
    setProcessedCount(0);

    for (let i = 0; i < items.length; i++) {
      if (abortRef.current) break;
      if (items[i].status === "done" || items[i].status === "saved") continue;

      setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, status: "processing" } : item));

      try {
        const row = items[i].original;
        const { data, error } = await supabase.functions.invoke("optimize-listing", {
          body: {
            brand: row.brand || undefined,
            category: row.category || undefined,
            size: row.size || undefined,
            condition: row.condition || undefined,
            currentTitle: row.title || undefined,
            currentDescription: row.description || undefined,
          },
        });

        if (error) throw error;
        if (data?.error) {
          if (data.error.includes("limit reached")) {
            setItems((prev) => prev.map((item, idx) =>
              idx === i ? { ...item, status: "error", error: data.error } : item
            ));
            toast.error("Credit limit reached. Stopping batch.");
            break;
          }
          throw new Error(data.error);
        }

        setItems((prev) => prev.map((item, idx) =>
          idx === i ? { ...item, status: "done", result: data as OptimiseResult } : item
        ));
      } catch (e: any) {
        const isRateLimit = e?.message?.includes("429") || e?.status === 429;
        if (isRateLimit) {
          // Retry once after 5s
          await new Promise((r) => setTimeout(r, 5000));
          try {
            const row = items[i].original;
            const { data, error } = await supabase.functions.invoke("optimize-listing", {
              body: {
                brand: row.brand || undefined,
                category: row.category || undefined,
                size: row.size || undefined,
                condition: row.condition || undefined,
                currentTitle: row.title || undefined,
                currentDescription: row.description || undefined,
              },
            });
            if (error) throw error;
            if (data?.error) throw new Error(data.error);
            setItems((prev) => prev.map((item, idx) =>
              idx === i ? { ...item, status: "done", result: data as OptimiseResult } : item
            ));
          } catch (retryErr: any) {
            setItems((prev) => prev.map((item, idx) =>
              idx === i ? { ...item, status: "error", error: retryErr.message || "Failed after retry" } : item
            ));
          }
        } else {
          setItems((prev) => prev.map((item, idx) =>
            idx === i ? { ...item, status: "error", error: e.message || "Optimisation failed" } : item
          ));
        }
      }

      setProcessedCount(i + 1);

      // 1s delay between calls
      if (i < items.length - 1 && !abortRef.current) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    setProcessing(false);
    refreshCredits();
    toast.success("Batch optimisation complete!");
  };

  const handleSaveItem = async (index: number) => {
    if (!user) return;
    const item = items[index];
    if (!item.result) return;

    const { error } = await supabase.from("listings").insert({
      user_id: user.id,
      title: item.result.optimised_title,
      description: item.result.optimised_description,
      brand: item.result.detected_brand || item.original.brand || null,
      category: item.result.detected_category || item.original.category || null,
      condition: item.result.detected_condition || item.original.condition || null,
      size: item.original.size || null,
      health_score: item.result.health_score.overall,
      purchase_price: item.original.purchase_price ? parseFloat(item.original.purchase_price) : null,
      status: "active",
    } as any);

    if (error) {
      toast.error("Failed to save listing");
    } else {
      setItems((prev) => prev.map((it, idx) => idx === index ? { ...it, status: "saved" } : it));
      toast.success("Saved to My Listings!");
    }
  };

  const handleSaveAll = async () => {
    if (!user) return;
    setSavingAll(true);
    const toSave = items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.status === "done" && item.result);

    const inserts = toSave.map(({ item }) => ({
      user_id: user.id,
      title: item.result!.optimised_title,
      description: item.result!.optimised_description,
      brand: item.result!.detected_brand || item.original.brand || null,
      category: item.result!.detected_category || item.original.category || null,
      condition: item.result!.detected_condition || item.original.condition || null,
      size: item.original.size || null,
      health_score: item.result!.health_score.overall,
      purchase_price: item.original.purchase_price ? parseFloat(item.original.purchase_price) : null,
      status: "active",
    }));

    if (inserts.length === 0) {
      toast.error("No optimised items to save");
      setSavingAll(false);
      return;
    }

    const { error } = await supabase.from("listings").insert(inserts as any);
    if (error) {
      toast.error("Failed to save listings");
    } else {
      setItems((prev) => prev.map((it) => it.status === "done" ? { ...it, status: "saved" } : it));
      toast.success(`${inserts.length} listings saved!`);
    }
    setSavingAll(false);
  };

  const toggleRow = (idx: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  const doneCount = items.filter((i) => i.status === "done" || i.status === "saved").length;
  const errorCount = items.filter((i) => i.status === "error").length;
  const progressPercent = items.length > 0 ? (processedCount / items.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border glass sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/listings")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display font-bold text-lg">Bulk Listing Optimiser</h1>
            <p className="text-xs text-muted-foreground">Upload a CSV to optimise listings in batch</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="w-4 h-4 mr-1" /> Template
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Upload Zone */}
        {phase === "upload" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-8">
              <div className="text-center">
                <FileSpreadsheet className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                <h2 className="font-display font-bold text-xl mb-2">Upload Your Inventory CSV</h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  Upload a CSV file with your items. Each row will be processed through the AI optimiser to generate
                  SEO-friendly titles, descriptions, and tags.
                </p>

                <div
                  className="border-2 border-dashed border-border rounded-xl p-8 hover:border-primary/50 transition-colors cursor-pointer mb-4"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary/50"); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove("border-primary/50"); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("border-primary/50");
                    const file = e.dataTransfer.files[0];
                    if (file) {
                      const input = fileInputRef.current!;
                      const dt = new DataTransfer();
                      dt.items.add(file);
                      input.files = dt.files;
                      input.dispatchEvent(new Event("change", { bubbles: true }));
                    }
                  }}
                >
                  <Upload className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Drag & drop a <span className="font-medium text-foreground">.csv</span> file here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Maximum {MAX_ITEMS} items per batch</p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <Button variant="ghost" size="sm" onClick={handleDownloadTemplate} className="text-xs">
                  <Download className="w-3 h-3 mr-1" /> Download CSV template
                </Button>

                {validationErrors.length > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-left">
                    {validationErrors.map((err, i) => (
                      <p key={i} className="text-sm text-destructive flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" /> {err}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Preview / Results */}
        {items.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Progress Bar */}
            {(processing || phase === "results") && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">
                    {processing
                      ? `Optimising ${processedCount + 1} of ${items.length}...`
                      : `Complete: ${doneCount} optimised, ${errorCount} failed`}
                  </p>
                  {processing && (
                    <Button variant="ghost" size="sm" onClick={() => { abortRef.current = true; }} className="text-xs text-destructive">
                      Stop
                    </Button>
                  )}
                </div>
                <Progress value={progressPercent} className="h-2" />
              </Card>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{items.length} items</Badge>
                {doneCount > 0 && <Badge className="bg-success/10 text-success border-success/30">{doneCount} optimised</Badge>}
                {errorCount > 0 && <Badge variant="destructive">{errorCount} failed</Badge>}
              </div>
              <div className="flex gap-2">
                {phase === "preview" && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => { setItems([]); setValidationErrors([]); }}>
                      <X className="w-4 h-4 mr-1" /> Clear
                    </Button>
                    <Button size="sm" onClick={handleOptimiseAll} disabled={processing} className="font-semibold">
                      {processing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
                      Optimise All
                    </Button>
                  </>
                )}
                {phase === "results" && !processing && doneCount > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => { setItems([]); setValidationErrors([]); }}>
                      New Batch
                    </Button>
                    <Button size="sm" onClick={handleSaveAll} disabled={savingAll} className="font-semibold">
                      {savingAll ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                      Save All to Listings
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Table */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden sm:table-cell">Brand</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead className="w-16">Score</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <Collapsible key={idx} open={expandedRows.has(idx)} onOpenChange={() => toggleRow(idx)} asChild>
                      <>
                        <TableRow className={item.status === "error" ? "bg-destructive/[0.03]" : item.status === "saved" ? "bg-success/[0.03]" : ""}>
                          <TableCell className="font-mono text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-medium text-sm truncate max-w-[200px]">
                            {item.result?.optimised_title || item.original.title || "—"}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                            {item.result?.detected_brand || item.original.brand || "—"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {item.result?.detected_category || item.original.category || "—"}
                          </TableCell>
                          <TableCell>
                            {item.status === "pending" && <Badge variant="outline" className="text-[10px]">Pending</Badge>}
                            {item.status === "processing" && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                            {item.status === "done" && <Check className="w-4 h-4 text-success" />}
                            {item.status === "saved" && <Badge className="text-[10px] bg-success/10 text-success border-success/30">Saved</Badge>}
                            {item.status === "error" && <X className="w-4 h-4 text-destructive" />}
                          </TableCell>
                          <TableCell>
                            {item.result?.health_score && (
                              <Badge variant="outline" className={`text-[10px] font-bold ${getHealthColor(item.result.health_score.overall)}`}>
                                {item.result.health_score.overall}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {(item.status === "done" || item.status === "error" || item.status === "saved") && (
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  {expandedRows.has(idx) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                              </CollapsibleTrigger>
                            )}
                          </TableCell>
                        </TableRow>
                        <CollapsibleContent asChild>
                          <tr>
                            <td colSpan={7} className="p-0">
                              <div className="px-6 py-4 bg-muted/30 border-t border-border space-y-3">
                                {item.status === "error" && (
                                  <p className="text-sm text-destructive flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" /> {item.error}
                                  </p>
                                )}
                                {item.result && (
                                  <>
                                    {/* Optimised Title */}
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs font-medium text-muted-foreground">Optimised Title</p>
                                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => copyToClipboard(item.result!.optimised_title)}>
                                          <Copy className="w-3 h-3 mr-1" /> Copy
                                        </Button>
                                      </div>
                                      <p className="text-sm font-medium p-2 rounded bg-success/5 border border-success/20">{item.result.optimised_title}</p>
                                      {item.original.title && item.original.title !== item.result.optimised_title && (
                                        <p className="text-xs text-muted-foreground mt-1 line-through">{item.original.title}</p>
                                      )}
                                    </div>
                                    {/* Optimised Description */}
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs font-medium text-muted-foreground">Optimised Description</p>
                                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => copyToClipboard(item.result!.optimised_description)}>
                                          <Copy className="w-3 h-3 mr-1" /> Copy
                                        </Button>
                                      </div>
                                      <p className="text-sm p-2 rounded bg-success/5 border border-success/20 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                        {item.result.optimised_description}
                                      </p>
                                    </div>
                                    {/* Tags */}
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Tags</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {item.result.suggested_tags.map((tag) => (
                                          <Badge key={tag} variant="secondary" className="text-[10px] cursor-pointer" onClick={() => copyToClipboard(tag)}>
                                            {tag}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                    {/* Save button */}
                                    {item.status === "done" && (
                                      <Button size="sm" variant="outline" onClick={() => handleSaveItem(idx)} className="text-xs">
                                        <Save className="w-3 h-3 mr-1" /> Save to Listings
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
