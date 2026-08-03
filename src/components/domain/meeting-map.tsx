"use client";

import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

import "leaflet/dist/leaflet.css";

export type MeetingMapProps = {
  lat: number;
  lng: number;
  name: string;
  address?: string | null;
  zoom?: number;
};

/**
 * Marker digambar sebagai divIcon berisi SVG, bukan ikon PNG bawaan
 * Leaflet. Path gambar bawaan itu selalu rusak setelah di-bundle dan
 * memunculkan error 404 di konsol (AC-GEOLOCATION-1 menuntut konsol bersih).
 */
const pinIcon = L.divIcon({
  className: "",
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24"
         fill="#166534" stroke="#ffffff" stroke-width="1.5"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="2.5" fill="#ffffff" stroke="none"/>
    </svg>`,
  iconSize: [34, 34],
  iconAnchor: [17, 32],
  popupAnchor: [0, -30],
});

export default function MeetingMap({
  lat,
  lng,
  name,
  address,
  zoom = 14,
}: MeetingMapProps) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={zoom}
      scrollWheelZoom={false}
      className="h-full w-full"
      aria-label={`Peta lokasi ${name}`}
    >
      <TileLayer
        attribution='&copy; kontributor <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <Marker position={[lat, lng]} icon={pinIcon}>
        <Popup>
          <strong>{name}</strong>
          {address ? <p className="mt-1 text-xs">{address}</p> : null}
        </Popup>
      </Marker>
    </MapContainer>
  );
}
