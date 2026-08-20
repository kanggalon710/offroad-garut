import { describe, expect, it } from "vitest";

import {
  HARI_PERINGATAN_SERVIS,
  hitungUtilisasi,
  indeksHari,
  NAMA_HARI,
  perluDiperingatkan,
  persen,
  persenLekat,
  rataRata,
  selisihHari,
  slotTersedia,
} from "@/lib/laporan";

describe("persentase", () => {
  it("membulatkan ke bilangan bulat", () => {
    expect(persen(1, 3)).toBe(33);
    expect(persen(2, 3)).toBe(67);
  });

  it("pembagi nol menghasilkan nol, bukan NaN", () => {
    // Tanpa penjaga ini, armada kosong menampilkan "NaN%" di layar pengelola.
    expect(persen(0, 0)).toBe(0);
    expect(persen(5, 0)).toBe(0);
    expect(Number.isNaN(persen(5, 0))).toBe(false);
  });
});

describe("utilisasi armada", () => {
  it("menghitung slot dari jumlah hari dikali jam keberangkatan", () => {
    // Basecamp melayani dua jam keberangkatan.
    expect(slotTersedia(30)).toBe(60);
    expect(slotTersedia(7)).toBe(14);
  });

  it("unit yang tidak pernah dipakai tetap menghasilkan angka, bukan kosong", () => {
    // Justru unit inilah yang perlu ketahuan, jadi ia tidak boleh hilang
    // dari laporan hanya karena tidak punya baris perjalanan.
    const hasil = hitungUtilisasi(
      { jeepId: "a", perjalanan: 0, penumpang: 0 },
      30,
    );
    expect(hasil.utilisasiPersen).toBe(0);
    expect(hasil.slotTersedia).toBe(60);
  });

  it("menghitung persentase pemakaian slot dengan benar", () => {
    const hasil = hitungUtilisasi(
      { jeepId: "a", perjalanan: 30, penumpang: 110 },
      30,
    );
    expect(hasil.utilisasiPersen).toBe(50);
  });

  it("rentang nol hari tidak membuat pembagian nol", () => {
    expect(hitungUtilisasi({ jeepId: "a", perjalanan: 0, penumpang: 0 }, 0)
      .utilisasiPersen).toBe(0);
  });
});

describe("persentase lekat add-on", () => {
  it("dihitung terhadap seluruh pesanan, bukan hanya yang memakai add-on", () => {
    // Kalau pembaginya hanya pesanan ber-add-on, hasilnya selalu mendekati
    // 100 persen dan tidak memberi tahu apa pun.
    expect(persenLekat(3, 12)).toBe(25);
  });

  it("nol pesanan menghasilkan nol", () => {
    expect(persenLekat(0, 0)).toBe(0);
  });
});

describe("rata-rata", () => {
  it("daftar kosong menghasilkan nol", () => {
    expect(rataRata([])).toBe(0);
  });

  it("menghitung rata-rata biasa", () => {
    expect(rataRata([2, 4, 6])).toBe(4);
  });
});

describe("selisih hari", () => {
  it("menghitung jarak antar tanggal", () => {
    expect(selisihHari("2026-08-20", "2026-08-27")).toBe(7);
    expect(selisihHari("2026-08-27", "2026-08-20")).toBe(-7);
  });

  it("melewati pergantian bulan dengan benar", () => {
    expect(selisihHari("2026-08-30", "2026-09-02")).toBe(3);
  });

  it("tanggal tidak valid menghasilkan nol, bukan NaN", () => {
    expect(selisihHari("bukan-tanggal", "2026-08-20")).toBe(0);
  });
});

describe("pengingat servis", () => {
  it("tanpa jadwal tidak pernah memperingatkan", () => {
    // Mengingatkan sesuatu yang belum dijadwalkan cuma melatih pengelola
    // mengabaikan peringatan.
    expect(perluDiperingatkan(null, "2026-08-20")).toBe(false);
    expect(perluDiperingatkan(undefined, "2026-08-20")).toBe(false);
  });

  it("memperingatkan saat sudah dekat", () => {
    expect(perluDiperingatkan("2026-08-25", "2026-08-20")).toBe(true);
  });

  it("memperingatkan saat sudah lewat", () => {
    expect(perluDiperingatkan("2026-08-01", "2026-08-20")).toBe(true);
  });

  it("belum memperingatkan kalau masih jauh", () => {
    const jauh = "2026-09-30";
    expect(perluDiperingatkan(jauh, "2026-08-20")).toBe(false);
  });

  it("tepat di ambang tetap diperingatkan", () => {
    expect(HARI_PERINGATAN_SERVIS).toBe(7);
    expect(perluDiperingatkan("2026-08-27", "2026-08-20")).toBe(true);
  });
});

describe("nama hari", () => {
  it("indeks cocok dengan urutan getDay", () => {
    // 2026-08-20 adalah hari Kamis.
    expect(NAMA_HARI[indeksHari("2026-08-20")]).toBe("Kamis");
    // 2026-08-22 adalah hari Sabtu, hari tersibuk untuk wisata.
    expect(NAMA_HARI[indeksHari("2026-08-22")]).toBe("Sabtu");
  });
});
