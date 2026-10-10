import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hoursWithoutPower } from '@barq/core';
import { Dashboard } from '@/components/dashboard';
import type { DashboardArea } from '@/components/types';
import { getDictionary, isLocale } from '@/i18n';
import { getApp } from '@/lib/services';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const messages = getDictionary(locale);
  return { title: messages.home.title, description: messages.meta.description };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getDictionary(locale);
  const app = await getApp();
  const now = new Date();
  const since = new Date(now.getTime() - 7 * 86_400_000);
  const [areas, outages, hours, chances] = await Promise.all([
    app.repo.listAreas(),
    app.repo.listOutages({ statuses: ['confirmed', 'unconfirmed'] }),
    app.repo.hoursSince(since),
    app.nextHourByArea(now),
  ]);

  const timezoneByArea = new Map(areas.map((area) => [area.id, area.timezone]));
  const stats = hoursWithoutPower(
    hours.map((hour) => ({
      areaId: hour.areaId,
      hourStart: hour.hourStart,
      outage: hour.outage === 1 ? 1 : 0,
      timezone: timezoneByArea.get(hour.areaId) ?? 'UTC',
    })),
    now,
    7,
  );
  const outageByArea = new Map<string, (typeof outages)[number]>();
  for (const outage of outages) {
    const current = outageByArea.get(outage.areaId);
    if (!current || (outage.status === 'confirmed' && current.status !== 'confirmed')) outageByArea.set(outage.areaId, outage);
  }

  const view: DashboardArea[] = areas.map((area) => {
    const outage = outageByArea.get(area.id);
    const status = outage?.status === 'confirmed' || outage?.status === 'unconfirmed' ? outage.status : 'on';
    const chance = chances.get(area.id);
    const stat = stats.get(area.id);
    return {
      id: area.id,
      countryCode: area.countryCode,
      country: locale === 'ar' ? area.countryNameAr : area.countryNameEn,
      city: locale === 'ar' ? area.cityNameAr : area.cityNameEn,
      name: locale === 'ar' ? area.nameAr : area.nameEn,
      latitude: area.latitude,
      longitude: area.longitude,
      status,
      synthetic: Boolean(outage?.synthetic),
      distinctReporters: outage?.distinctReporters ?? 0,
      startedAt: outage ? outage.startedAt.toISOString() : null,
      probability: chance?.probability ?? 0,
      baseline: chance?.baseline ?? 0,
      hoursToday: stat?.today ?? 0,
      hoursWeek: stat?.total ?? 0,
    };
  });

  return <Dashboard areas={view} locale={locale} messages={messages} dir={locale === 'ar' ? 'rtl' : 'ltr'} />;
}
