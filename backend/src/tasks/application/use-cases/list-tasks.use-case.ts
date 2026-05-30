import { Inject, Injectable } from '@nestjs/common';

import type { ApplicationError } from '../../../shared/errors/application-error';
import { ok, type Result } from '../../../shared/result/result';
import type { Task } from '../../domain/task.entity';
import { TASK_REPOSITORY, type TaskRepository } from '../ports/task-repository.port';

@Injectable()
export class ListTasksUseCase {
  constructor(@Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository) {}

  async execute(): Promise<Result<Task[], ApplicationError>> {
    return ok(await this.tasks.findAll());
  }
}
