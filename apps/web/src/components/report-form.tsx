'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import type { Locale } from '@/i18n';
import type { Messages } from '@/i18n/en';
import type { ReportChoice } from '@/components/types';

const DEVICE_KEY = 'barq.deviceId.v1';

function deviceId(): string {
  const existing = window.localStorage.getItem(DEVICE_KEY);
  if (existing && /^[A-Za-z0-9-]{8,80}$/.test(existing)) return existing;
  const created = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_KEY, created);
  return created;
}

type Result =
  | { ok: true; code: 'recorded' | 'confirmed' | 'resolved' | 'dismissed'; areaId: string }
  | { ok: false; code: 'duplicate' | 'too_fast' | 'daily_cap' | 'unknown_area' | 'bad' };

export function ReportForm({
  areas,
  locale,
  messages,
  initialAreaId,
}: {
  areas: ReportChoice[];
  locale: Locale;
  messages: Messages;
  initialAreaId?: string;
}) {
  const initial = areas.find((area) => area.id === initialAreaId) ?? null;
  const [country, setCountry] = useState(initial?.countryCode ?? '');
  const [city, setCity] = useState(initial?.cityId ?? '');
  const [areaId, setAreaId] = useState(initial?.id ?? '');
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  const countries = useMemo(() => {
    const seen = new Map<string, string>();
    for (const area of areas) seen.set(area.countryCode, area.country);
    return [...seen.entries()];
  }, [areas]);
  const cities = useMemo(() => {
    const seen = new Map<string, string>();
    for (const area of areas) {
      if (area.countryCode === country) seen.set(area.cityId, area.city);
    }
    return [...seen.entries()];
  }, [areas, country]);
  const neighbourhoods = areas.filter((area) => area.cityId === city);

  function submit(kind: 'off' | 'on') {
    if (!areaId) {
      setResult({ ok: false, code: 'bad' });
      return;
    }
    startTransition(async () => {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ areaId, kind, deviceId: deviceId() }),
      });
      const body = (await response.json()) as { code?: Result['code'] };
      const code = body.code;
      if (code === 'recorded' || code === 'confirmed' || code === 'resolved' || code === 'dismissed') {
        setResult({ ok: true, code, areaId });
        return;
      }
      if (code === 'duplicate' || code === 'too_fast' || code === 'daily_cap' || code === 'unknown_area') {
        setResult({ ok: false, code });
        return;
      }
      setResult({ ok: false, code: 'bad' });
    });
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <div>
        <label htmlFor="country" className="block text-sm">
          {messages.report.country}
        </label>
        <select
          id="country"
          value={country}
          onChange={(event) => {
            setCountry(event.target.value);
            setCity('');
            setAreaId('');
          }}
          className="mt-1 w-full border border-rule bg-white px-3 py-2"
        >
          <option value="">{messages.report.choose}</option>
          {countries.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="city" className="block text-sm">
          {messages.report.city}
        </label>
        <select
          id="city"
          value={city}
          disabled={!country}
          onChange={(event) => {
            setCity(event.target.value);
            setAreaId('');
          }}
          className="mt-1 w-full border border-rule bg-white px-3 py-2 disabled:opacity-50"
        >
          <option value="">{messages.report.choose}</option>
          {cities.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="neighbourhood" className="block text-sm">
          {messages.report.neighbourhood}
        </label>
        <select
          id="neighbourhood"
          value={areaId}
          disabled={!city}
          onChange={(event) => setAreaId(event.target.value)}
          className="mt-1 w-full border border-rule bg-white px-3 py-2 disabled:opacity-50"
        >
          <option value="">{messages.report.choose}</option>
          {neighbourhoods.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => submit('off')}
          className="border border-signal bg-signal px-4 py-4 text-paper disabled:opacity-60"
        >
          {pending ? messages.report.sending : messages.report.off}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => submit('on')}
          className="border border-sage bg-sage px-4 py-4 text-paper disabled:opacity-60"
        >
          {pending ? messages.report.sending : messages.report.on}
        </button>
      </div>
      <p role="status" aria-live="polite" className="min-h-6 text-sm">
        {result ? messages.report[result.code] : null}{' '}
        {result?.ok ? (
          <Link href={`/${locale}/area/${result.areaId}`} className="underline">
            {messages.report.viewArea}
          </Link>
        ) : null}
      </p>
    </form>
  );
}
