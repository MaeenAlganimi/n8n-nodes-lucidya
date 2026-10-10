import { json } from '@/lib/http';
import { getApp } from '@/lib/services';

export const runtime = 'nodejs';

export async function GET() {
  const app = await getApp();
  const synthetic = (await app.repo.getMeta('synthetic')) === 'true';
  return json({ ok: true, demo: app.demo, synthetic });
}
