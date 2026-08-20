import type { Metadata } from "next";

import { LaporanClient } from "@/components/admin/laporan-client";

export const metadata: Metadata = {
  title: "Laporan operasional - Admin Offroad Garut",
  robots: { index: false },
};

export default function LaporanPage() {
  return <LaporanClient />;
}
