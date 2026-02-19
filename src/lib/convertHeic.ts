import { toast } from "sonner";

/**
 * If the file is HEIC/HEIF, convert it to JPEG client-side.
 * Otherwise return it unchanged.
 */
export async function ensureDisplayableImage(file: File): Promise<File> {
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.heic$/i.test(file.name) ||
    /\.heif$/i.test(file.name);

  if (!isHeic) return file;

  try {
    const toastId = toast.loading("Converting HEIC photo…");
    // Dynamic import so the large library only loads when needed
    const { default: heic2any } = await import("heic2any");
    const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    const resultBlob = Array.isArray(blob) ? blob[0] : blob;
    const newName = file.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg");
    toast.dismiss(toastId);
    return new File([resultBlob], newName, { type: "image/jpeg" });
  } catch (err) {
    console.error("HEIC conversion failed:", err);
    toast.error("Could not convert HEIC photo. Try converting to JPG first.");
    // Return original file as fallback so the flow doesn't break entirely
    return file;
  }
}

/**
 * Convert an array of files in parallel, with an optional progress toast.
 */
export async function ensureDisplayableImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map(ensureDisplayableImage));
}
