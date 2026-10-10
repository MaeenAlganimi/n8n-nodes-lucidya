'use client';

import { useState } from 'react';
import type { FactorId } from '@barq/core';
import type { Locale } from '@/i18n';
import type { Messages } from '@/i18n/en';
import { formatHour, formatPercent } from '@/lib/format';

export type ChartSlot = {
  start: string;
  probability: number;
  baselineProbability: number;
  factors: { id: FactorId; contribution: number }[];
};

function barClass(probability: number): string {
  if (probability >= 0.6) return 'bg-signal';
  if (probability >= 0.35) return 'bg-amber';
  return 'bg-sage';
}

export function PredictionChart({
  slots,
  locale,
  timeZone,
  messages,
}: {
  slots: ChartSlot[];
  locale: Locale;
  timeZone: string;
  messages: Messages;
}) {
  const [selected, setSelected] = useState(0);
  const slot = slots[selected] ?? slots[0];
  if (!slot) return null;
  const factors = slot.factors.slice(0, 3);

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink/50">{messages.area.model}</p>
          <p className="font-mono text-5xl leading-none">{formatPercent(locale, slot.probability)}</p>
          <p className="mt-2 text-sm text-ink/70">
            {formatHour(locale, slot.start, timeZone)} · {messages.area.usualHour}{' '}
            <span className="font-mono">{formatPercent(locale, slot.baselineProbability)}</span>
          </p>
        </div>
      </div>
      <div className="mt-6 flex h-48 items-end gap-1" role="listbox" aria-label={messages.area.chartLabel}>
        {slots.map((item, index) => {
          const height = Math.max(4, Math.round(item.probability * 100));
          return (
            <button
              key={item.start}
              type="button"
              role="option"
              aria-selected={index === selected}
              aria-label={`${formatHour(locale, item.start, timeZone)} ${formatPercent(locale, item.probability)}`}
              onClick={() => setSelected(index)}
              className="flex h-full flex-1 items-end"
            >
              <span
                className={`block w-full ${barClass(item.probability)} ${index === selected ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper' : ''}`}
                style={{ height: `${height}%` }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[0.65rem] text-ink/50">
        <span>{formatHour(locale, slots[0]?.start ?? slot.start, timeZone)}</span>
        <span>{formatHour(locale, slots[Math.floor(slots.length / 2)]?.start ?? slot.start, timeZone)}</span>
        <span>{formatHour(locale, slots[slots.length - 1]?.start ?? slot.start, timeZone)}</span>
      </div>
      <h3 className="mt-6 text-sm font-medium">{messages.area.why}</h3>
      <ul className="mt-2 space-y-2">
        {factors.map((factor) => {
          const quiet = Math.abs(factor.contribution) < 0.05;
          const direction = quiet ? messages.area.little : factor.contribution > 0 ? messages.area.raises : messages.area.lowers;
          return (
            <li key={factor.id} className="flex items-baseline justify-between gap-3 text-sm">
              <span>{messages.factors[factor.id]}</span>
              <span className="text-end text-ink/70">
                {direction}
                {quiet ? null : <span className="ms-2 font-mono">{factor.contribution > 0 ? '+' : ''}{factor.contribution.toFixed(2)}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
