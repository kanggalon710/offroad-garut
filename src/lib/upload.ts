import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Utilitas untuk mengunggah file ke file system lokal (`public/uploads/...`)
 * dengan kompresi gambar otomatis menggunakan sharp.
 */
export type SaveUploadOptions = {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  subfolder?: string;
};

export async function processAndSaveUpload({
  buffer,
  originalName,
  mimeType,
  subfolder = "gallery",
}: SaveUploadOptions): Promise<string> {
  const uploadDir = path.join(process.cwd(), "public", "uploads", subfolder);
  await mkdir(uploadDir, { recursive: true });

  const isImage = mimeType.startsWith("image/") && !mimeType.includes("svg");
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const sanitizeName = originalName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 30);

  if (isImage) {
    const filename = `${sanitizeName}-${timestamp}-${randomSuffix}.webp`;
    const filePath = path.join(uploadDir, filename);

    // Kompresi otomatis dengan sharp: max 1920px width/height, format WebP quality 80
    await sharp(buffer)
      .resize({
        width: 1920,
        height: 1920,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toFile(filePath);

    return `/uploads/${subfolder}/${filename}`;
  }

  // Non-image (PDF, dokumen, dll.)
  const ext = path.extname(originalName) || ".bin";
  const filename = `${sanitizeName}-${timestamp}-${randomSuffix}${ext}`;
  const filePath = path.join(uploadDir, filename);

  await writeFile(filePath, buffer);
  return `/uploads/${subfolder}/${filename}`;
}
