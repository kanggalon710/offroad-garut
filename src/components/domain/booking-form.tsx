"use client";

import { CalendarDays, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  MIN_PAX_MESSAGE,
  PaxCalculator,
  PriceSummaryCard,
} from "@/components/domain/booking-calculator";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TIME_SLOTS } from "@/lib/constants";
import { cn, formatTanggal, normalizePhone } from "@/lib/utils";
import { api } from "@/trpc/client";

export type BookingPackageOption = {
  id: string;
  slug: string;
  name: string;
  pricePerPaxIdr: number;
  minPax: number;
  maxPax: number;
};

export type MeetingPointOption = {
  id: string;
  name: string;
  address: string | null;
};

type Props = {
  packages: BookingPackageOption[];
  meetingPoints: MeetingPointOption[];
  initialSlug?: string;
  defaultName: string;
  defaultPhone: string;
};

/** Tanggal lokal sebagai YYYY-MM-DD. toISOString() akan menggeser hari. */
function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function BookingForm({
  packages,
  meetingPoints,
  initialSlug,
  defaultName,
  defaultPhone,
}: Props) {
  const router = useRouter();

  const initialPackage =
    packages.find((pkg) => pkg.slug === initialSlug) ?? packages[0];

  const [packageId, setPackageId] = useState(initialPackage?.id ?? "");
  const [meetingPointId, setMeetingPointId] = useState(
    meetingPoints[0]?.id ?? "",
  );
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [dateOpen, setDateOpen] = useState(false);
  const [timeSlot, setTimeSlot] = useState<string>(TIME_SLOTS[0].value);
  const [paxCount, setPaxCount] = useState(initialPackage?.minPax ?? 3);
  const [contactName, setContactName] = useState(defaultName);
  const [contactPhone, setContactPhone] = useState(defaultPhone);
  const [specialRequests, setSpecialRequests] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const selected = useMemo(
    () => packages.find((pkg) => pkg.id === packageId) ?? initialPackage,
    [packageId, packages, initialPackage],
  );

  const paxValid =
    !!selected && paxCount >= selected.minPax && paxCount <= selected.maxPax;
  const phoneValid = normalizePhone(contactPhone) !== null;
  const nameValid = contactName.trim().length >= 2;
  const dateValid = date !== undefined;

  const availabilityQuery = api.booking.getAvailability.useQuery(
    { packageId: selected?.id ?? "", daysAhead: 30 },
    { enabled: !!selected },
  );

  // Modifier react-day-picker: tandai tanggal yang PENUH
  const modifiers = useMemo(() => {
    const map = availabilityQuery.data ?? {};
    const fullDates: Date[] = [];
    for (const [dateStr, isAvailable] of Object.entries(map)) {
      if (!isAvailable) {
        const [y, m, d] = dateStr.split("-").map(Number);
        if (y && m && d) fullDates.push(new Date(y, m - 1, d));
      }
    }
    return { full: fullDates };
  }, [availabilityQuery.data]);

  const modifiersClassNames = {
    full: "rdp-day-full",
  };

  const formValid =
    !!selected && paxValid && phoneValid && nameValid && dateValid && !!meetingPointId;

  const createBooking = api.booking.createBooking.useMutation({
    onSuccess(result) {
      const ticketPath = `/ticket/${result.bookingCode}`;

      // AC-BOOKING-3: pengguna dibawa ke tampilan Snap. Kalau skrip Snap
      // gagal dimuat (pemblokir iklan, jaringan buruk), dialihkan ke
      // halaman pembayaran Midtrans supaya transaksi tetap bisa selesai.
      if (typeof window !== "undefined" && window.snap) {
        window.snap.pay(result.snapToken, {
          onSuccess: () => router.push(ticketPath),
          onPending: () => router.push(ticketPath),
          onError: () => router.push(ticketPath),
          onClose: () => router.push(ticketPath),
        });
        return;
      }

      window.location.href = result.snapRedirectUrl;
    },
    onError(error) {
      setSubmitError(error.message);
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    setSubmitError(null);

    if (!formValid || !selected || !date) return;

    createBooking.mutate({
      packageId: selected.id,
      meetingPointId,
      bookingDate: toDateString(date),
      timeSlot,
      paxCount,
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      specialRequests: specialRequests.trim() || undefined,
    });
  }

  if (!selected) {
    return (
      <Alert tone="warning" title="Paket belum tersedia">
        Saat ini belum ada paket yang bisa dipesan. Hubungi kami lewat WhatsApp
        untuk menanyakan jadwal terdekat.
      </Alert>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <Card className="space-y-5 p-5">
          <h2 className="text-title font-bold">Detail perjalanan</h2>

          <Field id="paket" label="Paket" required>
            <select
              id="paket"
              value={packageId}
              onChange={(event) => {
                setPackageId(event.target.value);
                const next = packages.find(
                  (pkg) => pkg.id === event.target.value,
                );
                if (next && paxCount < next.minPax) setPaxCount(next.minPax);
              }}
              className="h-12 w-full rounded-[var(--radius-control)] border border-border bg-surface px-4 text-base"
            >
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="tanggal"
            label="Tanggal berangkat"
            required
            error={touched && !dateValid ? "Pilih tanggal dulu" : undefined}
          >
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <button
                  id="tanggal"
                  type="button"
                  /* aria-invalid tidak berlaku untuk role button, jadi
                     status error disampaikan lewat pesan yang ditautkan */
                  aria-describedby={
                    touched && !dateValid ? "tanggal-error" : undefined
                  }
                  className={cn(
                    "flex h-12 w-full items-center gap-3 rounded-[var(--radius-control)] border border-border bg-surface px-4 text-left text-base",
                    touched && !dateValid && "border-destructive",
                    !date && "text-muted-foreground",
                  )}
                >
                  <CalendarDays
                    className="size-5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  {date ? formatTanggal(date) : "Pilih tanggal"}
                </button>
              </PopoverTrigger>
              <PopoverContent>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(value) => {
                    setDate(value);
                    setDateOpen(false);
                  }}
                  disabled={{ before: today }}
                  modifiers={modifiers}
                  modifiersClassNames={modifiersClassNames}
                  startMonth={today}
                />
              </PopoverContent>
            </Popover>
          </Field>

          <fieldset>
            <legend className="mb-2 text-meta font-semibold">
              Jam keberangkatan
              <span className="ml-1 text-destructive" aria-hidden="true">
                *
              </span>
            </legend>
            <div className="grid grid-cols-2 gap-3">
              {TIME_SLOTS.map((slot) => (
                <label
                  key={slot.value}
                  className={cn(
                    "flex min-h-14 cursor-pointer flex-col justify-center rounded-[var(--radius-control)] border px-4 py-2 transition-colors duration-150",
                    timeSlot === slot.value
                      ? "border-primary bg-primary/5"
                      : "border-border bg-surface hover:bg-muted",
                  )}
                >
                  <input
                    type="radio"
                    name="timeSlot"
                    value={slot.value}
                    checked={timeSlot === slot.value}
                    onChange={() => setTimeSlot(slot.value)}
                    className="sr-only"
                  />
                  <span className="font-semibold">{slot.label}</span>
                  <span className="text-meta text-muted-foreground">
                    {slot.period}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <PaxCalculator
            value={paxCount}
            onChange={setPaxCount}
            minPax={selected.minPax}
            maxPax={selected.maxPax}
          />

          <Field id="titik-kumpul" label="Titik kumpul" required>
            <select
              id="titik-kumpul"
              value={meetingPointId}
              onChange={(event) => setMeetingPointId(event.target.value)}
              className="h-12 w-full rounded-[var(--radius-control)] border border-border bg-surface px-4 text-base"
            >
              {meetingPoints.map((point) => (
                <option key={point.id} value={point.id}>
                  {point.name}
                </option>
              ))}
            </select>
          </Field>
        </Card>

        <Card className="space-y-5 p-5">
          <h2 className="text-title font-bold">Data pemesan</h2>

          <Field
            id="nama"
            label="Nama lengkap"
            required
            error={
              touched && !nameValid ? "Nama minimal 2 huruf" : undefined
            }
          >
            <Input
              id="nama"
              name="nama"
              autoComplete="name"
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              aria-invalid={touched && !nameValid}
              placeholder="Contoh: Budi Santoso"
            />
          </Field>

          <Field
            id="telepon"
            label="Nomor WhatsApp"
            required
            hint="Tiket QR dan konfirmasi dikirim ke nomor ini."
            error={
              touched && !phoneValid
                ? "Nomor belum benar. Contoh: 0812 3456 7890"
                : undefined
            }
          >
            <Input
              id="telepon"
              name="telepon"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={contactPhone}
              onChange={(event) => setContactPhone(event.target.value)}
              aria-invalid={touched && !phoneValid}
              placeholder="0812 3456 7890"
            />
          </Field>

          <Field
            id="catatan"
            label="Catatan untuk driver"
            hint="Opsional. Misalnya ada anak kecil, lansia, atau permintaan jemput."
          >
            <Textarea
              id="catatan"
              name="catatan"
              value={specialRequests}
              onChange={(event) => setSpecialRequests(event.target.value)}
              maxLength={500}
              placeholder="Bawa anak usia 6 tahun, tolong siapkan kursi depan."
            />
          </Field>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <div className="space-y-4 lg:sticky lg:top-24">
          <PriceSummaryCard
            packageName={selected.name}
            pricePerPax={selected.pricePerPaxIdr}
            paxCount={paxCount}
            valid={paxValid}
          />

          {submitError ? (
            <Alert tone="danger" title="Pesanan belum bisa diproses">
              {submitError}
            </Alert>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!formValid || createBooking.isPending}
          >
            {createBooking.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Menyiapkan pembayaran...
              </>
            ) : (
              "Lanjut ke pembayaran"
            )}
          </Button>

          {!paxValid ? (
            <p className="text-center text-meta text-muted-foreground">
              {MIN_PAX_MESSAGE} sebelum bisa lanjut membayar.
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
