import { describe, expect, it } from 'vitest';
import { hourIsOutage, localParts } from './time';
import { meteoStampToIso, openMeteoForecastUrl, parseOpenMeteoHourly } from './weather';

describe('time and weather helpers', () => {
  it('labels an hour out only when at least half of it is covered', () => {
    const hour = Date.parse('2026-01-01T00:00:00.000Z');
    expect(hourIsOutage(hour, hour, hour + 29 * 60_000)).toBe(0);
    expect(hourIsOutage(hour, hour, hour + 30 * 60_000)).toBe(1);
    expect(hourIsOutage(hour, hour + 40 * 60_000, hour + 3_600_000)).toBe(0);
  });

  it('reads local hour in a city timezone', () => {
    const parts = localParts(new Date('2026-01-15T18:00:00.000Z'), 'Africa/Tripoli');
    expect(parts.hour).toBe(20);
    expect(parts.dateKey).toBe('2026-01-15');
  });

  it('parses Open-Meteo hours and builds a keyless forecast URL', () => {
    const url = openMeteoForecastUrl(32.8758, 13.1525);
    expect(url).toContain('latitude=32.8758');
    expect(url).not.toContain('apikey');
    expect(meteoStampToIso('2026-10-10T18:00')).toBe('2026-10-10T18:00:00.000Z');
    const parsed = parseOpenMeteoHourly({
      hourly: { time: ['2026-10-10T18:00', 'bad'], temperature_2m: [31.2, 'x'] },
    });
    expect(parsed.get('2026-10-10T18:00:00.000Z')).toBe(31.2);
    expect(parsed.size).toBe(1);
  });
});
