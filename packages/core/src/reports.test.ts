import { describe, expect, it } from 'vitest';
import { REPORT_POLICY, decideReport, type ReportRecord } from './reports';

const area = 'ly-tri-and';

function report(partial: Partial<ReportRecord> & Pick<ReportRecord, 'reporterKey' | 'kind'>): ReportRecord {
  return {
    areaId: area,
    createdAtMs: 0,
    ...partial,
  };
}

describe('decideReport', () => {
  it('records a single off report without confirming it', () => {
    const result = decideReport({
      nowMs: 1_000_000,
      report: { areaId: area, kind: 'off', reporterKey: 'a' },
      reporterHistory: [],
      areaReports: [],
      activeStatus: null,
    });
    expect(result).toMatchObject({ accept: true, code: 'recorded', distinctOff: 1 });
  });

  it('confirms when two different people report off inside the window', () => {
    const now = 10_000_000;
    const result = decideReport({
      nowMs: now,
      report: { areaId: area, kind: 'off', reporterKey: 'b' },
      reporterHistory: [],
      areaReports: [report({ reporterKey: 'a', kind: 'off', createdAtMs: now - 10 * 60_000 })],
      activeStatus: 'unconfirmed',
    });
    expect(result).toMatchObject({
      accept: true,
      code: 'confirmed',
      distinctOff: 2,
      startedAtMs: now - 10 * 60_000,
    });
  });

  it('does not let the same person confirm their own report', () => {
    const now = 10_000_000;
    const result = decideReport({
      nowMs: now,
      report: { areaId: area, kind: 'off', reporterKey: 'a' },
      reporterHistory: [report({ reporterKey: 'a', kind: 'on', createdAtMs: now - 10 * 60_000 })],
      areaReports: [report({ reporterKey: 'a', kind: 'off', createdAtMs: now - 40 * 60_000 })],
      activeStatus: 'unconfirmed',
    });
    expect(result).toMatchObject({ accept: true, code: 'recorded', distinctOff: 1 });
  });

  it('ignores a second off report that falls outside the confirmation window', () => {
    const now = 10_000_000;
    const result = decideReport({
      nowMs: now,
      report: { areaId: area, kind: 'off', reporterKey: 'b' },
      reporterHistory: [],
      areaReports: [report({ reporterKey: 'a', kind: 'off', createdAtMs: now - REPORT_POLICY.confirmWindowMs - 1 })],
      activeStatus: null,
    });
    expect(result).toMatchObject({ accept: true, code: 'recorded', distinctOff: 1 });
  });

  it('resolves a confirmed outage after two power-back reports', () => {
    const now = 10_000_000;
    const result = decideReport({
      nowMs: now,
      report: { areaId: area, kind: 'on', reporterKey: 'b' },
      reporterHistory: [],
      areaReports: [report({ reporterKey: 'a', kind: 'on', createdAtMs: now - 5 * 60_000 })],
      activeStatus: 'confirmed',
    });
    expect(result).toMatchObject({ accept: true, code: 'resolved', distinctOn: 2 });
  });

  it('dismisses an unconfirmed outage when restoration reports win', () => {
    const now = 10_000_000;
    const result = decideReport({
      nowMs: now,
      report: { areaId: area, kind: 'on', reporterKey: 'c' },
      reporterHistory: [],
      areaReports: [
        report({ reporterKey: 'a', kind: 'off', createdAtMs: now - 20 * 60_000 }),
        report({ reporterKey: 'b', kind: 'on', createdAtMs: now - 5 * 60_000 }),
      ],
      activeStatus: 'unconfirmed',
    });
    expect(result).toMatchObject({ accept: true, code: 'dismissed' });
  });

  it('rejects duplicates, bursts, and the daily cap', () => {
    const now = 50_000_000;
    expect(
      decideReport({
        nowMs: now,
        report: { areaId: area, kind: 'off', reporterKey: 'a' },
        reporterHistory: [report({ reporterKey: 'a', kind: 'off', createdAtMs: now - 60_000 })],
        areaReports: [],
        activeStatus: null,
      }).accept,
    ).toBe(false);
    expect(
      decideReport({
        nowMs: now,
        report: { areaId: area, kind: 'off', reporterKey: 'a' },
        reporterHistory: [report({ reporterKey: 'a', kind: 'off', createdAtMs: now - 60_000 })],
        areaReports: [],
        activeStatus: null,
      }),
    ).toMatchObject({ code: 'too_fast' });

    expect(
      decideReport({
        nowMs: now,
        report: { areaId: area, kind: 'off', reporterKey: 'a' },
        reporterHistory: [report({ reporterKey: 'a', kind: 'off', createdAtMs: now - 10 * 60_000 })],
        areaReports: [],
        activeStatus: null,
      }),
    ).toMatchObject({ code: 'duplicate' });

    const history = Array.from({ length: REPORT_POLICY.dailyCap }, (_, index) =>
      report({
        reporterKey: 'a',
        kind: index % 2 === 0 ? 'off' : 'on',
        areaId: `area-${index}`,
        createdAtMs: now - (index + 1) * 60 * 60_000,
      }),
    );
    expect(
      decideReport({
        nowMs: now,
        report: { areaId: area, kind: 'off', reporterKey: 'a' },
        reporterHistory: history,
        areaReports: [],
        activeStatus: null,
      }),
    ).toMatchObject({ code: 'daily_cap' });
  });
});
