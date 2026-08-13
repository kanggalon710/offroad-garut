import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/lib/db";
import {
  accounts,
  sessions,
  users,
  verifications,
} from "@/lib/db/schema";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  /**
   * Di produksi hanya domain aplikasi yang dipercaya. Saat pengembangan
   * `next dev` sering berpindah port kalau 3000 sedang dipakai, dan
   * origin yang tidak cocok membuat setiap permintaan auth ditolak.
   */
  trustedOrigins:
    process.env.NODE_ENV === "production"
      ? [process.env.BETTER_AUTH_URL ?? ""]
      : ["http://localhost:*", "http://127.0.0.1:*"],

  database: drizzleAdapter(db, {
    provider: "mysql",
    schema: { users, sessions, accounts, verifications },
  }),

  advanced: {
    database: {
      // Biarkan better-auth membuat id sendiri (nanoid) karena
      // MySQL tidak punya gen_random_uuid(). Kolom id bertipe string
      // 36 karakter diisi oleh aplikasi, bukan database.
      generateId: false,
    },
  },

  user: {
    modelName: "users",
    fields: {
      image: "avatarUrl",
    },
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "customer",
        // Tidak boleh diisi dari sisi klien, kalau tidak siapa pun
        // bisa mendaftar sebagai admin.
        input: false,
      },
      phone: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },

  session: {
    modelName: "sessions",
    fields: {
      token: "sessionToken",
    },
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },

  account: { modelName: "accounts" },
  verification: { modelName: "verifications" },

  /** Login turis: satu ketukan lewat Google (PRD §9). */
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },

  /** Login pemilik rental: email + password manual (PRD §9). */
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    requireEmailVerification: false,
  },

  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
