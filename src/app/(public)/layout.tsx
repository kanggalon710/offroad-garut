import { Footer } from "@/components/shared/footer";
import { Navbar } from "@/components/shared/navbar";
import { WhatsAppFAB } from "@/components/shared/whatsapp-fab";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      {/* pb menyisakan ruang supaya tombol WhatsApp tidak menutupi
          konten terakhir di layar kecil */}
      <main id="konten" className="flex-1 pb-24">
        {children}
      </main>
      <Footer />
      <WhatsAppFAB />
    </div>
  );
}
