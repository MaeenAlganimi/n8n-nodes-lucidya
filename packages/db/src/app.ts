import { randomUUID } from 'node:crypto';
import {
  fetchOpenMeteoTemps,
  floorToHour,
  forecastSlots,
  planAlerts,
  type AlertAction,
  type ForecastSlot,
  type SubscriptionUpdate,
} from '@barq/core';
import { openDatabase, type DatabaseConfig } from './client';
import { hashReporter } from './identity';
import { ingestReport, type IngestInput, type IngestResult } from './ingest';
import { createRepo, type AreaRow, type ModelBundle, type Repo } from './repo';
import { seedDemo } from './seed';
import { trainFromRepo } from './train';

const MODEL_TTL_MS = 6 * 60 * 60 * 1000;

export type AreaForecast = {
  areaId: string;
  generatedAt: string;
  temperatureSource: 'open-meteo' | 'climatology';
  model: 'l2_logistic';
  baseline: 'recency_weighted_hour_of_week';
  trainedAt: string;
  slots: ForecastSlot[];
};

export type BarqApp = {
  demo: boolean;
  config: DatabaseConfig;
  repo: Repo;
  ingest: (input: IngestInput) => Promise<IngestResult>;
  hashReporter: typeof hashReporter;
  forecastArea: (areaId: string, now?: Date) => Promise<AreaForecast | null>;
  nextHourByArea: (now?: Date) => Promise<Map<string, { probability: number; baseline: number }>>;
  collectAlerts: (now?: Date) => Promise<{ alerts: AlertAction[]; updates: SubscriptionUpdate[] }>;
  subscribe: (input: { chatId: string; areaId: string; threshold: number; locale: string }) => Promise<void>;
  close: () => Promise<void>;
};

async function bundleFor(repo: Repo, cache: { bundle: ModelBundle | null }, now: Date): Promise<ModelBundle> {
  if (cache.bundle) {
    const age = now.getTime() - Date.parse(cache.bundle.trainedAt);
    if (age >= 0 && age < MODEL_TTL_MS) return cache.bundle;
  }
  const stored = await repo.loadModel();
  if (stored && now.getTime() - Date.parse(stored.trainedAt) < MODEL_TTL_MS) {
    cache.bundle = stored;
    return stored;
  }
  cache.bundle = await trainFromRepo(repo, now);
  return cache.bundle;
}

export async function createBarqApp(env: NodeJS.ProcessEnv = process.env): Promise<BarqApp> {
  const opened = await openDatabase(env);
  const repo = createRepo(opened.db);
  if ((await repo.countAreas()) === 0 && opened.config.seedSynthetic) {
    const started = Date.now();
    const result = await seedDemo(repo);
    console.info(
      `Barq demo data ready: ${result.areas} neighbourhoods, ${result.hours} hours, ${result.outages} outage records (${Date.now() - started} ms).`,
    );
  }
  const cache: { bundle: ModelBundle | null } = { bundle: null };

  async function historySince(area: AreaRow, now: Date) {
    const since = new Date(floorToHour(now).getTime() - 8 * 24 * 3_600_000);
    return repo.hoursSince(since, area.id);
  }

  const nextHourByArea: BarqApp['nextHourByArea'] = async (now = new Date()) => {
    const [model, areaRows, history] = await Promise.all([
      bundleFor(repo, cache, now),
      repo.listAreas(),
      repo.hoursSince(new Date(floorToHour(now).getTime() - 8 * 24 * 3_600_000)),
    ]);
    const byArea = new Map<string, typeof history>();
    for (const hour of history) {
      const list = byArea.get(hour.areaId);
      if (list) list.push(hour);
      else byArea.set(hour.areaId, [hour]);
    }
    const result = new Map<string, { probability: number; baseline: number }>();
    for (const area of areaRows) {
      const slots = forecastSlots({
        areaId: area.id,
        latitude: area.latitude,
        timezone: area.timezone,
        logistic: model.logistic,
        baseline: model.baseline,
        history: (byArea.get(area.id) ?? []).map((hour) => ({
          areaId: hour.areaId,
          hourStart: hour.hourStart,
          outage: hour.outage === 1 ? 1 : 0,
          temperatureC: hour.temperatureC,
          timezone: area.timezone,
        })),
        origin: now,
        hours: 1,
      });
      const slot = slots[0];
      if (slot) result.set(area.id, { probability: slot.probability, baseline: slot.baselineProbability });
    }
    return result;
  };

  return {
    demo: opened.config.demo,
    config: opened.config,
    repo,
    ingest: (input) => ingestReport(repo, input),
    hashReporter,
    async forecastArea(areaId, now = new Date()) {
      const area = await repo.getArea(areaId);
      if (!area) return null;
      const [model, history, temps] = await Promise.all([
        bundleFor(repo, cache, now),
        historySince(area, now),
        process.env.BARQ_SKIP_WEATHER === '1'
          ? Promise.resolve(new Map<string, number>())
          : fetchOpenMeteoTemps(area.latitude, area.longitude),
      ]);
      const slots = forecastSlots({
        areaId: area.id,
        latitude: area.latitude,
        timezone: area.timezone,
        logistic: model.logistic,
        baseline: model.baseline,
        history: history.map((hour) => ({
          areaId: hour.areaId,
          hourStart: hour.hourStart,
          outage: hour.outage === 1 ? 1 : 0,
          temperatureC: hour.temperatureC,
          timezone: area.timezone,
        })),
        origin: now,
        hours: 24,
        observedTemperature: temps,
      });
      return {
        areaId: area.id,
        generatedAt: now.toISOString(),
        temperatureSource: temps.size > 0 ? 'open-meteo' : 'climatology',
        model: 'l2_logistic',
        baseline: 'recency_weighted_hour_of_week',
        trainedAt: model.trainedAt,
        slots,
      };
    },
    nextHourByArea,
    async collectAlerts(now = new Date()) {
      const [subscriptions, areas, active, chances] = await Promise.all([
        repo.listSubscriptions(),
        repo.listAreas(),
        repo.listOutages({ statuses: ['confirmed'] }),
        nextHourByArea(now),
      ]);
      const activeOutageIdByArea: Record<string, string | null> = {};
      for (const area of areas) activeOutageIdByArea[area.id] = null;
      for (const outage of active) activeOutageIdByArea[outage.areaId] = outage.id;
      const probabilityByArea: Record<string, number> = {};
      for (const [areaId, chance] of chances) probabilityByArea[areaId] = chance.probability;
      return planAlerts({
        subscriptions: subscriptions.map((subscription) => ({
          id: subscription.id,
          areaId: subscription.areaId,
          threshold: subscription.threshold,
          lastPredictionSlot: subscription.lastPredictionSlot ? subscription.lastPredictionSlot.toISOString() : null,
          trackedOutageId: subscription.trackedOutageId,
        })),
        nextHourSlot: floorToHour(now).toISOString(),
        probabilityByArea,
        activeOutageIdByArea,
      });
    },
    async subscribe(input) {
      const active = await repo.activeOutage(input.areaId);
      await repo.upsertSubscription({
        id: randomUUID(),
        chatId: input.chatId,
        areaId: input.areaId,
        threshold: input.threshold,
        locale: input.locale,
        trackedOutageId: active?.status === 'confirmed' ? active.id : null,
        lastPredictionSlot: null,
        createdAt: new Date(),
      });
    },
    close: () => opened.close(),
  };
}
