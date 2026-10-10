import type { Kind } from '@barq/core';
import { copy, type BotLocale } from './copy';

export type AreaRef = {
  id: string;
  countryCode: string;
  cityId: string;
  countryNameEn: string;
  countryNameAr: string;
  cityNameEn: string;
  cityNameAr: string;
  nameEn: string;
  nameAr: string;
};

export type Button = { text: string; data: string };

export type CallbackAction =
  | { type: 'countries'; intent: 'report' | 'subscribe' }
  | { type: 'cities'; intent: 'report' | 'subscribe'; countryCode: string }
  | { type: 'areas'; intent: 'report' | 'subscribe'; cityId: string }
  | { type: 'kind'; areaId: string }
  | { type: 'report'; kind: Kind; areaId: string }
  | { type: 'thresholds'; areaId: string }
  | { type: 'subscribe'; areaId: string; threshold: number }
  | { type: 'unsubscribe'; areaId: string }
  | { type: 'unknown' };

function name(area: AreaRef, locale: BotLocale, field: 'country' | 'city' | 'area'): string {
  if (field === 'country') return locale === 'ar' ? area.countryNameAr : area.countryNameEn;
  if (field === 'city') return locale === 'ar' ? area.cityNameAr : area.cityNameEn;
  return locale === 'ar' ? area.nameAr : area.nameEn;
}

export function countryButtons(areas: AreaRef[], locale: BotLocale, intent: 'report' | 'subscribe'): Button[] {
  const prefix = intent === 'report' ? 'rc' : 'sc';
  const seen = new Map<string, string>();
  for (const area of areas) seen.set(area.countryCode, name(area, locale, 'country'));
  return [...seen.entries()].map(([code, text]) => ({ text, data: `${prefix}:${code}` }));
}

export function cityButtons(areas: AreaRef[], locale: BotLocale, intent: 'report' | 'subscribe', countryCode: string): Button[] {
  const prefix = intent === 'report' ? 'ry' : 'sy';
  const seen = new Map<string, string>();
  for (const area of areas) {
    if (area.countryCode === countryCode) seen.set(area.cityId, name(area, locale, 'city'));
  }
  return [...seen.entries()].map(([id, text]) => ({ text, data: `${prefix}:${id}` }));
}

export function areaButtons(areas: AreaRef[], locale: BotLocale, intent: 'report' | 'subscribe', cityId: string): Button[] {
  const prefix = intent === 'report' ? 'ra' : 'sa';
  return areas
    .filter((area) => area.cityId === cityId)
    .map((area) => ({ text: name(area, locale, 'area'), data: `${prefix}:${area.id}` }));
}

export function kindButtons(areaId: string, locale: BotLocale): Button[] {
  return [
    { text: copy[locale].off, data: `k:off:${areaId}` },
    { text: copy[locale].on, data: `k:on:${areaId}` },
  ];
}

export function thresholdButtons(areaId: string): Button[] {
  return [0.4, 0.55, 0.7].map((value) => ({
    text: `${Math.round(value * 100)}%`,
    data: `th:${Math.round(value * 100)}:${areaId}`,
  }));
}

export function parseCallback(data: string): CallbackAction {
  const [head, second, third] = data.split(':');
  if (head === 'rc' && second) return { type: 'cities', intent: 'report', countryCode: second };
  if (head === 'sc' && second) return { type: 'cities', intent: 'subscribe', countryCode: second };
  if (head === 'ry' && second) return { type: 'areas', intent: 'report', cityId: second };
  if (head === 'sy' && second) return { type: 'areas', intent: 'subscribe', cityId: second };
  if (head === 'ra' && second) return { type: 'kind', areaId: second };
  if (head === 'sa' && second) return { type: 'thresholds', areaId: second };
  if (head === 'k' && (second === 'off' || second === 'on') && third) return { type: 'report', kind: second, areaId: third };
  if (head === 'th' && second && third) {
    const threshold = Number(second) / 100;
    if (threshold > 0 && threshold < 1) return { type: 'subscribe', areaId: third, threshold };
  }
  if (head === 'u' && second) return { type: 'unsubscribe', areaId: second };
  return { type: 'unknown' };
}

export function areaTitle(area: AreaRef, locale: BotLocale): string {
  return `${name(area, locale, 'area')} · ${name(area, locale, 'city')}`;
}
