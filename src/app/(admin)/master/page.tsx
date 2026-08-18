import type { Metadata } from "next";

import { MasterDataClient } from "@/components/admin/master-data";

export const metadata: Metadata = {
  title: "Kelola Master Data - Admin Offroad Garut",
  robots: { index: false },
};

export default function MasterDataPage() {
  return <MasterDataClient />;
}
