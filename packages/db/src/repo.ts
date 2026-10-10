import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import type { BaselineModel } from '@barq/core';
import type { LogisticModel } from '@barq/core';
import type { BarqDatabase } from './client';
import { areas, chats, datasetMeta, hourly, modelState, outages, reports, subscriptions } from './schema';

export type AreaRow = typeof areas.$inferSelect;
export type OutageRow = typeof outages.$inferSelect;
export type ReportRow = typeof reports.$inferSelect;
export type HourRow = typeof hourly.$inferSelect;
export type SubscriptionRow = typeof subscriptions.$inferSelect;

export type ModelBundle = {
  logistic: LogisticModel;
  baseline: BaselineModel;
  trainedAt: string;
  trainRows: number;
};

const HOUR_BATCH = 500;

export interface Repo {
  listAreas(): Promise<AreaRow[]>;
  getArea(id: string): Promise<AreaRow | null>;
  countAreas(): Promise<number>;
  insertAreas(rows: (typeof areas.$inferInsert)[]): Promise<void>;
  reportsForReporter(reporterKey: string, since: Date): Promise<ReportRow[]>;
  reportsForArea(areaId: string, since: Date): Promise<ReportRow[]>;
  insertReport(row: typeof reports.$inferInsert): Promise<void>;
  activeOutage(areaId: string): Promise<OutageRow | null>;
  listOutages(filter?: { statuses?: string[]; areaId?: string; since?: Date }): Promise<OutageRow[]>;
  insertOutage(row: typeof outages.$inferInsert): Promise<void>;
  insertOutages(rows: (typeof outages.$inferInsert)[]): Promise<void>;
  updateOutage(id: string, patch: Partial<typeof outages.$inferInsert>): Promise<void>;
  insertHours(rows: (typeof hourly.$inferInsert)[]): Promise<void>;
  upsertHours(rows: (typeof hourly.$inferInsert)[]): Promise<void>;
  hoursSince(since: Date, areaId?: string): Promise<HourRow[]>;
  allHours(): Promise<HourRow[]>;
  getMeta(key: string): Promise<string | null>;
  setMeta(key: string, value: string): Promise<void>;
  saveModel(bundle: ModelBundle, trainedAt: Date): Promise<void>;
  loadModel(): Promise<ModelBundle | null>;
  listSubscriptions(): Promise<SubscriptionRow[]>;
  subscriptionsForChat(chatId: string): Promise<SubscriptionRow[]>;
  upsertSubscription(row: typeof subscriptions.$inferInsert): Promise<void>;
  deleteSubscription(chatId: string, areaId: string): Promise<void>;
  updateSubscription(id: string, patch: Partial<typeof subscriptions.$inferInsert>): Promise<void>;
  getChat(chatId: string): Promise<{ chatId: string; locale: string } | null>;
  upsertChat(chatId: string, locale: string): Promise<void>;
  transaction<T>(fn: (repo: Repo) => Promise<T>): Promise<T>;
}

