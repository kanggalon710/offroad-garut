import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "typescript-eslint";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "drizzle/**",
      "next-env.d.ts",
    ],
  },

  ...compat.extends("next/core-web-vitals", "next/typescript"),

  {
    rules: {
      // CLAUDE.md melarang `any`. Dinaikkan dari peringatan menjadi
      // error supaya tidak bisa lolos diam diam.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Impor tipe ditulis eksplisit supaya tidak ikut terbawa ke bundel
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
  },

  {
    files: ["src/test/**/*.{ts,tsx}", "src/lib/db/seed.ts"],
    rules: {
      // Skrip seed dan test memang berbicara ke terminal
      "no-console": "off",
      // vi.mock membutuhkan anotasi `typeof import(...)` untuk
      // importOriginal, dan itu tidak punya padanan `import type`.
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
);
