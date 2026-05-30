import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { Task } from '../../../domain/task.entity';
import { TASK_STATUSES, type TaskStatus } from '../../../domain/task-status';

export class TaskResponseDto {
  @ApiProperty({ example: 'b5cc3f7d-9ba7-4c07-84ce-1ce906f6ef1f' })
  id!: string;

  @ApiProperty({ example: 'Preparar base del backend' })
  title!: string;

  @ApiPropertyOptional({ example: 'Crear arquitectura inicial con Nest, Prisma y tests.', nullable: true })
  description!: string | null;

  @ApiProperty({ enum: TASK_STATUSES, example: 'pending' })
  status!: TaskStatus;

  @ApiProperty({ example: '2026-05-30T16:00:00.000Z' })
  createdAt!: string;

  @ApiPropertyOptional({ example: '2026-05-30T16:05:00.000Z', nullable: true })
  completedAt!: string | null;

  @ApiProperty({ example: '2026-05-30T16:00:00.000Z' })
  updatedAt!: string;

  static fromDomain(task: Task): TaskResponseDto {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      createdAt: task.createdAt.toISOString(),
      completedAt: task.completedAt?.toISOString() ?? null,
      updatedAt: task.updatedAt.toISOString(),
    };
  }
}
