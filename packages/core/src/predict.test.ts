import { describe, expect, it } from 'vitest';
import published from '../../../docs/model-metrics.json';
import { predictBaseline, trainBaseline } from './baseline';
import { runPublishedBenchmark } from './benchmark';
import { buildFutureFeatures, buildSamples, featureVector, type HourObservation, type Sample } from './features';
import { predictLogistic, trainLogistic } from './logistic';
import { PLACES } from './places';
import { addHours } from './time';

function sample(partial: Partial<Sample> & Pick<Sample, 'y' | 'x' | 'localHour'>): Sample {
  return {
    areaId: 'a',
    hourStart: new Date('2026-01-01T00:00:00.000Z'),
    dow: 0,
    ...partial,
  };
}

describe('baseline', () => {
  it('learns a repeating hour and shrinks rare hours toward the base rate', () => {
    const samples: Sample[] = [];
    for (let day = 0; day < 28; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const y = hour === 18 ? 1 : 0;
        samples.push(
          sample({
            y,
            localHour: hour,
            dow: day % 7,
            hourStart: new Date(Date.UTC(2026, 0, 1 + day, hour)),
            x: featureVector({ hour, dow: day % 7, rate24: 0, rate7: 0, sameHourWeekAgo: 0, tempC: 25 }),
          }),
        );
      }
    }
    const model = trainBaseline(samples, 365);
    expect(predictBaseline(model, 'a', 3, 18)).toBeGreaterThan(0.8);
    expect(predictBaseline(model, 'a', 3, 3)).toBeLessThan(0.1);
    expect(predictBaseline(model, 'missing', 0, 0)).toBeCloseTo(model.prior, 6);
  });
});

describe('logistic regression', () => {
  it('separates evening hours from the rest', () => {
    const samples: Sample[] = [];
    for (let i = 0; i < 24 * 40; i++) {
      const hour = i % 24;
      const evening = hour >= 18 && hour <= 21 ? 1 : 0;
      const x = featureVector({
        hour,
        dow: Math.floor(i / 24) % 7,
        rate24: evening ? 0.7 : 0.05,
        rate7: 0.15,
        sameHourWeekAgo: evening,
        tempC: 28,
      });
      samples.push(
        sample({
          y: evening,
          x,
          localHour: hour,
          dow: Math.floor(i / 24) % 7,
          hourStart: new Date(Date.UTC(2026, 0, 1) + i * 3_600_000),
        }),
      );
    }
    const model = trainLogistic(samples);
    const evening = predictLogistic(
      model,
      featureVector({ hour: 19, dow: 2, rate24: 0.7, rate7: 0.15, sameHourWeekAgo: 1, tempC: 28 }),
    );
    const morning = predictLogistic(
      model,
      featureVector({ hour: 8, dow: 2, rate24: 0.05, rate7: 0.15, sameHourWeekAgo: 0, tempC: 28 }),
    );
    expect(evening).toBeGreaterThan(0.8);
    expect(morning).toBeLessThan(0.2);
    const again = trainLogistic(samples);
    expect(again.weights).toEqual(model.weights);
  });
});

describe('features', () => {
  it('does not include the target hour in the recent-outage rate', () => {
    const origin = new Date('2026-04-01T00:00:00.000Z');
    const history: HourObservation[] = [];
    for (let i = 0; i < 24; i++) {
      history.push({
        areaId: 'a',
        hourStart: addHours(origin, -(24 - i)),
        outage: 1,
        temperatureC: 30,
        timezone: 'UTC',
      });
    }
    history.push({ areaId: 'a', hourStart: origin, outage: 0, temperatureC: 30, timezone: 'UTC' });
    const x = buildFutureFeatures({
      history,
      timezone: 'UTC',
      target: origin,
      origin,
      temperatureC: 30,
    });
    expect(x[5]).toBe(1);
  });

  it('builds samples only from hours before the label', () => {
    const rows: HourObservation[] = [];
    const start = new Date('2026-01-01T00:00:00.000Z');
    for (let i = 0; i < 24 * 8; i++) {
      rows.push({
        areaId: 'a',
        hourStart: addHours(start, i),
        outage: i === 24 * 8 - 1 ? 0 : 1,
        temperatureC: 20,
        timezone: 'UTC',
      });
    }
    const samples = buildSamples(rows);
    const last = samples[samples.length - 1];
    expect(last.y).toBe(0);
    expect(last.x[5]).toBe(1);
  });
});

describe('published benchmark', () => {
  it('beats a constant forecast on a time-based holdout', () => {
    const report = runPublishedBenchmark();
    expect(report.logistic.auc).not.toBeNull();
    expect(report.baseline.auc).not.toBeNull();
    expect(report.logistic.auc ?? 0).toBeGreaterThan(0.73);
    expect(report.baseline.auc ?? 0).toBeGreaterThan(0.7);
    expect(report.logistic.brier).toBeLessThan(report.constant.brier);
    expect(report.baseline.brier).toBeLessThan(report.constant.brier);
    expect(report.logistic.brier).toBeLessThan(report.baseline.brier);
    expect(report.logistic.brier).toBeCloseTo(published.logistic.brier, 4);
    expect(report.logistic.auc ?? 0).toBeCloseTo(published.logistic.auc, 4);
    expect(report.baseline.auc ?? 0).toBeCloseTo(published.baseline.auc, 4);
    expect(report.testDays).toBe(14);
    expect(PLACES.length).toBeGreaterThan(20);
  }, 60_000);

  it('is deterministic', () => {
    const first = runPublishedBenchmark();
    const second = runPublishedBenchmark();
    expect(second.logistic.brier).toBe(first.logistic.brier);
    expect(second.logistic.auc).toBe(first.logistic.auc);
    expect(second.baseline.brier).toBe(first.baseline.brier);
  }, 60_000);
});
