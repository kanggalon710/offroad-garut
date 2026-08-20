import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { RUTE_PELANGGAN, RUTE_PENGELOLA } from "@/lib/rute-privat";

/**
 * Gerbang murah di edge: hanya memeriksa ADA atau TIDAKNYA cookie sesi.
 * Pemeriksaan role yang sebenarnya dilakukan di layout server
 * (src/app/(admin)/layout.tsx) karena cookie tidak memuat role.
 *
 * Daftar rutenya ada di src/lib/rute-privat.ts, dipakai bersama robots.txt
 * supaya rute pengelola baru tidak bisa dijaga di sini tapi lupa dilarang
 * di sana.
 */

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));

  if (hasSession) return NextResponse.next();

  // AC-OTENTIKASI-1: tamu yang membuka /booking dilempar ke alur
  // login Google, lalu dikembalikan ke halaman yang dituju.
  if (RUTE_PELANGGAN.some((route) => pathname.startsWith(route))) {
    const loginUrl = new URL("/masuk", request.url);
    loginUrl.searchParams.set("redirect", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (RUTE_PENGELOLA.some((route) => pathname.startsWith(route))) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/booking/:path*",
    "/ticket/:path*",
    "/dashboard/:path*",
    "/orders/:path*",
    "/master/:path*",
    "/gallery/:path*",
    "/packages/:path*",
    "/pembaruan/:path*",
    "/seo/:path*",
  ],
};
