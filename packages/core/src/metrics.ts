export function brierScore(probabilities: number[], labels: number[]): number {
  if (probabilities.length === 0 || probabilities.length !== labels.length) {
    throw new Error('Brier score needs paired probabilities and labels');
  }
  let sum = 0;
  for (let i = 0; i < probabilities.length; i++) {
    const delta = probabilities[i] - labels[i];
    sum += delta * delta;
  }
  return sum / probabilities.length;
}

/**
 * ROC AUC via the Mann–Whitney statistic, with average ranks for ties.
 * Returns null when either class is missing.
 */
export function rocAuc(scores: number[], labels: number[]): number | null {
  if (scores.length !== labels.length || scores.length === 0) {
    throw new Error('AUC needs paired scores and labels');
  }
  let positives = 0;
  let negatives = 0;
  const pairs = new Array<{ score: number; label: number }>(scores.length);
  for (let i = 0; i < scores.length; i++) {
    if (labels[i] === 1) positives += 1;
    else negatives += 1;
    pairs[i] = { score: scores[i], label: labels[i] };
  }
  if (positives === 0 || negatives === 0) return null;

  pairs.sort((a, b) => a.score - b.score);
  let rankSumPositive = 0;
  let index = 0;
  while (index < pairs.length) {
    let end = index;
    while (end < pairs.length && pairs[end].score === pairs[index].score) end += 1;
    const averageRank = (index + 1 + end) / 2;
    for (let k = index; k < end; k++) {
      if (pairs[k].label === 1) rankSumPositive += averageRank;
    }
    index = end;
  }
  return (rankSumPositive - (positives * (positives + 1)) / 2) / (positives * negatives);
}

export type CalibrationBin = {
  from: number;
  to: number;
  count: number;
  predicted: number;
  observed: number;
};

export function calibration(probabilities: number[], labels: number[], bins = 5): CalibrationBin[] {
  const rows: CalibrationBin[] = [];
  for (let i = 0; i < bins; i++) {
    rows.push({ from: i / bins, to: (i + 1) / bins, count: 0, predicted: 0, observed: 0 });
  }
  for (let i = 0; i < probabilities.length; i++) {
    const p = Math.min(Math.max(probabilities[i], 0), 0.999999);
    const bin = Math.min(bins - 1, Math.floor(p * bins));
    rows[bin].count += 1;
    rows[bin].predicted += probabilities[i];
    rows[bin].observed += labels[i];
  }
  for (const row of rows) {
    if (row.count > 0) {
      row.predicted /= row.count;
      row.observed /= row.count;
    }
  }
  return rows;
}

export function roundTo(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
