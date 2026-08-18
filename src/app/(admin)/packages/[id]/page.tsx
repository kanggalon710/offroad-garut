import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TRPCError } from "@trpc/server";

import { PackageEditorClient } from "@/components/admin/package-editor-client";
import { getServerApi } from "@/server/caller";

export const metadata: Metadata = {
  title: "Edit Paket - Admin Offroad Garut",
  robots: { index: false },
};

export default async function EditPackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Verify package exists (will throw TRPCError if not)
  const api = await getServerApi();
  try {
    await api.admin.getPackageDetailAdmin({ id });
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      notFound();
    }
    // Re-throw other errors
    throw error;
  }

  return <PackageEditorClient packageId={id} />;
}