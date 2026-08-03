import { ChevronDown } from "lucide-react";

import { Container, Section, SectionHeading } from "@/components/shared/container";
import { site } from "@/lib/site";

const faqs = [
  {
    question: "Saya cuma berdua, bisa tetap berangkat?",
    answer:
      "Satu Jeep dihitung minimal 3 orang karena biaya bahan bakar dan driver tetap sama berapa pun penumpangnya. Kalau kamu berdua, ada dua pilihan: bayar 3 kursi, atau kabari kami lewat WhatsApp supaya bisa digabung dengan rombongan lain di jam yang sama.",
  },
  {
    question: "Kalau hujan bagaimana?",
    answer:
      "Gerimis tetap jalan, Jeep kami pakai penutup dan kami sediakan jas hujan. Kalau hujan deras sampai jalur berbahaya, kami hubungi kamu pagi harinya dan kamu bisa pindah tanggal tanpa biaya tambahan.",
  },
  {
    question: "Anak kecil boleh ikut?",
    answer:
      "Boleh, mulai usia 5 tahun dan harus didampingi orang tua. Anak tetap dihitung satu pax karena satu kursi. Beri tahu kami di kolom catatan supaya driver menyiapkan kursi depan yang lebih nyaman.",
  },
  {
    question: "Bayarnya DP atau langsung lunas?",
    answer:
      "Langsung lunas lewat halaman pembayaran, bisa QRIS, GoPay, ShopeePay, atau transfer virtual account. Begitu pembayaran masuk, tiket QR otomatis dikirim ke WhatsApp kamu.",
  },
  {
    question: "Bisa ganti tanggal setelah bayar?",
    answer:
      "Bisa, selama diberitahukan paling lambat 2 hari sebelum tanggal berangkat. Hubungi kami di WhatsApp dengan menyebut kode booking, nanti kami atur ulang jadwalnya.",
  },
  {
    question: "Jeep-nya aman? Drivernya berpengalaman?",
    answer:
      "Semua unit diservis rutin dan dicek sebelum berangkat. Driver kami warga Cikajang yang sudah menempuh jalur ini bertahun-tahun. Helm dan sabuk tersedia di setiap unit.",
  },
];

export function Faq() {
  return (
    <Section id="tanya-jawab">
      <Container>
        <SectionHeading
          eyebrow="Tanya jawab"
          title="Yang paling sering ditanyakan sebelum pesan"
          description="Kalau pertanyaanmu belum terjawab di sini, chat saja langsung. Nomor di bawah dipegang orang, bukan bot."
        />

        <div className="mt-10 max-w-3xl divide-y divide-border border-y border-border">
          {faqs.map((faq) => (
            <details key={faq.question} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-semibold [&::-webkit-details-marker]:hidden">
                <span>{faq.question}</span>
                <ChevronDown
                  className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="pb-5 pr-9 text-muted-foreground">{faq.answer}</p>
            </details>
          ))}
        </div>

        <p className="mt-8 text-meta text-muted-foreground">
          Masih ragu? Chat {site.whatsappDisplay}, dijawab di jam operasional.
        </p>
      </Container>
    </Section>
  );
}
