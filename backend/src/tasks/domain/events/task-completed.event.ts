import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../shared/events/domain-event';

export type TaskCompletedPayload = {
  taskId: string;
  completedAt: string;
};

export class TaskCompletedEvent implements DomainEvent<TaskCompletedPayload> {
  readonly id = randomUUID();
  readonly type = 'task.completed';
  readonly occurredAt = new Date();

  constructor(readonly payload: TaskCompletedPayload) {}
}
