import { describe, expect, it } from 'vitest';
import { planAlerts } from './alerts';

describe('planAlerts', () => {
  const slot = '2026-06-15T18:00:00.000Z';

  it('notifies once when the next hour crosses the threshold', () => {
    const first = planAlerts({
      subscriptions: [
        { id: 's1', areaId: 'a', threshold: 0.55, lastPredictionSlot: null, trackedOutageId: null },
      ],
      nextHourSlot: slot,
      probabilityByArea: { a: 0.72 },
      activeOutageIdByArea: { a: null },
    });
    expect(first.alerts).toEqual([
      { type: 'prediction', subscriptionId: 's1', areaId: 'a', slotStart: slot, probability: 0.72 },
    ]);

    const second = planAlerts({
      subscriptions: [
        { id: 's1', areaId: 'a', threshold: 0.55, lastPredictionSlot: slot, trackedOutageId: null },
      ],
      nextHourSlot: slot,
      probabilityByArea: { a: 0.8 },
      activeOutageIdByArea: { a: null },
    });
    expect(second.alerts).toEqual([]);
  });

  it('stays quiet under the threshold and announces power back once', () => {
    const quiet = planAlerts({
      subscriptions: [
        { id: 's1', areaId: 'a', threshold: 0.55, lastPredictionSlot: null, trackedOutageId: 'out-1' },
      ],
      nextHourSlot: slot,
      probabilityByArea: { a: 0.4 },
      activeOutageIdByArea: { a: 'out-1' },
    });
    expect(quiet.alerts).toEqual([]);
    expect(quiet.updates).toEqual([]);

    const back = planAlerts({
      subscriptions: [
        { id: 's1', areaId: 'a', threshold: 0.55, lastPredictionSlot: null, trackedOutageId: 'out-1' },
      ],
      nextHourSlot: slot,
      probabilityByArea: { a: 0.2 },
      activeOutageIdByArea: { a: null },
    });
    expect(back.alerts).toEqual([{ type: 'power_back', subscriptionId: 's1', areaId: 'a', outageId: 'out-1' }]);
    expect(back.updates[0]?.trackedOutageId).toBeNull();
  });
});
