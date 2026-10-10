'use client';

import { CircleMarker, MapContainer, Popup, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Locale } from '@/i18n';
import type { Messages } from '@/i18n/en';
import type { DashboardArea } from '@/components/types';
import 'leaflet/dist/leaflet.css';

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((point) => point.join(',')).join('|');
  const latest = useRef(points);
  latest.current = points;
  useEffect(() => {
    const current = latest.current;
    if (current.length === 0) return;
    map.fitBounds(current, { padding: [36, 36], maxZoom: current.length === 1 ? 12 : 5 });
  }, [map, key]);
  return null;
}

const styleFor = {
  confirmed: { color: '#c4472f', fillColor: '#e39b2b', radius: 11, fillOpacity: 0.9, dashArray: undefined },
  unconfirmed: { color: '#e39b2b', fillColor: '#e39b2b', radius: 8, fillOpacity: 0.25, dashArray: '3 4' },
  on: { color: '#7f9a78', fillColor: '#2c6b48', radius: 5, fillOpacity: 0.75, dashArray: undefined },
} as const;

export function OutageMap({
  areas,
  locale,
  messages,
  dir,
}: {
  areas: DashboardArea[];
  locale: Locale;
  messages: Messages;
  dir: 'rtl' | 'ltr';
}) {
  const points = areas.map((area) => [area.latitude, area.longitude] as [number, number]);
  return (
    <MapContainer
      center={[18, 28]}
      zoom={3}
      scrollWheelZoom={false}
      zoomControl={false}
      className="h-full w-full"
      aria-label={messages.home.title}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position={dir === 'rtl' ? 'topleft' : 'topright'} />
      <FitBounds points={points} />
      {areas.map((area) => {
        const style = styleFor[area.status];
        return (
          <CircleMarker
            key={area.id}
            center={[area.latitude, area.longitude]}
            radius={style.radius}
            pathOptions={{
              color: style.color,
              fillColor: style.fillColor,
              fillOpacity: style.fillOpacity,
              weight: 2,
              dashArray: style.dashArray,
            }}
          >
            <Popup>
              <p className="font-serif text-lg leading-tight">{area.name}</p>
              <p className="text-sm">
                {area.city} · {area.country}
              </p>
              <p className="mt-1 text-sm">{messages.status[area.status]}</p>
              <p className="font-mono text-sm">
                {messages.home.nextHour} {Math.round(area.probability * 100)}%
              </p>
              <Link href={`/${locale}/area/${area.id}`} className="mt-1 inline-block text-sm underline">
                {messages.home.view}
              </Link>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
