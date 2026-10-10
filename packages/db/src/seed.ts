import { PLACES, generateHistory, type Place } from '@barq/core';
import type { Repo } from './repo';
import { trainFromRepo } from './train';

export const DEMO_DAYS = 84;
export const DEMO_SEED = 20261010;

export type SeedOptions = {
  now?: Date;
  days?: number;
  places?: Place[];
  ensureActive?: number;
  seed?: number;
};

/**
 * Loads sample neighbourhoods and a synthetic outage history.
 * Safe to call only on an empty database. Rows are marked synthetic.
 */
export async function seedDemo(repo: Repo, options: SeedOptions = {}): Promise<{ areas: number; hours: number; outages: number }> {
  const now = options.now ?? new Date();
  const places = options.places ?? PLACES;
  const generated = generateHistory(
    places.map((place) => ({
      id: place.id,
      latitude: place.latitude,
      timezone: place.timezone,
      stress: place.stress,
      schedule: place.schedule,
    })),
    {
      now,
      days: options.days ?? DEMO_DAYS,
      seed: options.seed ?? DEMO_SEED,
      ensureActive: options.ensureActive ?? 5,
    },
  );

  await repo.transaction(async (tx) => {
    await tx.insertAreas(
      places.map((place) => ({
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
      })),
    );
    await tx.insertHours(
      generated.hours.map((hour) => ({
        areaId: hour.areaId,
        hourStart: hour.hourStart,
        outage: hour.outage,
        temperatureC: hour.temperatureC,
      })),
    );
    await tx.insertOutages(
      generated.outages.map((outage) => ({
        id: `synthetic:${outage.areaId}:${outage.startedAt.toISOString()}`,
        areaId: outage.areaId,
        status: outage.endedAt ? 'resolved' : 'confirmed',
        startedAt: outage.startedAt,
        endedAt: outage.endedAt,
        distinctReporters: 0,
        synthetic: true,
        updatedAt: now,
      })),
    );
    await tx.setMeta('synthetic', 'true');
    await tx.setMeta(
      'synthetic_note',
      'Demo history is generated. Neighbourhood names and coordinates are real; outage times are not reports from those places.',
    );
  });

  await trainFromRepo(repo, now);
  return { areas: places.length, hours: generated.hours.length, outages: generated.outages.length };
}
