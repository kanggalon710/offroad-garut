import { NextResponse, type NextRequest } from "next/server";
import type { ZodError } from "zod";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { MIME_MEDIA_DIIZINKAN } from "@/lib/media-types";
import { isStaff, toRole } from "@/lib/roles";
import { processAndSaveUpload } from "@/lib/upload";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const FormSchema = z.object({
  subfolder: z.enum(["gallery", "album", "pdf", "jeep"]).default("gallery"),
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json(
      { error: "Belum login" },
      { status: 401 },
    );
  }
  // Lewat isStaff, bukan perbandingan peran sendiri. Versi sebelumnya
  // membandingkan langsung dengan "admin" dan "owner", sehingga super_admin
  // ditolak mengunggah padahal ia peran tertinggi.
  if (!isStaff(toRole(session.user.role))) {
    return NextResponse.json(
      { error: "Hanya pengelola rental yang boleh unggah file" },
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

  if (!MIME_MEDIA_DIIZINKAN.includes(file.type)) {
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
