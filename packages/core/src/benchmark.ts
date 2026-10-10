import { PLACES, PUBLISHED_EVAL } from './places';
import { evaluateObservations, type EvalReport } from './predict';
import { generateHistory } from './synthetic';

export type PublishedBenchmark = EvalReport & {
  now: string;
  days: number;
  seed: number;
  areas: number;
  note: string;
};

/** Held-out score of both models on the synthetic generator. No live data, no network. */
export function runPublishedBenchmark(): PublishedBenchmark {
  const now = new Date(PUBLISHED_EVAL.now);
  const { hours } = generateHistory(
    PLACES.map((place) => ({
      id: place.id,
      latitude: place.latitude,
      timezone: place.timezone,
      stress: place.stress,
      schedule: place.schedule,
    })),
    { now, days: PUBLISHED_EVAL.days, seed: PUBLISHED_EVAL.seed },
  );
  const timezoneByArea = new Map(PLACES.map((place) => [place.id, place.timezone]));
  const report = evaluateObservations(
    hours.map((hour) => ({
      areaId: hour.areaId,
      hourStart: hour.hourStart,
      outage: hour.outage,
      temperatureC: hour.temperatureC,
      timezone: timezoneByArea.get(hour.areaId) ?? 'UTC',
    })),
    PUBLISHED_EVAL.testDays,
  );
  return {
    ...report,
    now: PUBLISHED_EVAL.now,
    days: PUBLISHED_EVAL.days,
    seed: PUBLISHED_EVAL.seed,
    areas: PLACES.length,
    note: 'Synthetic history with a time-based holdout. The last 14 days are scored; they are not used to fit either model.',
  };
}
