import { Injectable } from '@nestjs/common';

import type {
  OrderInvalidatedEvent,
  RealtimeOrderEventPublisher,
} from '../../restaurants/application/ports/realtime-order-event-publisher.port';
import { RealtimeGateway } from '../presentation/ws/realtime.gateway';

@Injectable()
export class SocketRealtimeOrderEventPublisher implements RealtimeOrderEventPublisher {
  constructor(private readonly gateway: RealtimeGateway) {}

  publishOrderInvalidated(event: OrderInvalidatedEvent): void {
    this.gateway.server.to(`restaurant:${event.restaurantId}`).emit('order:invalidated', {
      ...event,
      occurredAt: new Date().toISOString(),
    });
  }
}
