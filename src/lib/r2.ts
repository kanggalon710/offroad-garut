import "server-only";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { env } from "@/env";

/**
 * Cloudflare R2 lewat S3 API (PRD §10).
 * Dipakai untuk foto spot resolusi tinggi supaya tidak kena
 * biaya egress seperti di S3.
 */

let client: S3Client | null = null;

function r2Client(): S3Client {
  if (client) return client;

  const R2_ENDPOINT = env.R2_ENDPOINT;
  const R2_ACCESS_KEY_ID = env.R2_ACCESS_KEY_ID;
  const R2_SECRET_ACCESS_KEY = env.R2_SECRET_ACCESS_KEY;
  if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error("Kredensial R2 belum lengkap di environment");
  }

  client = new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
  return client;
}

export type UploadInput = {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
};

/** Mengunggah objek dan mengembalikan URL publiknya. */
export async function uploadToR2(input: UploadInput): Promise<string> {
  const bucket = env.R2_BUCKET;
  const publicUrl = env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!bucket) throw new Error("R2_BUCKET belum diisi");
  if (!publicUrl) throw new Error("NEXT_PUBLIC_R2_PUBLIC_URL belum diisi");

  await r2Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return `${publicUrl.replace(/\/$/, "")}/${input.key}`;
}
