import { createHash } from 'node:crypto';

/** Store a short hash so a leaked database does not contain Telegram ids or device ids. */
export function hashReporter(source: 'web' | 'telegram', raw: string): string {
  const salt = process.env.REPORTER_SALT ?? 'barq-demo-salt';
  return createHash('sha256').update(`${salt}:${source}:${raw}`).digest('hex').slice(0, 32);
}
