import { router } from "../trpc";
import { adminRouter } from "./admin";
import { bookingRouter } from "./booking";
import { galleryRouter } from "./gallery";
import { pembaruanRouter } from "./pembaruan";
import { userRouter } from "./user";

export const appRouter = router({
  booking: bookingRouter,
  admin: adminRouter,
  user: userRouter,
  gallery: galleryRouter,
  pembaruan: pembaruanRouter,
});

export type AppRouter = typeof appRouter;
