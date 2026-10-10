import { json } from '@/lib/http';
import { getApp } from '@/lib/services';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const app = await getApp();
  const forecast = await app.forecastArea(id);
  if (!forecast) return json({ error: { code: 'unknown_area' } }, 404);
  return json(forecast);
}
