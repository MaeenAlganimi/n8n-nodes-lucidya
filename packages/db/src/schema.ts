import { boolean, doublePrecision, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const areas = pgTable('areas', {
  id: text('id').primaryKey(),
  countryCode: text('country_code').notNull(),
  countryNameEn: text('country_name_en').notNull(),
  countryNameAr: text('country_name_ar').notNull(),
  cityId: text('city_id').notNull(),
  cityNameEn: text('city_name_en').notNull(),
  cityNameAr: text('city_name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  nameAr: text('name_ar').notNull(),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  timezone: text('timezone').notNull(),
});

export const reports = pgTable(
  'reports',
  {
    id: text('id').primaryKey(),
    areaId: text('area_id')
      .notNull()
      .references(() => areas.id),
    kind: text('kind').notNull(),
    reporterKey: text('reporter_key').notNull(),
    source: text('source').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [
    index('reports_reporter_time_idx').on(table.reporterKey, table.createdAt),
    index('reports_area_time_idx').on(table.areaId, table.createdAt),
  ],
);

export const outages = pgTable(
  'outages',
  {
    id: text('id').primaryKey(),
    areaId: text('area_id')
      .notNull()
      .references(() => areas.id),
    status: text('status').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true, mode: 'date' }),
    distinctReporters: integer('distinct_reporters').notNull(),
    synthetic: boolean('synthetic').notNull().default(false),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [index('outages_area_status_idx').on(table.areaId, table.status)],
);

export const hourly = pgTable(
  'hourly',
  {
    areaId: text('area_id')
      .notNull()
      .references(() => areas.id),
    hourStart: timestamp('hour_start', { withTimezone: true, mode: 'date' }).notNull(),
    outage: integer('outage').notNull(),
    temperatureC: doublePrecision('temperature_c'),
  },
  (table) => [
    primaryKey({ columns: [table.areaId, table.hourStart] }),
    index('hourly_hour_idx').on(table.hourStart),
  ],
);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: text('id').primaryKey(),
    chatId: text('chat_id').notNull(),
    areaId: text('area_id')
      .notNull()
      .references(() => areas.id),
    threshold: doublePrecision('threshold').notNull(),
    locale: text('locale').notNull(),
    lastPredictionSlot: timestamp('last_prediction_slot', { withTimezone: true, mode: 'date' }),
    trackedOutageId: text('tracked_outage_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [uniqueIndex('subscriptions_chat_area_idx').on(table.chatId, table.areaId)],
);

export const chats = pgTable('chats', {
  chatId: text('chat_id').primaryKey(),
  locale: text('locale').notNull(),
});

export const datasetMeta = pgTable('dataset_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const modelState = pgTable('model_state', {
  id: text('id').primaryKey(),
  payload: text('payload').notNull(),
  trainedAt: timestamp('trained_at', { withTimezone: true, mode: 'date' }).notNull(),
});
