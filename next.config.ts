import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
    // cPanel RLIMIT_AS ketat: 1 CPU worker saja agar SWC tidak spawn banyak proses
    cpus: 1,
  },
  // Production build di cPanel tidak memasang devDependencies (eslint, typescript, @types/*)
  // Typecheck & lint sudah lulus di CI/lokal. Abaikan saat build production.
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Kurangi memori SWC di shared hosting: disable SWC minify, batasi worker
  swcMinify: false,
  // Turbopack tidak dipakai (--no-turbopack tidak valid di Next 15), tapi pastikan webpack worker terbatas
  // Environment variable di deploy script sudah handle NODE_OPTIONS heap size
};

export default nextConfig;
