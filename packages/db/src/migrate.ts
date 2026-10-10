export const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS areas (
  id TEXT PRIMARY KEY,
  country_code TEXT NOT NULL,
  country_name_en TEXT NOT NULL,
  country_name_ar TEXT NOT NULL,
  city_id TEXT NOT NULL,
  city_name_en TEXT NOT NULL,
  city_name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  timezone TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  area_id TEXT NOT NULL REFERENCES areas(id),
  kind TEXT NOT NULL,
  reporter_key TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS reports_reporter_time_idx ON reports (reporter_key, created_at);
CREATE INDEX IF NOT EXISTS reports_area_time_idx ON reports (area_id, created_at);

CREATE TABLE IF NOT EXISTS outages (
  id TEXT PRIMARY KEY,
  area_id TEXT NOT NULL REFERENCES areas(id),
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  distinct_reporters INTEGER NOT NULL,
  synthetic BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS outages_area_status_idx ON outages (area_id, status);

CREATE TABLE IF NOT EXISTS hourly (
  area_id TEXT NOT NULL REFERENCES areas(id),
  hour_start TIMESTAMPTZ NOT NULL,
  outage INTEGER NOT NULL,
  temperature_c DOUBLE PRECISION,
  PRIMARY KEY (area_id, hour_start)
);
CREATE INDEX IF NOT EXISTS hourly_hour_idx ON hourly (hour_start);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  area_id TEXT NOT NULL REFERENCES areas(id),
  threshold DOUBLE PRECISION NOT NULL,
  locale TEXT NOT NULL,
  last_prediction_slot TIMESTAMPTZ,
  tracked_outage_id TEXT,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_chat_area_idx ON subscriptions (chat_id, area_id);

CREATE TABLE IF NOT EXISTS chats (
  chat_id TEXT PRIMARY KEY,
  locale TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dataset_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS model_state (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  trained_at TIMESTAMPTZ NOT NULL
);
`;
