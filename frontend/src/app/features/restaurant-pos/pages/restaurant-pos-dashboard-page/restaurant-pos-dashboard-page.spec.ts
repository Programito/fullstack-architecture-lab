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
    organizationId: 'org-demo',
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
    salesByDay: [
      { date: '2026-06-23', revenueCents: 60000, ordersCount: 20 },
      { date: '2026-06-24', revenueCents: 60000, ordersCount: 20 },
    ],
    topProducts: [{ productName: 'Paella', quantity: 20, revenueCents: 40000 }],
    paymentBreakdown: [
      { method: 'cash', amountCents: 30000, count: 10 },
      { method: 'card', amountCents: 90000, count: 30 },
    ],
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

function reportWithPartialSections(): RestaurantAnalyticsReportDto {
  return {
    summary: { revenueCents: 45000, ordersCount: 15, averageTicketCents: 3000, averageTableTurnoverMinutes: 48 },
    previousSummary: { revenueCents: 40000, ordersCount: 14, averageTicketCents: 2857, averageTableTurnoverMinutes: 50 },
    salesByDay: [{ date: '2026-06-24', revenueCents: 45000, ordersCount: 15 }],
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
    expect(screen.getByText('Metodo dominante')).toBeTruthy();
    expect(screen.getByText('Tarjeta')).toBeTruthy();
    expect(screen.getByText('Mejor dia: 2026-06-23')).toBeTruthy();
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
    expect(screen.getAllByText('20% mas que el periodo anterior').length).toBe(2);
    // Orders count (40 vs 40) is unchanged.
    expect(screen.getAllByText('Igual que el periodo anterior').length).toBe(1);
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

    expect(screen.queryByText('20% mas que el periodo anterior')).toBeNull();
    expect(screen.queryByText('Igual que el periodo anterior')).toBeNull();
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

    expect(screen.getByText('No hay datos de ventas para el periodo seleccionado.')).toBeTruthy();
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

    expect(screen.getByText('No se han podido cargar las analiticas')).toBeTruthy();
    expect(screen.getByText('Something went wrong.')).toBeTruthy();
    expect(screen.queryByText('No hay datos de ventas para el periodo seleccionado.')).toBeNull();
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

  it('hydrates table view and collapsed filters from the URL query params on first load', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness({
      range: 'custom',
      from: '2026-06-01',
      to: '2026-06-07',
      view: 'table',
      filters: 'closed',
    });
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

    expect(screen.getByRole('button', { name: 'Mostrar filtros' })).toBeTruthy();
    expect(screen.getAllByRole('table').length).toBe(5);
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
    fireEvent.click(screen.getByRole('radio', { name: '30 dias' }));

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

    fireEvent.input(screen.getByLabelText('Desde'), { target: { value: '2020-01-01' } });

    expect(screen.getByText('El rango maximo es de 1 ano; se ha ajustado la fecha.')).toBeTruthy();
    const lastCallFilters = api.getReport.mock.calls.at(-1)?.[1];
    expect(lastCallFilters).toBeDefined();
    const rangeDays = (new Date(lastCallFilters!.to).getTime() - new Date(lastCallFilters!.from).getTime()) / (24 * 60 * 60 * 1000);
    // A 366 calendar-day gap spans just under 367 full days once converted to
    // UTC start-of-day/end-of-day instants; assert well below the unclamped
    // ~2300-day span to confirm clamping actually happened.
    expect(rangeDays).toBeLessThan(400);
  });

  it('shows a compact active-filter summary when the filter card is collapsed', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness({
      range: 'custom',
      from: '2026-06-01',
      to: '2026-06-07',
      filters: 'closed',
    });
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

    expect(screen.getByText('Filtros activos')).toBeTruthy();
    expect(screen.getByText('Desde: 2026-06-01')).toBeTruthy();
    expect(screen.getByText('Hasta: 2026-06-07')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeTruthy();
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

    fireEvent.click(screen.getByRole('button', { name: 'Ver como tabla' }));

    expect(screen.getAllByRole('table').length).toBe(5);
    expect(screen.getByText('Paella')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Ver como grafico' }));

    expect(screen.queryByRole('table')).toBeNull();
  });

  it('uses denser compact tables for payment breakdown and daily average ticket in table view', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness();
    const api = { getReport: vi.fn(() => of(createReport())) };

    TestBed.overrideComponent(RestaurantPosDashboardPage, {
      remove: { imports: [Chart] },
      add: { imports: [ChartStub] },
    });

    const view = await render(RestaurantPosDashboardPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: RestaurantContextStore, useValue: restaurantContext },
        { provide: RestaurantAnalyticsApiService, useValue: api },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Ver como tabla' }));

    expect(view.container.querySelectorAll('.table.table--sm.table--minimal').length).toBeGreaterThanOrEqual(2);
  });

  it('shows payment mix, operations and average ticket in the table view', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'Ver como tabla' }));

    expect(screen.getByText(/75/)).toBeTruthy();
    expect(screen.getByText('30')).toBeTruthy();
    expect(screen.getAllByText(/30,00/).length).toBeGreaterThan(0);
    expect(screen.getByText('Metodo dominante: Tarjeta')).toBeTruthy();
  });

  it('shows cash as Efectivo and formats payment revenue with currency in the table view', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'Ver como tabla' }));

    expect(screen.getByText('Efectivo')).toBeTruthy();
    expect(screen.getAllByText(/300,00/).length).toBeGreaterThan(0);
  });

  it('keeps payment share calculations correct for each payment method', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'Ver como tabla' }));

    expect(screen.getByText(/25/)).toBeTruthy();
    expect(screen.getByText(/75/)).toBeTruthy();
  });

  it('renders a daily average ticket row safely when a day has no orders', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness();
    const report = createReport();
    report.salesByDay = [
      { date: '2026-06-22', revenueCents: 0, ordersCount: 0 },
      { date: '2026-06-23', revenueCents: 4500, ordersCount: 2 },
    ];
    const api = { getReport: vi.fn(() => of(report)) };

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

    fireEvent.click(screen.getByRole('button', { name: 'Ver como tabla' }));

    expect(screen.getAllByText('2026-06-22').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0,00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('2026-06-23').length).toBeGreaterThan(0);
    expect(screen.getByText(/22,50/)).toBeTruthy();
  });

  it('renders the extra analytics charts for payment share and daily average ticket', async () => {
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

    expect(screen.getAllByText('Ingresos por metodo de pago').length).toBeGreaterThan(0);
    expect(screen.getByText('Mix de pagos')).toBeTruthy();
    expect(screen.getByText('Ticket medio por dia')).toBeTruthy();
  });

  it('renders dashboard sections in the new hierarchy with payments as a dedicated section', async () => {
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

    expect(screen.getByRole('region', { name: 'Resumen' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Tendencias' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Pagos' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Operativa' })).toBeTruthy();
  });

  it('adds mobile layout hooks for summary cards, page actions and payments', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness();
    const api = { getReport: vi.fn(() => of(createReport())) };

    const view = await render(RestaurantPosDashboardPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: RestaurantContextStore, useValue: restaurantContext },
        { provide: RestaurantAnalyticsApiService, useValue: api },
      ],
    });

    expect(view.container.querySelectorAll('.restaurant-pos-dashboard-page__summary-card').length).toBe(4);
    expect(view.container.querySelector('.restaurant-pos-dashboard-page__page-actions')).toBeTruthy();
    expect(view.container.querySelector('.restaurant-pos-dashboard-page__payment-panel')).toBeTruthy();
  });

  it('shows section-level empty states when the report has partial analytics data', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness();
    const api = { getReport: vi.fn(() => of(reportWithPartialSections())) };

    await render(RestaurantPosDashboardPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: RestaurantContextStore, useValue: restaurantContext },
        { provide: RestaurantAnalyticsApiService, useValue: api },
      ],
    });

    expect(screen.getByText('No hay ingresos por metodo para este periodo.')).toBeTruthy();
    expect(screen.getByText('No hay productos destacados para este periodo.')).toBeTruthy();
    expect(screen.getByText('No hay horas punta registradas para este periodo.')).toBeTruthy();
  });

  it('shows section-level empty states in table mode without breaking accessibility', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness();
    const api = { getReport: vi.fn(() => of(reportWithPartialSections())) };

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

    fireEvent.click(screen.getByRole('button', { name: 'Ver como tabla' }));

    expect(screen.getByText('No hay ingresos por metodo para este periodo.')).toBeTruthy();
    expect(screen.getByText('No hay productos destacados para este periodo.')).toBeTruthy();
    expect(screen.getByText('No hay horas punta registradas para este periodo.')).toBeTruthy();
    expect(screen.getAllByRole('table').length).toBe(2);
  });

  it('does not hide the error state behind the collapsed filter card', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness({ filters: 'closed' });
    const api = {
      getReport: vi.fn(() => throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error' }))),
    };

    await render(RestaurantPosDashboardPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: RestaurantContextStore, useValue: restaurantContext },
        { provide: RestaurantAnalyticsApiService, useValue: api },
      ],
    });

    expect(screen.getByText('No se han podido cargar las analiticas')).toBeTruthy();
  });
});
