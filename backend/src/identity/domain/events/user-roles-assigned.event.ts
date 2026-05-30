import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../shared/events/domain-event';

export type UserRolesAssignedPayload = {
  userId: string;
  roleIds: string[];
};

export class UserRolesAssignedEvent implements DomainEvent<UserRolesAssignedPayload> {
  readonly id = randomUUID();
  readonly type = 'user.roles.assigned';
  readonly occurredAt = new Date();

  constructor(readonly payload: UserRolesAssignedPayload) {}
}
