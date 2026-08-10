import { defineConfig } from "drizzle-kit";

// drizzle-kit tidak membaca .env.local sendiri, padahal di situlah
// Next.js menyimpan kredensial lokal.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Wajar terjadi di CI, di mana variabel sudah disuntikkan langsung.
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
