import { Module } from '@nestjs/common';

import { EVENT_BUS } from '../shared/events/event-bus.port';
import { InMemoryEventBus } from '../shared/events/in-memory-event-bus';
import { TASK_REPOSITORY } from './application/ports/task-repository.port';
import { CompleteTaskUseCase } from './application/use-cases/complete-task.use-case';
import { CreateTaskUseCase } from './application/use-cases/create-task.use-case';
import { ListTasksUseCase } from './application/use-cases/list-tasks.use-case';
import { InMemoryTaskRepository } from './infrastructure/persistence/in-memory-task.repository';
import { TasksController } from './presentation/rest/tasks.controller';

@Module({
  controllers: [TasksController],
  providers: [
    CreateTaskUseCase,
    ListTasksUseCase,
    CompleteTaskUseCase,
    InMemoryTaskRepository,
    InMemoryEventBus,
    {
      provide: TASK_REPOSITORY,
      useExisting: InMemoryTaskRepository,
    },
    {
      provide: EVENT_BUS,
      useExisting: InMemoryEventBus,
    },
  ],
})
export class TasksModule {}
