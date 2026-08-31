## 2026-08-29 - Simplifikasi teks Hero dan Galeri grid berotasi (rolling)
**Agen:** opencode (MAIN-COMBO) | **Status:** selesai
**Kenapa:** User meminta teks Hero yang lebih ringkas dan bermakna tentang offroad Garut, serta galeri gambar responsif bento grid di `id="galeri"` yang tidak statis dan berotasi otomatis setiap x detik dengan foto yang bisa dikelola oleh staff via Admin.
**Perubahan:**
- Menyederhanakan teks judul dan subjudul di `src/components/landing/hero.tsx`.
- Membuat komponen client `GalleryGridClient` (`src/components/landing/gallery-grid-client.tsx`) untuk memutar item galeri publik secara berkala (default 4 detik).
- Mengubah limit query `getPublicGalleryItems` dari 12 ke 20 di `src/server/routers/gallery.ts` agar galeri memiliki persediaan foto untuk dirotasi.
- Memperbarui `src/components/landing/gallery.tsx` untuk menyuplai foto dari DB/fallback ke `GalleryGridClient`.
**File:** src/components/landing/hero.tsx, src/components/landing/gallery.tsx, src/components/landing/gallery-grid-client.tsx, src/server/routers/gallery.ts
**Verified:** `npm run typecheck` 0 error, `npm run lint` bersih.

## 2026-08-24 - Fix price input parsing for formatted IDR (150.000 -> 150000)
**Agen:** opencode (MAIN-COMBO) | **Status:** selesai
**Kenapa:** Input harga menggunakan <Input type="number"> yang menginterpretasikan titik sebagai pemisah desimal, sehingga "150.000" menjadi 150.0 (150). Ini menyebabkan kesalahan saat memasukkan harga dengan format ribuan Indonesia (titik sebagai pemisah ribuan).
**Perubahan:**
- Tambahkan komponen CurrencyInput di src/components/ui/input.tsx dengan fungsi formatNumberInput dan parseFormattedNumber.
- Ganti semua input harga di master data (addon, paket, editor paket, servis jeep) dengan CurrencyInput.
- Tambahkan unit test src/test/currency-input.test.ts untuk memastikan fungsi format dan parsing bekerja dengan benar.
**File:** src/components/ui/input.tsx, src/components/admin/master-data/addons-manager.tsx, src/components/admin/master-data/packages-manager.tsx, src/components/admin/package-editor-client.tsx, src/components/admin/jeep-servis.tsx, src/test/currency-input.test.ts
**Verified:** typecheck bersih, lint bersih, test currency-input lolos, dan manual verifikasi bahwa input 150.000 menghasilkan nilai 150000 disimpan ke database.
**Catatan:** Perbaikan ini hanya berlaku untuk branch dev; perlu dilakukan sinkronisasi skema database (Problem 2) sebelum perubahan ini dapat digunakan sepenuhnya karena kolom packages.status masih belum terapkan di beberapa lingkungan.