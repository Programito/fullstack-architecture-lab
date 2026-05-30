import { Injectable } from '@nestjs/common';

import type { TaskRepository } from '../../application/ports/task-repository.port';
import { Task } from '../../domain/task.entity';

@Injectable()
export class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<string, Task>();

  async save(task: Task): Promise<void> {
    this.tasks.set(task.id, Task.rehydrate(task.toSnapshot()));
  }

  async findById(id: string): Promise<Task | null> {
    const task = this.tasks.get(id);

    return task ? Task.rehydrate(task.toSnapshot()) : null;
  }

  async findAll(): Promise<Task[]> {
    return [...this.tasks.values()]
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .map((task) => Task.rehydrate(task.toSnapshot()));
  }

  clear(): void {
    this.tasks.clear();
  }
}
