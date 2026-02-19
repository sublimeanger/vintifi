import { useEffect, useRef, useCallback } from "react";
import type { PipelineStep } from "@/components/vintography/vintographyReducer";

interface DraftSnapshot {
  originalPhotoUrl: string;
  resultPhotoUrl: string | null;
  pipeline: PipelineStep[];
  activePipelineIndex: number;
  garmentContext: string;
  timestamp: number;
}

const DRAFT_KEY_PREFIX = "vintography_draft_";
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEBOUNCE_MS = 500;

function getDraftKey(userId: string) {
  return `${DRAFT_KEY_PREFIX}${userId}`;
}

/** Read a saved draft from localStorage (returns null if missing/expired) */
export function readDraft(userId: string): DraftSnapshot | null {
  try {
    const raw = localStorage.getItem(getDraftKey(userId));
    if (!raw) return null;
    const draft: DraftSnapshot = JSON.parse(raw);
    if (Date.now() - draft.timestamp > MAX_AGE_MS) {
      localStorage.removeItem(getDraftKey(userId));
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

/** Clear the saved draft */
export function clearDraft(userId: string) {
  try {
    localStorage.removeItem(getDraftKey(userId));
  } catch {}
}

/** Hook that auto-saves Photo Studio state to localStorage with debouncing */
export function useVintographyDraftSave(
  userId: string | undefined,
  originalPhotoUrl: string | null,
  resultPhotoUrl: string | null,
  pipeline: PipelineStep[],
  activePipelineIndex: number,
  garmentContext: string,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId || !originalPhotoUrl) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      try {
        const snapshot: DraftSnapshot = {
          originalPhotoUrl,
          resultPhotoUrl,
          pipeline,
          activePipelineIndex,
          garmentContext,
          timestamp: Date.now(),
        };
        localStorage.setItem(getDraftKey(userId), JSON.stringify(snapshot));
      } catch {}
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [userId, originalPhotoUrl, resultPhotoUrl, pipeline, activePipelineIndex, garmentContext]);
}
