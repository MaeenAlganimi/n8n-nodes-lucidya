import { USUAL_HOUR_INDEX, buildSamples, predictBaseline, trainBaseline, trainLogistic } from '@barq/core';
import type { ModelBundle, Repo } from './repo';

/** Fit both models on every stored hour. The published benchmark is a separate holdout. */
export async function trainFromRepo(repo: Repo, now: Date): Promise<ModelBundle> {
  const areaRows = await repo.listAreas();
  const timezoneByArea = new Map(areaRows.map((area) => [area.id, area.timezone]));
  const hours = await repo.allHours();
  const samples = buildSamples(
    hours.map((hour) => ({
      areaId: hour.areaId,
      hourStart: hour.hourStart,
      outage: hour.outage === 1 ? 1 : 0,
      temperatureC: hour.temperatureC,
      timezone: timezoneByArea.get(hour.areaId) ?? 'UTC',
    })),
  );
  const baseline = trainBaseline(samples);
  const ready = samples.map((sample) => {
    const x = sample.x.slice();
    x[USUAL_HOUR_INDEX] = predictBaseline(baseline, sample.areaId, sample.dow, sample.localHour);
    return { ...sample, x };
  });
  const logistic = trainLogistic(ready);
  const bundle: ModelBundle = {
    logistic,
    baseline,
    trainedAt: now.toISOString(),
    trainRows: ready.length,
  };
  await repo.saveModel(bundle, now);
  return bundle;
}
