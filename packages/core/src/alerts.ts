export type SubscriptionState = {
  id: string;
  areaId: string;
  threshold: number;
  lastPredictionSlot: string | null;
  trackedOutageId: string | null;
};

export type AlertAction =
  | {
      type: 'prediction';
      subscriptionId: string;
      areaId: string;
      slotStart: string;
      probability: number;
    }
  | {
      type: 'power_back';
      subscriptionId: string;
      areaId: string;
      outageId: string;
    };

export type SubscriptionUpdate = {
  subscriptionId: string;
  lastPredictionSlot: string | null;
  trackedOutageId: string | null;
};

function asMap(value: ReadonlyMap<string, string | number | null> | Record<string, string | number | null>): Map<string, string | number | null> {
  return value instanceof Map ? value : new Map(Object.entries(value));
}

/**
 * One prediction notice per area per hour when probability crosses the
 * subscriber's threshold, and one notice when a tracked outage is no longer active.
 * A subscription that starts during an outage should already carry that outage id,
 * so it does not announce a restoration that happened before they subscribed.
 */
export function planAlerts(input: {
  subscriptions: SubscriptionState[];
  nextHourSlot: string;
  probabilityByArea: ReadonlyMap<string, number> | Record<string, number>;
  activeOutageIdByArea: ReadonlyMap<string, string | null> | Record<string, string | null>;
}): { alerts: AlertAction[]; updates: SubscriptionUpdate[] } {
  const probability = asMap(input.probabilityByArea);
  const active = asMap(input.activeOutageIdByArea);
  const alerts: AlertAction[] = [];
  const updates: SubscriptionUpdate[] = [];

  for (const subscription of input.subscriptions) {
    const chance = probability.get(subscription.areaId);
    const p = typeof chance === 'number' ? chance : 0;
    const current = active.get(subscription.areaId);
    const activeId = typeof current === 'string' ? current : null;
    let lastSlot = subscription.lastPredictionSlot;
    let tracked = subscription.trackedOutageId;

    if (p >= subscription.threshold && lastSlot !== input.nextHourSlot) {
      alerts.push({
        type: 'prediction',
        subscriptionId: subscription.id,
        areaId: subscription.areaId,
        slotStart: input.nextHourSlot,
        probability: p,
      });
      lastSlot = input.nextHourSlot;
    }

    if (tracked && tracked !== activeId) {
      alerts.push({
        type: 'power_back',
        subscriptionId: subscription.id,
        areaId: subscription.areaId,
        outageId: tracked,
      });
      tracked = activeId;
    } else if (tracked !== activeId) {
      tracked = activeId;
    }

    if (lastSlot !== subscription.lastPredictionSlot || tracked !== subscription.trackedOutageId) {
      updates.push({
        subscriptionId: subscription.id,
        lastPredictionSlot: lastSlot,
        trackedOutageId: tracked,
      });
    }
  }

  return { alerts, updates };
}
