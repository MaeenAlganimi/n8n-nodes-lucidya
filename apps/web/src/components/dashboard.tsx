'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/i18n';
import type { Messages } from '@/i18n/en';
import { formatPercent } from '@/lib/format';
import { OutageMapLoader } from '@/components/map-loader';
import type { DashboardArea } from '@/components/types';
import { StatusPill } from '@/components/status-pill';

type Filter = 'all' | 'out' | 'watch';

export function Dashboard({
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
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(timer);
  }, [router]);

  const confirmed = areas.filter((area) => area.status === 'confirmed').length;
  const pending = areas.filter((area) => area.status === 'unconfirmed').length;
  const ranked = [...areas].sort((a, b) => b.hoursWeek - a.hoursWeek).slice(0, 5);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return areas
      .filter((area) => {
        if (filter === 'out' && area.status === 'on') return false;
        if (filter === 'watch' && area.probability < 0.45 && area.status === 'on') return false;
        if (!needle) return true;
        return `${area.name} ${area.city} ${area.country} ${area.countryCode}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => {
        const rank = { confirmed: 0, unconfirmed: 1, on: 2 };
        if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
        return b.probability - a.probability;
      });
  }, [areas, filter, query]);

  const groups = new Map<string, DashboardArea[]>();
  for (const area of visible) {
    const key = `${area.city} · ${area.country}`;
    const list = groups.get(key);
    if (list) list.push(area);
    else groups.set(key, [area]);
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="relative h-[68vh] lg:sticky lg:top-[4.25rem] lg:h-[calc(100vh-4.25rem)]">
        <OutageMapLoader areas={areas} locale={locale} messages={messages} dir={dir} />
        <ul className="absolute bottom-4 start-4 z-[400] flex flex-col gap-1 bg-paper/95 p-3 text-xs text-ink shadow-none">
          <li className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-amber ring-2 ring-signal" />
            {messages.home.legendConfirmed}
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full border border-dashed border-amber" />
            {messages.home.legendPending}
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-sage" />
            {messages.home.legendOn}
          </li>
        </ul>
      </div>
      <aside className="bg-paper text-ink lg:h-[calc(100vh-4.25rem)] lg:overflow-y-auto">
        <div className="border-b border-rule px-5 py-5">
          <h1 className="font-serif text-3xl leading-tight">{messages.home.title}</h1>
          <dl className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink/60">{messages.home.confirmed}</dt>
              <dd className="font-mono text-2xl">{confirmed}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink/60">{messages.home.unconfirmed}</dt>
              <dd className="font-mono text-2xl">{pending}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink/60">{messages.home.neighbourhoods}</dt>
              <dd className="font-mono text-2xl">{areas.length}</dd>
            </div>
          </dl>
        </div>
        <div className="border-b border-rule px-5 py-4">
          <h2 className="text-xs uppercase tracking-wide text-ink/60">{messages.home.ranking}</h2>
          <ol className="mt-2 space-y-2">
            {ranked.map((area) => (
              <li key={area.id} className="flex items-center justify-between gap-3 text-sm">
                <Link href={`/${locale}/area/${area.id}`} className="truncate hover:underline">
                  {area.name}
                  <span className="text-ink/50"> · {area.city}</span>
                </Link>
                <span className="shrink-0 font-mono">{area.hoursWeek}h</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="sticky top-0 z-10 border-b border-rule bg-paper px-5 py-3">
          <label className="sr-only" htmlFor="area-search">
            {messages.home.searchLabel}
          </label>
          <input
            id="area-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={messages.home.search}
            className="w-full border border-rule bg-white px-3 py-2 text-sm outline-none"
          />
          <div className="mt-2 flex gap-2" role="group" aria-label={messages.home.filters.all}>
            {(['all', 'out', 'watch'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
                className={
                  filter === key
                    ? 'border border-ink bg-ink px-2 py-1 text-xs text-paper'
                    : 'border border-rule px-2 py-1 text-xs text-ink/80'
                }
              >
                {messages.home.filters[key]}
              </button>
            ))}
          </div>
        </div>
        {visible.length === 0 ? <p className="px-5 py-6 text-sm">{messages.home.empty}</p> : null}
        {[...groups.entries()].map(([label, group]) => (
          <section key={label} className="border-b border-rule">
            <h2 className="px-5 pt-4 text-xs uppercase tracking-wide text-ink/50">{label}</h2>
            <ul>
              {group.map((area) => (
                <li key={area.id} className="border-t border-rule/80 px-5 py-3 first:border-t-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/${locale}/area/${area.id}`} className="font-serif text-xl leading-tight hover:underline">
                        {area.name}
                      </Link>
                      <p className="mt-1 font-mono text-sm text-ink/70">
                        {messages.home.nextHour} {formatPercent(locale, area.probability)}
                        <span className="text-ink/40"> · {messages.home.usual} {formatPercent(locale, area.baseline)}</span>
                      </p>
                    </div>
                    <StatusPill status={area.status} messages={messages} synthetic={area.synthetic && area.status !== 'on'} />
                  </div>
                  <div className="mt-2 h-1.5 bg-ink/10" aria-hidden="true">
                    <div className="h-full bg-signal/80" style={{ width: `${Math.min(100, (area.hoursWeek / 84) * 100)}%` }} />
                  </div>
                  <p className="mt-1 text-end font-mono text-xs text-ink/60">
                    {area.hoursWeek}h · {messages.home.hoursWeek}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </aside>
    </div>
  );
}
