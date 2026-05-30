import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../shared/events/domain-event';

export type TaskCreatedPayload = {
  taskId: string;
  title: string;
};

export class TaskCreatedEvent implements DomainEvent<TaskCreatedPayload> {
  readonly id = randomUUID();
  readonly type = 'task.created';
  readonly occurredAt = new Date();

  constructor(readonly payload: TaskCreatedPayload) {}
}
