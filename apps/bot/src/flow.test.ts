import { describe, expect, it } from 'vitest';
import { areaButtons, countryButtons, kindButtons, parseCallback, thresholdButtons, type AreaRef } from './flow';

const areas: AreaRef[] = [
  {
    id: 'ly-tri-and',
    countryCode: 'LY',
    cityId: 'ly-tri',
    countryNameEn: 'Libya',
    countryNameAr: 'ليبيا',
    cityNameEn: 'Tripoli',
    cityNameAr: 'طرابلس',
    nameEn: 'Hay Al-Andalus',
    nameAr: 'حي الأندلس',
  },
  {
    id: 'za-cpt-woo',
    countryCode: 'ZA',
    cityId: 'za-cpt',
    countryNameEn: 'South Africa',
    countryNameAr: 'جنوب أفريقيا',
    cityNameEn: 'Cape Town',
    cityNameAr: 'كيب تاون',
    nameEn: 'Woodstock',
    nameAr: 'وودستوك',
  },
];

describe('telegram callbacks', () => {
  it('walks country to city to neighbourhood without hard-coding a country', () => {
    const countries = countryButtons(areas, 'ar', 'report');
    expect(countries.map((button) => button.text)).toEqual(['ليبيا', 'جنوب أفريقيا']);
    expect(parseCallback(countries[0]?.data ?? '')).toEqual({ type: 'cities', intent: 'report', countryCode: 'LY' });
    const neighbourhoods = areaButtons(areas, 'en', 'subscribe', 'za-cpt');
    expect(neighbourhoods[0]?.text).toBe('Woodstock');
    expect(parseCallback('sa:za-cpt-woo')).toEqual({ type: 'thresholds', areaId: 'za-cpt-woo' });
    expect(parseCallback(kindButtons('ly-tri-and', 'en')[0]?.data ?? '')).toEqual({
      type: 'report',
      kind: 'off',
      areaId: 'ly-tri-and',
    });
    expect(parseCallback(thresholdButtons('ly-tri-and')[1]?.data ?? '')).toEqual({
      type: 'subscribe',
      areaId: 'ly-tri-and',
      threshold: 0.55,
    });
  });

  it('keeps callback data inside Telegram’s 64-byte limit', () => {
    const buttons = [
      ...countryButtons(areas, 'en', 'report'),
      ...kindButtons('ye-sah-old', 'ar'),
      ...thresholdButtons('za-cpt-kha'),
    ];
    for (const button of buttons) expect(Buffer.byteLength(button.data)).toBeLessThanOrEqual(64);
  });
});
