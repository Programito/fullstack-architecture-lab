import { execFileSync } from 'node:child_process';

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Task } from '../../domain/task.entity';
import { PrismaTaskRepository } from './prisma-task.repository';

describe('PrismaTaskRepository', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaService;
  let repository: PrismaTaskRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    process.env.DATABASE_URL = container.getConnectionUri();

    const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
    execFileSync(pnpm, ['prisma', 'db', 'push', '--skip-generate'], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'pipe',
    });

    prisma = new PrismaService();
    await prisma.$connect();
    repository = new PrismaTaskRepository(prisma);
  }, 60_000);

  beforeEach(async () => {
    await prisma.outboxEvent.deleteMany();
    await prisma.task.deleteMany();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await container?.stop();
  });

  it('persists and loads a task', async () => {
    const task = Task.create({ title: 'Persistir task' });
    await repository.save(task);

    const found = await repository.findById(task.id);

    expect(found?.toSnapshot()).toMatchObject({
      id: task.id,
      title: 'Persistir task',
      status: 'pending',
    });
  });

  it('updates a completed task', async () => {
    const task = Task.create({ title: 'Completar task' });
    await repository.save(task);

    task.complete(new Date('2026-05-30T16:00:00.000Z'));
    await repository.save(task);

    const found = await repository.findById(task.id);

    expect(found?.status).toBe('completed');
    expect(found?.completedAt?.toISOString()).toBe('2026-05-30T16:00:00.000Z');
  });
});
