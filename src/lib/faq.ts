/**
 * Tanya jawab yang tampil di beranda.
 *
 * Diangkat keluar dari komponennya supaya data terstruktur FAQPage
 * (src/lib/seo.ts) membaca sumber yang sama dengan yang dilihat
 * pengunjung. Menandai jawaban yang berbeda dari isi halaman adalah
 * cloaking, dan salinan kedua adalah cara paling gampang jadi berbeda.
 */
export const faqs = [
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

export type Faq = (typeof faqs)[number];
