import { MessageCircle } from "lucide-react";

import { site } from "@/lib/site";
import { waMeLink } from "@/lib/utils";

/**
 * Jalur tanya jawab instan (PRD §6). Ditempatkan di kanan bawah dengan
 * jarak aman dari area gestur bawah layar dan target sentuh 56px.
 */
export function WhatsAppFAB() {
  const href = waMeLink(
    site.whatsapp,
    "Halo, saya mau tanya soal paket offroad di Garut.",
  );

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-40 flex h-14 items-center gap-2 rounded-full bg-primary pl-4 pr-5 text-on-primary shadow-[var(--shadow-raised)] transition-transform duration-200 ease-[var(--ease-out-soft)] hover:scale-[1.03] active:scale-95"
    >
      <MessageCircle className="size-5" aria-hidden="true" />
      <span className="text-meta font-semibold">Tanya dulu</span>
    </a>
  );
}
