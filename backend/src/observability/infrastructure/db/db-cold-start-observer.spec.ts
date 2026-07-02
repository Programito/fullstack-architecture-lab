import { ConfigService } from '@nestjs/config';

import { DbColdStartObserver } from './db-cold-start-observer';

describe('DbColdStartObserver', () => {
  const buildObserver = (enabled = true) => {
    let middleware: ((params: unknown, next: (params: unknown) => Promise<unknown>) => Promise<unknown>) | null = null;
    const prisma = {
      $use: vi.fn((registered) => {
        middleware = registered;
      }),
    };
    const observability = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    const observer = new DbColdStartObserver(
      prisma as never,
      observability as never,
      new ConfigService({
        OBSERVABILITY_DB_COLD_START_ENABLED: enabled ? 'true' : 'false',
      }),
    );

    return { prisma, observability, observer, getMiddleware: () => middleware };
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-02T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not attach prisma middleware when the feature flag is disabled', () => {
    const { prisma, observer } = buildObserver(false);

    observer.onModuleInit();

    expect(prisma.$use).not.toHaveBeenCalled();
  });

  it('logs a database cold start on the first slow query', async () => {
    const { observer, observability, getMiddleware } = buildObserver(true);
    observer.onModuleInit();

    const middleware = getMiddleware();
    expect(middleware).toBeTruthy();

    const next = vi.fn(async () => {
      vi.advanceTimersByTime(1800);
      return { ok: true };
    });

    await middleware!(
      { model: 'Restaurant', action: 'findMany' },
      next,
    );

    expect(observability.record).toHaveBeenCalledWith(expect.objectContaining({
      event: 'db.connection.cold_start',
      level: 'warn',
      metadata: expect.objectContaining({
        provider: 'postgres-free-tier',
        operation: 'Restaurant.findMany',
        coldStart: true,
      }),
    }));
  });

  it('skips app log writes to avoid recursion', async () => {
    const { observer, observability, getMiddleware } = buildObserver(true);
    observer.onModuleInit();

    await getMiddleware()!(
      { model: 'AppLog', action: 'create' },
      async () => ({ id: 'log-1' }),
    );

    expect(observability.record).not.toHaveBeenCalled();
  });

  it('logs timeout and recovered events around a failing query', async () => {
    const { observer, observability, getMiddleware } = buildObserver(true);
    observer.onModuleInit();

    await expect(getMiddleware()!(
      { model: 'Order', action: 'findFirst' },
      async () => {
        vi.advanceTimersByTime(1900);
        throw new Error('Connection timed out');
      },
    )).rejects.toThrow('Connection timed out');

    await getMiddleware()!(
      { model: 'Order', action: 'findFirst' },
      async () => {
        vi.advanceTimersByTime(40);
        return { id: 'order-1' };
      },
    );

    expect(observability.record).toHaveBeenCalledWith(expect.objectContaining({
      event: 'db.connection.timeout',
      level: 'error',
      metadata: expect.objectContaining({
        operation: 'Order.findFirst',
        recovered: false,
      }),
    }));
    expect(observability.record).toHaveBeenCalledWith(expect.objectContaining({
      event: 'db.connection.recovered',
      level: 'info',
      metadata: expect.objectContaining({
        operation: 'Order.findFirst',
        recovered: true,
      }),
    }));
  });
});
