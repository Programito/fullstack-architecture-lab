import { describe, expect, it, vi } from 'vitest';

import { DatabaseReadinessService } from './database-readiness.service';

describe('DatabaseReadinessService', () => {
  it('returns ready when the database responds quickly', async () => {
    const service = new DatabaseReadinessService({
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as never);

    await expect(service.check()).resolves.toEqual({
      status: 'ready',
      database: 'ready',
      durationMs: expect.any(Number),
    });
  });

  it('returns warming_up when the database response is slow', async () => {
    vi.useFakeTimers();

    const service = new DatabaseReadinessService({
      $queryRaw: vi.fn().mockImplementation(async () => {
        await vi.advanceTimersByTimeAsync(1_600);
        return [{ '?column?': 1 }];
      }),
    } as never);

    await expect(service.check()).resolves.toEqual({
      status: 'warming_up',
      database: 'warming_up',
      durationMs: 1_600,
    });

    vi.useRealTimers();
  });

  it('returns warming_up when the database connection is still waking up', async () => {
    const service = new DatabaseReadinessService({
      $queryRaw: vi.fn().mockRejectedValue(new Error('Cannot reach database server at this time')),
    } as never);

    await expect(service.check()).resolves.toEqual({
      status: 'warming_up',
      database: 'warming_up',
      durationMs: expect.any(Number),
    });
  });

  it('returns down for unexpected database errors', async () => {
    const service = new DatabaseReadinessService({
      $queryRaw: vi.fn().mockRejectedValue(new Error('syntax error at or near "SELECT"')),
    } as never);

    await expect(service.check()).resolves.toEqual({
      status: 'down',
      database: 'down',
      durationMs: expect.any(Number),
    });
  });
});
