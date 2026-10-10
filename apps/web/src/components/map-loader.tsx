'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/i18n';
import type { Messages } from '@/i18n/en';
import type { DashboardArea } from '@/components/types';

export function OutageMapLoader(props: {
  areas: DashboardArea[];
  locale: Locale;
  messages: Messages;
  dir: 'rtl' | 'ltr';
}) {
  const [MapView, setMapView] = useState<typeof import('@/components/outage-map').OutageMap | null>(null);
  useEffect(() => {
    let cancelled = false;
    void import('@/components/outage-map').then((mod) => {
      if (!cancelled) setMapView(() => mod.OutageMap);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  if (!MapView) {
    return <div className="map-grid flex h-full items-center justify-center text-sm text-paper/70">{props.messages.loadingMap}</div>;
  }
  return <MapView {...props} />;
}
