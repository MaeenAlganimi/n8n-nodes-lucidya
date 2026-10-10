import { json, presentArea, requestedLocale } from '@/lib/http';
import { getApp } from '@/lib/services';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const app = await getApp();
  const locale = requestedLocale(request);
  const areas = await app.repo.listAreas();
  return json({ areas: areas.map((area) => presentArea(area, locale)) });
}
