import '@angular/compiler';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RestaurantAnalyticsApiService } from './restaurant-analytics-api.service';
import type { RestaurantAnalyticsReportDto } from './restaurant-analytics.models';

const REPORT_URL = '/api/v1/restaurants/restaurant-1/analytics/report';
const FILTERS = { from: '2026-01-01T00:00:00.000Z', to: '2026-01-07T23:59:59.999Z' };

function makeReport(): RestaurantAnalyticsReportDto {
  return {
    summary: { revenueCents: 1000, ordersCount: 1, averageTicketCents: 1000, averageTableTurnoverMinutes: 10 },
    previousSummary: { revenueCents: 0, ordersCount: 0, averageTicketCents: 0, averageTableTurnoverMinutes: 0 },
    salesByDay: [],
    topProducts: [],
    paymentBreakdown: [],
    peakHours: [],
  };
}

describe('RestaurantAnalyticsApiService', () => {
  const setup = () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    return {
      service: TestBed.inject(RestaurantAnalyticsApiService),
      http: TestBed.inject(HttpTestingController),
    };
  };

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('fetches the report from the backend', () => {
    const { service, http } = setup();
    let result: RestaurantAnalyticsReportDto | undefined;

    service.getReport('restaurant-1', FILTERS).subscribe((value) => {
      result = value;
    });

    const request = http.expectOne((req) => req.url === REPORT_URL);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('from')).toBe(FILTERS.from);
    expect(request.request.params.get('to')).toBe(FILTERS.to);
    request.flush(makeReport());

    expect(result).toEqual(makeReport());
    http.verify();
  });

  it('serves a cached response for the same restaurant and range without a second HTTP call', () => {
    const { service, http } = setup();

    service.getReport('restaurant-1', FILTERS).subscribe();
    http.expectOne((req) => req.url === REPORT_URL).flush(makeReport());

    let second: RestaurantAnalyticsReportDto | undefined;
    service.getReport('restaurant-1', FILTERS).subscribe((value) => {
      second = value;
    });

    expect(second).toEqual(makeReport());
    // If the service had issued a second request, this would fail with a
    // "expected no open requests" error.
    http.verify();
  });

  it('issues a fresh request for a different date range', () => {
    const { service, http } = setup();

    service.getReport('restaurant-1', FILTERS).subscribe();
    http.expectOne((req) => req.url === REPORT_URL).flush(makeReport());

    service.getReport('restaurant-1', { from: '2026-02-01T00:00:00.000Z', to: '2026-02-07T23:59:59.999Z' }).subscribe();
    http.expectOne((req) => req.url === REPORT_URL).flush(makeReport());

    http.verify();
  });

  it('requests again once the cached entry has expired', () => {
    vi.useFakeTimers();
    const { service, http } = setup();

    service.getReport('restaurant-1', FILTERS).subscribe();
    http.expectOne((req) => req.url === REPORT_URL).flush(makeReport());

    vi.advanceTimersByTime(61_000);

    service.getReport('restaurant-1', FILTERS).subscribe();
    http.expectOne((req) => req.url === REPORT_URL).flush(makeReport());

    http.verify();
  });
});
