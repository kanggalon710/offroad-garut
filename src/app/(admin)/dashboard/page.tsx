import type { Metadata } from "next";

import { DashboardClient } from "@/components/admin/dashboard-client";

export const metadata: Metadata = {
  title: "Dashboard pengelola",
  robots: { index: false },
};

export default function DashboardPage() {
  return <DashboardClient />;
}
