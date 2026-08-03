"use client";

import { useEffect } from "react";

/**
 * Jaring terakhir kalau root layout sendiri yang gagal. Karena layout
 * belum sempat terpasang, komponen ini wajib merender html dan body
 * sendiri, dan tidak boleh bergantung pada token gaya dari globals.css.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] global error:", error.message, error.digest);
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          backgroundColor: "#fafafa",
          color: "#171717",
          padding: "1.25rem",
        }}
      >
        <div style={{ maxWidth: "24rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
            Aplikasi gagal dimuat
          </h1>
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "0.875rem",
              color: "#52525b",
              lineHeight: 1.6,
            }}
          >
            Terjadi kesalahan yang menghentikan seluruh halaman. Coba muat
            ulang. Kalau kamu sedang menunggu tiket, pembayaran yang sudah
            masuk tetap aman dan tiket dikirim lewat WhatsApp.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              minHeight: "44px",
              padding: "0 1.5rem",
              borderRadius: "0.75rem",
              border: "none",
              backgroundColor: "#f97316",
              color: "#ffffff",
              fontSize: "0.9375rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Muat ulang
          </button>
        </div>
      </body>
    </html>
  );
}
