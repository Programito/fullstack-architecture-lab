import { describe, expect, it, vi } from 'vitest';

import type { RealtimeGateway } from '../presentation/ws/realtime.gateway';
import { SocketRealtimeOrderEventPublisher } from './socket-realtime-order-event-publisher';

describe('SocketRealtimeOrderEventPublisher', () => {
  it('emite order:invalidated a la room del restaurante con el payload exacto', () => {
    const emit = vi.fn();
    const to = vi.fn().mockReturnValue({ emit });
    const gateway = { server: { to } } as unknown as RealtimeGateway;
    const publisher = new SocketRealtimeOrderEventPublisher(gateway);

    publisher.publishOrderInvalidated({
      restaurantId: 'restaurant-1',
      tableId: 'table-1',
      orderId: 'order-1',
      reason: 'order.line.created',
    });

    expect(to).toHaveBeenCalledWith('restaurant:restaurant-1');
    expect(emit).toHaveBeenCalledWith('order:invalidated', {
      restaurantId: 'restaurant-1',
      tableId: 'table-1',
      orderId: 'order-1',
      reason: 'order.line.created',
      occurredAt: expect.any(String),
    });
  });
});
