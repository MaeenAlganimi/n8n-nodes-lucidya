import { z } from 'zod';
import { json } from '@/lib/http';
import { getApp } from '@/lib/services';

export const runtime = 'nodejs';

const bodySchema = z.object({
  areaId: z.string().min(1).max(80),
  kind: z.enum(['off', 'on']),
  deviceId: z.string().regex(/^[A-Za-z0-9-]{8,80}$/),
});

const statusFor = {
  unknown_area: 404,
  duplicate: 409,
  too_fast: 429,
  daily_cap: 429,
} as const;

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: { code: 'bad_request' } }, 400);
  }
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) return json({ error: { code: 'bad_request' } }, 400);
  const app = await getApp();
  const result = await app.ingest({
    areaId: parsed.data.areaId,
    kind: parsed.data.kind,
    reporterKey: app.hashReporter('web', parsed.data.deviceId),
    source: 'web',
  });
  if (!result.accepted) {
    const status = statusFor[result.code];
    return json({ accepted: false, code: result.code }, status);
  }
  return json({
    accepted: true,
    code: result.code,
    outageId: result.outageId,
    distinctReporters: result.distinctReporters,
  });
}
