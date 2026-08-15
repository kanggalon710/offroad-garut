import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getServerApi } from "@/server/caller";
import { PengaturanClient } from "./client";

export default async function PengaturanPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/masuk?redirect=/pengaturan");

  const api = await getServerApi();
  const profile = await api.user.getProfile();

  return (
    <PengaturanClient
      name={session.user.name}
      email={session.user.email}
      phone={profile.phone}
      alternativePhone={profile.alternativePhone}
    />
  );
}
