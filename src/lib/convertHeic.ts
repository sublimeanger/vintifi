import heic2any from "heic2any";

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

  const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  const resultBlob = Array.isArray(blob) ? blob[0] : blob;
  const newName = file.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg");
  return new File([resultBlob], newName, { type: "image/jpeg" });
}

/**
 * Convert an array of files in parallel, with an optional progress toast.
 */
export async function ensureDisplayableImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map(ensureDisplayableImage));
}
