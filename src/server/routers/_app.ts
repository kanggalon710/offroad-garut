import { router } from "../trpc";
import { adminRouter } from "./admin";
import { bookingRouter } from "./booking";

export const appRouter = router({
  booking: bookingRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
