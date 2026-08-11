import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";

import { TRPCProvider } from "@/trpc/client";

import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
  weight: ["600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Offroad Garut - Sewa Jeep & Paket Wisata Cikuray",
    template: "%s | Offroad Garut",
  },
  description:
    "Pesan paket offroad Jeep di Garut lewat website. Pilih paket, bayar online, tiket QR langsung masuk WhatsApp. Minimal 3 orang.",
  keywords: [
    "offroad garut",
    "sewa jeep garut",
    "wisata cikuray",
    "paket offroad",
  ],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    title: "Offroad Garut - Sewa Jeep & Paket Wisata Cikuray",
    description:
      "Pilih paket, bayar online, tiket QR langsung masuk WhatsApp. Minimal 3 orang.",
    images: ["/images/hero-offroad-garut.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // maximumScale sengaja tidak dikunci supaya pengguna tetap bisa zoom
  themeColor: "#166534",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${plusJakarta.variable} ${inter.variable}`}>
      <body>
        <a
          href="#konten"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-control)] focus:bg-primary focus:px-4 focus:py-3 focus:text-on-primary"
        >
          Lompat ke konten utama
        </a>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
