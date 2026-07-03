import { HttpErrorResponse } from '@angular/common/http';
import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, type Params } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { of, throwError } from 'rxjs';

import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { addDaysToIsoDate, currentZonedDateIso, zonedDayRangeUtc } from '../../../../shared/utils/date/restaurant-timezone';
import { Chart } from '../../../../shared/ui/chart/chart';
import { RestaurantAnalyticsApiService } from '../../api/restaurant-analytics-api.service';
import type { RestaurantAnalyticsReportDto } from '../../api/restaurant-analytics.models';
import { RestaurantContextStore } from '../../state/restaurant-context.store';
import { RestaurantPosDashboardPage } from './restaurant-pos-dashboard-page';

const TIMEZONE = 'Europe/Madrid';

class TestResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

// ngx-echarts renders onto a real <canvas>, which jsdom cannot back with a 2D
// context. Repainting an already-mounted chart (e.g. after a filter change)
// then crashes on disposal. Tests that trigger a second render swap in this
// inert stub instead of the real Chart component.
@Component({ selector: 'app-chart', template: '' })
class ChartStub {
  readonly type = input('line');
  readonly appearance = input('default');
  readonly size = input('md');
  readonly variant = input('primary');
  readonly data = input<unknown[]>([]);
  readonly categories = input<string[]>([]);
  readonly title = input('');
  readonly description = input('');
  readonly loading = input(false);
  readonly emptyTitle = input('');
  readonly emptyDescription = input('');
  readonly max = input(100);
}

function createRestaurantContextMock() {
  const restaurant = {
    id: 'restaurant-mesaflow-centro',
    name: 'MesaFlow Centro',
    displayName: 'MesaFlow Centro',
    timezone: TIMEZONE,
    currency: 'EUR',
    isActive: true,
  };

  return {
    load: vi.fn(),
    activeRestaurant: () => restaurant,
    isLoading: () => false,
    loadError: () => null,
    multipleRestaurants: () => false,
    hasNoRestaurants: () => false,
    restaurants: () => [restaurant],
  };
}

function createRouteHarness(initialParams: Params = {}) {
  const router = { navigate: vi.fn(async () => true) };
  const route = { snapshot: { queryParamMap: convertToParamMap(initialParams) } };
  return {
    providers: [
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: route },
    ],
    router,
  };
}

function createReport(): RestaurantAnalyticsReportDto {
  return {
    summary: { revenueCents: 120000, ordersCount: 40, averageTicketCents: 3000, averageTableTurnoverMinutes: 52 },
    previousSummary: { revenueCents: 100000, ordersCount: 40, averageTicketCents: 2500, averageTableTurnoverMinutes: 52 },
    salesByDay: [{ date: '2026-06-24', revenueCents: 120000, ordersCount: 40 }],
    topProducts: [{ productName: 'Paella', quantity: 20, revenueCents: 40000 }],
    paymentBreakdown: [{ method: 'card', amountCents: 90000, count: 30 }],
    peakHours: [{ hour: 21, ordersCount: 15 }],
  };
}

function emptyReport(): RestaurantAnalyticsReportDto {
  return {
    summary: { revenueCents: 0, ordersCount: 0, averageTicketCents: 0, averageTableTurnoverMinutes: 0 },
    previousSummary: { revenueCents: 0, ordersCount: 0, averageTicketCents: 0, averageTableTurnoverMinutes: 0 },
    salesByDay: [],
    topProducts: [],
    paymentBreakdown: [],
    peakHours: [],
  };
}

