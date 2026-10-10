import { predictBaseline, trainBaseline, type BaselineModel } from './baseline';
import {
  USUAL_HOUR_INDEX,
  buildFutureFeatures,
  buildSamples,
  factorContributions,
  type Factor,
  type HourObservation,
  type Sample,
} from './features';
import { predictLogistic, trainLogistic, type LogisticModel } from './logistic';
import { brierScore, calibration, rocAuc, roundTo, type CalibrationBin } from './metrics';
import { addHours, climatologyTemp, floorToHour, localParts } from './time';

export type ForecastSlot = {
  start: string;
  probability: number;
  baselineProbability: number;
  factors: Factor[];
};

export function forecastSlots(input: {
  areaId: string;
  latitude: number;
  timezone: string;
  logistic: LogisticModel;
  baseline: BaselineModel;
  history: HourObservation[];
  origin: Date;
  hours: number;
  /** ISO hour → °C. Missing hours fall back to the seasonal curve. */
  observedTemperature?: ReadonlyMap<string, number>;
}): ForecastSlot[] {
  const origin = floorToHour(input.origin);
  const slots: ForecastSlot[] = [];
  for (let step = 0; step < input.hours; step++) {
    const target = addHours(origin, step);
    const iso = target.toISOString();
    const local = localParts(target, input.timezone);
    const observed = input.observedTemperature?.get(iso);
    const temperatureC = observed ?? climatologyTemp(input.latitude, local.dayOfYear, local.hour);
    const x = buildFutureFeatures({
      history: input.history,
      timezone: input.timezone,
      target,
      origin,
      temperatureC,
    });
    x[USUAL_HOUR_INDEX] = predictBaseline(input.baseline, input.areaId, local.dow, local.hour);
    slots.push({
      start: iso,
      probability: roundTo(predictLogistic(input.logistic, x), 4),
      baselineProbability: roundTo(predictBaseline(input.baseline, input.areaId, local.dow, local.hour), 4),
      factors: factorContributions(input.logistic.weights, x).map((factor) => ({
        id: factor.id,
        contribution: roundTo(factor.contribution, 4),
      })),
    });
  }
  return slots;
}

export function timeSplit<T extends { hourStart: Date }>(samples: T[], testDays: number): { train: T[]; test: T[] } {
  if (samples.length === 0) return { train: [], test: [] };
  let end = samples[0].hourStart.getTime();
  for (const sample of samples) {
    const ms = sample.hourStart.getTime();
    if (ms > end) end = ms;
  }
  const cut = end - testDays * 24 * 3_600_000;
  const train: T[] = [];
  const test: T[] = [];
  for (const sample of samples) {
    if (sample.hourStart.getTime() <= cut) train.push(sample);
    else test.push(sample);
  }
  return { train, test };
}

export type Score = { brier: number; auc: number | null };

export type EvalReport = {
  trainHours: number;
  testHours: number;
  testDays: number;
  positiveRateTrain: number;
  positiveRateTest: number;
  constant: { brier: number };
  baseline: Score;
  logistic: Score;
  skillVsConstant: { baseline: number; logistic: number };
  calibration: CalibrationBin[];
};

function score(probabilities: number[], labels: number[]): Score {
  return { brier: brierScore(probabilities, labels), auc: rocAuc(probabilities, labels) };
}

function withUsualHour(rows: Sample[], baseline: BaselineModel): Sample[] {
  return rows.map((sample) => {
    const x = sample.x.slice();
    x[USUAL_HOUR_INDEX] = predictBaseline(baseline, sample.areaId, sample.dow, sample.localHour);
    return { ...sample, x };
  });
}

export function evaluateSamples(samples: Sample[], testDays: number): EvalReport {
  const { train, test } = timeSplit(samples, testDays);
  if (train.length === 0 || test.length === 0) {
    throw new Error('Time split produced an empty train or test set');
  }
  const baseline = trainBaseline(train);
  const trainReady = withUsualHour(train, baseline);
  const testReady = withUsualHour(test, baseline);
  const logistic = trainLogistic(trainReady);
  let trainPos = 0;
  for (const sample of trainReady) trainPos += sample.y;
  const baseRate = trainPos / trainReady.length;

  const labels = testReady.map((sample) => sample.y);
  const constantP = labels.map(() => baseRate);
  const baselineP = testReady.map((sample) => predictBaseline(baseline, sample.areaId, sample.dow, sample.localHour));
  const logisticP = testReady.map((sample) => predictLogistic(logistic, sample.x));

  const constant = { brier: brierScore(constantP, labels) };
  const baselineScore = score(baselineP, labels);
  const logisticScore = score(logisticP, labels);
  let testPos = 0;
  for (const label of labels) testPos += label;

  return {
    trainHours: train.length,
    testHours: test.length,
    testDays,
    positiveRateTrain: baseRate,
    positiveRateTest: testPos / labels.length,
    constant,
    baseline: baselineScore,
    logistic: logisticScore,
    skillVsConstant: {
      baseline: 1 - baselineScore.brier / constant.brier,
      logistic: 1 - logisticScore.brier / constant.brier,
    },
    calibration: calibration(logisticP, labels, 5),
  };
}

export function evaluateObservations(rows: HourObservation[], testDays: number): EvalReport {
  return evaluateSamples(buildSamples(rows), testDays);
}
