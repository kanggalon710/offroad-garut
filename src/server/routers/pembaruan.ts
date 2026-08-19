import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { env } from "@/env";
import { catatAudit } from "@/lib/db/audit";
import { users } from "@/lib/db/schema";
import {
  BATAS_PERCOBAAN_PIN,
  MENIT_PENGUNCIAN_PIN,
  hashPin,
  hitungPenguncian,
  pinValid,
  sedangTerkunci,
  verifikasiPin,
} from "@/lib/pin";
import { router, superAdminProcedure, type TRPCContext } from "../trpc";

/**
 * Halaman /pembaruan: menarik kode terbaru dari GitHub lalu me-restart
 * aplikasi, tanpa pemilik perlu membuka Terminal cPanel.
 *
 * Prosedur di sini sengaja tidak menjalankan pembaruannya sendiri. Lihat
 * scripts/perbarui.cjs untuk alasannya.
 */

const skemaPin = z.object({
  pin: z.string().regex(/^\d{6}$/, "PIN harus 6 digit angka"),
});

/** Mengubah kegagalan git jadi pesan yang aman ditampilkan ke pemakai. */
function pesanAman(kesalahan: unknown): string {
  // Keluaran git memuat path absolut dan nama pengguna sistem, jadi tidak
  // pernah diteruskan apa adanya ke peramban.
  return kesalahan instanceof Error && kesalahan.message.includes("ENOENT")
    ? "Perintah git tidak tersedia di server ini."
    : "Gagal membaca informasi versi dari server.";
}

async function ambilPengguna(ctx: {
  db: TRPCContext["db"];
  user: { id: string };
}) {
  const [baris] = await ctx.db
    .select({
      id: users.id,
      updatePinHash: users.updatePinHash,
      pinFailedAttempts: users.pinFailedAttempts,
      pinLockedUntil: users.pinLockedUntil,
      mustChangeCredentials: users.mustChangeCredentials,
    })
    .from(users)
    .where(eq(users.id, ctx.user.id))
    .limit(1);

  if (!baris) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Akun tidak ditemukan" });
  }
  return baris;
}

