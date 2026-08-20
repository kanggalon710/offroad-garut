import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { hashPin, verifikasiPin } from "@/lib/pin";
import { users } from "@/lib/db/schema";
import { appRouter } from "@/server/routers/_app";
import { createCallerFactory, type TRPCContext } from "@/server/trpc";

/**
 * Regresi untuk kebuntuan ganti PIN.
 *
 * scripts/set-super-admin.cjs menyetel update_pin_hash DAN
 * must_change_credentials sekaligus, sehingga server mewajibkan PIN lama pada
 * layar wajib-ganti-PIN yang pertama. Form-nya dulu tidak punya kolom untuk
 * itu dan tidak pernah mengirimkannya, jadi super admin baru mustahil melewati
 * layar tersebut dan tidak pernah bisa memakai tombol pembaruan.
 */

const createCaller = createCallerFactory(appRouter);

const PIN_LAMA = "463696";
const PIN_BARU = "112233";

let idSuperAdmin: string;
let caller: ReturnType<typeof createCaller>;

beforeAll(async () => {
  idSuperAdmin = randomUUID();
  await db.insert(users).values({
    id: idSuperAdmin,
    email: `uji.pin.${idSuperAdmin}@contoh.id`,
    name: "Uji Super Admin",
    role: "super_admin",
    emailVerified: true,
    updatePinHash: await hashPin(PIN_LAMA),
    mustChangeCredentials: true,
  });

  const ctx: TRPCContext = {
    db,
    headers: new Headers(),
    user: {
      id: idSuperAdmin,
      email: `uji.pin.${idSuperAdmin}@contoh.id`,
      name: "Uji Super Admin",
      role: "super_admin",
      phone: null,
      alternativePhone: null,
    },
  };
  caller = createCaller(ctx);
});

afterAll(async () => {
  await db.delete(users).where(eq(users.id, idSuperAdmin));
});

describe("ganti PIN pembaruan", () => {
  it("menolak permintaan tanpa PIN lama saat akun sudah punya PIN", async () => {
    // Ini persis yang dikirim form versi lama, dan persis pesan galat yang
    // dilaporkan pemilik.
    await expect(
      caller.pembaruan.setPin({ pinBaru: PIN_BARU }),
    ).rejects.toThrow(/PIN lama tidak cocok/i);
  });

  it("menolak PIN lama yang salah", async () => {
    await expect(
      caller.pembaruan.setPin({ pinBaru: PIN_BARU, pinLama: "000000" }),
    ).rejects.toThrow(/PIN lama tidak cocok/i);
  });

  it("PIN tidak berubah setelah percobaan yang ditolak", async () => {
    const [baris] = await db
      .select({ hash: users.updatePinHash })
      .from(users)
      .where(eq(users.id, idSuperAdmin));

    expect(await verifikasiPin(PIN_LAMA, baris?.hash)).toBe(true);
    expect(await verifikasiPin(PIN_BARU, baris?.hash)).toBe(false);
  });

  it("menerima PIN lama yang benar dan mematikan wajib-ganti-kredensial", async () => {
    const hasil = await caller.pembaruan.setPin({
      pinBaru: PIN_BARU,
      pinLama: PIN_LAMA,
    });
    expect(hasil.success).toBe(true);

    const [baris] = await db
      .select({
        hash: users.updatePinHash,
        wajibGanti: users.mustChangeCredentials,
      })
      .from(users)
      .where(eq(users.id, idSuperAdmin));

    expect(await verifikasiPin(PIN_BARU, baris?.hash)).toBe(true);
    expect(baris?.wajibGanti).toBe(false);
  });
});
