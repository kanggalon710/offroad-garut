// @vitest-environment jsdom

/**
 * Uji komponen form booking di DOM sungguhan (jsdom).
 * Menutup acceptance criteria yang berupa perilaku antarmuka:
 * AC-BOOKING-1 (pesan error dan tombol bayar terkunci),
 * AC-BOOKING-2 (total dihitung ulang seketika),
 * serta memastikan DatePicker benar-benar terbuka saat diklik.
 */
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// useRouter hanya tersedia di dalam App Router. Di runner test ia
// digantikan stub, karena yang diuji di sini adalah perilaku form.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import {
  BookingForm,
  type BookingPackageOption,
  type MeetingPointOption,
} from "@/components/domain/booking-form";
import { TRPCProvider } from "@/trpc/client";

const paket: BookingPackageOption[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    slug: "trek-kebun-teh-cikajang",
    name: "Trek Kebun Teh Cikajang",
    pricePerPaxIdr: 150_000,
    minPax: 3,
    maxPax: 24,
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    slug: "sunrise-punggungan-cikuray",
    name: "Sunrise Punggungan Cikuray",
    pricePerPaxIdr: 250_000,
    minPax: 3,
    maxPax: 16,
  },
];

const titikKumpul: MeetingPointOption[] = [
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Basecamp Cikuray Adventure",
    address: "Jl. Raya Cikajang No. 88, Garut",
  },
];

beforeAll(() => {
  // Radix Popper memakai ResizeObserver yang belum ada di jsdom.
  if (!("ResizeObserver" in globalThis)) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
    Element.prototype.setPointerCapture = () => {};
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});

afterEach(cleanup);

function tampilkan() {
  return render(
    <TRPCProvider>
      <BookingForm
        packages={paket}
        meetingPoints={titikKumpul}
        initialSlug="trek-kebun-teh-cikajang"
        defaultName="Budi Santoso"
        defaultPhone="0812 3456 7890"
      />
    </TRPCProvider>,
  );
}

/** Ringkasan biaya menandai nilai totalnya dengan aria-live. */
function totalBayar(): string {
  const el = document.querySelector('[aria-live="polite"]');
  return el?.textContent?.replace(/ /g, " ").trim() ?? "";
}

async function isiPax(nilai: string) {
  const user = userEvent.setup();
  const input = screen.getByLabelText(/jumlah orang/i);
  await user.clear(input);
  await user.type(input, nilai);
}

describe("form booking", () => {
  it("menghitung total awal dari paket yang dipilih", () => {
    tampilkan();
    // 3 orang minimum x Rp150.000
    expect(totalBayar()).toBe("Rp 450.000");
  });

  it("AC-BOOKING-1: pax 2 memunculkan error dan mengunci tombol bayar", async () => {
    tampilkan();
    await isiPax("2");

    expect(
      screen.getAllByText(/minimal pesanan adalah 3 pax/i).length,
    ).toBeGreaterThan(0);

    const tombol = screen.getByRole("button", {
      name: /lanjut ke pembayaran/i,
    });
    expect(tombol).toBeDisabled();

    // Total tidak boleh menampilkan angka yang menyesatkan
    expect(totalBayar()).toBe("-");
  });

  it("AC-BOOKING-2: pax 5 pada paket Rp150.000 menampilkan Rp750.000", async () => {
    tampilkan();
    await isiPax("5");
    expect(totalBayar()).toBe("Rp 750.000");
  });

  it("total ikut berubah saat paket diganti", async () => {
    const user = userEvent.setup();
    tampilkan();

    await user.selectOptions(
      screen.getByLabelText(/^paket/i),
      "22222222-2222-2222-2222-222222222222",
    );

    // 3 orang x Rp250.000
    expect(totalBayar()).toBe("Rp 750.000");
  });

  it("tombol bayar tetap terkunci sampai tanggal dipilih", () => {
    tampilkan();
    expect(
      screen.getByRole("button", { name: /lanjut ke pembayaran/i }),
    ).toBeDisabled();
  });

  it("DatePicker terbuka saat tombol tanggal diklik", async () => {
    const user = userEvent.setup();
    tampilkan();

    const pemicu = screen.getByRole("button", { name: /tanggal berangkat/i });
    expect(pemicu).toHaveAttribute("aria-expanded", "false");

    await user.click(pemicu);

    expect(pemicu).toHaveAttribute("aria-expanded", "true");

    const dialog = await screen.findByRole("dialog");
    const grid = within(dialog).getByRole("grid");
    expect(grid).toBeTruthy();

    // Kalender berbahasa Indonesia
    expect(within(dialog).getAllByText(/sen|sel|rab|kam|jum|sab|min/i).length)
      .toBeGreaterThan(0);
  });

  it("memilih tanggal menutup kalender dan membuka tombol bayar", async () => {
    const user = userEvent.setup();
    tampilkan();

    await user.click(screen.getByRole("button", { name: /tanggal berangkat/i }));
    const dialog = await screen.findByRole("dialog");

    // Ambil tanggal yang masih bisa dipilih (hari lampau dinonaktifkan)
    const hari = within(dialog)
      .getAllByRole("gridcell")
      .map((sel) => sel.querySelector("button"))
      .filter((b): b is HTMLButtonElement => b !== null && !b.disabled);

    const target = hari[hari.length - 1];
    expect(target).toBeTruthy();
    await user.click(target as HTMLButtonElement);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.getByRole("button", { name: /lanjut ke pembayaran/i }),
    ).toBeEnabled();
  });

  it("nomor WhatsApp yang tidak valid mengunci tombol bayar", async () => {
    const user = userEvent.setup();
    tampilkan();

    await user.click(screen.getByRole("button", { name: /tanggal berangkat/i }));
    const dialog = await screen.findByRole("dialog");
    const hari = within(dialog)
      .getAllByRole("gridcell")
      .map((sel) => sel.querySelector("button"))
      .filter((b): b is HTMLButtonElement => b !== null && !b.disabled);
    await user.click(hari[hari.length - 1] as HTMLButtonElement);

    const telepon = screen.getByLabelText(/nomor whatsapp/i);
    await user.clear(telepon);
    await user.type(telepon, "12345");

    expect(
      screen.getByRole("button", { name: /lanjut ke pembayaran/i }),
    ).toBeDisabled();
  });
});
