import { useReducer, useRef, useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { FeatureGate } from "@/components/FeatureGate";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { useIsMobile } from "@/hooks/use-mobile";
import { UpgradeModal } from "@/components/UpgradeModal";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Loader2, Wand2, RotateCcw, Info, X, Coins, Package, Star, ChevronDown,
} from "lucide-react";
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from "@/components/ui/collapsible";

// Sub-components
import { CreditBar } from "@/components/vintography/CreditBar";
import { ComparisonView } from "@/components/vintography/ComparisonView";
import { GalleryCard, type VintographyJob } from "@/components/vintography/GalleryCard";
import { PhotoFilmstrip, type PhotoEditState } from "@/components/vintography/PhotoFilmstrip";
import { QuickPresets, type Preset, type SavedPreset } from "@/components/vintography/QuickPresets";
import { OperationBar } from "@/components/vintography/OperationBar";
import { ConfigContainer } from "@/components/vintography/ConfigContainer";
import { PipelineStrip } from "@/components/vintography/PipelineStrip";
import { ProcessingOverlay } from "@/components/vintography/ProcessingOverlay";
import { ResultActions } from "@/components/vintography/ResultActions";
import { EmptyState } from "@/components/vintography/EmptyState";
import { SimpleOperationConfig } from "@/components/vintography/SimpleOperationConfig";
import { SteamConfig } from "@/components/vintography/SteamConfig";
import { FlatLayConfig } from "@/components/vintography/FlatLayConfig";
import { LifestyleConfig } from "@/components/vintography/LifestyleConfig";
import { MannequinConfig } from "@/components/vintography/MannequinConfig";
import { ModelShotWizard, type ModelParams } from "@/components/vintography/ModelShotWizard";

// State / types
import {
  vintographyReducer,
  initialState,
  Operation,
  OP_MAP,
  OP_RESULT_LABEL,
  OP_LABEL,
  getOperationCreditCost,
  buildApiParams,
  defaultParams,
  PipelineStep,
} from "@/components/vintography/vintographyReducer";
import { useVintographyDraftSave, readDraft, clearDraft } from "@/hooks/useVintographyDraft";

