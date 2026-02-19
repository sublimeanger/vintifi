import { PhotoEditState } from "./PhotoFilmstrip";

// ─── Operation identifiers ───
export type Operation =
  | "clean_bg"
  | "lifestyle_bg"
  | "flatlay"
  | "mannequin"
  | "ai_model"
  | "enhance"
  | "decrease";

// ─── Per-operation parameter shapes (all use Record<string,string> for simplicity) ───
export type OperationParams = Record<string, string>;

// ─── Default params per operation ───
export function defaultParams(op: Operation): OperationParams {
  switch (op) {
    case "lifestyle_bg": return { bg_style: "studio_white" };
    case "flatlay": return { flatlay_style: "minimal_white" };
    case "mannequin": return { mannequin_type: "headless", lighting_style: "soft_studio", model_bg: "studio" };
    case "ai_model": return { gender: "female", pose: "standing_front", model_look: "classic", model_bg: "studio", shot_style: "editorial", full_body: "true" };
    case "decrease": return { intensity: "standard" };
    default: return {};
  }
}

// ─── Pipeline step ───
export interface PipelineStep {
  operation: Operation;
  params: OperationParams;
}

// ─── Full page state ───
export interface VintographyState {
  originalPhotoUrl: string | null;
  resultPhotoUrl: string | null;
  pipeline: PipelineStep[];
  activePipelineIndex: number;
  isProcessing: boolean;
  processingStepIndex: number; // which pipeline step is currently running
  drawerOpen: boolean;
  itemPhotos: string[];
  photoEditStates: Record<string, PhotoEditState>;
  resultReady: boolean;
  savingToItem: boolean;
}

// ─── Reducer actions ───
export type VintographyAction =
  | { type: "SET_ORIGINAL_PHOTO"; url: string | null }
  | { type: "SET_RESULT_PHOTO"; url: string | null }
  | { type: "SET_ITEM_PHOTOS"; urls: string[] }
  | { type: "ADD_PIPELINE_STEP"; step: PipelineStep }
  | { type: "REMOVE_PIPELINE_STEP"; index: number }
  | { type: "SET_ACTIVE_PIPELINE_INDEX"; index: number }
  | { type: "UPDATE_STEP_PARAMS"; index: number; params: Partial<OperationParams> }
  | { type: "REPLACE_PIPELINE"; pipeline: PipelineStep[] }
  | { type: "PROCESSING_START" }
  | { type: "PROCESSING_STEP_START"; stepIndex: number }
  | { type: "PROCESSING_COMPLETE"; resultUrl: string }
  | { type: "PROCESSING_FAILED" }
  | { type: "SET_DRAWER_OPEN"; open: boolean }
  | { type: "SET_PHOTO_EDIT_STATE"; url: string; state: PhotoEditState }
  | { type: "SET_SAVING_TO_ITEM"; saving: boolean }
  | { type: "RESULT_READY_FLASH" }
  | { type: "RESET_ALL" };

export const initialState: VintographyState = {
  originalPhotoUrl: null,
  resultPhotoUrl: null,
  pipeline: [{ operation: "clean_bg", params: {} }],
  activePipelineIndex: 0,
  isProcessing: false,
  processingStepIndex: -1,
  drawerOpen: false,
  itemPhotos: [],
  photoEditStates: {},
  resultReady: false,
  savingToItem: false,
};

