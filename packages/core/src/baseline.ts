import type { Sample } from './features';

export type BaselineModel = {
  kind: 'recency_weighted_hour_of_week';
  halfLifeDays: number;
  /** Share of training hours that were outages. Used as a prior. */
  prior: number;
  byArea: Record<string, { sumW: number[]; sumWY: number[] }>;
};

/**
 * Per neighbourhood, per hour-of-week, the recency-weighted outage frequency.
 * A 21-day half-life means a month-old hour counts about half as much as yesterday.
 * Areas or hours with little data shrink toward the training base rate.
 */
export function trainBaseline(samples: Sample[], halfLifeDays = 21): BaselineModel {
  let positives = 0;
  for (const sample of samples) positives += sample.y;
  const prior = samples.length === 0 ? 0.2 : positives / samples.length;
  const newest = samples.length === 0 ? 0 : samples[samples.length - 1].hourStart.getTime();
  const byArea: BaselineModel['byArea'] = {};

  for (const sample of samples) {
    let bucket = byArea[sample.areaId];
    if (!bucket) {
      bucket = { sumW: new Array<number>(168).fill(0), sumWY: new Array<number>(168).fill(0) };
      byArea[sample.areaId] = bucket;
    }
    const ageDays = (newest - sample.hourStart.getTime()) / 86_400_000;
    const weight = Math.exp((-Math.LN2 * ageDays) / halfLifeDays);
    const index = sample.dow * 24 + sample.localHour;
    bucket.sumW[index] += weight;
    bucket.sumWY[index] += weight * sample.y;
  }

  return { kind: 'recency_weighted_hour_of_week', halfLifeDays, prior, byArea };
}

export function predictBaseline(model: BaselineModel, areaId: string, dow: number, hour: number): number {
  const bucket = model.byArea[areaId];
  if (!bucket) return model.prior;
  const index = dow * 24 + hour;
  const alpha = 1;
  return (bucket.sumWY[index] + alpha * model.prior) / (bucket.sumW[index] + alpha);
}
