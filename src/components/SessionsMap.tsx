'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { useLocale } from '@/components/LocaleProvider';
import 'leaflet/dist/leaflet.css';

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

const VANCOUVER: [number, number] = [49.2827, -123.1207];

type SessionItem = {
  session: {
    _id: string;
    title: string;
    startAt: string;
    publicAreaLabel?: string;
    publicLocation: {
      type: 'Point';
      coordinates: [number, number];
    };
  };
  distanceMeters: number;
};

type Props = {
  items: SessionItem[];
  center?: [number, number] | null;
  height?: number;
};

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

function FitBounds({ items }: { items: SessionItem[] }) {
  const map = useMap();
  const prevCount = useRef(0);

  useEffect(() => {
    if (items.length === 0 || items.length === prevCount.current) return;
    prevCount.current = items.length;
    const bounds = items.map(({ session }) => {
      const [lng, lat] = session.publicLocation.coordinates;
      return [lat, lng] as [number, number];
    });
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [items, map]);

  return null;
}

export default function SessionsMap({ items, center, height = 300 }: Props) {
  const { t, formatDateTime } = useLocale();
  const initialCenter: [number, number] = center ?? VANCOUVER;

  return (
    <MapContainer
      center={initialCenter}
      zoom={13}
      style={{ height, width: '100%', borderRadius: 12, border: '1px solid #e5e7eb' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {center && <RecenterMap center={center} />}
      {items.length > 0 && <FitBounds items={items} />}
      {items.map(({ session }) => {
        const [lng, lat] = session.publicLocation.coordinates;
        return (
          <Marker key={session._id} position={[lat, lng]}>
            <Popup>
              <div style={{ minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{session.title}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>
                  {formatDateTime(session.startAt)}
                </div>
                {session.publicAreaLabel && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                    {session.publicAreaLabel}
                  </div>
                )}
                <Link
                  href={`/sessions/${session._id}`}
                  style={{ fontSize: 13, color: '#3b82f6', textDecoration: 'underline' }}
                >
                  {t('viewDetails')}
                </Link>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
