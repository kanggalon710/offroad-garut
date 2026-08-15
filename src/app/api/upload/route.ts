import { NextResponse, type NextRequest } from "next/server";
import type { ZodError } from "zod";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { processAndSaveUpload } from "@/lib/upload";

const VALID_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const FormSchema = z.object({
  subfolder: z.enum(["gallery", "album", "pdf"]).default("gallery"),
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json(
      { error: "Belum login" },
      { status: 401 },
    );
  }
  if (session.user.role !== "admin" && session.user.role !== "owner") {
    return NextResponse.json(
      { error: "Hanya pemilik rental yang boleh unggah file" },
      { status: 403 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Body request harus berupa form-data multipart" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Field 'file' wajib diisi" },
      { status: 400 },
    );
  }

  const subfolderRaw = formData.get("subfolder");
  const parsed = FormSchema.safeParse({ subfolder: subfolderRaw ?? "gallery" });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Subfolder tidak valid", detail: (parsed.error as ZodError).flatten() },
      { status: 400 },
    );
  }

  if (!VALID_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Tipe file ${file.type} tidak didukung. Gunakan JPEG/PNG/WebP/GIF/PDF.` },
      { status: 400 },
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `Ukuran file ${(file.size / 1024 / 1024).toFixed(2)} MB lebih dari 10 MB.` },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await processAndSaveUpload({
    buffer,
    originalName: file.name || "tanpa-nama",
    mimeType: file.type,
    subfolder: parsed.data.subfolder,
  });

  return NextResponse.json({ url });
}
