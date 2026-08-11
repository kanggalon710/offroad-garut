import { router } from "../trpc";
import { adminRouter } from "./admin";
import { bookingRouter } from "./booking";
import { userRouter } from "./user";

export const appRouter = router({
  booking: bookingRouter,
  admin: adminRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