export function createRepo(db: BarqDatabase): Repo {
  return {
    async listAreas(): Promise<AreaRow[]> {
      return db.select().from(areas).orderBy(areas.countryNameEn, areas.cityNameEn, areas.nameEn);
    },

    async getArea(id: string): Promise<AreaRow | null> {
      const rows = await db.select().from(areas).where(eq(areas.id, id)).limit(1);
      return rows[0] ?? null;
    },

    async countAreas(): Promise<number> {
      const rows = await db.select({ value: sql<number>`count(*)::int` }).from(areas);
      return Number(rows[0]?.value ?? 0);
    },

    async insertAreas(rows: (typeof areas.$inferInsert)[]): Promise<void> {
      if (rows.length === 0) return;
      await db.insert(areas).values(rows);
    },

    async reportsForReporter(reporterKey: string, since: Date): Promise<ReportRow[]> {
      return db
        .select()
        .from(reports)
        .where(and(eq(reports.reporterKey, reporterKey), gte(reports.createdAt, since)));
    },

    async reportsForArea(areaId: string, since: Date): Promise<ReportRow[]> {
      return db
        .select()
        .from(reports)
        .where(and(eq(reports.areaId, areaId), gte(reports.createdAt, since)))
        .orderBy(reports.createdAt);
    },

    async insertReport(row: typeof reports.$inferInsert): Promise<void> {
      await db.insert(reports).values(row);
    },

    async activeOutage(areaId: string): Promise<OutageRow | null> {
      const rows = await db
        .select()
        .from(outages)
        .where(and(eq(outages.areaId, areaId), inArray(outages.status, ['confirmed', 'unconfirmed'])))
        .limit(1);
      return rows[0] ?? null;
    },

    async listOutages(filter: { statuses?: string[]; areaId?: string; since?: Date } = {}): Promise<OutageRow[]> {
      const conditions = [];
      if (filter.statuses && filter.statuses.length > 0) conditions.push(inArray(outages.status, filter.statuses));
      if (filter.areaId) conditions.push(eq(outages.areaId, filter.areaId));
      if (filter.since) conditions.push(gte(outages.startedAt, filter.since));
      const query = db.select().from(outages).orderBy(desc(outages.startedAt));
      if (conditions.length === 0) return query;
      return query.where(and(...conditions));
    },

    async insertOutage(row: typeof outages.$inferInsert): Promise<void> {
      await db.insert(outages).values(row);
    },

    async insertOutages(rows: (typeof outages.$inferInsert)[]): Promise<void> {
      if (rows.length === 0) return;
      for (let i = 0; i < rows.length; i += HOUR_BATCH) {
        await db.insert(outages).values(rows.slice(i, i + HOUR_BATCH));
      }
    },

    async updateOutage(id: string, patch: Partial<typeof outages.$inferInsert>): Promise<void> {
      await db.update(outages).set(patch).where(eq(outages.id, id));
    },

    async insertHours(rows: (typeof hourly.$inferInsert)[]): Promise<void> {
      if (rows.length === 0) return;
      for (let i = 0; i < rows.length; i += HOUR_BATCH) {
        const batch = rows.slice(i, i + HOUR_BATCH);
        await db.insert(hourly).values(batch);
      }
    },

    async upsertHours(rows: (typeof hourly.$inferInsert)[]): Promise<void> {
      for (const row of rows) {
        await db
          .insert(hourly)
          .values(row)
          .onConflictDoUpdate({
            target: [hourly.areaId, hourly.hourStart],
            set: {
              outage: sql`excluded.outage`,
              temperatureC: sql`coalesce(hourly.temperature_c, excluded.temperature_c)`,
            },
          });
      }
    },

    async hoursSince(since: Date, areaId?: string): Promise<HourRow[]> {
      const conditions = [gte(hourly.hourStart, since)];
      if (areaId) conditions.push(eq(hourly.areaId, areaId));
      return db
        .select()
        .from(hourly)
        .where(and(...conditions))
        .orderBy(hourly.hourStart);
    },

    async allHours(): Promise<HourRow[]> {
      return db.select().from(hourly).orderBy(hourly.areaId, hourly.hourStart);
    },

    async getMeta(key: string): Promise<string | null> {
      const rows = await db.select().from(datasetMeta).where(eq(datasetMeta.key, key)).limit(1);
      return rows[0]?.value ?? null;
    },

    async setMeta(key: string, value: string): Promise<void> {
      await db
        .insert(datasetMeta)
        .values({ key, value })
        .onConflictDoUpdate({ target: datasetMeta.key, set: { value } });
    },

    async saveModel(bundle: ModelBundle, trainedAt: Date): Promise<void> {
      const payload = JSON.stringify(bundle);
      await db
        .insert(modelState)
        .values({ id: 'bundle', payload, trainedAt })
        .onConflictDoUpdate({ target: modelState.id, set: { payload, trainedAt } });
    },

    async loadModel(): Promise<ModelBundle | null> {
      const rows = await db.select().from(modelState).where(eq(modelState.id, 'bundle')).limit(1);
      if (!rows[0]) return null;
      return JSON.parse(rows[0].payload) as ModelBundle;
    },

    async listSubscriptions(): Promise<SubscriptionRow[]> {
      return db.select().from(subscriptions);
    },

    async subscriptionsForChat(chatId: string): Promise<SubscriptionRow[]> {
      return db.select().from(subscriptions).where(eq(subscriptions.chatId, chatId));
    },

    async upsertSubscription(row: typeof subscriptions.$inferInsert): Promise<void> {
      await db
        .insert(subscriptions)
        .values(row)
        .onConflictDoUpdate({
          target: [subscriptions.chatId, subscriptions.areaId],
          set: { threshold: row.threshold, locale: row.locale },
        });
    },

    async deleteSubscription(chatId: string, areaId: string): Promise<void> {
      await db.delete(subscriptions).where(and(eq(subscriptions.chatId, chatId), eq(subscriptions.areaId, areaId)));
    },

    async updateSubscription(id: string, patch: Partial<typeof subscriptions.$inferInsert>): Promise<void> {
      await db.update(subscriptions).set(patch).where(eq(subscriptions.id, id));
    },

    async getChat(chatId: string): Promise<{ chatId: string; locale: string } | null> {
      const rows = await db.select().from(chats).where(eq(chats.chatId, chatId)).limit(1);
      return rows[0] ?? null;
    },

    async upsertChat(chatId: string, locale: string): Promise<void> {
      await db.insert(chats).values({ chatId, locale }).onConflictDoUpdate({ target: chats.chatId, set: { locale } });
    },

    async transaction<T>(fn: (repo: Repo) => Promise<T>): Promise<T> {
      return db.transaction(async (tx) => fn(createRepo(tx as BarqDatabase)));
    },
  };
}
