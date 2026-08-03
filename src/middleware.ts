import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Gerbang murah di edge: hanya memeriksa ADA atau TIDAKNYA cookie sesi.
 * Pemeriksaan role yang sebenarnya dilakukan di layout server
 * (src/app/(admin)/layout.tsx) karena cookie tidak memuat role.
 */
const CUSTOMER_ROUTES = ["/booking", "/ticket"];
const ADMIN_ROUTES = ["/dashboard", "/orders"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));

  if (hasSession) return NextResponse.next();

  // AC-OTENTIKASI-1: tamu yang membuka /booking dilempar ke alur
  // login Google, lalu dikembalikan ke halaman yang dituju.
  if (CUSTOMER_ROUTES.some((route) => pathname.startsWith(route))) {
    const loginUrl = new URL("/masuk", request.url);
    loginUrl.searchParams.set("redirect", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/booking/:path*", "/ticket/:path*", "/dashboard/:path*", "/orders/:path*"],
};
