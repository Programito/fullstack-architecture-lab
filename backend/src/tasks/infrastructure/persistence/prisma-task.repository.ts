import { Injectable } from '@nestjs/common';
import { TaskStatus as PrismaTaskStatus, type Task as PrismaTask } from '@prisma/client';

import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { TaskRepository } from '../../application/ports/task-repository.port';
import { Task } from '../../domain/task.entity';
import type { TaskStatus } from '../../domain/task-status';

@Injectable()
export class PrismaTaskRepository implements TaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(task: Task): Promise<void> {
    await this.prisma.task.upsert({
      where: { id: task.id },
      create: {
        id: task.id,
        title: task.title,
        description: task.description,
        status: toPrismaStatus(task.status),
        createdAt: task.createdAt,
        completedAt: task.completedAt,
        updatedAt: task.updatedAt,
      },
      update: {
        title: task.title,
        description: task.description,
        status: toPrismaStatus(task.status),
        completedAt: task.completedAt,
        updatedAt: task.updatedAt,
      },
    });
  }

  async findById(id: string): Promise<Task | null> {
    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    return task ? toDomainTask(task) : null;
  }

  async findAll(): Promise<Task[]> {
    const tasks = await this.prisma.task.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return tasks.map(toDomainTask);
  }
}

function toDomainTask(task: PrismaTask): Task {
  return Task.rehydrate({
    id: task.id,
    title: task.title,
    description: task.description,
    status: fromPrismaStatus(task.status),
    createdAt: task.createdAt,
    completedAt: task.completedAt,
    updatedAt: task.updatedAt,
  });
}

function toPrismaStatus(status: TaskStatus): PrismaTaskStatus {
  return status === 'completed' ? PrismaTaskStatus.COMPLETED : PrismaTaskStatus.PENDING;
}

function fromPrismaStatus(status: PrismaTaskStatus): TaskStatus {
  return status === PrismaTaskStatus.COMPLETED ? 'completed' : 'pending';
}
