/**
 * Data usaha yang tampil di seluruh halaman publik.
 * Diisi realistis (bukan placeholder) sesuai aturan konten PRD §14.6 poin 6.
 */
export const site = {
  name: "Offroad Garut",
  tagline: "Sewa Jeep dan paket offroad di kaki Cikuray",
  ownerName: "Pak Asep Saepudin",
  whatsapp: "+6281234567890",
  whatsappDisplay: "0812 3456 7890",
  basecamp: {
    name: "Basecamp Cikuray Adventure",
    address: "Jl. Raya Cikajang No. 88, Cikajang, Kabupaten Garut, Jawa Barat",
    lat: -7.3186,
    lng: 107.7891,
  },
  operationalHours: "Setiap hari, 06.00 - 17.00 WIB",
} as const;
