import type { Metadata } from "next";

import { OrdersClient } from "@/components/admin/orders-client";

export const metadata: Metadata = {
  title: "Semua pesanan",
  robots: { index: false },
};

export default function OrdersPage() {
  return <OrdersClient />;
}
