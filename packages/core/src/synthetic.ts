import { mixSeed, mulberry32 } from './random';
import { addHours, climatologyTemp, floorToHour, localParts } from './time';
import { sigmoid } from './logistic';

export type ScheduleBlock = {
  /** 0 Sunday … 6 Saturday. */
  dow: number[];
  startHour: number;
  endHour: number;
};

export type AreaProfile = {
  id: string;
  latitude: number;
  timezone: string;
  /** 1 is typical. Higher means a more fragile supply. */
  stress: number;
  schedule?: ScheduleBlock;
};

export type GeneratedHour = {
  areaId: string;
  hourStart: Date;
  outage: 0 | 1;
  temperatureC: number;
};

export type GeneratedOutage = {
  areaId: string;
  startedAt: Date;
  endedAt: Date | null;
  synthetic: true;
};

export type GenerateOptions = {
  now: Date;
  days: number;
  seed: number;
  /**
   * If fewer than this many areas are in outage at the final hour, force the
   * last three hours on for additional areas so a demo map is not empty.
   * Those rows are still labelled synthetic. Omit for benchmarks.
   */
  ensureActive?: number;
};

function inSchedule(profile: AreaProfile, dow: number, hour: number): boolean {
  const block = profile.schedule;
  if (!block || !block.dow.includes(dow)) return false;
  return hour >= block.startHour && hour < block.endHour;
}

function logitOf(input: {
  stress: number;
  hour: number;
  dow: number;
  rate24: number;
  temp: number;
  scheduled: boolean;
}): number {
  let logit = -2.85 + (input.stress - 1) * 0.65;
  if (input.hour >= 17 && input.hour <= 21) logit += 2.15;
  else if (input.hour >= 12 && input.hour <= 16) logit += 0.2;
  if (input.dow === 5 || input.dow === 6) logit -= 0.4;
  logit += 3.1 * input.rate24;
  if (input.temp >= 34) logit += 1.15 * ((input.temp - 34) / 5);
  if (input.scheduled) logit += 3.05;
  return logit;
}

function compress(rows: GeneratedHour[]): GeneratedOutage[] {
  const outages: GeneratedOutage[] = [];
  let start: GeneratedHour | null = null;
  let last: GeneratedHour | null = null;

  const flush = (ongoing: boolean) => {
    if (!start || !last) return;
    outages.push({
      areaId: start.areaId,
      startedAt: start.hourStart,
      endedAt: ongoing ? null : addHours(last.hourStart, 1),
      synthetic: true,
    });
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.outage === 0) {
      if (start) flush(false);
      start = null;
      last = null;
      continue;
    }
    if (!start) start = row;
    last = row;
    const next = rows[i + 1];
    const continues =
      next !== undefined && next.outage === 1 && next.hourStart.getTime() === row.hourStart.getTime() + 3_600_000;
    if (!continues) {
      flush(next === undefined);
      start = null;
      last = null;
    }
  }
  return outages;
}

/**
 * Synthetic hourly history. The process is seeded and sequential: each hour's
 * chance depends on the outage rate of the previous 24 hours, the local clock,
 * an optional scheduled block, and temperature. It is not a record of real cuts.
 */
export function generateHistory(areas: AreaProfile[], options: GenerateOptions): {
  hours: GeneratedHour[];
  outages: GeneratedOutage[];
} {
  const end = floorToHour(options.now);
  const total = options.days * 24;
  const start = addHours(end, -(total - 1));
  const hours: GeneratedHour[] = [];

  for (const area of areas) {
    const rand = mulberry32(mixSeed(options.seed, area.id));
    const series: GeneratedHour[] = [];
    let recent = 0;
    for (let i = 0; i < total; i++) {
      const hourStart = addHours(start, i);
      const local = localParts(hourStart, area.timezone);
      const climate = climatologyTemp(area.latitude, local.dayOfYear, local.hour);
      const temperatureC = climate + (rand() - 0.5) * 2.4;
      const rate24 = recent / 24;
      const probability = sigmoid(
        logitOf({
          stress: area.stress,
          hour: local.hour,
          dow: local.dow,
          rate24,
          temp: temperatureC,
          scheduled: inSchedule(area, local.dow, local.hour),
        }),
      );
      const outage: 0 | 1 = rand() < probability ? 1 : 0;
      recent += outage;
      if (i >= 24) recent -= series[i - 24].outage;
      series.push({ areaId: area.id, hourStart, outage, temperatureC });
    }
    for (const row of series) hours.push(row);
  }

  if (options.ensureActive && options.ensureActive > 0) {
    const byArea = new Map<string, GeneratedHour[]>();
    for (const row of hours) {
      const list = byArea.get(row.areaId);
      if (list) list.push(row);
      else byArea.set(row.areaId, [row]);
    }
    let active = 0;
    for (const list of byArea.values()) {
      if (list[list.length - 1]?.outage === 1) active += 1;
    }
    const needed = options.ensureActive - active;
    if (needed > 0) {
      const candidates = [...areas]
        .filter((area) => byArea.get(area.id)?.at(-1)?.outage !== 1)
        .sort((a, b) => (a.id < b.id ? -1 : 1));
      for (const area of candidates.slice(0, needed)) {
        const list = byArea.get(area.id);
        if (!list) continue;
        for (const row of list.slice(-3)) row.outage = 1;
      }
    }
  }

  const outages: GeneratedOutage[] = [];
  const grouped = new Map<string, GeneratedHour[]>();
  for (const row of hours) {
    const list = grouped.get(row.areaId);
    if (list) list.push(row);
    else grouped.set(row.areaId, [row]);
  }
  for (const list of grouped.values()) outages.push(...compress(list));

  return { hours, outages };
}
