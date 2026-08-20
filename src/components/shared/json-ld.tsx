/**
 * Menyisipkan satu blok data terstruktur schema.org.
 *
 * `dangerouslySetInnerHTML` dipakai di sini karena tidak ada cara lain
 * menaruh JSON mentah ke dalam <script>: React akan meng-escape teks biasa
 * dan merusak JSON-nya. Ini aman, dan bagian keamanan standar global
 * mewajibkan alasannya ditulis: isinya kita serialisasi sendiri dari objek
 * bertipe di src/lib/seo.ts, tidak pernah dari input pengguna. Karakter
 * `<` tetap di-escape supaya string dari database (nama paket, deskripsi)
 * tidak bisa menutup tag <script> lebih awal.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
