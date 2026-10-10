import { NextResponse } from 'next/server';
import type { AreaRow } from '@barq/db';
import type { Locale } from '@/i18n';

export const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'cache-control': 'no-store',
};

export function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export function requestedLocale(request: Request): Locale {
  const lang = new URL(request.url).searchParams.get('lang');
  return lang === 'ar' ? 'ar' : 'en';
}

export function presentArea(area: AreaRow, locale: Locale) {
  return {
    id: area.id,
    countryCode: area.countryCode,
    country: locale === 'ar' ? area.countryNameAr : area.countryNameEn,
    city: locale === 'ar' ? area.cityNameAr : area.cityNameEn,
    cityId: area.cityId,
    name: locale === 'ar' ? area.nameAr : area.nameEn,
    latitude: area.latitude,
    longitude: area.longitude,
    timezone: area.timezone,
  };
}

export async function readArea(id: string) {
  const app = await (await import('@/lib/services')).getApp();
  const area = await app.repo.getArea(id);
  return { app, area };
}
