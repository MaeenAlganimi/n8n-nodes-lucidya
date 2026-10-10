import { localParts } from './time';

export type AreaHourStats = {
  today: number;
  total: number;
  /** Local dates inside the requested window. */
  byDay: { date: string; hours: number }[];
};

export function hoursWithoutPower(
  rows: { areaId: string; hourStart: Date; outage: 0 | 1; timezone: string }[],
  now: Date,
  days = 7,
): Map<string, AreaHourStats> {
  const windowStart = now.getTime() - days * 86_400_000;
  const buckets = new Map<string, { today: number; total: number; byDay: Map<string, number> }>();

  for (const row of rows) {
    if (row.outage !== 1) continue;
    const ms = row.hourStart.getTime();
    if (ms < windowStart || ms > now.getTime()) continue;
    const local = localParts(row.hourStart, row.timezone);
    let bucket = buckets.get(row.areaId);
    if (!bucket) {
      bucket = { today: 0, total: 0, byDay: new Map() };
      buckets.set(row.areaId, bucket);
    }
    bucket.total += 1;
    bucket.byDay.set(local.dateKey, (bucket.byDay.get(local.dateKey) ?? 0) + 1);
    if (local.dateKey === localParts(now, row.timezone).dateKey) bucket.today += 1;
  }

  const result = new Map<string, AreaHourStats>();
  for (const [areaId, bucket] of buckets) {
    const byDay = [...bucket.byDay.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, hours]) => ({ date, hours }));
    result.set(areaId, { today: bucket.today, total: bucket.total, byDay });
  }
  return result;
}
