import Image from "next/image";

import { Container, Section, SectionHeading } from "@/components/shared/container";
import { getServerApi } from "@/server/caller";

const FALLBACK_SHOTS = [
  {
    src: "/images/real_img/Jeep_offroad_gunung_landscape.jpg",
    alt: "Pemandangan hamparan hijau dan gunung dari belakang Jeep",
    caption: "Lintasan gunung dan kebun teh",
    className: "sm:col-span-2 sm:row-span-2",
  },
  {
    src: "/images/paket-sunrise-cikuray.jpg",
    alt: "Jeep parkir di punggungan gunung menghadap lautan awan saat matahari terbit",
    caption: "Lautan awan dari pegunungan",
    className: "sm:col-span-2",
  },
  {
    src: "/images/real_img/drone_fif.webp",
    alt: "Foto udara belasan Jeep terparkir berjajar di lapangan dengan rombongan peserta berkaus merah di sekitarnya",
    caption: "Rombongan FiF",
    className: "",
  },
  {
    src: "/images/detail-roda-lumpur.jpg",
    alt: "Roda Jeep berlumur lumpur merah basah di jalur hutan",
    caption: "Jalur basah setelah hujan",
    className: "",
  },
  {
    src: "/images/paket-kebun-teh.jpg",
    alt: "Konvoi tiga Jeep melintas di antara barisan kebun teh saat sore",
    caption: "Konvoi sore di kebun teh Cikajang",
    className: "sm:col-span-2",
  },
  {
    src: "/images/real_img/jeep_basecamp.jpg",
    alt: "Foto bareng tim di basecamp",
    caption: "Foto bareng tim di basecamp",
    className: "sm:col-span-2",
  },
];

export async function Gallery() {
  let displayShots = FALLBACK_SHOTS;

  try {
    const api = await getServerApi();
    const items = await api.gallery.getPublicGalleryItems({ limit: 6 });

    if (items.length > 0) {
      displayShots = items.map((row, idx) => ({
        src: row.item.mediaUrl,
        alt: row.item.title || row.albumTitle || "Foto galeri",
        caption: row.item.title || row.albumTitle,
        className:
          idx === 0
            ? "sm:col-span-2 sm:row-span-2"
            : idx === 1 || idx === 4 || idx === 5
              ? "sm:col-span-2"
              : "",
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

        <div className="mt-10 grid grid-cols-2 gap-3 sm:auto-rows-[11rem] sm:grid-cols-4 sm:gap-4">
          {displayShots.map((shot) => (
            <figure
              key={shot.src}
              className={`group relative overflow-hidden rounded-[var(--radius-card)] bg-muted ${shot.className}`}
            >
              <div className="relative aspect-[4/3] sm:aspect-auto sm:h-full">
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  fill
                  loading="lazy"
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover transition-transform duration-300 ease-[var(--ease-out-soft)] group-hover:scale-[1.03]"
                />
              </div>
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 text-legal font-medium text-white sm:text-meta">
                {shot.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </Section>
  );
}
