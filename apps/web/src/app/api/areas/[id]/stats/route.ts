import { hoursWithoutPower } from '@barq/core';
import { json } from '@/lib/http';
import { getApp } from '@/lib/services';

export const runtime = 'nodejs';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const days = Math.min(60, Math.max(1, Number(new URL(request.url).searchParams.get('days') ?? 7) || 7));
  const app = await getApp();
  const area = await app.repo.getArea(id);
  if (!area) return json({ error: { code: 'unknown_area' } }, 404);
  const now = new Date();
  const hours = await app.repo.hoursSince(new Date(now.getTime() - days * 86_400_000), id);
  const stats = hoursWithoutPower(
    hours.map((hour) => ({
      areaId: hour.areaId,
      hourStart: hour.hourStart,
      outage: hour.outage === 1 ? 1 : 0,
      timezone: area.timezone,
    })),
    now,
    days,
  ).get(id);
  return json({
    areaId: id,
    timezone: area.timezone,
    days,
    today: stats?.today ?? 0,
    total: stats?.total ?? 0,
    byDay: stats?.byDay ?? [],
  });
}
