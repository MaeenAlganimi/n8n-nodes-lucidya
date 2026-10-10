import { REPORT_POLICY } from '@barq/core';
import { describe, expect, it } from 'vitest';
import { ar } from './ar';
import { en } from './en';

function leafKeys(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => leafKeys(item, `${prefix}[${index}]`));
  }
  return Object.entries(value).flatMap(([key, item]) => leafKeys(item, prefix ? `${prefix}.${key}` : key));
}

describe('dictionaries', () => {
  it('gives Arabic every English key', () => {
    expect(leafKeys(ar)).toEqual(leafKeys(en));
  });

  it('describes the same confirmation window the policy uses', () => {
    const minutes = String(REPORT_POLICY.confirmWindowMs / 60_000);
    expect(en.report.lede).toContain(minutes);
    expect(ar.report.lede).toContain('٦٠');
    expect(en.method.sections[0]?.body[0]).toContain('Two different people');
  });
});
