import { describe, expect, it } from 'vitest';
import { brierScore, rocAuc } from './metrics';

describe('metrics', () => {
  it('scores a perfect and a constant forecast', () => {
    expect(brierScore([0, 1, 0, 1], [0, 1, 0, 1])).toBe(0);
    expect(brierScore([0.25, 0.25, 0.25, 0.25], [0, 0, 1, 1])).toBeCloseTo(0.3125, 6);
    expect(brierScore([0.5, 0.5, 0.5, 0.5], [0, 0, 1, 1])).toBeCloseTo(0.25, 6);
  });

  it('computes AUC with and without ties', () => {
    expect(rocAuc([0.1, 0.4, 0.35, 0.8], [0, 0, 1, 1])).toBeCloseTo(0.75, 6);
    expect(rocAuc([0.1, 0.9], [0, 1])).toBe(1);
    expect(rocAuc([0.9, 0.1], [0, 1])).toBe(0);
    expect(rocAuc([0.2, 0.2], [0, 1])).toBeCloseTo(0.5, 6);
    expect(rocAuc([0.2, 0.8], [0, 0])).toBeNull();
  });
});
