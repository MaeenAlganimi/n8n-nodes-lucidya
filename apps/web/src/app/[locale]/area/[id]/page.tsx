import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { hoursWithoutPower } from '@barq/core';
import { OutageMapLoader } from '@/components/map-loader';
import { PredictionChart, type ChartSlot } from '@/components/prediction-chart';
import { StatusPill } from '@/components/status-pill';
import type { DashboardArea } from '@/components/types';
import { getDictionary, isLocale } from '@/i18n';
import { formatNumber, formatRange } from '@/lib/format';
import { getApp } from '@/lib/services';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) return {};
  const app = await getApp();
  const area = await app.repo.getArea(id);
  if (!area) return {};
  const name = locale === 'ar' ? area.nameAr : area.nameEn;
  return { title: name };
}

export default async function AreaPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getDictionary(locale);
  const app = await getApp();
  const now = new Date();
  const area = await app.repo.getArea(id);
  if (!area) notFound();

  const sinceHours = new Date(now.getTime() - 14 * 86_400_000);
  const sinceEvents = new Date(now.getTime() - 21 * 86_400_000);
  const [forecast, events, hours, active] = await Promise.all([
    app.forecastArea(area.id, now),
    app.repo.listOutages({ areaId: area.id, since: sinceEvents }),
    app.repo.hoursSince(sinceHours, area.id),
    app.repo.activeOutage(area.id),
  ]);
  if (!forecast) notFound();

  const name = locale === 'ar' ? area.nameAr : area.nameEn;
  const city = locale === 'ar' ? area.cityNameAr : area.cityNameEn;
  const country = locale === 'ar' ? area.countryNameAr : area.countryNameEn;
  const status = active?.status === 'confirmed' || active?.status === 'unconfirmed' ? active.status : 'on';
  const stats = hoursWithoutPower(
    hours.map((hour) => ({
      areaId: hour.areaId,
      hourStart: hour.hourStart,
      outage: hour.outage === 1 ? 1 : 0,
      timezone: area.timezone,
    })),
    now,
    14,
  ).get(area.id);
  const marker: DashboardArea = {
    id: area.id,
    countryCode: area.countryCode,
    country,
    city,
    name,
    latitude: area.latitude,
    longitude: area.longitude,
    status,
    synthetic: Boolean(active?.synthetic),
    distinctReporters: active?.distinctReporters ?? 0,
    startedAt: active ? active.startedAt.toISOString() : null,
    probability: forecast.slots[0]?.probability ?? 0,
    baseline: forecast.slots[0]?.baselineProbability ?? 0,
    hoursToday: stats?.today ?? 0,
    hoursWeek: stats?.total ?? 0,
  };
  const slots: ChartSlot[] = forecast.slots.map((slot) => ({
    start: slot.start,
    probability: slot.probability,
    baselineProbability: slot.baselineProbability,
    factors: slot.factors,
  }));
  const timeline = events.filter((event) => event.status === 'confirmed' || event.status === 'resolved');
  const visibleEvents = timeline.slice(0, 12);
  const maxDay = Math.max(1, ...(stats?.byDay.map((day) => day.hours) ?? [1]));

  return (
    <div>
      <div className="h-64 border-b border-white/10">
        <OutageMapLoader areas={[marker]} locale={locale} messages={messages} dir={locale === 'ar' ? 'rtl' : 'ltr'} />
      </div>
      <article className="mx-auto max-w-3xl px-4 py-8">
        <div className="bg-paper p-6 text-ink sm:p-8">
          <Link href={`/${locale}`} className="text-sm text-ink/60 hover:text-ink">
            {messages.area.back}
          </Link>
          <p className="mt-4 text-sm text-ink/60">
            {country} · {city}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-serif text-4xl leading-tight">{name}</h1>
            <StatusPill status={status} messages={messages} synthetic={Boolean(active?.synthetic)} />
          </div>
          {active && active.distinctReporters > 0 ? (
            <p className="mt-2 text-sm text-ink/70">
              {messages.area.confirmedBy} {active.distinctReporters} {messages.area.people}
            </p>
          ) : null}

          <section className="mt-8">
            <h2 className="font-serif text-2xl">{messages.area.next24}</h2>
            <div className="mt-4">
              <PredictionChart slots={slots} locale={locale} timeZone={area.timezone} messages={messages} />
            </div>
            <p className="mt-4 text-sm text-ink/60">
              {forecast.temperatureSource === 'open-meteo' ? messages.area.openMeteo : messages.area.climatology}{' '}
              {messages.area.trained} {forecast.trainedAt.slice(0, 16).replace('T', ' ')} UTC.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-2xl">{messages.area.stats}</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div className="border border-rule p-3">
                <dt className="text-xs uppercase tracking-wide text-ink/50">{messages.area.today}</dt>
                <dd className="font-mono text-3xl">{formatNumber(locale, stats?.today ?? 0)}</dd>
              </div>
              <div className="border border-rule p-3">
                <dt className="text-xs uppercase tracking-wide text-ink/50">{messages.area.window}</dt>
                <dd className="font-mono text-3xl">{formatNumber(locale, stats?.total ?? 0)}</dd>
              </div>
            </dl>
            <ul className="mt-4 space-y-1">
              {(stats?.byDay ?? []).map((day) => (
                <li key={day.date} className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-2 text-sm">
                  <span className="font-mono text-xs text-ink/60">{day.date.slice(5)}</span>
                  <span className="h-2 bg-ink/10">
                    <span className="block h-2 bg-signal/80" style={{ width: `${(day.hours / maxDay) * 100}%` }} />
                  </span>
                  <span className="text-end font-mono text-xs">{day.hours}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-2xl">{messages.area.timeline}</h2>
            {visibleEvents.length === 0 ? <p className="mt-3 text-sm">{messages.area.noTimeline}</p> : null}
            <ol className="mt-3 divide-y divide-rule border-y border-rule">
              {visibleEvents.map((event) => (
                <li key={event.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm">
                  <span className="font-mono">
                    {formatRange(
                      locale,
                      event.startedAt.toISOString(),
                      event.endedAt ? event.endedAt.toISOString() : null,
                      area.timezone,
                      messages.area.ongoing,
                    )}
                  </span>
                  <span className="text-ink/60">
                    {event.synthetic ? messages.area.syntheticNote : messages.status[event.status === 'resolved' ? 'resolved' : 'confirmed']}
                  </span>
                </li>
              ))}
            </ol>
            {timeline.length > visibleEvents.length ? <p className="mt-3 text-sm text-ink/60">{messages.area.earlier}</p> : null}
          </section>

          <p className="mt-8">
            <Link href={`/${locale}/report?area=${area.id}`} className="inline-block border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-paper">
              {messages.area.reportCta}
            </Link>
          </p>
        </div>
      </article>
    </div>
  );
}
