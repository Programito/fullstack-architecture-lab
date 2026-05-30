import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../shared/events/domain-event';
import { TaskCompletedEvent } from './events/task-completed.event';
import { TaskCreatedEvent } from './events/task-created.event';
import type { TaskStatus } from './task-status';

export type TaskSnapshot = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  createdAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
};

type CreateTaskProps = {
  title: string;
  description?: string | null;
};

export class Task {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(private snapshot: TaskSnapshot) {}

  static create(props: CreateTaskProps): Task {
    const now = new Date();
    const task = new Task({
      id: randomUUID(),
      title: props.title.trim(),
      description: props.description?.trim() || null,
      status: 'pending',
      createdAt: now,
      completedAt: null,
      updatedAt: now,
    });

    task.record(new TaskCreatedEvent({ taskId: task.id, title: task.title }));

    return task;
  }

  static rehydrate(snapshot: TaskSnapshot): Task {
    return new Task(snapshot);
  }

  get id(): string {
    return this.snapshot.id;
  }

  get title(): string {
    return this.snapshot.title;
  }

  get description(): string | null {
    return this.snapshot.description;
  }

  get status(): TaskStatus {
    return this.snapshot.status;
  }

  get createdAt(): Date {
    return this.snapshot.createdAt;
  }

  get completedAt(): Date | null {
    return this.snapshot.completedAt;
  }

  get updatedAt(): Date {
    return this.snapshot.updatedAt;
  }

  complete(now = new Date()): void {
    if (this.snapshot.status === 'completed') {
      return;
    }

    this.snapshot = {
      ...this.snapshot,
      status: 'completed',
      completedAt: now,
      updatedAt: now,
    };
    this.record(new TaskCompletedEvent({ taskId: this.id, completedAt: now.toISOString() }));
  }

  pullDomainEvents(): DomainEvent[] {
    return this.domainEvents.splice(0);
  }

  toSnapshot(): TaskSnapshot {
    return { ...this.snapshot };
  }

  private record(event: DomainEvent): void {
    this.domainEvents.push(event);
  }
}
