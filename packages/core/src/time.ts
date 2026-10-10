const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = formatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hourCycle: 'h23',
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    formatters.set(timeZone, fmt);
  }
  return fmt;
}

export type LocalParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  /** 0 Sunday … 6 Saturday, in the given timezone. */
  dow: number;
  dayOfYear: number;
  /** YYYY-MM-DD in the given timezone. */
  dateKey: string;
};

export function localParts(date: Date, timeZone: string): LocalParts {
  const bag: Record<string, string> = {};
  for (const part of formatter(timeZone).formatToParts(date)) {
    if (part.type !== 'literal') bag[part.type] = part.value;
  }
  const year = Number(bag.year);
  const month = Number(bag.month);
  const day = Number(bag.day);
  let hour = Number(bag.hour);
  if (hour === 24) hour = 0;
  const dow = WEEKDAYS.indexOf(bag.weekday as (typeof WEEKDAYS)[number]);
  const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return {
    year,
    month,
    day,
    hour,
    dow: dow < 0 ? 0 : dow,
    dayOfYear: dayOfYear(year, month, day),
    dateKey,
  };
}

export function dayOfYear(year: number, month: number, day: number): number {
  const start = Date.UTC(year, 0, 1);
  const current = Date.UTC(year, month - 1, day);
  return Math.floor((current - start) / 86_400_000) + 1;
}

export function floorToHour(date: Date): Date {
  const ms = date.getTime();
  return new Date(ms - (ms % 3_600_000));
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3_600_000);
}

/** Share of the UTC hour overlapped by [startMs, endMs). */
export function hourOverlapFraction(hourStartMs: number, startMs: number, endMs: number): number {
  const overlap = Math.min(hourStartMs + 3_600_000, endMs) - Math.max(hourStartMs, startMs);
  if (overlap <= 0) return 0;
  return overlap / 3_600_000;
}

/** An hour counts as outage when at least 30 minutes of it are covered. */
export function hourIsOutage(hourStartMs: number, startMs: number, endMs: number): 0 | 1 {
  return hourOverlapFraction(hourStartMs, startMs, endMs) >= 0.5 ? 1 : 0;
}

/**
 * Smooth seasonal temperature in °C for a latitude.
 * Northern-hemisphere summer peaks near day 200. Used when Open-Meteo is
 * unreachable, and as the climate the demo history is built from.
 */
export function climatologyTemp(latitude: number, day: number, hour: number): number {
  const annual = Math.cos(((day - 200) / 365) * 2 * Math.PI);
  const hemisphere = latitude >= 0 ? 1 : -1;
  const mean = 26 - Math.abs(latitude) * 0.45 + hemisphere * annual * 7;
  const diurnal = Math.sin(((hour - 9) / 24) * 2 * Math.PI) * 5;
  return mean + diurnal;
}
