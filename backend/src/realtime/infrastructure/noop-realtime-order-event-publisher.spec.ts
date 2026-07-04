import { describe, expect, it } from 'vitest';

import { NoopRealtimeOrderEventPublisher } from './noop-realtime-order-event-publisher';

describe('NoopRealtimeOrderEventPublisher', () => {
  it('does not throw and has no observable effect when publishing an order invalidation', () => {
    const publisher = new NoopRealtimeOrderEventPublisher();

    expect(() =>
      publisher.publishOrderInvalidated({
        restaurantId: 'restaurant-1',
        tableId: 'table-1',
        orderId: 'order-1',
        reason: 'order.opened',
      }),
    ).not.toThrow();
  });
});
