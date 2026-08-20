import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";

import { TRPCProvider } from "@/trpc/client";
import { env } from "@/env";
import { canonical, urlPenuh } from "@/lib/seo";

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
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
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
  alternates: canonical("/"),
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
    siteName: "Offroad Garut",
    url: urlPenuh("/"),
    title: "Offroad Garut - Sewa Jeep & Paket Wisata Cikuray",
    description:
      "Pilih paket, bayar online, tiket QR langsung masuk WhatsApp. Minimal 3 orang.",
    images: [
      {
        url: "/images/hero-offroad-garut.jpg",
        // Dimensi eksplisit supaya WhatsApp dan Facebook tidak perlu
        // mengunduh gambarnya dulu sebelum bisa menampilkan pratinjau.
        width: 1200,
        height: 630,
        alt: "Jeep offroad menyusuri jalur tanah di kaki Gunung Cikuray, Garut",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Offroad Garut - Sewa Jeep & Paket Wisata Cikuray",
    description:
      "Pilih paket, bayar online, tiket QR langsung masuk WhatsApp. Minimal 3 orang.",
    images: ["/images/hero-offroad-garut.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
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
