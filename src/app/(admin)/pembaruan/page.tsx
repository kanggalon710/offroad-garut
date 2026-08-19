import { headers } from "next/headers";
import type { Metadata } from "next";

import { PembaruanClient } from "@/components/admin/pembaruan-client";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminPage } from "@/components/admin/admin-page";
import { auth } from "@/lib/auth";
import { isSuperAdmin, toRole } from "@/lib/roles";
import { ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Pembaruan aplikasi",
  robots: { index: false },
};

/**
 * Layout pengelola meloloskan semua staf, jadi peran diperiksa lagi di sini.
 * Prosedur tRPC-nya juga menolak sendiri; ini supaya pengelola biasa melihat
 * penjelasan, bukan halaman yang gagal memuat data.
 */
export default async function PembaruanPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = toRole((session?.user as { role?: unknown } | undefined)?.role);

  if (!isSuperAdmin(role)) {
    return (
      <AdminPage title="Pembaruan aplikasi" width="default">
        <EmptyState
          icon={ShieldAlert}
          title="Halaman ini khusus super admin"
          description="Pembaruan aplikasi menjalankan kode baru di server, jadi aksesnya dipisah dari pengelola biasa. Hubungi pemegang akun super admin bila ada versi baru yang perlu dipasang."
        />
      </AdminPage>
    );
  }

  return <PembaruanClient />;
}
