import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Validasi environment variable dengan Zod (T3 Env).
 * Set SKIP_ENV_VALIDATION=1 untuk build CI/Docker tanpa kredensial nyata.
 */
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    /** URL database utama (produksi) untuk fitur sync data di lingkungan dev. */
    MAIN_DATABASE_URL: z.string().url().optional(),

    BETTER_AUTH_SECRET: z.string().min(16),
    BETTER_AUTH_URL: z.string().url(),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),

    MIDTRANS_SERVER_KEY: z.string().min(1),
    MIDTRANS_CLIENT_KEY: z.string().min(1),

    R2_ACCESS_KEY_ID: z.string().min(1).optional(),
    R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    R2_ENDPOINT: z.string().url().optional(),
    R2_BUCKET: z.string().min(1).optional(),

    FONNTE_TOKEN: z.string().min(1),
    OWNER_WHATSAPP: z
      .string()
      .regex(/^\+62\d{8,14}$/, "Nomor owner harus format +62"),

    /** Variabel untuk penyemaian data awal (hanya digunakan oleh npm run db:seed) */
    SEED_ADMIN_EMAIL: z.string().email().optional(),
    SEED_ADMIN_PASSWORD: z.string().min(1).optional(),
    SEED_ADMIN_NAME: z.string().min(1).optional(),

    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_MIDTRANS_URL: z.string().url(),
    /**
     * Tidak ada di daftar PRD §11, tetapi snap.js membacanya dari atribut
     * data-client-key di browser sehingga nilainya wajib publik.
     * MIDTRANS_CLIENT_KEY tanpa awalan NEXT_PUBLIC_ tidak akan pernah
     * sampai ke sisi klien.
     */
    NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: z.string().min(1),
    NEXT_PUBLIC_R2_PUBLIC_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    MAIN_DATABASE_URL: process.env.MAIN_DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    MIDTRANS_SERVER_KEY: process.env.MIDTRANS_SERVER_KEY,
    MIDTRANS_CLIENT_KEY: process.env.MIDTRANS_CLIENT_KEY,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_ENDPOINT: process.env.R2_ENDPOINT,
    R2_BUCKET: process.env.R2_BUCKET,
    FONNTE_TOKEN: process.env.FONNTE_TOKEN,
    OWNER_WHATSAPP: process.env.OWNER_WHATSAPP,
    SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL,
    SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD,
    SEED_ADMIN_NAME: process.env.SEED_ADMIN_NAME,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_MIDTRANS_URL: process.env.NEXT_PUBLIC_MIDTRANS_URL,
    NEXT_PUBLIC_MIDTRANS_CLIENT_KEY:
      process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
    NEXT_PUBLIC_R2_PUBLIC_URL: process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
  },
  skipValidation: Boolean(process.env.SKIP_ENV_VALIDATION),
  emptyStringAsUndefined: true,
});
