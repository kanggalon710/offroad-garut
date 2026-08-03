import QRCode from "qrcode";

/**
 * QR dibuat di server sebagai data URL, jadi tidak ada pustaka QR yang
 * ikut terkirim ke browser dan gambarnya sudah ada di HTML pertama.
 */
export async function ETicketQR({
  value,
  bookingCode,
}: {
  value: string;
  bookingCode: string;
}) {
  const dataUrl = await QRCode.toDataURL(value, {
    width: 512,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#166534", light: "#ffffff" },
  });

  return (
    <figure className="flex flex-col items-center">
      {/* next/image tidak memberi manfaat untuk data URL, dan ukuran
          eksplisit di sini mencegah pergeseran layout. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt={`Kode QR tiket untuk pesanan ${bookingCode}`}
        width={256}
        height={256}
        className="size-64 rounded-[var(--radius-control)] border border-border bg-white p-2"
      />
      <figcaption className="tabular mt-3 text-title font-extrabold tracking-wide">
        {bookingCode}
      </figcaption>
    </figure>
  );
}
