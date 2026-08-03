import "server-only";

import { headers } from "next/headers";

import { appRouter } from "./routers/_app";
import { createCallerFactory, createTRPCContext } from "./trpc";

const createCaller = createCallerFactory(appRouter);

/**
 * Pemanggil tRPC langsung dari Server Component: tanpa HTTP round trip,
 * jadi data paket sudah ikut terkirim di HTML pertama (penting untuk
 * target FCP di AC-PERFORMA-2).
 */
export async function getServerApi() {
  const requestHeaders = new Headers(await headers());
  return createCaller(await createTRPCContext({ headers: requestHeaders }));
}
