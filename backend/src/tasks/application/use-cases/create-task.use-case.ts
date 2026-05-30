import { Inject, Injectable } from '@nestjs/common';

import { EVENT_BUS, type EventBus } from '../../../shared/events/event-bus.port';
import type { ApplicationError } from '../../../shared/errors/application-error';
import { ok, type Result } from '../../../shared/result/result';
import { Task } from '../../domain/task.entity';
import { TASK_REPOSITORY, type TaskRepository } from '../ports/task-repository.port';

export type CreateTaskCommand = {
  title: string;
  description?: string | null;
};

@Injectable()
export class CreateTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateTaskCommand): Promise<Result<Task, ApplicationError>> {
    const task = Task.create(command);

    await this.tasks.save(task);
    await this.eventBus.publishMany(task.pullDomainEvents());

    return ok(task);
  }
}
