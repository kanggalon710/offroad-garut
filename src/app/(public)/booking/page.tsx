import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Script from "next/script";

import { env } from "@/env";
import { BookingForm } from "@/components/domain/booking-form";
import { Container } from "@/components/shared/container";
import { Alert } from "@/components/ui/alert";
import { auth } from "@/lib/auth";
import { catatKegagalanDatabase } from "@/lib/db/errors";
import { getServerApi } from "@/server/caller";

export const metadata: Metadata = {
  title: "Pesan paket offroad",
  robots: { index: false },
};

type PageProps = {
  searchParams: Promise<{ paket?: string }>;
};

export default async function BookingPage({ searchParams }: PageProps) {
  const { paket } = await searchParams;

  // AC-OTENTIKASI-1. Middleware sudah menyaring lebih dulu di edge,
  // pemeriksaan ini menutup celah kalau cookie ada tapi sesinya sudah mati.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    const target = paket ? `/booking?paket=${paket}` : "/booking";
    redirect(`/masuk?redirect=${encodeURIComponent(target)}`);
  }

  let packages: Awaited<ReturnType<typeof loadOptions>>["packages"] = [];
  let meetingPoints: Awaited<ReturnType<typeof loadOptions>>["meetingPoints"] =
    [];
  let loadFailed = false;

  let petunjukPengembang: string | null = null;

  try {
    const options = await loadOptions();
    packages = options.packages;
    meetingPoints = options.meetingPoints;
  } catch (error) {
    const diagnosis = catatKegagalanDatabase("booking", error);
    loadFailed = true;
    petunjukPengembang =
      env.NODE_ENV === "development" ? diagnosis.message : null;
  }

  let userPhone = "";
  try {
    const api = await getServerApi();
    const profile = await api.user.getProfile();
    if (profile.phone) userPhone = profile.phone;
  } catch {
    // Fallback bila profile gagal dimuat
    if (typeof (session.user as { phone?: unknown }).phone === "string") {
      userPhone = (session.user as unknown as { phone: string }).phone;
    }
  }

  return (
    <>
      <Script
        src={env.NEXT_PUBLIC_MIDTRANS_URL}
        data-client-key={env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="lazyOnload"
      />

      <Container className="py-10">
        <h1 className="text-section sm:text-[2rem]">Pesan paket offroad</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Isi tanggal, jumlah orang, dan data kontak. Total biaya dihitung
          langsung di sebelah kanan sebelum kamu membayar.
        </p>

        <div className="mt-8">
          {loadFailed ? (
            <Alert tone="danger" title="Data paket gagal dimuat">
              Coba muat ulang halaman ini. Kalau masih gagal, hubungi kami lewat
              WhatsApp dan sebutkan paket yang kamu inginkan.
              {petunjukPengembang ? (
                <span className="mt-2 block text-legal">
                  Catatan pengembang: {petunjukPengembang}
                </span>
              ) : null}
            </Alert>
          ) : (
            <BookingForm
              packages={packages}
              meetingPoints={meetingPoints}
              initialSlug={paket}
              defaultName={session.user.name ?? ""}
              defaultPhone={userPhone}
            />
          )}
        </div>
      </Container>
    </>
  );
}

async function loadOptions() {
  const api = await getServerApi();
  const [rawPackages, rawMeetingPoints] = await Promise.all([
    api.booking.getPackages({ limit: 20 }),
    api.booking.getMeetingPoints(),
  ]);

  return {
    packages: rawPackages.map((pkg) => ({
      id: pkg.id,
      slug: pkg.slug,
      name: pkg.name,
      pricePerPaxIdr: pkg.pricePerPaxIdr,
      minPax: pkg.minPax,
      maxPax: pkg.maxPax,
    })),
    meetingPoints: rawMeetingPoints.map((point) => ({
      id: point.id,
      name: point.name,
      address: point.address,
    })),
  };
}
