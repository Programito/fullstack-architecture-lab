import { Injectable } from '@nestjs/common';

import type {
  OrderInvalidatedEvent,
  RealtimeOrderEventPublisher,
} from '../../restaurants/application/ports/realtime-order-event-publisher.port';

@Injectable()
export class NoopRealtimeOrderEventPublisher implements RealtimeOrderEventPublisher {
  publishOrderInvalidated(_event: OrderInvalidatedEvent): void {
    // Realtime desactivado (REALTIME_ENABLED=false): no-op intencional.
  }
}
