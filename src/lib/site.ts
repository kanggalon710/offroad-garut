/**
 * Data usaha yang tampil di seluruh halaman publik.
 * Diisi realistis (bukan placeholder) sesuai aturan konten PRD §14.6 poin 6.
 */
export const site = {
  name: "Offroad Garut",
  tagline: "Sewa Jeep dan paket offroad di kaki Cikuray",
  ownerName: "Pak Asep Saepudin",
  whatsapp: "+6281399101355",
  whatsappDisplay: "0813 9910 1355",
  basecamp: {
    name: "Basecamp Cikuray Adventure",
    address: "Jl. Raya Cikajang No. 88, Cikajang, Kabupaten Garut, Jawa Barat",
    lat: -7.3186,
    lng: 107.7891,
  },
  operationalHours: "Setiap hari, 06.00 - 17.00 WIB",
  /** Rentang harga untuk data terstruktur, mengikuti paket termurah dan termahal. */
  priceRange: "Rp150.000 - Rp350.000",
  /**
   * Profil resmi lain milik usaha ini. Dipakai schema.org untuk
   * menghubungkan situs dengan Google Business Profile dan media sosial.
   * Dibiarkan kosong sampai tautannya dipastikan: mengarang URL di sini
   * justru membuat Google meragukan identitas usahanya.
   */
  sameAs: [] as string[],
} as const;
