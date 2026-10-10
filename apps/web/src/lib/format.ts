export function formatPercent(locale: string, value: number): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
    numberingSystem: 'latn',
  }).format(value);
}

export function formatNumber(locale: string, value: number, digits = 0): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
    numberingSystem: 'latn',
  }).format(value);
}

export function formatHour(locale: string, iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    numberingSystem: 'latn',
  }).format(new Date(iso));
}

export function formatDay(locale: string, isoOrDate: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    month: 'short',
    day: 'numeric',
    numberingSystem: 'latn',
  }).format(new Date(isoOrDate));
}

export function formatRange(locale: string, startIso: string, endIso: string | null, timeZone: string, ongoing: string): string {
  const start = formatHour(locale, startIso, timeZone);
  const day = formatDay(locale, startIso, timeZone);
  if (!endIso) return `${day} · ${start} – ${ongoing}`;
  return `${day} · ${start} – ${formatHour(locale, endIso, timeZone)}`;
}

export function formatWhen(locale: string, iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    numberingSystem: 'latn',
  }).format(new Date(iso));
}
