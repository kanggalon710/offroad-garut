import { Container, Section, SectionHeading } from "@/components/shared/container";
import { getServerApi } from "@/server/caller";
import { GalleryGridClient, type GalleryShot } from "./gallery-grid-client";

const FALLBACK_SHOTS: GalleryShot[] = [
  {
    src: "/images/real_img/Jeep_offroad_gunung_landscape.jpg",
    alt: "Pemandangan hamparan hijau dan gunung dari belakang Jeep",
    caption: "Lintasan gunung dan kebun teh",
  },
  {
    src: "/images/paket-sunrise-cikuray.jpg",
    alt: "Jeep parkir di punggungan gunung menghadap lautan awan saat matahari terbit",
    caption: "Lautan awan dari pegunungan",
  },
  {
    src: "/images/real_img/drone_fif.webp",
    alt: "Foto udara belasan Jeep terparkir berjajar di lapangan dengan rombongan peserta berkaus merah di sekitarnya",
    caption: "Rombongan FiF",
  },
  {
    src: "/images/detail-roda-lumpur.jpg",
    alt: "Roda Jeep berlumur lumpur merah basah di jalur hutan",
    caption: "Jalur basah setelah hujan",
  },
  {
    src: "/images/paket-kebun-teh.jpg",
    alt: "Konvoi tiga Jeep melintas di antara barisan kebun teh saat sore",
    caption: "Konvoi sore di kebun teh Cikajang",
  },
  {
    src: "/images/real_img/jeep_basecamp.jpg",
    alt: "Foto bareng tim di basecamp",
    caption: "Foto bareng tim di basecamp",
  },
];

export async function Gallery() {
  let displayShots = FALLBACK_SHOTS;

  try {
    const api = await getServerApi();
    const items = await api.gallery.getPublicGalleryItems({ limit: 20 });

    if (items.length > 0) {
      displayShots = items.map((row) => ({
        src: row.item.mediaUrl,
        alt: row.item.title || row.albumTitle || "Foto galeri",
        caption: row.item.title || row.albumTitle || undefined,
      }));
    }
  } catch {
    // Apabila DB tidak bisa dihubungi saat SSR, gunakan fallback static shots
  }

  return (
    <Section id="galeri" className="bg-surface">
      <Container>
        <SectionHeading
          eyebrow="Spot yang dilewati"
          title="Semua foto ini diambil di jalur yang kamu lewati"
          description="Bukan stok foto gunung entah di mana. Ini jalur yang dipakai armada kami setiap minggu di kawasan Cikajang dan kaki Cikuray."
        />

        <GalleryGridClient shots={displayShots} intervalMs={4000} />
      </Container>
    </Section>
  );
}
