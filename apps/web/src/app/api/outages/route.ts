import { json } from '@/lib/http';
import { getApp } from '@/lib/services';

export const runtime = 'nodejs';

function present(outage: {
  id: string;
  areaId: string;
  status: string;
  startedAt: Date;
  endedAt: Date | null;
  distinctReporters: number;
  synthetic: boolean;
}) {
  return {
    id: outage.id,
    areaId: outage.areaId,
    status: outage.status,
    startedAt: outage.startedAt.toISOString(),
    endedAt: outage.endedAt ? outage.endedAt.toISOString() : null,
    distinctReporters: outage.distinctReporters,
    synthetic: outage.synthetic,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status') ?? 'active';
  const areaId = url.searchParams.get('areaId') ?? undefined;
  const app = await getApp();
  if (status === 'active') {
    const rows = await app.repo.listOutages({ statuses: ['confirmed', 'unconfirmed'], areaId });
    return json({ outages: rows.map(present) });
  }
  if (status === 'recent') {
    const since = new Date(Date.now() - 21 * 86_400_000);
    const rows = await app.repo.listOutages({ areaId, since });
    return json({ outages: rows.map(present) });
  }
  const rows = await app.repo.listOutages({ areaId });
  return json({ outages: rows.map(present) });
}
