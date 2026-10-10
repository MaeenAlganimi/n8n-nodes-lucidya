import { PLACES } from '@barq/core';
import { afterEach, describe, expect, it } from 'vitest';
import { createBarqApp, type BarqApp } from './app';
import { createRepo } from './repo';
import { openDatabase } from './client';
import { seedDemo } from './seed';

const place = PLACES[0];

async function emptyApp(): Promise<BarqApp> {
  return createBarqApp({ DATABASE_URL: 'memory', SEED_SYNTHETIC: 'false', BARQ_SKIP_WEATHER: '1' });
}

describe('ingest and demo database', () => {
  const opened: BarqApp[] = [];

  afterEach(async () => {
    while (opened.length > 0) {
      const app = opened.pop();
      if (app) await app.close();
    }
  });

  it('confirms an outage on the second independent report and ignores a duplicate', async () => {
    const app = await emptyApp();
    opened.push(app);
    await app.repo.insertAreas([
      {
        id: place.id,
        countryCode: place.countryCode,
        countryNameEn: place.countryNameEn,
        countryNameAr: place.countryNameAr,
        cityId: place.cityId,
        cityNameEn: place.cityNameEn,
        cityNameAr: place.cityNameAr,
        nameEn: place.nameEn,
        nameAr: place.nameAr,
        latitude: place.latitude,
        longitude: place.longitude,
        timezone: place.timezone,
      },
    ]);
    const now = new Date('2026-06-15T18:00:00.000Z');
    const first = await app.ingest({
      areaId: place.id,
      kind: 'off',
      reporterKey: 'person-a',
      source: 'web',
      now,
    });
    expect(first).toMatchObject({ accepted: true, code: 'recorded' });

    const duplicate = await app.ingest({
      areaId: place.id,
      kind: 'off',
      reporterKey: 'person-a',
      source: 'web',
      now: new Date(now.getTime() + 5 * 60_000),
    });
    expect(duplicate).toMatchObject({ accepted: false, code: 'duplicate' });

    const second = await app.ingest({
      areaId: place.id,
      kind: 'off',
      reporterKey: 'person-b',
      source: 'telegram',
      now: new Date(now.getTime() + 40 * 60_000),
    });
    expect(second).toMatchObject({ accepted: true, code: 'confirmed', distinctReporters: 2 });

    const active = await app.repo.activeOutage(place.id);
    expect(active?.status).toBe('confirmed');
    expect(active?.synthetic).toBe(false);
    const hours = await app.repo.hoursSince(new Date('2026-06-15T00:00:00.000Z'), place.id);
    expect(hours.some((hour) => hour.outage === 1)).toBe(true);
  });

  it('seeds synthetic history, forecasts 24 hours, and does not seed twice', async () => {
    const database = await openDatabase({ DATABASE_URL: 'memory', SEED_SYNTHETIC: 'false' });
    const repo = createRepo(database.db);
    const first = await seedDemo(repo, {
      now: new Date('2026-06-15T12:00:00.000Z'),
      days: 36,
      places: PLACES.slice(0, 3),
      ensureActive: 1,
    });
    expect(first.areas).toBe(3);
    expect(await repo.getMeta('synthetic')).toBe('true');
    expect(await repo.countAreas()).toBe(3);

    const stored = await repo.loadModel();
    expect(stored?.trainRows).toBeGreaterThan(0);

    const { forecastSlots } = await import('@barq/core');
    const area = await repo.getArea(PLACES[0].id);
    const history = await repo.hoursSince(new Date('2026-06-01T00:00:00.000Z'), PLACES[0].id);
    expect(area).not.toBeNull();
    expect(stored).not.toBeNull();
    if (!area || !stored) return;
    const slots = forecastSlots({
      areaId: area.id,
      latitude: area.latitude,
      timezone: area.timezone,
      logistic: stored.logistic,
      baseline: stored.baseline,
      history: history.map((hour) => ({
        areaId: hour.areaId,
        hourStart: hour.hourStart,
        outage: hour.outage === 1 ? 1 : 0,
        temperatureC: hour.temperatureC,
        timezone: area.timezone,
      })),
      origin: new Date('2026-06-15T12:00:00.000Z'),
      hours: 24,
    });
    expect(slots).toHaveLength(24);
    for (const slot of slots) {
      expect(slot.probability).toBeGreaterThanOrEqual(0);
      expect(slot.probability).toBeLessThanOrEqual(1);
      expect(slot.factors.length).toBeGreaterThan(0);
    }
    const active = await repo.listOutages({ statuses: ['confirmed'] });
    expect(active.length).toBeGreaterThan(0);
    expect(active.every((outage) => outage.synthetic)).toBe(true);
    await database.close();
  });
});
