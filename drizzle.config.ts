import { defineConfig } from "drizzle-kit";

// drizzle-kit tidak membaca .env sendiri; muat manual untuk skrip CLI.
for (const envFile of [".env.production", ".env.local"]) {
  try {
    process.loadEnvFile(envFile);
    break;
  } catch {
    // Lewati jika file tidak ada
  }
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
