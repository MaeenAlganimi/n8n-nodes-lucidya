import type { Messages } from '@/i18n/en';

export function StatusPill({
  status,
  messages,
  synthetic = false,
}: {
  status: 'confirmed' | 'unconfirmed' | 'on' | 'resolved' | 'dismissed';
  messages: Messages;
  synthetic?: boolean;
}) {
  const tone =
    status === 'confirmed'
      ? 'border-signal text-signal'
      : status === 'unconfirmed'
        ? 'border-amber text-amber'
        : status === 'on'
          ? 'border-sage text-sage'
          : 'border-ink/30 text-ink/70';
  return (
    <span className={`inline-flex items-center gap-2 border px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] ${tone}`}>
      {messages.status[status]}
      {synthetic ? <span className="normal-case tracking-normal text-ink/50">{messages.home.synthetic}</span> : null}
    </span>
  );
}
