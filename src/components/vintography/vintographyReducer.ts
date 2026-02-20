import { PhotoOperation, PHOTO_OPERATIONS } from "@/lib/constants";

const STORAGE_KEY = "vintifi_photo_session";

export interface PhotoSession {
  photo: string | null;
  result: string | null;
  operation: PhotoOperation | null;
}

export function saveSession(session: PhotoSession): void {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session)); } catch {}
}

export function loadSession(): PhotoSession {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { photo: null, result: null, operation: null };
    return JSON.parse(raw);
  } catch { return { photo: null, result: null, operation: null }; }
}

export function clearSession(): void {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
}

// Re-export for backward compatibility with gallery cards
export const OP_RESULT_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(PHOTO_OPERATIONS).map(([key, val]) => [key, val.label])
);
