import { Injectable } from '@nestjs/common';

import type { DomainEvent } from './domain-event';
import type { EventBus } from './event-bus.port';

@Injectable()
export class InMemoryEventBus implements EventBus {
  private readonly events: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.events.push(event);
  }

  async publishMany(events: readonly DomainEvent[]): Promise<void> {
    this.events.push(...events);
  }

  getPublishedEvents(): readonly DomainEvent[] {
    return this.events;
  }

  clear(): void {
    this.events.length = 0;
  }
}