export function vintographyReducer(
  state: VintographyState,
  action: VintographyAction
): VintographyState {
  switch (action.type) {
    case "SET_ORIGINAL_PHOTO":
      return { ...state, originalPhotoUrl: action.url, resultPhotoUrl: null, resultReady: false };
    case "SET_RESULT_PHOTO":
      return { ...state, resultPhotoUrl: action.url };
    case "SET_ITEM_PHOTOS":
      return { ...state, itemPhotos: action.urls };
    case "ADD_PIPELINE_STEP":
      if (state.pipeline.length >= 4) return state;
      return {
        ...state,
        pipeline: [...state.pipeline, action.step],
        activePipelineIndex: state.pipeline.length,
        drawerOpen: false,
      };
    case "REMOVE_PIPELINE_STEP": {
      if (state.pipeline.length <= 1) return state; // always keep at least 1
      const newPipeline = state.pipeline.filter((_, i) => i !== action.index);
      const newActive = Math.min(state.activePipelineIndex, newPipeline.length - 1);
      return { ...state, pipeline: newPipeline, activePipelineIndex: newActive };
    }
    case "SET_ACTIVE_PIPELINE_INDEX":
      return { ...state, activePipelineIndex: action.index, drawerOpen: false };
    case "UPDATE_STEP_PARAMS": {
      const newPipeline = state.pipeline.map((step, i) =>
        i === action.index ? { ...step, params: { ...step.params, ...action.params } } : step
      );
      return { ...state, pipeline: newPipeline };
    }
    case "REPLACE_PIPELINE":
      return { ...state, pipeline: action.pipeline, activePipelineIndex: 0, drawerOpen: false };
    case "PROCESSING_START":
      return { ...state, isProcessing: true, processingStepIndex: 0 };
    case "PROCESSING_STEP_START":
      return { ...state, processingStepIndex: action.stepIndex };
    case "PROCESSING_COMPLETE":
      return { ...state, isProcessing: false, processingStepIndex: -1, resultPhotoUrl: action.resultUrl, resultReady: true, drawerOpen: false };
    case "PROCESSING_FAILED":
      return { ...state, isProcessing: false, processingStepIndex: -1 };
    case "SET_DRAWER_OPEN":
      return { ...state, drawerOpen: action.open };
    case "SET_PHOTO_EDIT_STATE":
      return { ...state, photoEditStates: { ...state.photoEditStates, [action.url]: action.state } };
    case "SET_SAVING_TO_ITEM":
      return { ...state, savingToItem: action.saving };
    case "RESULT_READY_FLASH":
      return { ...state, resultReady: false };
    case "RESET_ALL":
      return { ...initialState };
    default:
      return state;
  }
}

// ─── Helpers ───
export const OP_MAP: Record<Operation, string> = {
  clean_bg: "remove_bg",
  lifestyle_bg: "smart_bg",
  flatlay: "flatlay_style",
  mannequin: "mannequin_shot",
  ai_model: "model_shot",
  enhance: "enhance",
  decrease: "decrease",
};

export const OP_LABEL: Record<Operation, string> = {
  clean_bg: "Clean Background",
  lifestyle_bg: "Lifestyle Scene",
  flatlay: "Flat-Lay Pro",
  mannequin: "Mannequin",
  ai_model: "AI Model Shot",
  enhance: "Enhance",
  decrease: "Steam & Press",
};

export const OP_RESULT_LABEL: Record<Operation, string> = {
  clean_bg: "Background Removed",
  lifestyle_bg: "Lifestyle Scene",
  flatlay: "Flat-Lay Pro",
  mannequin: "Mannequin Shot",
  ai_model: "AI Model",
  enhance: "Enhanced",
  decrease: "Steamed",
};

export function getOperationCreditCost(op: Operation): number {
  return op === "ai_model" ? 4 : 1;
}

export function buildApiParams(step: PipelineStep): Record<string, string> {
  return step.params as Record<string, string>;
}

// ─── Conflict rules ───
const SCENE_OPS: Operation[] = ["flatlay", "mannequin", "lifestyle_bg"];

function hasSceneOp(pipeline: PipelineStep[]): Operation | null {
  for (const s of pipeline) {
    if (SCENE_OPS.includes(s.operation)) return s.operation;
  }
  return null;
}

/** Pipeline validation rules */
export function canAddOperation(pipeline: PipelineStep[], op: Operation): boolean {
  if (pipeline.length >= 4) return false;
  // No duplicates
  if (pipeline.some((s) => s.operation === op)) return false;
  // ai_model can only be first step
  if (op === "ai_model" && pipeline.length > 0) return false;

  const existingScene = hasSceneOp(pipeline);

  // Mutual exclusivity: only one scene-setting op allowed
  if (SCENE_OPS.includes(op) && existingScene) return false;

  // Redundancy: clean_bg is pointless before flatlay/mannequin (they generate their own BG)
  const hasFlatlayOrMannequin = pipeline.some((s) => s.operation === "flatlay" || s.operation === "mannequin");
  if (op === "clean_bg" && hasFlatlayOrMannequin) return false;

  // Redundancy: flatlay/mannequin after clean_bg is fine conceptually but they re-compose anyway
  const hasCleanBg = pipeline.some((s) => s.operation === "clean_bg");
  if ((op === "flatlay" || op === "mannequin") && hasCleanBg) return false;

  return true;
}

export function getAvailableOpsToAdd(pipeline: PipelineStep[]): Operation[] {
  const all: Operation[] = ["clean_bg", "lifestyle_bg", "flatlay", "mannequin", "ai_model", "enhance", "decrease"];
  const hasAiModel = pipeline.some((s) => s.operation === "ai_model");
  return all.filter((op) => {
    if (!canAddOperation(pipeline, op)) return false;
    // If ai_model is first, only enhance/decrease can follow
    if (hasAiModel && op !== "enhance" && op !== "decrease") return false;
    return true;
  });
}
