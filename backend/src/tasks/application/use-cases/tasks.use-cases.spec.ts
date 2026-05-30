import { describe, expect, it } from 'vitest';

import { InMemoryEventBus } from '../../../shared/events/in-memory-event-bus';
import { isErr, isOk } from '../../../shared/result/result';
import { CompleteTaskUseCase } from './complete-task.use-case';
import { CreateTaskUseCase } from './create-task.use-case';
import { ListTasksUseCase } from './list-tasks.use-case';
import { InMemoryTaskRepository } from '../../infrastructure/persistence/in-memory-task.repository';

describe('task use cases', () => {
  it('creates and lists tasks using the in-memory repository', async () => {
    const repository = new InMemoryTaskRepository();
    const eventBus = new InMemoryEventBus();
    const createTask = new CreateTaskUseCase(repository, eventBus);
    const listTasks = new ListTasksUseCase(repository);

    const createResult = await createTask.execute({
      title: 'Crear backend',
      description: 'Nest con arquitectura limpia',
    });
    const listResult = await listTasks.execute();

    expect(isOk(createResult)).toBe(true);
    expect(isOk(listResult)).toBe(true);
    if (isErr(createResult) || isErr(listResult)) {
      throw new Error('Expected successful task results.');
    }

    const task = createResult.value;
    const tasks = listResult.value;
    expect(task.status).toBe('pending');
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      id: task.id,
      title: 'Crear backend',
      description: 'Nest con arquitectura limpia',
    });
    expect(eventBus.getPublishedEvents()).toHaveLength(1);
    expect(eventBus.getPublishedEvents()[0]?.type).toBe('task.created');
  });

  it('completes a task and publishes a domain event', async () => {
    const repository = new InMemoryTaskRepository();
    const eventBus = new InMemoryEventBus();
    const createTask = new CreateTaskUseCase(repository, eventBus);
    const completeTask = new CompleteTaskUseCase(repository, eventBus);

    const createResult = await createTask.execute({ title: 'Pasar tests' });
    expect(isOk(createResult)).toBe(true);
    if (isErr(createResult)) {
      throw new Error('Expected task creation to succeed.');
    }

    const completeResult = await completeTask.execute(createResult.value.id);
    expect(isOk(completeResult)).toBe(true);
    if (isErr(completeResult)) {
      throw new Error('Expected task completion to succeed.');
    }

    const completedTask = completeResult.value;
    expect(completedTask.status).toBe('completed');
    expect(completedTask.completedAt).toBeInstanceOf(Date);
    expect(eventBus.getPublishedEvents().map((event) => event.type)).toEqual(['task.created', 'task.completed']);
  });

  it('returns an application error when a task does not exist', async () => {
    const repository = new InMemoryTaskRepository();
    const eventBus = new InMemoryEventBus();
    const completeTask = new CompleteTaskUseCase(repository, eventBus);

    const result = await completeTask.execute('missing-task');

    expect(isErr(result)).toBe(true);
    if (isOk(result)) {
      throw new Error('Expected task completion to fail.');
    }
    expect(result.error.code).toBe('task_not_found');
  });
});
