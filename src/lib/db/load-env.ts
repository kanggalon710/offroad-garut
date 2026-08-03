/**
 * Memuat .env.local untuk skrip yang dijalankan di luar Next.js.
 *
 * Harus berupa modul terpisah dan diimpor paling awal. Pernyataan
 * `import` di-hoist, jadi kode yang ditulis di atas impor lain tetap
 * berjalan belakangan, sedangkan koneksi database dibuat begitu modulnya
 * dimuat.
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  // Wajar di CI, tempat variabel sudah disuntikkan langsung ke environment.
}

export {};
