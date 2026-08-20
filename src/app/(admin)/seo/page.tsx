import type { Metadata } from "next";

import { SeoClient } from "@/components/admin/seo-client";

export const metadata: Metadata = {
  title: "Kelola SEO - Admin Offroad Garut",
  robots: { index: false },
};

export default function SeoPage() {
  return <SeoClient />;
}
