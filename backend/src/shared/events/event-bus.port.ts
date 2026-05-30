import type { DomainEvent } from './domain-event';

export const EVENT_BUS = Symbol('EVENT_BUS');

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  publishMany(events: readonly DomainEvent[]): Promise<void>;
}
