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