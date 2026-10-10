export type Kind = 'off' | 'on';

export type ReportRecord = {
  areaId: string;
  kind: Kind;
  reporterKey: string;
  createdAtMs: number;
};

export const REPORT_POLICY = {
  /** Same person, area, and kind inside this window is a duplicate. */
  duplicateWindowMs: 30 * 60 * 1000,
  /** Minimum gap between any two reports from one person. */
  minGapMs: 2 * 60 * 1000,
  /** Rolling cap per person. */
  dailyCap: 12,
  dailyWindowMs: 24 * 60 * 60 * 1000,
  /** Reports inside this window can confirm each other. */
  confirmWindowMs: 60 * 60 * 1000,
  /** Distinct people required to confirm an outage or a restoration. */
  minDistinctReporters: 2,
} as const;

export type ActiveStatus = 'confirmed' | 'unconfirmed' | null;

export type DecideInput = {
  nowMs: number;
  report: { areaId: string; kind: Kind; reporterKey: string };
  /** Earlier reports from this person. */
  reporterHistory: ReportRecord[];
  /** Earlier reports for this area. */
  areaReports: ReportRecord[];
  activeStatus: ActiveStatus;
};

export type DecideResult =
  | { accept: false; code: 'duplicate' | 'too_fast' | 'daily_cap' }
  | {
      accept: true;
      code: 'recorded' | 'confirmed' | 'resolved' | 'dismissed';
      distinctOff: number;
      distinctOn: number;
      /** Earliest supporting "off" report when confirming; otherwise now. */
      startedAtMs: number;
    };

function distinct(reports: ReportRecord[], kind: Kind): number {
  const keys = new Set<string>();
  for (const report of reports) {
    if (report.kind === kind) keys.add(report.reporterKey);
  }
  return keys.size;
}

/**
 * Pure report policy. Persistence, including the outage row, lives in the
 * database layer. Two different people reporting the same area inside the
 * confirmation window confirm an outage; the same rule clears it.
 */
export function decideReport(input: DecideInput): DecideResult {
  const { nowMs, report } = input;
  const history = input.reporterHistory.filter(
    (row) => nowMs - row.createdAtMs <= REPORT_POLICY.dailyWindowMs && nowMs >= row.createdAtMs,
  );

  for (const row of history) {
    if (nowMs - row.createdAtMs < REPORT_POLICY.minGapMs) {
      return { accept: false, code: 'too_fast' };
    }
  }
  if (history.length >= REPORT_POLICY.dailyCap) {
    return { accept: false, code: 'daily_cap' };
  }
  for (const row of history) {
    if (
      row.areaId === report.areaId &&
      row.kind === report.kind &&
      nowMs - row.createdAtMs <= REPORT_POLICY.duplicateWindowMs
    ) {
      return { accept: false, code: 'duplicate' };
    }
  }

  const incoming: ReportRecord = { ...report, createdAtMs: nowMs };
  const windowReports = input.areaReports.filter(
    (row) =>
      row.areaId === report.areaId &&
      nowMs - row.createdAtMs <= REPORT_POLICY.confirmWindowMs &&
      nowMs >= row.createdAtMs,
  );
  windowReports.push(incoming);

  const distinctOff = distinct(windowReports, 'off');
  const distinctOn = distinct(windowReports, 'on');
  const offEnough = distinctOff >= REPORT_POLICY.minDistinctReporters;
  const onEnough = distinctOn >= REPORT_POLICY.minDistinctReporters;

  let startedAtMs = nowMs;
  if (offEnough) {
    for (const row of windowReports) {
      if (row.kind === 'off' && row.createdAtMs < startedAtMs) startedAtMs = row.createdAtMs;
    }
  }

  let code: 'recorded' | 'confirmed' | 'resolved' | 'dismissed' = 'recorded';
  if (input.activeStatus === 'confirmed') {
    if (onEnough) code = 'resolved';
  } else if (input.activeStatus === 'unconfirmed') {
    if (onEnough && distinctOn >= distinctOff) code = 'dismissed';
    else if (offEnough) code = 'confirmed';
  } else if (offEnough) {
    code = 'confirmed';
  }

  return { accept: true, code, distinctOff, distinctOn, startedAtMs };
}
