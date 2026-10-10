import { localParts } from './time';

export const FEATURE_NAMES = [
  'bias',
  'hour_sin',
  'hour_cos',
  'dow_sin',
  'dow_cos',
  'rate_24h',
  'rate_7d',
  'same_hour_week_ago',
  'temp_norm',
  'temp_missing',
  'usual_hour',
] as const;

/** Index of the baseline hour-of-week probability. Filled in after that model is fit. */
export const USUAL_HOUR_INDEX = 10;

export type FeatureName = (typeof FEATURE_NAMES)[number];

/** First week of each area is a warm-up: the 7-day rate is not defined yet. */
export const WARMUP_HOURS = 24 * 7;

export const FACTOR_GROUPS = [
  { id: 'time_of_day', indexes: [1, 2] },
  { id: 'day_of_week', indexes: [3, 4] },
  { id: 'recent_day', indexes: [5] },
  { id: 'recent_week', indexes: [6] },
  { id: 'same_hour_last_week', indexes: [7] },
  { id: 'temperature', indexes: [8, 9] },
  { id: 'usual_hour', indexes: [USUAL_HOUR_INDEX] },
] as const;

export type FactorId = (typeof FACTOR_GROUPS)[number]['id'];

export type FeatureInput = {
  hour: number;
  dow: number;
  rate24: number;
  rate7: number;
  sameHourWeekAgo: number;
  tempC: number | null;
  /** Baseline probability for this area and hour of week. 0 until it is attached. */
  usualHour?: number;
};

export function featureVector(input: FeatureInput): number[] {
  const hourAngle = (2 * Math.PI * input.hour) / 24;
  const dowAngle = (2 * Math.PI * input.dow) / 7;
  const missing = input.tempC == null ? 1 : 0;
  const tempNorm = input.tempC == null ? 0 : (input.tempC - 25) / 10;
  return [
    1,
    Math.sin(hourAngle),
    Math.cos(hourAngle),
    Math.sin(dowAngle),
    Math.cos(dowAngle),
    input.rate24,
    input.rate7,
    input.sameHourWeekAgo,
    tempNorm,
    missing,
    input.usualHour ?? 0,
  ];
}

export type HourObservation = {
  areaId: string;
  hourStart: Date;
  outage: 0 | 1;
  temperatureC: number | null;
  timezone: string;
};

export type Sample = {
  areaId: string;
  hourStart: Date;
  y: 0 | 1;
  x: number[];
  localHour: number;
  dow: number;
};

/**
 * One training row per hour after the warm-up. Recent-outage features use
 * only earlier hours, so the label of the target hour never leaks into x.
 */
export function buildSamples(rows: HourObservation[]): Sample[] {
  const byArea = new Map<string, HourObservation[]>();
  for (const row of rows) {
    const list = byArea.get(row.areaId);
    if (list) list.push(row);
    else byArea.set(row.areaId, [row]);
  }

  const samples: Sample[] = [];
  for (const list of byArea.values()) {
    list.sort((a, b) => a.hourStart.getTime() - b.hourStart.getTime());
    const prefix = new Array<number>(list.length + 1);
    prefix[0] = 0;
    for (let i = 0; i < list.length; i++) prefix[i + 1] = prefix[i] + list[i].outage;

    for (let i = WARMUP_HOURS; i < list.length; i++) {
      const row = list[i];
      const local = localParts(row.hourStart, row.timezone);
      samples.push({
        areaId: row.areaId,
        hourStart: row.hourStart,
        y: row.outage,
        localHour: local.hour,
        dow: local.dow,
        x: featureVector({
          hour: local.hour,
          dow: local.dow,
          rate24: (prefix[i] - prefix[i - 24]) / 24,
          rate7: (prefix[i] - prefix[i - 168]) / 168,
          sameHourWeekAgo: list[i - 168].outage,
          tempC: row.temperatureC,
        }),
      });
    }
  }

  samples.sort((a, b) => a.hourStart.getTime() - b.hourStart.getTime() || (a.areaId < b.areaId ? -1 : 1));
  return samples;
}

/**
 * Features for a future hour. Recent rates stop at `origin` (typically "now"),
 * so unknown hours between now and the target are not treated as known.
 * The same hour last week is a real observation when the target is within a day.
 */
export function buildFutureFeatures(input: {
  history: HourObservation[];
  timezone: string;
  target: Date;
  origin: Date;
  temperatureC: number | null;
}): number[] {
  const known: HourObservation[] = [];
  for (const row of input.history) {
    if (row.hourStart.getTime() < input.origin.getTime()) known.push(row);
  }
  known.sort((a, b) => a.hourStart.getTime() - b.hourStart.getTime());

  const last24 = known.slice(-24);
  const last168 = known.slice(-168);
  let out24 = 0;
  for (const row of last24) out24 += row.outage;
  let out168 = 0;
  for (const row of last168) out168 += row.outage;

  const weekAgo = input.target.getTime() - 168 * 3_600_000;
  let same = 0;
  for (const row of input.history) {
    if (row.hourStart.getTime() === weekAgo) {
      same = row.outage;
      break;
    }
  }

  const local = localParts(input.target, input.timezone);
  return featureVector({
    hour: local.hour,
    dow: local.dow,
    rate24: out24 / 24,
    rate7: out168 / 168,
    sameHourWeekAgo: same,
    tempC: input.temperatureC,
  });
}

export type Factor = { id: FactorId; contribution: number };

/** Log-odds contribution of each plain-language group. Bias is left out. */
export function factorContributions(weights: number[], x: number[]): Factor[] {
  const factors: Factor[] = FACTOR_GROUPS.map((group) => {
    let contribution = 0;
    for (const index of group.indexes) contribution += weights[index] * x[index];
    return { id: group.id, contribution };
  });
  factors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  return factors;
}
