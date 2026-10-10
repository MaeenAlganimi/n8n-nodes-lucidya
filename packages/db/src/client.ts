import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { drizzle as drizzlePglite, type PgliteDatabase } from 'drizzle-orm/pglite';
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PGlite } from '@electric-sql/pglite';
import type { Pool } from 'pg';
import * as schema from './schema';
import { MIGRATION_SQL } from './migrate';

export type BarqDatabase = PgliteDatabase<typeof schema> | NodePgDatabase<typeof schema>;

export type DatabaseConfig = {
  kind: 'pglite' | 'postgres';
  demo: boolean;
  seedSynthetic: boolean;
  location: string;
};

export type OpenDatabase = {
  db: BarqDatabase;
  config: DatabaseConfig;
  close: () => Promise<void>;
};

function defaultDataDir(): string {
  const cwd = process.cwd();
  if (cwd.endsWith(`${path.sep}apps${path.sep}web`) || cwd.endsWith(`${path.sep}apps${path.sep}bot`)) {
    return path.resolve(cwd, '../../data/barq');
  }
  return path.resolve(cwd, 'data/barq');
}

export function resolveConfig(env: NodeJS.ProcessEnv = process.env): DatabaseConfig {
  const url = env.DATABASE_URL?.trim();
  if (url && (url.startsWith('postgres://') || url.startsWith('postgresql://'))) {
    const seed = env.SEED_SYNTHETIC === 'true';
    return { kind: 'postgres', demo: seed, seedSynthetic: seed, location: url };
  }
  if (url === 'memory' || url === ':memory:') {
    return { kind: 'pglite', demo: true, seedSynthetic: env.SEED_SYNTHETIC !== 'false', location: 'memory' };
  }
  if (url?.startsWith('file:')) {
    return { kind: 'pglite', demo: true, seedSynthetic: true, location: url.slice('file:'.length) };
  }
  if (!url) {
    return { kind: 'pglite', demo: true, seedSynthetic: true, location: defaultDataDir() };
  }
  return { kind: 'pglite', demo: true, seedSynthetic: true, location: url };
}

async function migrate(exec: (sql: string) => Promise<void>): Promise<void> {
  await exec(MIGRATION_SQL);
}

export async function openDatabase(env: NodeJS.ProcessEnv = process.env): Promise<OpenDatabase> {
  const config = resolveConfig(env);
  if (config.kind === 'pglite') {
    const { PGlite } = await import('@electric-sql/pglite');
    if (config.location !== 'memory') mkdirSync(path.dirname(config.location), { recursive: true });
    const client: PGlite = config.location === 'memory' ? new PGlite() : new PGlite(config.location);
    await client.waitReady;
    await migrate(async (statement) => {
      await client.exec(statement);
    });
    const db = drizzlePglite(client, { schema });
    return { db, config, close: () => client.close() };
  }

  const { Pool } = await import('pg');
  const pool: Pool = new Pool({ connectionString: config.location });
  let lastError: unknown;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      await pool.query('select 1');
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  if (lastError) {
    await pool.end();
    throw lastError;
  }
  await migrate((sql) => pool.query(sql).then(() => undefined));
  const db = drizzlePg(pool, { schema });
  return { db, config, close: () => pool.end() };
}
