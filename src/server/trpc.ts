import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { UserRole } from "@/lib/db/schema";
import { isStaff, isSuperAdmin, toRole } from "@/lib/roles";

export type TRPCContext = {
  db: typeof db;
  headers: Headers;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    phone: string | null;
    alternativePhone: string | null;
  } | null;
};

export async function createTRPCContext(opts: {
  headers: Headers;
}): Promise<TRPCContext> {
  const session = await auth.api.getSession({ headers: opts.headers });

  return {
    db,
    headers: opts.headers,
    user: session
      ? {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: toRole((session.user as { role?: unknown }).role),
          phone:
            typeof (session.user as { phone?: unknown }).phone === "string"
              ? (session.user as unknown as { phone: string }).phone
              : null,
          alternativePhone:
            typeof (session.user as { alternativePhone?: unknown }).alternativePhone === "string"
              ? (session.user as unknown as { alternativePhone: string }).alternativePhone
              : null,
        }
      : null,
  };
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

/** Wajib login. Dipakai form booking dan halaman E-Ticket. */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Silakan masuk dulu untuk melanjutkan",
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

/** Hanya pemilik rental. AC-OTENTIKASI-7: customer ditolak. */
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Silakan masuk dulu" });
  }
  if (!isStaff(ctx.user.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Halaman ini khusus pengelola rental",
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

/**
 * Hanya super admin. Dipakai halaman /pembaruan, yang menjalankan kode baru
 * di server, jadi gerbangnya sengaja terpisah dari `adminProcedure`: pengelola
 * biasa boleh mengurus pesanan tanpa ikut bisa men-deploy.
 */
export const superAdminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Silakan masuk dulu" });
  }
  if (!isSuperAdmin(ctx.user.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Halaman ini khusus super admin",
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
