# Kalender Ketersediaan Real-time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memperlihatkan kepada pelanggan pada form pemesanan (`/booking`) apakah tanggal tertentu masih punya kuota kosong atau sudah penuh, sehingga mengurangi transaksi yang gagal di sisi Midtrans.

**Architecture:** 
1. Menambahkan route tRPC baru `booking.getAvailability` yang menerima sebuah `packageId` dan mengembalikan peta ketersediaan per tanggal untuk 14 hari ke depan.
2. Logika sisi server menjumlahkan total kapasitas armada jeep yang aktif (berdasarkan tabel `jeeps` dengan status `active`) dan membandingkannya dengan total `pax_count` dari pesanan pada tanggal tersebut dengan status aktif (`pending`, `awaiting_payment`, `paid`, `confirmed`, `completed`).
3. Sisi klien menggunakan data tersebut untuk merender ikon "X" atau "P" (Penuh) pada tanggal yang tidak tersedia di komponen kalender (`Calendar`), menggunakan prop `modifiers` dan `modifiersClassNames` dari `react-day-picker`.

**Tech Stack:** 
- Next.js 15 (App Router)
- tRPC v11
- Drizzle ORM + PostgreSQL
- `react-day-picker` (terintegrasi di `src/components/ui/calendar.tsx`)

## Global Constraints

- **Bahasa & Komentar**: Seluruh kode, komentar, dan UI copy menggunakan bahasa Indonesia natural. Pesan error harus jelas.
- **Type Safety**: Dilarang menggunakan `any`, `@ts-ignore`, `@ts-expect-error`. 
- **Tipe DB**: Tabel `jeeps` (kolom `capacity`, `status`). Tabel `bookings` (kolom `bookingDate`, `timeSlot`, `paxCount`, `status`, `packageId`).
- **Design Tokens**: Boleh menggunakan `text-destructive`, `bg-destructive`, dan radius standar. Ikon berasal dari `lucide-react`.
- **Responsif**: Target sentuh minimal 44px. Wajib berfungsi di mobile dan desktop.

---

## File Structure

- **Modify**: `src/server/routers/booking.ts` 
  - Tambahkan procedure `getAvailability` di `bookingRouter`.
- **Modify**: `src/components/domain/booking-form.tsx`
  - Tambahkan state `availability`, gunakan `api.booking.getAvailability.useQuery`.
  - Berikan prop `modifiers` & `modifiersClassNames` ke komponen `Calendar`.
- **Modify (possibly)**: `src/components/ui/calendar.tsx`
  - Pastikan komponen `Calendar` meneruskan prop `modifiers` dan `modifiersClassNames` ke underlying `DayPicker`.

---

### Task 1: Tambah procedure `getAvailability` di tRPC

**Files:**
- Modify: `src/server/routers/booking.ts:34-49`

**Interfaces:**
- Consumes: `jeeps`, `bookings`, `packages`, `ctx.db`.
- Produces: Sebuah procedure dengan input `{ packageId: string.uuid(), daysAhead: z.number().int().min(1).max(60).default(14) }` yang mengembalikan `Record<string, boolean>` (key = `YYYY-MM-DD`, value = `true` jika TERSEDIA, `false` jika PENUH).

- [ ] **Step 1: Tambahkan `getAvailability` di `bookingRouter`**

Buka `src/server/routers/booking.ts` dan tambahkan procedure ini sebelum `getPackageById` atau tepat setelahnya:

