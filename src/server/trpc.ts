import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { UserRole } from "@/lib/db/schema";

export type TRPCContext = {
  db: typeof db;
  headers: Headers;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    phone: string | null;
  } | null;
};

function toRole(value: unknown): UserRole {
  return value === "admin" || value === "owner" ? value : "customer";
}

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
              ? (session.user as { phone: string }).phone
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
  if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Halaman ini khusus pengelola rental",
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
