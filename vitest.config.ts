import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  // JSX ditransformasi esbuild bawaan Vitest. Plugin React tidak dipakai
  // karena versinya menuntut Vite 8 sementara Vitest 2 masih di Vite 5,
  // dan Fast Refresh tidak diperlukan di runner test.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["./src/test/setup.ts"],
    // Test menyentuh database yang sama, jadi dijalankan berurutan
    // supaya tidak saling menimpa data.
    fileParallelism: false,
    testTimeout: 30_000,
  },
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      // `server-only` sengaja melempar error di luar React Server
      // Component. Di runner test ia diganti modul kosong.
      {
        find: /^server-only$/,
        replacement: path.resolve(__dirname, "./src/test/empty.ts"),
      },
    ],
  },
});
