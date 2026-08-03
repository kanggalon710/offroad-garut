"use client";

import dynamic from "next/dynamic";

import type { MeetingMapProps } from "./meeting-map";

/**
 * Leaflet menyentuh `window` saat modul dimuat, jadi peta hanya boleh
 * dirender di klien (PRD §15.5). Tinggi kontainer sudah dipesan lebih
 * dulu supaya tidak ada layout shift saat peta muncul.
 */
const MeetingMap = dynamic(() => import("./meeting-map"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full w-full items-center justify-center rounded-[var(--radius-card)] bg-muted"
      role="status"
      aria-live="polite"
    >
      <span className="text-meta text-muted-foreground">Memuat peta...</span>
    </div>
  ),
});

export function MeetingMapLoader(props: MeetingMapProps) {
  return <MeetingMap {...props} />;
}
