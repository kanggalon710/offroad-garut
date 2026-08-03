try {
  process.loadEnvFile(".env.local");
} catch {
  // Di CI variabel sudah disuntikkan langsung ke environment.
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL belum diisi. Test ini memerlukan database sungguhan.",
  );
}
