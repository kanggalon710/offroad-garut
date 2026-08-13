/**
 * Memuat .env.production atau .env.local untuk skrip yang dijalankan di luar Next.js (seperti db:seed).
 */
for (const envFile of [".env.production", ".env.local"]) {
  try {
    process.loadEnvFile(envFile);
    break;
  } catch {
    // Lewati jika file tidak ada
  }
}

export {};
