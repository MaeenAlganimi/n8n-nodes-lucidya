import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { runPublishedBenchmark } from '../packages/core/src/benchmark.ts';
import { roundTo } from '../packages/core/src/metrics.ts';

const report = runPublishedBenchmark();
const published = {
  evaluatedAt: report.now,
  historyDays: report.days,
  holdoutDays: report.testDays,
  seed: report.seed,
  areas: report.areas,
  trainHours: report.trainHours,
  testHours: report.testHours,
  positiveRate: {
    train: roundTo(report.positiveRateTrain, 4),
    test: roundTo(report.positiveRateTest, 4),
  },
  constant: { brier: roundTo(report.constant.brier, 4) },
  baseline: {
    brier: roundTo(report.baseline.brier, 4),
    auc: roundTo(report.baseline.auc ?? Number.NaN, 4),
  },
  logistic: {
    brier: roundTo(report.logistic.brier, 4),
    auc: roundTo(report.logistic.auc ?? Number.NaN, 4),
  },
  skillVsConstant: {
    baseline: roundTo(report.skillVsConstant.baseline, 4),
    logistic: roundTo(report.skillVsConstant.logistic, 4),
  },
  calibration: report.calibration.map((bin) => ({
    from: bin.from,
    to: bin.to,
    count: bin.count,
    predicted: roundTo(bin.predicted, 3),
    observed: roundTo(bin.observed, 3),
  })),
  note: report.note,
};

const targets = [
  resolve('docs/model-metrics.json'),
  resolve('apps/web/src/content/model-metrics.json'),
];
for (const target of targets) {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(published, null, 2)}\n`);
}
console.log(JSON.stringify(published, null, 2));
