import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../shared/events/domain-event';

export type RoleCreatedPayload = {
  roleId: string;
  name: string;
};

export class RoleCreatedEvent implements DomainEvent<RoleCreatedPayload> {
  readonly id = randomUUID();
  readonly type = 'role.created';
  readonly occurredAt = new Date();

  constructor(readonly payload: RoleCreatedPayload) {}
}
