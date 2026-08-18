# Keputusan Arsitektur

Entri terbaru di atas. Catat keputusan yang akan ditanyakan lagi nanti: yang punya
alternatif masuk akal, yang mengunci sesuatu, atau yang sengaja melanggar aturan standar.
Jangan mencatat keputusan yang sudah jelas dari kode.

Format: Konteks, Opsi, Pilihan, Alasan, Konsekuensi.

Penyimpangan dari PRD dicatat terpisah di `DEVIASI-PRD.md` di root repo, dengan format
kutipan PRD, masalah, dan tindakan.

---

## 2026-08-11 - Aturan agen dipecah jadi global dan project

**Konteks:** Repo dikerjakan bergantian oleh Claude, Gemini, Kimi, Deepseek, dan Qwen.
Aturan sebelumnya hanya ada di `CLAUDE.md`, jadi agen selain Claude bekerja tanpa aturan
sama sekali, dan project baru mulai dari nol.

**Opsi:**

1. Menaruh standar lengkap di `AGENTS.md` tiap repo. Portabel, tapi teks aturan yang sama
   hidup di banyak repo dan harus disinkronkan manual.
2. Menaruh standar universal di config agen global, repo hanya memuat aturan khusus
   project.
3. Menaruh standar global tapi tetap menyalin ke repo untuk jaga-jaga.

**Pilihan:** Opsi 2. Standar universal di `~/.ai/AGENTS.md`, di-symlink ke
`~/.claude/CLAUDE.md`, `~/.qwen/QWEN.md`, `~/.gemini/GEMINI.md`, `~/.codex/AGENTS.md`, dan
`~/.config/opencode/AGENTS.md`. `AGENTS.md` di repo hanya berisi aturan khusus project, dan
`CLAUDE.md`, `GEMINI.md`, `QWEN.md`, serta `.github/copilot-instructions.md` di repo adalah
symlink ke file itu.

**Alasan:** Satu file yang diedit, semua agen dan semua project ikut berubah, dan tidak ada
teks aturan yang terduplikasi. Dokumen yang isinya melarang duplikasi tidak pantas
menduplikasi dirinya sendiri.

**Konsekuensi:** Repo tidak lagi membawa standar universalnya sendiri. Kalau repo di-clone
ke mesin yang belum punya `~/.ai/AGENTS.md`, agen di mesin itu hanya akan membaca aturan
project. `AGENTS.md` di repo menyebutkan hal ini beserta cara mendapatkan filenya. Cursor
dan Copilot versi GUI juga tidak membaca config global, jadi isinya harus di-paste manual
ke settings masing-masing.

---

## 2026-08-11 - Log dan to-do dipisah dari file instruksi

**Konteks:** Permintaan awal adalah menaruh riwayat perubahan dan to-do di dalam file
instruksi agen.

**Opsi:** Menggabungkan ke `AGENTS.md`, atau memisah ke file state tersendiri.

**Pilihan:** Dipisah ke `.ai/PROGRESS.md`, `.ai/TODO.md`, dan `.ai/DECISIONS.md`.

**Alasan:** `AGENTS.md` dimuat utuh setiap sesi oleh setiap agen. Riwayat tumbuh tanpa
batas, jadi dalam beberapa bulan aturan akan tenggelam di bawah ratusan baris log dan makin
sering terlewat. File state dibaca sesuai kebutuhan, jadi aturannya tetap ringkas dan
riwayatnya tetap boleh panjang.

**Konsekuensi:** Ada protokol tambahan yang harus dipatuhi agen (baca TODO sebelum mulai,
perbarui PROGRESS dan TODO sebelum melapor selesai). Protokol itu ditulis di bagian 13
`~/.ai/AGENTS.md` dan masuk checklist penyelesaian.

## 2026-08-19 - Pemecahan file besar jadi folder per-domain

**Konteks:** `src/components/admin/master-data-client.tsx` mencapai 653 baris berisi
empat manager CRUD yang tidak saling bergantung (add-on, paket, jeep, titik kumpul).
Setiap perubahan kecil pada satu manager memaksa membaca ulang seluruh file.

**Opsi:** (a) biarkan satu file, (b) pecah jadi beberapa file sejajar dengan awalan nama
(`master-data-addons.tsx`, dst), (c) pecah jadi folder dengan `index.tsx` sebagai
komposisi.

**Pilihan:** (c). `src/components/admin/master-data/` dengan `index.tsx`,
`addons-manager.tsx`, `packages-manager.tsx`, `jeeps-manager.tsx`,
`meeting-points-manager.tsx`, dan `section-toolbar.tsx`.

**Alasan:** jalur impor pemanggilnya tidak berubah bentuknya
(`@/components/admin/master-data`), folder menahan file pendukung yang hanya dipakai di
dalamnya (`section-toolbar.tsx`) supaya tidak mengotori `components/admin/`, dan tiap
manager bisa direview sendiri. Opsi (b) menyebarkan enam file setara ke folder yang sudah
padat tanpa menandakan mana yang saling terkait.

**Preseden:** komponen client yang melewati sekitar 400 baris dan isinya beberapa bagian
yang berdiri sendiri dipecah jadi folder seperti ini, bukan dibiarkan tumbuh.

## 2026-08-19 - Tombol ber-aria-pressed, bukan ARIA tabs

**Konteks:** `/master` memakai `role="tablist"` dan `role="tab"` tanpa `role="tabpanel"`,
`aria-controls`, maupun navigasi panah dengan roving tabindex. Sementara filter di
`/orders` sudah memakai `aria-pressed` dengan benar. Dua pola berbeda untuk kebutuhan yang
sama.

**Opsi:** (a) lengkapi jadi ARIA tabs yang benar di kedua tempat, (b) buang role tab dan
seragamkan ke `aria-pressed`.

**Pilihan:** (b). Primitif `src/components/ui/segmented-control.tsx`.

**Alasan:** role tab yang tidak lengkap lebih menyesatkan pembaca layar daripada
sekumpulan tombol jujur, karena menjanjikan pola navigasi panah yang tidak ada. Pola
`aria-pressed` sudah terbukti benar di `/orders`, jadi menaikkannya jadi milik bersama
menghapus duplikasi sekaligus memperbaiki aksesibilitas tanpa menambah kode navigasi
keyboard buatan sendiri.

**Preseden:** jangan memasang role ARIA yang kontrak perilakunya tidak dipenuhi. Kalau
pola lengkapnya tidak dibangun, pakai elemen dan atribut yang jujur menggambarkan yang ada.
