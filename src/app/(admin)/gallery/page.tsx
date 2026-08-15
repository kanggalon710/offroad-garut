import type { Metadata } from "next";

import { GalleryManagerClient } from "@/components/admin/gallery-manager-client";

export const metadata: Metadata = {
  title: "Kelola Galeri & Album - Admin Offroad Garut",
  robots: { index: false },
};

export default function GalleryManagerPage() {
  return <GalleryManagerClient />;
}
