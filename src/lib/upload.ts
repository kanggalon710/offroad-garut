import { mkdir, unlink, writeFile } from "node:fs/promises";
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

/**
 * Menghapus berkas unggahan dari disk berdasarkan URL publiknya.
 *
 * Baris database yang dihapus WAJIB ikut menghapus berkasnya, kalau tidak
 * disk perlahan penuh oleh berkas yatim yang setahun kemudian tidak ada yang
 * bisa mengenali lagi milik siapa.
 *
 * Mengembalikan false, bukan melempar, kalau berkasnya memang sudah tidak ada.
 * Kegagalan menghapus berkas tidak boleh membatalkan penghapusan barisnya:
 * baris yang tertinggal menunjuk gambar yang hilang jauh lebih merepotkan
 * daripada satu berkas yatim.
 */
export async function hapusBerkasUnggahan(publicUrl: string): Promise<boolean> {
  // Hanya melayani berkas milik sendiri. URL dari luar (Google Drive, YouTube)
  // maupun jalur yang mencoba keluar dari direktori unggahan diabaikan.
  if (!publicUrl.startsWith("/uploads/")) return false;

  const akar = path.join(process.cwd(), "public", "uploads");
  const target = path.resolve(
    process.cwd(),
    "public",
    `.${publicUrl}`.replace(/^\.\//, ""),
  );

  // Penjaga kedua: hasil resolve harus tetap di dalam direktori unggahan,
  // supaya "/uploads/../../etc/passwd" tidak bisa menghapus apa pun.
  if (target !== akar && !target.startsWith(akar + path.sep)) return false;

  try {
    await unlink(target);
    return true;
  } catch {
    return false;
  }
}