export const pembaruanRouter = router({
  /** Versi yang sedang jalan, versi terbaru di GitHub, dan selisihnya. */
  getStatus: superAdminProcedure.query(async ({ ctx }) => {
    const pengguna = await ambilPengguna(ctx);
    const { bacaVersi, bacaStatusJob, adaKunci } = await import("@/lib/pembaruan-git");

    if (!env.UPDATE_ENABLED) {
      return {
        aktif: false as const,
        wajibGantiKredensial: pengguna.mustChangeCredentials,
        versi: null,
        job: await bacaStatusJob(),
        sedangBerjalan: false,
      };
    }

    let versi = null;
    let galat: string | null = null;
    try {
      versi = await bacaVersi(env.UPDATE_BRANCH);
    } catch (e) {
      galat = pesanAman(e);
    }

    return {
      aktif: true as const,
      wajibGantiKredensial: pengguna.mustChangeCredentials,
      punyaPin: Boolean(pengguna.updatePinHash),
      branch: env.UPDATE_BRANCH,
      versi,
      galat,
      job: await bacaStatusJob(),
      sedangBerjalan: await adaKunci(),
    };
  }),

  /** Dijajaki halaman tiap beberapa detik selagi pembaruan berjalan. */
  getStatusJob: superAdminProcedure.query(async () => {
    const { bacaStatusJob, adaKunci } = await import("@/lib/pembaruan-git");
    return { job: await bacaStatusJob(), sedangBerjalan: await adaKunci() };
  }),

  /** Menyetel PIN baru. Wajib dilakukan sebelum tombol pembaruan terbuka. */
  setPin: superAdminProcedure
    .input(
      z.object({
        pinBaru: z.string().regex(/^\d{6}$/, "PIN harus 6 digit angka"),
        pinLama: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const pengguna = await ambilPengguna(ctx);

      // Kalau sudah punya PIN, wajib menyebut yang lama. Tanpa ini, sesi yang
      // dibajak bisa menetapkan PIN baru tanpa tahu yang sekarang.
      if (pengguna.updatePinHash) {
        const cocok = await verifikasiPin(input.pinLama ?? "", pengguna.updatePinHash);
        if (!cocok) {
          throw new TRPCError({ code: "FORBIDDEN", message: "PIN lama tidak cocok" });
        }
      }

      await ctx.db
        .update(users)
        .set({
          updatePinHash: await hashPin(input.pinBaru),
          pinFailedAttempts: 0,
          pinLockedUntil: null,
          mustChangeCredentials: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id));

      await ctx.db.transaction(async (tx) => {
        await catatAudit(tx, {
          tableName: "users",
          recordId: ctx.user.id,
          action: "UPDATE",
          newData: { peristiwa: "pin-pembaruan-diganti" },
          changedBy: ctx.user.id,
        });
      });

      return { success: true as const };
    }),

  /** Memulai pembaruan. PIN diminta lagi di sini, bukan hanya saat login. */
  terapkan: superAdminProcedure
    .input(skemaPin)
    .mutation(async ({ ctx, input }) => {
      if (!env.UPDATE_ENABLED) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Pembaruan lewat halaman ini sedang dimatikan.",
        });
      }

      const pengguna = await ambilPengguna(ctx);

      if (pengguna.mustChangeCredentials) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Ganti kata sandi dan PIN bawaan dulu sebelum memakai pembaruan.",
        });
      }

      if (sedangTerkunci(pengguna.pinLockedUntil)) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `PIN terkunci karena terlalu banyak percobaan. Coba lagi setelah ${MENIT_PENGUNCIAN_PIN} menit.`,
        });
      }

      const cocok =
        pinValid(input.pin) &&
        (await verifikasiPin(input.pin, pengguna.updatePinHash));

      if (!cocok) {
        const { percobaan, terkunciSampai } = hitungPenguncian(
          pengguna.pinFailedAttempts,
        );
        await ctx.db
          .update(users)
          .set({ pinFailedAttempts: percobaan, pinLockedUntil: terkunciSampai })
          .where(eq(users.id, ctx.user.id));

        await ctx.db.transaction(async (tx) => {
          await catatAudit(tx, {
            tableName: "users",
            recordId: ctx.user.id,
            action: "UPDATE",
            newData: { peristiwa: "pin-pembaruan-salah", percobaan },
            changedBy: ctx.user.id,
          });
        });

        throw new TRPCError({
          code: "FORBIDDEN",
          message: terkunciSampai
            ? `PIN salah. Terkunci ${MENIT_PENGUNCIAN_PIN} menit.`
            : `PIN salah. Sisa ${BATAS_PERCOBAAN_PIN - percobaan} percobaan.`,
        });
      }

      await ctx.db
        .update(users)
        .set({ pinFailedAttempts: 0, pinLockedUntil: null })
        .where(eq(users.id, ctx.user.id));

      const { mulaiPembaruan } = await import("@/lib/pembaruan-git");

      // Audit ditulis SEBELUM eksekusi. Kalau ditulis sesudahnya, pembaruan
      // yang membuat aplikasi mati tidak akan meninggalkan jejak siapa pun.
      await ctx.db.transaction(async (tx) => {
        await catatAudit(tx, {
          tableName: "users",
          recordId: ctx.user.id,
          action: "UPDATE",
          newData: { peristiwa: "pembaruan-dimulai", branch: env.UPDATE_BRANCH },
          changedBy: ctx.user.id,
        });
      });

      try {
        await mulaiPembaruan();
      } catch (e) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            e instanceof Error && e.message === "terkunci"
              ? "Pembaruan lain sedang berjalan."
              : "Gagal memulai pembaruan di server.",
        });
      }

      return { success: true as const };
    }),
});