export default function Vintography() {
  const { user, profile, credits, refreshCredits } = useAuth();
  const isMobile = useIsMobile();
  const flatlayGate = useFeatureGate("vintography_flatlay");
  const mannequinGate = useFeatureGate("vintography_mannequin");
  const aiModelGate = useFeatureGate("vintography_ai_model");
  const [activeLockedGate, setActiveLockedGate] = useState<"flatlay" | "mannequin" | "ai_model" | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addPhotoInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const itemId = searchParams.get("itemId");

  const [state, dispatch] = useReducer(vintographyReducer, initialState);

  // Non-pipeline UI state
  const [garmentContext, setGarmentContext] = useState("");
  const [linkedItemTitle, setLinkedItemTitle] = useState("");
  const [itemData, setItemData] = useState<{ last_optimised_at: string | null } | null>(null);
  const [gallery, setGallery] = useState<VintographyJob[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);
  const [draftRestored, setDraftRestored] = useState(false);

  // ─── Autosave draft to localStorage ───
  useVintographyDraftSave(
    user?.id,
    state.originalPhotoUrl,
    state.resultPhotoUrl,
    state.pipeline,
    state.activePipelineIndex,
    garmentContext,
  );

  // ─── Restore draft on mount (only if no itemId/image_url params) ───
  useEffect(() => {
    if (!user || draftRestored) return;
    setDraftRestored(true);
    // Don't restore if we're loading from URL params
    if (searchParams.get("itemId") || searchParams.get("image_url")) return;
    const draft = readDraft(user.id);
    if (!draft) return;
    dispatch({ type: "SET_ORIGINAL_PHOTO", url: draft.originalPhotoUrl });
    dispatch({ type: "REPLACE_PIPELINE", pipeline: draft.pipeline });
    if (draft.resultPhotoUrl) {
      dispatch({ type: "SET_RESULT_PHOTO", url: draft.resultPhotoUrl });
    }
    if (draft.garmentContext) setGarmentContext(draft.garmentContext);
    toast.success("Session restored", { duration: 3000 });
  }, [user]);

  // ─── Fetch saved presets ───
  const fetchSavedPresets = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_presets")
      .select("id, name, pipeline")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) {
      setSavedPresets(data.map((d: any) => ({ id: d.id, name: d.name, pipeline: d.pipeline })));
    }
  }, [user]);

  useEffect(() => { fetchSavedPresets(); }, [fetchSavedPresets]);

  const handleSavePreset = async () => {
    if (!user) return;
    const name = prompt("Name your preset:");
    if (!name?.trim()) return;
    const { error } = await supabase.from("user_presets").insert({
      user_id: user.id,
      name: name.trim(),
      pipeline: state.pipeline as any,
    });
    if (error) { toast.error("Failed to save preset"); return; }
    toast.success("Preset saved!");
    fetchSavedPresets();
  };

  const handleDeleteSavedPreset = async (id: string) => {
    const { error } = await supabase.from("user_presets").delete().eq("id", id);
    if (error) { toast.error("Failed to delete preset"); return; }
    setSavedPresets((prev) => prev.filter((p) => p.id !== id));
    toast.success("Preset deleted");
  };

  const handleSavedPresetSelect = (preset: SavedPreset) => {
    const pipeline = preset.pipeline.map((s) => ({
      operation: s.operation as Operation,
      params: s.params || {},
    }));
    dispatch({ type: "REPLACE_PIPELINE", pipeline });
  };

  // Credits
  const totalUsed = credits
    ? credits.price_checks_used + credits.optimizations_used + credits.vintography_used
    : 0;
  const creditsLimit = credits?.credits_limit ?? 5;
  const isUnlimited = (profile as any)?.subscription_tier === "scale" || creditsLimit >= 999;
  const creditsRemaining = Math.max(0, creditsLimit - totalUsed);
  const creditsLow = !isUnlimited && creditsRemaining <= 5;

  // ─── Active step helpers ───
  const activeStep = state.pipeline[state.activePipelineIndex];
  const activeOp = activeStep?.operation ?? "clean_bg";
  const activeParams = activeStep?.params ?? {};

  const updateActiveParams = (params: Record<string, string>) => {
    dispatch({ type: "UPDATE_STEP_PARAMS", index: state.activePipelineIndex, params });
  };

  // ─── Total pipeline credit cost ───
  const totalCreditCost = state.pipeline.reduce(
    (sum, step) => sum + getOperationCreditCost(step.operation),
    0
  );

  // ─── Load item photos on mount / param change ───
  useEffect(() => {
    if (!user) return;
    const imageUrl = searchParams.get("image_url");
    const paramItemId = searchParams.get("itemId");

    const fetchItemPhotos = async (id: string, pinUrl: string | null) => {
      const { data } = await supabase
        .from("listings")
        .select("image_url, images, last_optimised_at, title, brand, category, description, size, condition")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data) return;

      setItemData({ last_optimised_at: data.last_optimised_at });
      setLinkedItemTitle(data.title || "");
      const parts = [data.brand, data.title, data.category, data.size ? `size ${data.size}` : null, data.condition].filter(Boolean);
      if (parts.length > 0) setGarmentContext(parts.join(", "));

      const urls: string[] = [];
      if (data.image_url) urls.push(data.image_url);
      if (Array.isArray(data.images)) {
        for (const img of data.images) {
          const u = typeof img === "string" ? img : (img as any)?.url;
          if (u && !urls.includes(u)) urls.push(u);
        }
      }
      dispatch({ type: "SET_ITEM_PHOTOS", urls });
      if (urls.length === 0) {
        dispatch({ type: "SET_ORIGINAL_PHOTO", url: null });
        return;
      }
      const targetUrl = pinUrl && urls.includes(pinUrl) ? pinUrl : (pinUrl || urls[0]);
      dispatch({ type: "SET_ORIGINAL_PHOTO", url: targetUrl });
    };

    if (imageUrl) {
      dispatch({ type: "SET_ORIGINAL_PHOTO", url: imageUrl });
      if (paramItemId) fetchItemPhotos(paramItemId, imageUrl);
    } else if (paramItemId) {
      fetchItemPhotos(paramItemId, null);
    }
  }, [searchParams, user]);

  const fetchGallery = useCallback(async () => {
    if (!user) return;
    try {
      setGalleryLoading(true);
      const { data } = await supabase
        .from("vintography_jobs")
        .select("id, original_url, processed_url, operation, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setGallery((data as VintographyJob[]) || []);
    } catch {} finally { setGalleryLoading(false); }
  }, [user]);

  useEffect(() => { fetchGallery(); }, [fetchGallery]);

  // ─── File upload ───
  const uploadFile = async (file: File): Promise<string | null> => {
    if (!user) return null;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return null; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10MB"); return null; }
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/vintography-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const { error } = await supabase.storage.from("listing-photos").upload(path, file, { contentType: file.type, upsert: true });
    if (error) { toast.error("Failed to upload image"); return null; }
    const { data: pub } = supabase.storage.from("listing-photos").getPublicUrl(path);
    return pub.publicUrl;
  };

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    if (!user) return;
    const fileArr = Array.from(files).slice(0, 10);
    if (fileArr.length === 1) {
      const url = await uploadFile(fileArr[0]);
      if (url) {
        dispatch({ type: "SET_ORIGINAL_PHOTO", url });
        dispatch({ type: "SET_ITEM_PHOTOS", urls: [] });
        dispatch({ type: "RESET_ALL" });
        if (user) clearDraft(user.id);
        dispatch({ type: "SET_ORIGINAL_PHOTO", url });
      }
    } else {
      const uploaded: string[] = [];
      for (const f of fileArr) {
        const url = await uploadFile(f);
        if (url) uploaded.push(url);
      }
      if (uploaded.length > 0) {
        dispatch({ type: "SET_ITEM_PHOTOS", urls: uploaded });
        dispatch({ type: "SET_ORIGINAL_PHOTO", url: uploaded[0] });
      }
    }
  }, [user]);

  // ─── Add photo to listing ───
  const appendListingPhoto = async (newUrl: string) => {
    if (!itemId || !user) return;
    const { data: listing } = await supabase
      .from("listings").select("images, image_url").eq("id", itemId).eq("user_id", user.id).maybeSingle();
    const existingImages = Array.isArray(listing?.images) ? (listing.images as string[]) : [];
    await supabase.from("listings").update({
      last_photo_edit_at: new Date().toISOString(),
      images: [...existingImages, newUrl] as any,
      image_url: existingImages.length === 0 ? newUrl : listing?.image_url,
    }).eq("id", itemId).eq("user_id", user.id);
  };

  const handleAddPhoto = useCallback(async (files: FileList | null) => {
    if (!files || !user || !itemId) return;
    const url = await uploadFile(files[0]);
    if (!url) return;
    await appendListingPhoto(url);
    dispatch({ type: "SET_ITEM_PHOTOS", urls: [...state.itemPhotos, url] });
    dispatch({ type: "SET_ORIGINAL_PHOTO", url });
    toast.success("Photo added to listing");
  }, [user, itemId, state.itemPhotos]);

  // ─── Replace photo in listing ───
  const replaceListingPhoto = async (oldUrl: string, newUrl: string) => {
    const { data } = await supabase
      .from("listings").select("image_url, images").eq("id", itemId!).eq("user_id", user!.id).maybeSingle();
    if (!data) return;
    const isPrimary = data.image_url === oldUrl;
    const rawImages = Array.isArray(data.images) ? (data.images as string[]) : [];
    const newImages = rawImages.map((u) => (u === oldUrl ? newUrl : u));
    await supabase.from("listings").update({
      image_url: isPrimary ? newUrl : data.image_url,
      images: newImages as any,
      last_photo_edit_at: new Date().toISOString(),
    }).eq("id", itemId!).eq("user_id", user!.id);
  };

  // ─── Save to item ───
  const handleSaveToItem = async (mode: "replace" | "add") => {
    if (!state.resultPhotoUrl || !itemId || !state.originalPhotoUrl) return;
    dispatch({ type: "SET_SAVING_TO_ITEM", saving: true });
    try {
      if (mode === "replace") {
        await replaceListingPhoto(state.originalPhotoUrl, state.resultPhotoUrl);
        const newPhotos = state.itemPhotos.map((u) => u === state.originalPhotoUrl ? state.resultPhotoUrl! : u);
        dispatch({ type: "SET_ITEM_PHOTOS", urls: newPhotos });
        dispatch({ type: "SET_PHOTO_EDIT_STATE", url: state.originalPhotoUrl, state: { editedUrl: null, savedToItem: true, operationApplied: activeOp } });
        dispatch({ type: "SET_ORIGINAL_PHOTO", url: state.resultPhotoUrl });
        toast.success("Photo replaced in your listing", {
          action: { label: "View Photos", onClick: () => navigate(`/items/${itemId}?tab=photos`) },
          duration: 5000,
        });
      } else {
        await appendListingPhoto(state.resultPhotoUrl);
        dispatch({ type: "SET_ITEM_PHOTOS", urls: [...state.itemPhotos, state.resultPhotoUrl] });
        dispatch({ type: "SET_PHOTO_EDIT_STATE", url: state.originalPhotoUrl, state: { editedUrl: state.resultPhotoUrl, savedToItem: true, operationApplied: activeOp } });
        toast.success("Photo added to your listing", {
          action: { label: "View Photos", onClick: () => navigate(`/items/${itemId}?tab=photos`) },
          duration: 5000,
        });
      }
      if (user) clearDraft(user.id);
      await supabase.from("item_activity").insert({
        user_id: user!.id,
        listing_id: itemId,
        type: "photo_edited",
        payload: { operation: activeOp, processed_url: state.resultPhotoUrl, mode },
      });
    } catch (err) {
      toast.error("Failed to save photo");
    } finally {
      dispatch({ type: "SET_SAVING_TO_ITEM", saving: false });
    }
  };

  // ─── Process image (single call) ───
  const processImage = async (imageUrl: string, operation: string, params: Record<string, string>): Promise<string | null> => {
    const { data, error } = await supabase.functions.invoke("vintography", {
      body: { image_url: imageUrl, operation, parameters: params, garment_context: garmentContext || undefined, sell_wizard: fromWizard || undefined },
    });
    if (error) throw error;
    if (data?.error) { toast.error(data.error); return null; }
    const deducted = data?.credits_deducted ?? 1;
    toast.success(isUnlimited ? "Step done!" : `Step done! −${deducted} credit${deducted !== 1 ? "s" : ""}`);
    refreshCredits();
    return data.processed_url;
  };

  // ─── Main pipeline processor ───
  const handleProcess = async () => {
    if (!state.originalPhotoUrl) return;
    dispatch({ type: "PROCESSING_START" });
    try {
      let currentUrl = state.originalPhotoUrl;
      for (let i = 0; i < state.pipeline.length; i++) {
        const step = state.pipeline[i];
        dispatch({ type: "PROCESSING_STEP_START", stepIndex: i });
        if (i > 0) {
          toast.info(`Step ${i + 1}/${state.pipeline.length}: ${OP_LABEL[step.operation as Operation]}`, { duration: 2000 });
        }
        const result = await processImage(currentUrl, OP_MAP[step.operation], buildApiParams(step));
        if (!result) {
          dispatch({ type: "PROCESSING_FAILED" });
          return;
        }
        currentUrl = result;
      }
      dispatch({ type: "PROCESSING_COMPLETE", resultUrl: currentUrl });

      // Store per-photo edit state
      if (state.originalPhotoUrl) {
        dispatch({
          type: "SET_PHOTO_EDIT_STATE",
          url: state.originalPhotoUrl,
          state: { editedUrl: currentUrl, savedToItem: false, operationApplied: activeOp },
        });
      }

      fetchGallery();
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 200);
      setTimeout(() => dispatch({ type: "RESULT_READY_FLASH" }), 3000);
    } catch (err: any) {
      toast.error(err.message || "Processing failed. Try again.");
      dispatch({ type: "PROCESSING_FAILED" });
    }
  };

  // ─── Operation Bar selection ───
  const handleOpSelect = (op: Operation) => {
    const existingIndex = state.pipeline.findIndex((s) => s.operation === op);
    if (existingIndex >= 0) {
      dispatch({ type: "SET_ACTIVE_PIPELINE_INDEX", index: existingIndex });
    } else {
      dispatch({ type: "REPLACE_PIPELINE", pipeline: [{ operation: op, params: defaultParams(op) }] });
    }
    // On mobile, don't auto-open drawer — user taps "Customize" explicitly
    if (!isMobile) dispatch({ type: "SET_DRAWER_OPEN", open: true });
  };

  // ─── Quick Preset selection ───
  const handlePresetSelect = (preset: Preset) => {
    const newPipeline: PipelineStep[] = preset.steps.map((s) => ({
      operation: (Object.entries(OP_MAP).find(([, v]) => v === s.operation)?.[0] || s.operation) as Operation,
      params: (s.parameters || {}) as Record<string, string>,
    }));
    dispatch({ type: "REPLACE_PIPELINE", pipeline: newPipeline });
  };

  // ─── Filmstrip select ───
  const handleFilmstripSelect = (url: string) => {
    dispatch({ type: "SET_ORIGINAL_PHOTO", url });
    const editState = state.photoEditStates[url];
    if (editState?.editedUrl) dispatch({ type: "SET_RESULT_PHOTO", url: editState.editedUrl });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ─── Download ───
  const handleDownload = async () => {
    if (!state.resultPhotoUrl) return;
    try {
      const res = await fetch(state.resultPhotoUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `vintography-${Date.now()}.png`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Download failed"); }
  };

  // ─── Use current result as new starting point ───
  const handleUseResultAsStart = () => {
    if (!state.resultPhotoUrl) return;
    const resultUrl = state.resultPhotoUrl;
    dispatch({ type: "RESET_ALL" });
    if (user) clearDraft(user.id);
    dispatch({ type: "SET_ORIGINAL_PHOTO", url: resultUrl });
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.success("Result set as starting point — choose your next effect", { duration: 3000 });
  };

  // ─── Gallery restore ───
  const handleUseAsInput = (job: VintographyJob) => {
    const url = job.processed_url || job.original_url;
    dispatch({ type: "RESET_ALL" });
    if (user) clearDraft(user.id);
    dispatch({ type: "SET_ORIGINAL_PHOTO", url });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteJob = async (jobId: string) => {
    const { error } = await supabase.from("vintography_jobs").delete().eq("id", jobId);
    if (error) { toast.error("Failed to delete"); return; }
    setGallery((prev) => prev.filter((j) => j.id !== jobId));
    toast.success("Deleted");
  };

  // ─── Next photo in filmstrip ───
  const handleNextPhoto = () => {
    if (!state.originalPhotoUrl) return;
    const idx = state.itemPhotos.indexOf(state.originalPhotoUrl);
    if (idx >= 0 && idx < state.itemPhotos.length - 1) {
      handleFilmstripSelect(state.itemPhotos[idx + 1]);
    }
  };

  const opLabel = (op: string) => {
    const opKey = Object.entries(OP_MAP).find(([, v]) => v === op)?.[0];
    return opKey ? OP_LABEL[opKey as Operation] : op;
  };

  const returnTo = searchParams.get("returnTo");
  const fromWizard = returnTo === "/sell";
  const hasFilmstrip = itemId && state.itemPhotos.length > 0;
  const editedCount = Object.values(state.photoEditStates).filter((s) => s.editedUrl !== null).length;
  const savedCount = Object.values(state.photoEditStates).filter((s) => s.savedToItem).length;
  const activePhotoSaved = state.originalPhotoUrl
    ? state.photoEditStates[state.originalPhotoUrl]?.savedToItem === true
    : false;

  // ─── Active step config renderer ───
  const renderActiveConfig = () => {
    if (!activeStep) return null;
    const params = activeStep.params;

    switch (activeOp) {
      case "clean_bg":
        return <SimpleOperationConfig operation="clean_bg" />;
      case "enhance":
        return <SimpleOperationConfig operation="enhance" />;
      case "decrease":
        return (
          <SteamConfig
            intensity={(params as any).intensity || "standard"}
            onChange={(v) => updateActiveParams({ intensity: v })}
          />
        );
      case "lifestyle_bg":
        return (
          <LifestyleConfig
            bgStyle={(params as any).bg_style || "studio_white"}
            onChange={(v) => updateActiveParams({ bg_style: v })}
          />
        );
      case "flatlay":
        return (
          <FlatLayConfig
            style={(params as any).flatlay_style || "minimal_white"}
            onChange={(v) => updateActiveParams({ flatlay_style: v })}
          />
        );
      case "mannequin":
        return (
          <MannequinConfig
            mannequinType={(params as any).mannequin_type || "headless"}
            lighting={(params as any).lighting_style || "soft_studio"}
            bg={(params as any).model_bg || "studio"}
            onTypeChange={(v) => updateActiveParams({ mannequin_type: v })}
            onLightingChange={(v) => updateActiveParams({ lighting_style: v })}
            onBgChange={(v) => updateActiveParams({ model_bg: v })}
          />
        );
      case "ai_model":
        return (
          <ModelShotWizard
            params={{
              gender: (params as any).gender || "female",
              look: (params as any).model_look || "classic",
              pose: (params as any).pose || "standing_front",
              bg: (params as any).model_bg || "studio",
              shot_style: (params as any).shot_style || "editorial",
              full_body: (params as any).full_body !== "false",
            }}
            onChange={(p) => {
              const mapped: Record<string, string> = {};
              if (p.gender !== undefined) mapped.gender = p.gender;
              if (p.look !== undefined) mapped.model_look = p.look;
              if (p.pose !== undefined) mapped.pose = p.pose;
              if (p.bg !== undefined) mapped.model_bg = p.bg;
              if (p.shot_style !== undefined) mapped.shot_style = p.shot_style;
              if (p.full_body !== undefined) mapped.full_body = p.full_body ? "true" : "false";
              updateActiveParams(mapped);
            }}
          />
        );
      default:
        return null;
    }
  };

  // ─── Generate Button ───
  const GenerateButton = () => {
    const isLockedOp =
      (activeOp === "flatlay" && !flatlayGate.allowed) ||
      (activeOp === "mannequin" && !mannequinGate.allowed) ||
      (activeOp === "ai_model" && !aiModelGate.allowed);
    const label = state.pipeline.length > 1
      ? `Apply ${state.pipeline.length} Effects · ${totalCreditCost} credit${totalCreditCost !== 1 ? "s" : ""}`
      : activeOp === "ai_model"
        ? "Generate · 4 credits"
        : `Apply ${OP_LABEL[activeOp]}`;
    return (
      <Button
        onClick={handleProcess}
        disabled={state.isProcessing || !state.originalPhotoUrl || isLockedOp}
        className="w-full h-12 font-semibold text-sm active:scale-95 transition-transform"
      >
        {state.isProcessing
          ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
          : <Wand2 className="w-4 h-4 mr-2" />}
        {state.isProcessing ? "Processing…" : label}
      </Button>
    );
  };

  // ─── Pipeline strip (rendered inline, not in drawer) ───
  const PipelineStripInline = () => (
    <PipelineStrip
      pipeline={state.pipeline}
      activePipelineIndex={state.activePipelineIndex}
      onSelectStep={(i) => dispatch({ type: "SET_ACTIVE_PIPELINE_INDEX", index: i })}
      onRemoveStep={(i) => dispatch({ type: "REMOVE_PIPELINE_STEP", index: i })}
      onAddStep={(op) => dispatch({ type: "ADD_PIPELINE_STEP", step: { operation: op, params: defaultParams(op) } })}
      flatlayLocked={!flatlayGate.allowed}
      mannequinLocked={!mannequinGate.allowed}
      aiModelLocked={!aiModelGate.allowed}
    />
  );

  // ─── Config drawer content for mobile / desktop wrapper ───
  const configContent = (
    <>
      {renderActiveConfig()}
      {/* Garment context for relevant ops */}
      {(activeOp === "ai_model" || activeOp === "mannequin" || activeOp === "lifestyle_bg") && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Describe your item {itemId ? "(auto-filled)" : "(optional)"}
          </label>
          <input
            type="text"
            value={garmentContext}
            onChange={(e) => setGarmentContext(e.target.value)}
            placeholder="e.g. Black Nike crewneck sweatshirt, size M"
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-1 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      )}
    </>
  );

  // ─── Derived helpers ───
  const activePhotoUrl = state.originalPhotoUrl;

  return (
    <PageShell
      title="Photo Studio"
      subtitle={itemId && linkedItemTitle ? `Editing photos for: ${linkedItemTitle}` : "AI-powered photo editing for your listings"}
      maxWidth="max-w-5xl"
    >
      {/* Back nav */}
      {fromWizard ? (
        <div className="mb-3 -mt-1">
          <button
            onClick={() => navigate("/sell")}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
          >
            ← Back to Sell Wizard
          </button>
        </div>
      ) : itemId && linkedItemTitle ? (
        <div className="mb-3 -mt-1">
          <button
            onClick={() => navigate(`/items/${itemId}?tab=photos`)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to {linkedItemTitle}
          </button>
        </div>
      ) : null}

      <FeatureGate feature="vintography">
        <div className="space-y-3 sm:space-y-4">
          <CreditBar used={totalUsed} limit={creditsLimit} unlimited={isUnlimited} />

          {/* Low-credit banner */}
          {!isUnlimited && creditsRemaining <= 2 && creditsRemaining >= 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-xl bg-warning/10 border border-warning/25 p-3"
            >
              <Coins className="w-4 h-4 text-warning shrink-0" />
              <p className="text-xs text-foreground flex-1">
                <span className="font-semibold">
                  {creditsRemaining <= 0 ? "No credits left." : `${creditsRemaining} credit${creditsRemaining === 1 ? "" : "s"} remaining.`}
                </span>{" "}
                Top up 10 for £2.99 →
              </p>
              <Button
                size="sm"
                className="shrink-0 h-8 text-xs font-semibold bg-warning text-warning-foreground hover:bg-warning/90"
                onClick={() => navigate("/settings?tab=billing")}
              >
                Top Up
              </Button>
            </motion.div>
          )}

          {/* Guidance banner */}
          {!localStorage.getItem("vintography_guidance_dismissed") && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5 rounded-xl bg-primary/[0.04] border border-primary/10 p-3"
            >
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground flex-1 leading-relaxed">
                <span className="font-semibold text-foreground">Best results</span> with a full, flat-lay or hanger shot showing the entire garment.
              </p>
              <button
                onClick={() => localStorage.setItem("vintography_guidance_dismissed", "1")}
                className="shrink-0 text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* ─── No photo: Empty state ─── */}
          {!state.originalPhotoUrl ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <EmptyState
                itemId={itemId}
                linkedItemTitle={linkedItemTitle}
                onFilesSelected={handleFileSelect}
              />
            </motion.div>
          ) : (
            /* ─── Editor: three-zone layout ─── */
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* ════ MOBILE layout (< lg) ════ */}
              <div className="lg:hidden space-y-3">
                {/* Zone 1: Canvas — always visible at top */}
                {hasFilmstrip && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="p-3">
                      <PhotoFilmstrip
                        photos={state.itemPhotos}
                        activeUrl={state.originalPhotoUrl}
                        editStates={state.photoEditStates}
                        itemId={itemId}
                        onSelect={handleFilmstripSelect}
                        onAddPhoto={() => addPhotoInputRef.current?.click()}
                      />
                      {editedCount > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border">
                          {savedCount > 0
                            ? `${savedCount} of ${editedCount} edits saved to listing`
                            : `${editedCount} photo${editedCount > 1 ? "s" : ""} edited — tap Save to apply`}
                        </p>
                      )}
                    </Card>
                    <input
                      ref={addPhotoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleAddPhoto(e.target.files)}
                    />
                  </motion.div>
                )}

                {!itemId && state.itemPhotos.length > 1 && (
                  <Card className="p-3">
                    <PhotoFilmstrip
                      photos={state.itemPhotos}
                      activeUrl={state.originalPhotoUrl}
                      editStates={state.photoEditStates}
                      itemId={null}
                      onSelect={handleFilmstripSelect}
                    />
                  </Card>
                )}

                <div
                  ref={resultRef}
                  className={`rounded-xl transition-all duration-700 ${state.resultReady ? "ring-2 ring-success ring-offset-2 shadow-lg shadow-success/20" : ""}`}
                >
                  <ComparisonView
                    originalUrl={state.originalPhotoUrl!}
                    processedUrl={state.resultPhotoUrl}
                    processing={state.isProcessing}
                    processingStep={null}
                    operationId={activeOp}
                    resultLabel={state.pipeline.map(s => OP_RESULT_LABEL[s.operation]).join(" + ")}
                    variations={[]}
                    currentVariation={0}
                    onVariationChange={() => {}}
                  />
                </div>

                {/* Zone 2: Quick Presets + Operation Bar */}
                <QuickPresets
                  onSelect={handlePresetSelect}
                  onLockedTap={(tier) => {
                    if (tier === "business") setActiveLockedGate("ai_model");
                    else if (tier === "pro") setActiveLockedGate("flatlay");
                  }}
                  disabled={state.isProcessing}
                  userTier={(profile as any)?.subscription_tier || "free"}
                  savedPresets={savedPresets}
                  onSavedPresetSelect={handleSavedPresetSelect}
                  onDeleteSavedPreset={handleDeleteSavedPreset}
                />
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Choose Effect</p>
                  <OperationBar
                    pipeline={state.pipeline}
                    activePipelineIndex={state.activePipelineIndex}
                    flatlayLocked={!flatlayGate.allowed}
                    mannequinLocked={!mannequinGate.allowed}
                    aiModelLocked={!aiModelGate.allowed}
                    onSelect={handleOpSelect}
                    onLockedTap={(gate) => setActiveLockedGate(gate)}
                  />
                  {/* Pipeline strip — always visible below effect bar */}
                  <div className="pt-1">
                    <PipelineStripInline />
                  </div>
                </div>

                {/* Processing strip on mobile */}
                {state.isProcessing && (
                  <ProcessingOverlay
                    isProcessing={state.isProcessing}
                    pipeline={state.pipeline}
                    processingStepIndex={state.processingStepIndex}
                    isMobile={true}
                  />
                )}

                {/* Zone 3: Inline config (collapsible) + Generate button always visible */}
                {!state.isProcessing && activeStep && (
                  <Collapsible
                    defaultOpen={!["clean_bg", "enhance"].includes(activeOp)}
                    key={activeOp}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full rounded-xl border border-border bg-card px-3 py-2.5 active:scale-[0.98] transition-transform">
                      <span className="text-xs font-semibold">{OP_LABEL[activeOp]} Settings</span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="rounded-xl border border-border border-t-0 rounded-t-none bg-card px-3 py-3 space-y-3">
                      {configContent}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                <div className="space-y-2">
                  <GenerateButton />
                  {state.pipeline.length >= 2 && !state.isProcessing && (
                    <Button variant="ghost" size="sm" className="w-full text-xs" onClick={handleSavePreset}>
                      <Star className="w-3.5 h-3.5 mr-1.5" /> Save as Preset
                    </Button>
                  )}
                </div>

                {/* Result actions */}
                <ResultActions
                  processedUrl={state.resultPhotoUrl}
                  itemId={itemId}
                  activePhotoSaved={activePhotoSaved}
                  savingToItem={state.savingToItem}
                  processing={state.isProcessing}
                  itemPhotos={state.itemPhotos}
                  activePhotoUrl={activePhotoUrl}
                  creditsLow={creditsLow}
                  onReprocess={handleProcess}
                  onDownload={handleDownload}
                   onReset={() => { dispatch({ type: "RESET_ALL" }); if (user) clearDraft(user.id); }}
                  onSaveReplace={() => handleSaveToItem("replace")}
                  onSaveAdd={() => handleSaveToItem("add")}
                  onUseAsStartingPoint={handleUseResultAsStart}
                  onNextPhoto={handleNextPhoto}
                  onTopUp={() => navigate("/settings?tab=billing")}
                />

                {!state.resultPhotoUrl && (
                   <Button variant="ghost" onClick={() => { dispatch({ type: "RESET_ALL" }); if (user) clearDraft(user.id); }} className="w-full h-10 text-sm active:scale-95">
                    <RotateCcw className="w-4 h-4 mr-1.5" /> New Photo
                  </Button>
                )}

                {state.resultPhotoUrl && itemId && (
                  <Card className="p-3 border-primary/20 bg-gradient-to-br from-primary/[0.04] to-transparent">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Next Steps</p>
                    {hasFilmstrip && editedCount > 0 ? (
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{state.itemPhotos.length} photos · {editedCount} enhanced</p>
                          <p className="text-xs text-muted-foreground">
                            {savedCount < editedCount ? `Save ${editedCount - savedCount} remaining edit${editedCount - savedCount > 1 ? "s" : ""} above` : "All edits saved"}
                          </p>
                        </div>
                        <Button size="sm" onClick={() => navigate(`/items/${itemId}?tab=photos`)}>View Photos</Button>
                      </div>
                    ) : (
                      <Button size="sm" className="w-full" onClick={() => navigate(`/items/${itemId}`)}>
                        View Listing <Package className="w-3.5 h-3.5 ml-1.5" />
                      </Button>
                    )}
                  </Card>
                )}
              </div>

              {/* ════ DESKTOP layout (≥ lg): two-column ════ */}
              <div className="hidden lg:grid lg:grid-cols-[420px_1fr] lg:gap-6 lg:items-start">

                {/* ── LEFT PANEL ── */}
                <div className="min-w-0 space-y-4" style={{ maxWidth: '420px' }}>
                  <QuickPresets
                    onSelect={handlePresetSelect}
                    onLockedTap={(tier) => {
                      if (tier === "business") setActiveLockedGate("ai_model");
                      else if (tier === "pro") setActiveLockedGate("flatlay");
                    }}
                    disabled={state.isProcessing}
                    userTier={(profile as any)?.subscription_tier || "free"}
                    savedPresets={savedPresets}
                    onSavedPresetSelect={handleSavedPresetSelect}
                    onDeleteSavedPreset={handleDeleteSavedPreset}
                  />

                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Choose Effect</p>
                    <p className="text-[10px] text-muted-foreground mb-2">Tap an effect to configure it. Chain up to 4 effects.</p>
                    <OperationBar
                      pipeline={state.pipeline}
                      activePipelineIndex={state.activePipelineIndex}
                      flatlayLocked={!flatlayGate.allowed}
                      mannequinLocked={!mannequinGate.allowed}
                      aiModelLocked={!aiModelGate.allowed}
                      onSelect={handleOpSelect}
                      onLockedTap={(gate) => setActiveLockedGate(gate)}
                    />
                  </div>

                  {/* Pipeline strip — always visible between bar and config */}
                  <PipelineStripInline />

                  {/* Config zone — scroll-constrained with pinned Generate */}
                  <ConfigContainer
                    open={true}
                    onClose={() => {}}
                    drawerTitle={OP_LABEL[activeOp]}
                    footer={
                      <div className="space-y-2">
                        <GenerateButton />
                        {state.pipeline.length >= 2 && !state.isProcessing && (
                          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={handleSavePreset}>
                            <Star className="w-3.5 h-3.5 mr-1.5" /> Save as Preset
                          </Button>
                        )}
                      </div>
                    }
                  >
                    {state.isProcessing ? (
                      <ProcessingOverlay
                        isProcessing={state.isProcessing}
                        pipeline={state.pipeline}
                        processingStepIndex={state.processingStepIndex}
                        isMobile={false}
                      />
                    ) : (
                      configContent
                    )}
                  </ConfigContainer>
                </div>

                {/* ── RIGHT PANEL ── */}
                <div className="lg:sticky lg:top-6 space-y-3">
                  {hasFilmstrip && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                      <Card className="p-3">
                        <PhotoFilmstrip
                          photos={state.itemPhotos}
                          activeUrl={state.originalPhotoUrl}
                          editStates={state.photoEditStates}
                          itemId={itemId}
                          onSelect={handleFilmstripSelect}
                          onAddPhoto={() => addPhotoInputRef.current?.click()}
                        />
                        {editedCount > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border">
                            {savedCount > 0
                              ? `${savedCount} of ${editedCount} edits saved to listing`
                              : `${editedCount} photo${editedCount > 1 ? "s" : ""} edited — tap Save to apply`}
                          </p>
                        )}
                      </Card>
                      <input
                        ref={addPhotoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleAddPhoto(e.target.files)}
                      />
                    </motion.div>
                  )}

                  {!itemId && state.itemPhotos.length > 1 && (
                    <Card className="p-3">
                      <PhotoFilmstrip
                        photos={state.itemPhotos}
                        activeUrl={state.originalPhotoUrl}
                        editStates={state.photoEditStates}
                        itemId={null}
                        onSelect={handleFilmstripSelect}
                      />
                    </Card>
                  )}

                  <div
                    ref={resultRef}
                    className={`rounded-xl transition-all duration-700 ${state.resultReady ? "ring-2 ring-success ring-offset-2 shadow-lg shadow-success/20" : ""}`}
                  >
                    <ComparisonView
                      originalUrl={state.originalPhotoUrl!}
                      processedUrl={state.resultPhotoUrl}
                      processing={state.isProcessing}
                      processingStep={null}
                      operationId={activeOp}
                      resultLabel={state.pipeline.map(s => OP_RESULT_LABEL[s.operation]).join(" + ")}
                      variations={[]}
                      currentVariation={0}
                      onVariationChange={() => {}}
                    />
                  </div>

                  <ResultActions
                    processedUrl={state.resultPhotoUrl}
                    itemId={itemId}
                    activePhotoSaved={activePhotoSaved}
                    savingToItem={state.savingToItem}
                    processing={state.isProcessing}
                    itemPhotos={state.itemPhotos}
                    activePhotoUrl={activePhotoUrl}
                    creditsLow={creditsLow}
                    onReprocess={handleProcess}
                    onDownload={handleDownload}
                    onReset={() => { dispatch({ type: "RESET_ALL" }); if (user) clearDraft(user.id); }}
                  onSaveReplace={() => handleSaveToItem("replace")}
                  onSaveAdd={() => handleSaveToItem("add")}
                  onUseAsStartingPoint={handleUseResultAsStart}
                  onNextPhoto={handleNextPhoto}
                  onTopUp={() => navigate("/settings?tab=billing")}
                />

                  {!state.resultPhotoUrl && (
                    <Button variant="ghost" onClick={() => { dispatch({ type: "RESET_ALL" }); if (user) clearDraft(user.id); }} className="w-full h-10 text-sm active:scale-95">
                      <RotateCcw className="w-4 h-4 mr-1.5" /> New Photo
                    </Button>
                  )}

                  {state.resultPhotoUrl && itemId && (
                    <Card className="p-3 border-primary/20 bg-gradient-to-br from-primary/[0.04] to-transparent">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Next Steps</p>
                      {hasFilmstrip && editedCount > 0 ? (
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{state.itemPhotos.length} photos · {editedCount} enhanced</p>
                            <p className="text-xs text-muted-foreground">
                              {savedCount < editedCount ? `Save ${editedCount - savedCount} remaining edit${editedCount - savedCount > 1 ? "s" : ""} above` : "All edits saved"}
                            </p>
                          </div>
                          <Button size="sm" onClick={() => navigate(`/items/${itemId}?tab=photos`)}>View Photos</Button>
                        </div>
                      ) : (
                        <Button size="sm" className="w-full" onClick={() => navigate(`/items/${itemId}`)}>
                          View Listing <Package className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                      )}
                    </Card>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── Gallery ─── */}
          <div className="mt-6 space-y-3">
            <h2 className="font-display font-bold text-sm lg:text-base">Previous Edits</h2>
            {galleryLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-xl" />
                ))}
              </div>
            ) : gallery.length === 0 ? (
              <p className="text-sm text-muted-foreground">No edits yet. Upload a photo and transform it above.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {gallery.map((job) => (
                  <GalleryCard
                    key={job.id}
                    job={job}
                    opLabel={opLabel(job.operation)}
                    onRestore={(j) => {
                      dispatch({ type: "SET_ORIGINAL_PHOTO", url: j.original_url });
                      dispatch({ type: "SET_RESULT_PHOTO", url: j.processed_url || j.original_url });
                    }}
                    onDelete={handleDeleteJob}
                    onUseAsInput={handleUseAsInput}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </FeatureGate>

      {/* Upgrade modals */}
      <UpgradeModal
        open={activeLockedGate !== null}
        onClose={() => setActiveLockedGate(null)}
        tierRequired={activeLockedGate === "ai_model" ? "business" : "pro"}
        reason={
          activeLockedGate === "ai_model"
            ? aiModelGate.reason
            : activeLockedGate === "flatlay"
            ? flatlayGate.reason
            : mannequinGate.reason
        }
      />
    </PageShell>
  );
}

