import { randomUUID } from 'node:crypto';
import {
  REPORT_POLICY,
  climatologyTemp,
  decideReport,
  floorToHour,
  hourIsOutage,
  localParts,
  type Kind,
} from '@barq/core';
import type { AreaRow, Repo } from './repo';

export type IngestInput = {
  areaId: string;
  kind: Kind;
  reporterKey: string;
  source: 'web' | 'telegram';
  now?: Date;
};

export type IngestResult =
  | { accepted: false; code: 'unknown_area' | 'duplicate' | 'too_fast' | 'daily_cap' }
  | {
      accepted: true;
      code: 'recorded' | 'confirmed' | 'resolved' | 'dismissed';
      outageId: string | null;
      distinctReporters: number;
    };

async function markHours(repo: Repo, area: AreaRow, start: Date, end: Date): Promise<void> {
  const from = floorToHour(start);
  const to = floorToHour(end);
  const rows: {
    areaId: string;
    hourStart: Date;
    outage: 0 | 1;
    temperatureC: number;
  }[] = [];
  for (let cursor = from.getTime(); cursor <= to.getTime(); cursor += 3_600_000) {
    const hourStart = new Date(cursor);
    const local = localParts(hourStart, area.timezone);
    rows.push({
      areaId: area.id,
      hourStart,
      outage: hourIsOutage(cursor, start.getTime(), end.getTime()),
      temperatureC: climatologyTemp(area.latitude, local.dayOfYear, local.hour),
    });
  }
  if (rows.length > 0) await repo.upsertHours(rows);
}

export async function ingestReport(repo: Repo, input: IngestInput): Promise<IngestResult> {
  const now = input.now ?? new Date();
  return repo.transaction(async (tx) => {
    const area = await tx.getArea(input.areaId);
    if (!area) return { accepted: false, code: 'unknown_area' };
    const history = await tx.reportsForReporter(input.reporterKey, new Date(now.getTime() - REPORT_POLICY.dailyWindowMs));
    const areaReports = await tx.reportsForArea(input.areaId, new Date(now.getTime() - REPORT_POLICY.confirmWindowMs));
    const active = await tx.activeOutage(input.areaId);
    const decision = decideReport({
      nowMs: now.getTime(),
      report: { areaId: input.areaId, kind: input.kind, reporterKey: input.reporterKey },
      reporterHistory: history.map((row) => ({
        areaId: row.areaId,
        kind: row.kind as Kind,
        reporterKey: row.reporterKey,
        createdAtMs: row.createdAt.getTime(),
      })),
      areaReports: areaReports.map((row) => ({
        areaId: row.areaId,
        kind: row.kind as Kind,
        reporterKey: row.reporterKey,
        createdAtMs: row.createdAt.getTime(),
      })),
      activeStatus: active?.status === 'confirmed' || active?.status === 'unconfirmed' ? active.status : null,
    });
    if (!decision.accept) return { accepted: false, code: decision.code };

    await tx.insertReport({
      id: randomUUID(),
      areaId: input.areaId,
      kind: input.kind,
      reporterKey: input.reporterKey,
      source: input.source,
      createdAt: now,
    });

    let outageId: string | null = active?.id ?? null;
    if (decision.code === 'confirmed') {
      const startedAt = new Date(decision.startedAtMs);
      if (active) {
        await tx.updateOutage(active.id, {
          status: 'confirmed',
          startedAt,
          distinctReporters: decision.distinctOff,
          updatedAt: now,
        });
      } else {
        outageId = randomUUID();
        await tx.insertOutage({
          id: outageId,
          areaId: area.id,
          status: 'confirmed',
          startedAt,
          endedAt: null,
          distinctReporters: decision.distinctOff,
          synthetic: false,
          updatedAt: now,
        });
      }
      await markHours(tx, area, startedAt, now);
    } else if (decision.code === 'resolved' && active) {
      await tx.updateOutage(active.id, {
        status: 'resolved',
        endedAt: now,
        distinctReporters: Math.max(active.distinctReporters, decision.distinctOn),
        updatedAt: now,
      });
      await markHours(tx, area, active.startedAt, now);
    } else if (decision.code === 'dismissed' && active) {
      await tx.updateOutage(active.id, { status: 'dismissed', endedAt: now, updatedAt: now });
    } else if (decision.code === 'recorded' && input.kind === 'off' && !active) {
      outageId = randomUUID();
      await tx.insertOutage({
        id: outageId,
        areaId: area.id,
        status: 'unconfirmed',
        startedAt: now,
        endedAt: null,
        distinctReporters: decision.distinctOff,
        synthetic: false,
        updatedAt: now,
      });
    } else if (decision.code === 'recorded' && active && input.kind === 'off') {
      await tx.updateOutage(active.id, { distinctReporters: decision.distinctOff, updatedAt: now });
    }

    return {
      accepted: true,
      code: decision.code,
      outageId,
      distinctReporters: input.kind === 'on' ? decision.distinctOn : decision.distinctOff,
    };
  });
}
