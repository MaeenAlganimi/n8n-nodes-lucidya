import { json, presentArea, requestedLocale } from '@/lib/http';
import { getApp } from '@/lib/services';

export const runtime = 'nodejs';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const app = await getApp();
  const area = await app.repo.getArea(id);
  if (!area) return json({ error: { code: 'unknown_area' } }, 404);
  return json({ area: presentArea(area, requestedLocale(request)) });
}
