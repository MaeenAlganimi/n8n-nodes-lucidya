import { createBarqApp, type BarqApp } from '@barq/db';

const globalForBarq = globalThis as unknown as { barq?: Promise<BarqApp> };

export function getApp(): Promise<BarqApp> {
  if (!globalForBarq.barq) {
    const pending = createBarqApp().catch((error: unknown) => {
      if (globalForBarq.barq === pending) globalForBarq.barq = undefined;
      throw error;
    });
    globalForBarq.barq = pending;
  }
  return globalForBarq.barq;
}
