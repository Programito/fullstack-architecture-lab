import { Inject, Injectable } from '@nestjs/common';

import { EVENT_BUS, type EventBus } from '../../../shared/events/event-bus.port';
import { taskNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { Task } from '../../domain/task.entity';
import { TASK_REPOSITORY, type TaskRepository } from '../ports/task-repository.port';

@Injectable()
export class CompleteTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  async execute(taskId: string): Promise<Result<Task, ApplicationError>> {
    const task = await this.tasks.findById(taskId);

    if (!task) {
      return err(taskNotFound(taskId));
    }

    task.complete();

    await this.tasks.save(task);
    await this.eventBus.publishMany(task.pullDomainEvents());

    return ok(task);
  }
}
