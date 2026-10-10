import { json } from '@/lib/http';
import { getApp } from '@/lib/services';

export const runtime = 'nodejs';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const days = Math.min(120, Math.max(1, Number(new URL(request.url).searchParams.get('days') ?? 21) || 21));
  const app = await getApp();
  const area = await app.repo.getArea(id);
  if (!area) return json({ error: { code: 'unknown_area' } }, 404);
  const rows = await app.repo.listOutages({ areaId: id, since: new Date(Date.now() - days * 86_400_000) });
  return json({
    areaId: id,
    outages: rows.map((outage) => ({
      id: outage.id,
      status: outage.status,
      startedAt: outage.startedAt.toISOString(),
      endedAt: outage.endedAt ? outage.endedAt.toISOString() : null,
      distinctReporters: outage.distinctReporters,
      synthetic: outage.synthetic,
    })),
  });
}
