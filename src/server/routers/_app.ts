import { router } from "../trpc";
import { adminRouter } from "./admin";
import { bookingRouter } from "./booking";
import { galleryRouter } from "./gallery";
import { laporanRouter } from "./laporan";
import { pembaruanRouter } from "./pembaruan";
import { seoRouter } from "./seo";
import { userRouter } from "./user";

export const appRouter = router({
  booking: bookingRouter,
  admin: adminRouter,
  user: userRouter,
  gallery: galleryRouter,
  laporan: laporanRouter,
  pembaruan: pembaruanRouter,
  seo: seoRouter,
});

export type AppRouter = typeof appRouter;