```typescript
  /**
   * Mengecek ketersediaan paket dalam rentang hari ke depan.
   * Mengembalikan peta { "YYYY-MM-DD": isAvailable }.
   * isAvailable = false artinya seluruh slot jeep pada tanggal itu sudah penuh.
   */
  getAvailability: publicProcedure
    .input(
      z.object({
        packageId: z.string().uuid(),
        daysAhead: z.number().int().min(1).max(60).default(14),
      }),
    )
    .query(async ({ ctx, input }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const rangeEnd = new Date(today);
      rangeEnd.setDate(rangeEnd.getDate() + input.daysAhead);

      // 1. Pastikan paket ada
      const [pkg] = await ctx.db
        .select()
        .from(packages)
        .where(and(eq(packages.id, input.packageId), isNull(packages.deletedAt)))
        .limit(1);

      if (!pkg) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Paket tidak ditemukan" });
      }

      // 2. Hitung total kapasitas harian (semua jeep aktif)
      const jeepCapacityResult = await ctx.db
        .select({
          total: sql<number>`COALESCE(SUM(${jeeps.capacity}), 0)`,
        })
        .from(jeeps)
        .where(and(eq(jeeps.status, "active"), isNull(jeeps.deletedAt)));

      const dailyCapacity = Number(jeepCapacityResult[0]?.total ?? 0);

      // Tidak ada jeep sama sekali = semua tanggal tidak tersedia
      if (dailyCapacity === 0) {
        const result: Record<string, boolean> = {};
        for (let i = 0; i < input.daysAhead; i += 1) {
          const d = new Date(today);
          d.setDate(d.getDate() + i);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          result[key] = false;
        }
        return result;
      }

      // 3. Ambil semua pesanan aktif dalam rentang tanggal
      const occupiedResult = await ctx.db
        .select({
          date: bookings.bookingDate,
          totalPax: sql<number>`COALESCE(SUM(${bookings.paxCount}), 0)`,
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.packageId, input.packageId),
            gte(bookings.bookingDate, sql`CURRENT_DATE`),
            lte(bookings.bookingDate, sql`CURRENT_DATE + INTERVAL '${sql.raw(String(input.daysAhead))} days'`),
            inArray(bookings.status, [
              "pending",
              "awaiting_payment",
              "paid",
              "confirmed",
              "completed",
            ]),
            isNull(bookings.deletedAt),
          ),
        )
        .groupBy(bookings.bookingDate);

      const occupiedMap = new Map<string, number>();
      for (const row of occupiedResult) {
        const dateKey = row.date instanceof Date
          ? row.date.toISOString().slice(0, 10)
          : String(row.date);
        occupiedMap.set(dateKey, Number(row.totalPax));
      }

      // 4. Bangun hasil untuk 14 hari ke depan
      const result: Record<string, boolean> = {};
      for (let i = 0; i < input.daysAhead; i += 1) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const occupied = occupiedMap.get(key) ?? 0;
        // Toleransi 1 kursi agar tidak terlalu ketat (1 kursi kosong = tetap tersedia)
        result[key] = occupied < dailyCapacity;
      }

      return result;
    }),
```

- [ ] **Step 2: Tambahkan impor yang kurang**

Pastikan di bagian atas file, Anda sudah mengimpor `jeeps`:
```typescript
import {
  bookings,
  jeeps,
  meetingPoints,
  packageGalleries,
  packages,
  payments,
  users,
} from "@/lib/db/schema";
```
Dan dari `drizzle-orm`:
```typescript
import { and, asc, desc, eq, gte, inArray, isNull, lte, notExists, sql } from "drizzle-orm";
```

- [ ] **Step 3: Verifikasi tipe**

Jalankan `pnpm typecheck`. Expected: tidak ada error.

- [ ] **Step 4: Commit**

```bash
git add src/server/routers/booking.ts
git commit -m "feat(booking): tambah procedure getAvailability untuk kalender real-time"
```

---

### Task 2: Buat helper tanggal lokal di booking-form

**Files:**
- Modify: `src/components/domain/booking-form.tsx`

**Interfaces:**
- Consumes: `api.booking.getAvailability` (return `Record<string, boolean>`).
- Produces: `modifiers` dan `modifiersClassNames` untuk diteruskan ke `Calendar`.

- [ ] **Step 1: Tambahkan state dan query**

Pada bagian atas komponen `BookingForm`, setelah `const router = useRouter();`, tambahkan:

```typescript
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const availabilityQuery = api.booking.getAvailability.useQuery(
    { packageId: initialPackage?.id ?? "", daysAhead: 30 },
    { enabled: !!initialPackage },
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
    full: "rdp-day-full opacity-40 line-through cursor-not-allowed",
  };
```

- [ ] **Step 2: Oper modifiers ke Calendar**

Temukan blok JSX untuk Calendar (sekitar baris tempat `<Calendar mode="single" ... />`). Tambahkan prop `modifiers={modifiers}` dan `modifiersClassNames={modifiersClassNames}`:

```tsx
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
```

- [ ] **Step 3: Tambahkan CSS kustom untuk `rdp-day-full`**

Cek apakah ada file `globals.css` atau `tailwind.config`. Jika menggunakan Tailwind v4, tambahkan di `globals.css`:

```css
@layer components {
  .rdp-day-full {
    text-decoration: line-through;
    color: var(--destructive);
    cursor: not-allowed;
  }
}
```

- [ ] **Step 4: Validasi tipe**

Jalankan `pnpm typecheck` dan `pnpm lint`.

- [ ] **Step 5: Commit**

```bash
git add src/components/domain/booking-form.tsx
git commit -m "feat(booking): tampilkan tanggal penuh di date picker"
```

---

### Task 3: Verifikasi end-to-end

- [ ] **Step 1: Buat pesanan dummy untuk hari ini**

Jalankan script pada database untuk membuat booking dengan `packageId` paket dummy testing dan `paxCount` yang memenuhi total kapasitas (misal 20 orang).

- [ ] **Step 2: Cek UI di browser**

Jalankan `pnpm dev`, buka `/booking`, pilih paket dummy, lihat date picker. Tanggal yang penuh harus menampilkan garis merah dan tidak dapat dipilih.

- [ ] **Step 3: Build production**

```bash
pnpm build
```
Expected: tidak ada error.

- [ ] **Step 4: Commit dan Push**

```bash
git push origin main
```