describe('RestaurantPosDashboardPage', () => {
  beforeAll(() => {
    globalThis.ResizeObserver = TestResizeObserver;
  });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-06-24T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the summary KPIs using the restaurant timezone for the default 7-day range', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness();
    const api = { getReport: vi.fn(() => of(createReport())) };

    await render(RestaurantPosDashboardPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: RestaurantContextStore, useValue: restaurantContext },
        { provide: RestaurantAnalyticsApiService, useValue: api },
      ],
    });

    const today = currentZonedDateIso(TIMEZONE);
    const from = addDaysToIsoDate(today, -6);
    expect(screen.getByText('40')).toBeTruthy();
    expect(api.getReport).toHaveBeenCalledWith('restaurant-mesaflow-centro', {
      from: zonedDayRangeUtc(from, TIMEZONE).from,
      to: zonedDayRangeUtc(today, TIMEZONE).to,
    });
  });

  it('shows a variation badge comparing each KPI to the previous period', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness();
    const api = { getReport: vi.fn(() => of(createReport())) };

    await render(RestaurantPosDashboardPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: RestaurantContextStore, useValue: restaurantContext },
        { provide: RestaurantAnalyticsApiService, useValue: api },
      ],
    });

    // Revenue (120000 vs 100000) and average ticket (3000 vs 2500) both grew 20%.
    expect(screen.getAllByText('restaurantPos.dashboard.metrics.vsIncrease').length).toBe(2);
    // Orders count (40 vs 40) and table turnover (52 vs 52) are unchanged.
    expect(screen.getAllByText('restaurantPos.dashboard.metrics.vsFlat').length).toBe(2);
  });

  it('does not show a variation badge when there is no previous-period baseline', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness();
    const api = { getReport: vi.fn(() => of(emptyReport())) };

    await render(RestaurantPosDashboardPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: RestaurantContextStore, useValue: restaurantContext },
        { provide: RestaurantAnalyticsApiService, useValue: api },
      ],
    });

    expect(screen.queryByText('restaurantPos.dashboard.metrics.vsIncrease')).toBeNull();
    expect(screen.queryByText('restaurantPos.dashboard.metrics.vsFlat')).toBeNull();
  });

  it('shows an empty state when the report has no orders in range', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness();
    const api = { getReport: vi.fn(() => of(emptyReport())) };

    await render(RestaurantPosDashboardPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: RestaurantContextStore, useValue: restaurantContext },
        { provide: RestaurantAnalyticsApiService, useValue: api },
      ],
    });

    expect(screen.getByText('restaurantPos.dashboard.empty')).toBeTruthy();
  });

  it('shows an error alert instead of the empty state when the report request fails', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness();
    const api = { getReport: vi.fn(() => throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error' }))) };

    await render(RestaurantPosDashboardPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: RestaurantContextStore, useValue: restaurantContext },
        { provide: RestaurantAnalyticsApiService, useValue: api },
      ],
    });

    expect(screen.getByText('restaurantPos.dashboard.errors.title')).toBeTruthy();
    expect(screen.getByText('Something went wrong.')).toBeTruthy();
    expect(screen.queryByText('restaurantPos.dashboard.empty')).toBeNull();
  });

  it('hydrates a custom range from the URL query params on first load', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness({ range: 'custom', from: '2026-01-01', to: '2026-01-10' });
    const api = { getReport: vi.fn(() => of(createReport())) };

    await render(RestaurantPosDashboardPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: RestaurantContextStore, useValue: restaurantContext },
        { provide: RestaurantAnalyticsApiService, useValue: api },
      ],
    });

    expect(api.getReport).toHaveBeenCalledWith('restaurant-mesaflow-centro', {
      from: zonedDayRangeUtc('2026-01-01', TIMEZONE).from,
      to: zonedDayRangeUtc('2026-01-10', TIMEZONE).to,
    });
  });

  it('reloads the report and updates the URL when a quick range option is selected', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness();
    const api = {
      getReport: vi.fn((_restaurantId: string, _filters: { from: string; to: string }) => of(createReport())),
    };

    TestBed.overrideComponent(RestaurantPosDashboardPage, {
      remove: { imports: [Chart] },
      add: { imports: [ChartStub] },
    });

    await render(RestaurantPosDashboardPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: RestaurantContextStore, useValue: restaurantContext },
        { provide: RestaurantAnalyticsApiService, useValue: api },
      ],
    });

    const initialCallCount = api.getReport.mock.calls.length;
    fireEvent.click(screen.getByRole('radio', { name: 'restaurantPos.dashboard.ranges.30d' }));

    expect(api.getReport.mock.calls.length).toBeGreaterThan(initialCallCount);
    const lastCallFilters = api.getReport.mock.calls.at(-1)?.[1];
    expect(lastCallFilters).toBeDefined();
    expect(new Date(lastCallFilters!.to).getTime() - new Date(lastCallFilters!.from).getTime()).toBeGreaterThan(20 * 24 * 60 * 60 * 1000);
    expect(routeHarness.router.navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({ queryParams: expect.objectContaining({ range: '30d', from: null, to: null }) }),
    );
  });

  it('clamps a manually entered range wider than 366 days and shows a hint', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness();
    const api = {
      getReport: vi.fn((_restaurantId: string, _filters: { from: string; to: string }) => of(createReport())),
    };

    TestBed.overrideComponent(RestaurantPosDashboardPage, {
      remove: { imports: [Chart] },
      add: { imports: [ChartStub] },
    });

    await render(RestaurantPosDashboardPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: RestaurantContextStore, useValue: restaurantContext },
        { provide: RestaurantAnalyticsApiService, useValue: api },
      ],
    });

    fireEvent.input(screen.getByLabelText('restaurantPos.dashboard.filters.from'), { target: { value: '2020-01-01' } });

    expect(screen.getByText('restaurantPos.dashboard.filters.rangeClamped')).toBeTruthy();
    const lastCallFilters = api.getReport.mock.calls.at(-1)?.[1];
    expect(lastCallFilters).toBeDefined();
    const rangeDays = (new Date(lastCallFilters!.to).getTime() - new Date(lastCallFilters!.from).getTime()) / (24 * 60 * 60 * 1000);
    // A 366 calendar-day gap spans just under 367 full days once converted to
    // UTC start-of-day/end-of-day instants; assert well below the unclamped
    // ~2300-day span to confirm clamping actually happened.
    expect(rangeDays).toBeLessThan(400);
  });

  it('switches to an accessible table view for the charts when toggled', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness();
    const api = { getReport: vi.fn(() => of(createReport())) };

    TestBed.overrideComponent(RestaurantPosDashboardPage, {
      remove: { imports: [Chart] },
      add: { imports: [ChartStub] },
    });

    await render(RestaurantPosDashboardPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: RestaurantContextStore, useValue: restaurantContext },
        { provide: RestaurantAnalyticsApiService, useValue: api },
      ],
    });

    expect(screen.queryByRole('table')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'restaurantPos.dashboard.filters.viewAsTable' }));

    expect(screen.getAllByRole('table').length).toBe(4);
    expect(screen.getByText('Paella')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'restaurantPos.dashboard.filters.viewAsChart' }));

    expect(screen.queryByRole('table')).toBeNull();
  });
});
