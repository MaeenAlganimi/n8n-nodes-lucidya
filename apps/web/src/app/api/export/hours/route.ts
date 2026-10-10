import { json } from '@/lib/http';
import { getApp } from '@/lib/services';

export const runtime = 'nodejs';

const MAX_SPAN = 120 * 86_400_000;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = new Date(url.searchParams.get('from') ?? '');
  const to = new Date(url.searchParams.get('to') ?? '');
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from || to.getTime() - from.getTime() > MAX_SPAN) {
    return json({ error: { code: 'bad_range', message: 'from and to must be a range of at most 120 days' } }, 400);
  }
  const areaId = url.searchParams.get('areaId') ?? undefined;
  const app = await getApp();
  if (areaId) {
    const area = await app.repo.getArea(areaId);
    if (!area) return json({ error: { code: 'unknown_area' } }, 404);
  }
  const hours = await app.repo.hoursSince(from, areaId);
  const end = to.getTime();
  return json({
    from: from.toISOString(),
    to: to.toISOString(),
    hours: hours
      .filter((hour) => hour.hourStart.getTime() < end)
      .map((hour) => ({
        areaId: hour.areaId,
        hourStart: hour.hourStart.toISOString(),
        outage: hour.outage,
        temperatureC: hour.temperatureC,
      })),
  });
}
