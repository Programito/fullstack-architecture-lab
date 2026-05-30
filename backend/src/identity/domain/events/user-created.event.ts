import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../shared/events/domain-event';

export type UserCreatedPayload = {
  userId: string;
  email: string;
};

export class UserCreatedEvent implements DomainEvent<UserCreatedPayload> {
  readonly id = randomUUID();
  readonly type = 'user.created';
  readonly occurredAt = new Date();

  constructor(readonly payload: UserCreatedPayload) {}
}
