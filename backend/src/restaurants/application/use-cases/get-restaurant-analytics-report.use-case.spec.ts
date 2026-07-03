import { describe, expect, it, vi } from 'vitest';

import { ok } from '../../../shared/result/result';
import type { RestaurantAnalyticsReport } from '../../domain/restaurant-analytics.models';
import type { RestaurantAnalyticsRepository } from '../ports/restaurant-analytics-repository.port';
import { GetRestaurantAnalyticsReportUseCase } from './get-restaurant-analytics-report.use-case';

function makeReport(): RestaurantAnalyticsReport {
  return {
    summary: { revenueCents: 120000, ordersCount: 40, averageTicketCents: 3000, averageTableTurnoverMinutes: 52 },
    previousSummary: { revenueCents: 100000, ordersCount: 35, averageTicketCents: 2857, averageTableTurnoverMinutes: 55 },
    salesByDay: [{ date: '2026-06-24', revenueCents: 120000, ordersCount: 40 }],
    topProducts: [{ productName: 'Paella', quantity: 20, revenueCents: 40000 }],
    paymentBreakdown: [{ method: 'card', amountCents: 90000, count: 30 }],
    peakHours: [{ hour: 21, ordersCount: 15 }],
  };
}

function makeRepo(): RestaurantAnalyticsRepository {
  return { getReport: vi.fn() };
}

describe('GetRestaurantAnalyticsReportUseCase', () => {
  it('delegates to the repository and returns the report when the range is valid', async () => {
    const repo = makeRepo();
    vi.mocked(repo.getReport).mockResolvedValue(makeReport());
    const useCase = new GetRestaurantAnalyticsReportUseCase(repo);

    const result = await useCase.execute({ restaurantId: 'restaurant-1', from: '2026-06-01T00:00:00.000Z', to: '2026-06-30T23:59:59.000Z' });

    expect(result).toEqual(ok(makeReport()));
    expect(repo.getReport).toHaveBeenCalledWith({ restaurantId: 'restaurant-1', from: '2026-06-01T00:00:00.000Z', to: '2026-06-30T23:59:59.000Z' });
  });

  it('returns invalid_analytics_range when "from" is after "to", without calling the repository', async () => {
    const repo = makeRepo();
    const useCase = new GetRestaurantAnalyticsReportUseCase(repo);

    const result = await useCase.execute({ restaurantId: 'restaurant-1', from: '2026-06-30T00:00:00.000Z', to: '2026-06-01T00:00:00.000Z' });

    expect(result).toEqual({ ok: false, error: expect.objectContaining({ code: 'invalid_analytics_range' }) });
    expect(repo.getReport).not.toHaveBeenCalled();
  });

  it('returns invalid_analytics_range when the range spans more than 366 days, without calling the repository', async () => {
    const repo = makeRepo();
    const useCase = new GetRestaurantAnalyticsReportUseCase(repo);

    const result = await useCase.execute({ restaurantId: 'restaurant-1', from: '2024-01-01T00:00:00.000Z', to: '2026-06-01T00:00:00.000Z' });

    expect(result).toEqual({ ok: false, error: expect.objectContaining({ code: 'invalid_analytics_range' }) });
    expect(repo.getReport).not.toHaveBeenCalled();
  });

  it('accepts a range just under 366 days', async () => {
    const repo = makeRepo();
    vi.mocked(repo.getReport).mockResolvedValue(makeReport());
    const useCase = new GetRestaurantAnalyticsReportUseCase(repo);

    const result = await useCase.execute({ restaurantId: 'restaurant-1', from: '2025-01-01T00:00:00.000Z', to: '2026-01-01T23:59:59.999Z' });

    expect(result).toEqual(ok(makeReport()));
    expect(repo.getReport).toHaveBeenCalled();
  });
});
