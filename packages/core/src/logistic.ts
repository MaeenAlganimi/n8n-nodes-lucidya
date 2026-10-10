import { FEATURE_NAMES, type Sample } from './features';

export const LOGISTIC_DEFAULTS = {
  iterations: 400,
  learningRate: 1,
  lambda: 0.001,
} as const;

export type LogisticModel = {
  kind: 'l2_logistic';
  weights: number[];
  featureNames: readonly string[];
  iterations: number;
  learningRate: number;
  lambda: number;
  trainedRows: number;
};

export function sigmoid(z: number): number {
  if (z > 30) return 1;
  if (z < -30) return 0;
  return 1 / (1 + Math.exp(-z));
}

/**
 * L2-regularized logistic regression fit by full-batch gradient descent.
 * The bias weight is not penalized. Fixed iteration count keeps the fit deterministic.
 */
export function trainLogistic(samples: Sample[], options: Partial<typeof LOGISTIC_DEFAULTS> = {}): LogisticModel {
  const iterations = options.iterations ?? LOGISTIC_DEFAULTS.iterations;
  const learningRate = options.learningRate ?? LOGISTIC_DEFAULTS.learningRate;
  const lambda = options.lambda ?? LOGISTIC_DEFAULTS.lambda;
  const width = FEATURE_NAMES.length;
  const weights = new Array<number>(width).fill(0);
  const gradient = new Array<number>(width).fill(0);
  const count = samples.length;
  if (count === 0) {
    return {
      kind: 'l2_logistic',
      weights,
      featureNames: FEATURE_NAMES,
      iterations,
      learningRate,
      lambda,
      trainedRows: 0,
    };
  }

  for (let epoch = 0; epoch < iterations; epoch++) {
    gradient.fill(0);
    for (let i = 0; i < count; i++) {
      const x = samples[i].x;
      let z = 0;
      for (let j = 0; j < width; j++) z += weights[j] * x[j];
      const error = sigmoid(z) - samples[i].y;
      for (let j = 0; j < width; j++) gradient[j] += error * x[j];
    }
    const inv = 1 / count;
    for (let j = 0; j < width; j++) {
      const penalty = j === 0 ? 0 : lambda * weights[j];
      weights[j] -= learningRate * (gradient[j] * inv + penalty);
    }
  }

  for (const weight of weights) {
    if (!Number.isFinite(weight)) throw new Error('Logistic regression diverged');
  }

  return {
    kind: 'l2_logistic',
    weights,
    featureNames: FEATURE_NAMES,
    iterations,
    learningRate,
    lambda,
    trainedRows: count,
  };
}

export function predictLogistic(model: LogisticModel, x: number[]): number {
  let z = 0;
  for (let j = 0; j < model.weights.length; j++) z += model.weights[j] * x[j];
  return sigmoid(z);
}
