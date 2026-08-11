import { desc, eq } from "drizzle-orm";

import { bookings, packages } from "@/lib/db/schema";
import { protectedProcedure, router } from "../trpc";

export const userRouter = router({
  getOrders: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        booking: bookings,
        packageName: packages.name,
      })
      .from(bookings)
      .innerJoin(packages, eq(packages.id, bookings.packageId))
      .where(eq(bookings.userId, ctx.user.id))
      .orderBy(desc(bookings.createdAt));
  }),
});
