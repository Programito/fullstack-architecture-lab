import { HttpErrorResponse } from '@angular/common/http';
import { Component, input, output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router, convertToParamMap, type Params } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { Subject, of, throwError } from 'rxjs';

import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { addDaysToIsoDate, currentZonedDateIso, zonedDayRangeUtc } from '../../../../shared/utils/date/restaurant-timezone';
import { Chart } from '../../../../shared/ui/chart/chart';
import { DatePicker } from '../../../../shared/ui/date-picker/date-picker';
import { RestaurantAnalyticsApiService } from '../../api/restaurant-analytics-api.service';
import type { RestaurantAnalyticsReportDto } from '../../api/restaurant-analytics.models';
import { RestaurantContextStore } from '../../state/restaurant-context.store';
import { RestaurantPosDashboardPage } from './restaurant-pos-dashboard-page';
import { RestaurantAnalyticsExportService } from './restaurant-pos-dashboard-export.service';

// The Angular CLI's vitest builder rejects `vi.mock()` for relative imports
// ("Please use Angular TestBed for mocking dependencies"), so the export
// helper is faked here as a plain object and provided via TestBed instead.
function createExportServiceMock() {
  return {
    fileExtensions: { xlsx: 'xlsx', csv: 'zip' },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- keeps the mock's inferred arity at 1, matching the real method, so `mock.calls[0]` destructures as a 1-tuple below.
    export: vi.fn(async (_input: unknown) => new Blob(['xlsx'])),
    triggerDownload: vi.fn(),
  };
}

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

@Component({
  selector: 'app-date-picker',
  template: `
    <button
      type="button"
      [attr.aria-label]="label()"
      [attr.data-start]="startValue()"
      [attr.data-end]="endValue()"
      [attr.data-min]="min()"
      [attr.data-max]="max()"
    ></button>
  `,
})
class DatePickerStub {
  readonly mode = input<'single' | 'range'>('single');
  readonly label = input('');
  readonly placeholder = input('');
  readonly hint = input('');
  readonly error = input('');
  readonly value = input('');
  readonly startValue = input('');
  readonly endValue = input('');
  readonly dateFormat = input('d MMM yyyy');
  readonly weekStartsOn = input<0 | 1>(1);
  readonly name = input('');
  readonly min = input('');
  readonly max = input('');
  readonly variant = input<'primary' | 'secondary' | 'neutral' | 'danger' | 'violet'>('primary');
  readonly fill = input<'default' | 'solid' | 'outline' | 'filled'>('default');
  readonly appearance = input<'default' | 'minimal'>('default');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly disabled = input(false);
  readonly required = input(false);

  readonly valueChange = output<string>();
  readonly rangeChange = output<{ start: string; end: string }>();
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
    previousSalesByDay: [
      { date: '2026-06-16', revenueCents: 50000, ordersCount: 18 },
      { date: '2026-06-17', revenueCents: 50000, ordersCount: 18 },
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
    previousSalesByDay: [],
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
    previousSalesByDay: [],
    topProducts: [],
    paymentBreakdown: [],
    peakHours: [],
  };
}

function compactPeriodLabel(from: string, to: string, locale = 'es'): string {
  const formatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const fromDate = new Date(`${from}T12:00:00.000Z`);
  const toDate = new Date(`${to}T12:00:00.000Z`);
  return `${formatter.format(fromDate)} - ${formatter.format(toDate)}`;
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
    expect(screen.getByText('Método dominante')).toBeTruthy();
    expect(screen.getAllByText('Tarjeta').length).toBeGreaterThan(0);
    expect(screen.getByText('Mejor día: 2026-06-23')).toBeTruthy();
  });
  it('keeps the clear-filters action and the visibility toggle together in the same header row', async () => {
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

    const actions = view.container.querySelector('.restaurant-pos-dashboard-page__filters-actions');

    expect(actions).toBeTruthy();
    expect(actions?.querySelectorAll('app-button').length).toBe(2);
  });

  it('shows loading spinners in the KPI cards while the report is still loading', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness();
    const report$ = new Subject<RestaurantAnalyticsReportDto>();
    const api = { getReport: vi.fn(() => report$) };

    const view = await render(RestaurantPosDashboardPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: RestaurantContextStore, useValue: restaurantContext },
        { provide: RestaurantAnalyticsApiService, useValue: api },
      ],
    });

    expect(view.container.querySelectorAll('.restaurant-pos-dashboard-page__summary-card app-spinner').length).toBe(4);
  });

  it('keeps a stable skeleton in the payment share panel while the report is still loading', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness();
    const report$ = new Subject<RestaurantAnalyticsReportDto>();
    const api = { getReport: vi.fn(() => report$) };

    TestBed.overrideComponent(RestaurantPosDashboardPage, {
      remove: { imports: [Chart, DatePicker] },
      add: { imports: [ChartStub, DatePickerStub] },
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

    const skeletonRows = view.container.querySelectorAll(
      '.restaurant-pos-dashboard-page__payment-mix-list app-skeleton',
    );
    expect(skeletonRows.length).toBeGreaterThan(0);
    expect(view.container.querySelector('.restaurant-pos-dashboard-page__payment-mix-track')).toBeNull();

    report$.next(createReport());
    report$.complete();
    view.fixture.detectChanges();

    expect(view.container.querySelectorAll('.restaurant-pos-dashboard-page__payment-mix-list app-skeleton').length).toBe(0);
    expect(view.container.querySelector('.restaurant-pos-dashboard-page__payment-mix-track')).not.toBeNull();
  });

  it('overlays the previous period as a second series on the sales trend chart', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness();
    const api = { getReport: vi.fn(() => of(createReport())) };

    TestBed.overrideComponent(RestaurantPosDashboardPage, {
      remove: { imports: [Chart, DatePicker] },
      add: { imports: [ChartStub, DatePickerStub] },
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

    const salesByDayChart = view.fixture.debugElement.queryAll(By.directive(ChartStub))[0].componentInstance as ChartStub;
    const series = salesByDayChart.data() as Array<{ name: string; values: number[] }>;

    expect(series).toHaveLength(2);
    expect(series[0]).toEqual({ name: 'Ingresos', values: [600, 600] });
    expect(series[1]).toEqual({ name: 'Periodo anterior', values: [500, 500] });
  });

  it('shows only the current-period series when there is no previous-period data', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness();
    const api = { getReport: vi.fn(() => of(reportWithPartialSections())) };

    TestBed.overrideComponent(RestaurantPosDashboardPage, {
      remove: { imports: [Chart, DatePicker] },
      add: { imports: [ChartStub, DatePickerStub] },
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

    const salesByDayChart = view.fixture.debugElement.queryAll(By.directive(ChartStub))[0].componentInstance as ChartStub;
    const series = salesByDayChart.data() as Array<{ name: string; values: number[] }>;

    expect(series).toHaveLength(1);
    expect(series[0].name).toBe('Ingresos');
  });

  it('uses the shared period picker for custom ranges and reloads analytics when a full range is selected', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness({
      range: 'custom',
      from: '2026-07-01',
      to: '2026-07-07',
    });
    const api = { getReport: vi.fn(() => of(createReport())) };

    TestBed.overrideComponent(RestaurantPosDashboardPage, {
      remove: { imports: [Chart, DatePicker] },
      add: { imports: [ChartStub, DatePickerStub] },
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

    expect(screen.queryByLabelText('Desde')).toBeNull();
    expect(screen.queryByLabelText('Hasta')).toBeNull();

    const periodPicker = screen.getByRole('button', { name: 'Rango de fechas' });
    expect(periodPicker.getAttribute('data-start')).toBe('2026-07-01');
    expect(periodPicker.getAttribute('data-end')).toBe('2026-07-07');

    const datePicker = view.fixture.debugElement.query(By.directive(DatePickerStub)).componentInstance as DatePickerStub;
    datePicker.rangeChange.emit({ start: '2026-07-20', end: '2026-07-25' });
    view.fixture.detectChanges();

    const reportCalls = api.getReport.mock.calls as unknown as Array<[string, { from: string; to: string }]>;
    const lastCallFilters = reportCalls.at(-1)?.[1];
    expect(lastCallFilters).toEqual({
      from: zonedDayRangeUtc('2026-07-20', TIMEZONE).from,
      to: zonedDayRangeUtc('2026-07-25', TIMEZONE).to,
    });
    expect(routeHarness.router.navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({ queryParams: expect.objectContaining({ from: '2026-07-20', to: '2026-07-25' }) }),
    );
  });

  it('passes the selected custom period into the shared date picker', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness({
      range: 'custom',
      from: '2026-07-01',
      to: '2026-07-07',
    });
    const api = { getReport: vi.fn(() => of(createReport())) };

    TestBed.overrideComponent(RestaurantPosDashboardPage, {
      remove: { imports: [Chart, DatePicker] },
      add: { imports: [ChartStub, DatePickerStub] },
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

    const periodPicker = screen.getByRole('button', { name: 'Rango de fechas' });
    expect(periodPicker.getAttribute('data-start')).toBe('2026-07-01');
    expect(periodPicker.getAttribute('data-end')).toBe('2026-07-07');
  });

  it('shows a friendlier banner when the backend rejects an invalid analytics range', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness();
    const api = {
      getReport: vi.fn(() =>
        throwError(() => new HttpErrorResponse({
          status: 400,
          error: {
            code: 'invalid_analytics_range',
            message: 'Date range is invalid: "from" must not be after "to".',
          },
        }))),
    };

    const view = await render(RestaurantPosDashboardPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: RestaurantContextStore, useValue: restaurantContext },
        { provide: RestaurantAnalyticsApiService, useValue: api },
      ],
    });

    expect(screen.getByText('Revisa el rango de fechas seleccionado.')).toBeTruthy();
    expect(screen.queryByText(/Date range is invalid/)).toBeNull();
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
    expect(screen.getAllByText('20% más que el periodo anterior').length).toBe(2);
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

    expect(screen.queryByText('20% más que el periodo anterior')).toBeNull();
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

    expect(screen.getByText('No se han podido cargar las analíticas')).toBeTruthy();
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
      remove: { imports: [Chart, DatePicker] },
      add: { imports: [ChartStub, DatePickerStub] },
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

    const filtersToggle = screen.getByRole('button', { name: 'Mostrar filtros' });

    expect(filtersToggle).toBeTruthy();
    expect(filtersToggle.className).toContain('button--neutral-clear');
    expect(filtersToggle.className).toContain('rounded-full');
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
      remove: { imports: [Chart, DatePicker] },
      add: { imports: [ChartStub, DatePickerStub] },
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

    const initialCallCount = api.getReport.mock.calls.length;
    fireEvent.click(screen.getByRole('radio', { name: '30 días' }));

    expect(api.getReport.mock.calls.length).toBeGreaterThan(initialCallCount);
    const reportCalls = api.getReport.mock.calls as unknown as Array<[string, { from: string; to: string }]>;
    const lastCallFilters = reportCalls.at(-1)?.[1];
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
      remove: { imports: [Chart, DatePicker] },
      add: { imports: [ChartStub, DatePickerStub] },
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

    const datePicker = view.fixture.debugElement.query(By.directive(DatePickerStub)).componentInstance as DatePickerStub;
    datePicker.rangeChange.emit({ start: '2020-01-01', end: '2026-07-07' });
    view.fixture.detectChanges();

    expect(screen.getByText('El rango máximo es de 1 año; se ha ajustado la fecha.')).toBeTruthy();
    const reportCalls = api.getReport.mock.calls as unknown as Array<[string, { from: string; to: string }]>;
    const lastCallFilters = reportCalls.at(-1)?.[1];
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
    expect(screen.getByText(compactPeriodLabel('2026-06-01', '2026-06-07'))).toBeTruthy();
    expect(screen.getByText('Desde: 2026-06-01')).toBeTruthy();
    expect(screen.getByText('Hasta: 2026-06-07')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeTruthy();
    expect(screen.queryByText('Limpiar filtros')).toBeNull();
  });

  it('removes only the selected custom filter chip when clicked', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'Desde: 2026-06-01' }));

    expect(screen.queryByText('Desde: 2026-06-01')).toBeNull();
    expect(screen.getByText('Hasta: 2026-06-07')).toBeTruthy();
    expect(routeHarness.router.navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({ queryParams: expect.objectContaining({ range: 'custom', from: null, to: '2026-06-07' }) }),
    );
  });

  it('returns to the default preset when the quick-range chip is removed', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness({
      range: '30d',
      filters: 'closed',
    });
    const api = { getReport: vi.fn(() => of(createReport())) };

    TestBed.overrideComponent(RestaurantPosDashboardPage, {
      remove: { imports: [Chart, DatePicker] },
      add: { imports: [ChartStub, DatePickerStub] },
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

    fireEvent.click(screen.getByRole('button', { name: '30 días' }));

    expect(routeHarness.router.navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({ queryParams: expect.objectContaining({ range: null, from: null, to: null }) }),
    );
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

    fireEvent.click(screen.getByRole('button', { name: 'Ver como gráfico' }));

    expect(screen.queryByRole('table')).toBeNull();
  });

  it('uses denser compact tables for payment breakdown and daily average ticket in table view', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness();
    const api = { getReport: vi.fn(() => of(createReport())) };

    TestBed.overrideComponent(RestaurantPosDashboardPage, {
      remove: { imports: [Chart, DatePicker] },
      add: { imports: [ChartStub, DatePickerStub] },
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
      remove: { imports: [Chart, DatePicker] },
      add: { imports: [ChartStub, DatePickerStub] },
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

    expect(screen.getByText(/75/)).toBeTruthy();
    expect(screen.getByText('30')).toBeTruthy();
    expect(screen.getAllByText(/30,00/).length).toBeGreaterThan(0);
    expect(screen.getByText('Método dominante: Tarjeta')).toBeTruthy();
  });

  it('shows cash as Efectivo and formats payment revenue with currency in the table view', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness();
    const api = { getReport: vi.fn(() => of(createReport())) };

    TestBed.overrideComponent(RestaurantPosDashboardPage, {
      remove: { imports: [Chart, DatePicker] },
      add: { imports: [ChartStub, DatePickerStub] },
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

    expect(screen.getByText('Efectivo')).toBeTruthy();
    expect(screen.getAllByText(/300,00/).length).toBeGreaterThan(0);
  });

  it('keeps payment share calculations correct for each payment method', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness();
    const api = { getReport: vi.fn(() => of(createReport())) };

    TestBed.overrideComponent(RestaurantPosDashboardPage, {
      remove: { imports: [Chart, DatePicker] },
      add: { imports: [ChartStub, DatePickerStub] },
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
      remove: { imports: [Chart, DatePicker] },
      add: { imports: [ChartStub, DatePickerStub] },
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

    expect(screen.getAllByText('Ingresos por método de pago').length).toBeGreaterThan(0);
    expect(screen.getByText('Mix de pagos')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Tarjeta' }).getAttribute('aria-valuetext')).toMatch(/75\s?%/);
    expect(screen.getByRole('progressbar', { name: 'Efectivo' }).getAttribute('aria-valuetext')).toMatch(/25\s?%/);
    expect(screen.getByText('Ticket medio por día')).toBeTruthy();
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

    expect(screen.getByText('No hay ingresos por método para este periodo.')).toBeTruthy();
    expect(screen.getByText('No hay productos destacados para este periodo.')).toBeTruthy();
    expect(screen.getByText('No hay horas punta registradas para este periodo.')).toBeTruthy();
  });

  it('shows section-level empty states in table mode without breaking accessibility', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness();
    const api = { getReport: vi.fn(() => of(reportWithPartialSections())) };

    TestBed.overrideComponent(RestaurantPosDashboardPage, {
      remove: { imports: [Chart, DatePicker] },
      add: { imports: [ChartStub, DatePickerStub] },
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

    expect(screen.getByText('No hay ingresos por método para este periodo.')).toBeTruthy();
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

    expect(screen.getByText('No se han podido cargar las analíticas')).toBeTruthy();
  });

  it('does not render the export action while there is no data yet', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness();
    const report$ = new Subject<RestaurantAnalyticsReportDto>();
    const api = { getReport: vi.fn(() => report$) };

    await render(RestaurantPosDashboardPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: RestaurantContextStore, useValue: restaurantContext },
        { provide: RestaurantAnalyticsApiService, useValue: api },
      ],
    });

    expect(screen.queryByRole('button', { name: 'Exportar' })).toBeNull();
  });

  it('exports the loaded report as an Excel workbook when the export action is pressed', async () => {
    const exportService = createExportServiceMock();

    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness();
    const api = { getReport: vi.fn(() => of(createReport())) };

    TestBed.overrideComponent(RestaurantPosDashboardPage, {
      remove: { imports: [Chart, DatePicker] },
      add: { imports: [ChartStub, DatePickerStub] },
    });

    await render(RestaurantPosDashboardPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: RestaurantContextStore, useValue: restaurantContext },
        { provide: RestaurantAnalyticsApiService, useValue: api },
        { provide: RestaurantAnalyticsExportService, useValue: exportService },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Excel (.xlsx)' }));
    await Promise.resolve();
    await Promise.resolve();

    expect(exportService.export).toHaveBeenCalledTimes(1);
    const [input] = exportService.export.mock.calls[0] as [{ restaurantName: string; period: { from: string; to: string }; report: RestaurantAnalyticsReportDto }];
    expect(input.restaurantName).toBe('MesaFlow Centro');
    expect(input.report).toEqual(createReport());
    expect(input.period.from).toBeTruthy();
    expect(input.period.to).toBeTruthy();

    expect(exportService.triggerDownload).toHaveBeenCalledTimes(1);
    const [filename] = exportService.triggerDownload.mock.calls[0] as [string];
    expect(filename).toContain('restaurant-mesaflow-centro');
    expect(filename.endsWith('.xlsx')).toBe(true);
  });

  it('persists the view mode when toggled and restores it on the next visit', async () => {
    const i18n = provideI18nTesting();
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness();
    const api = { getReport: vi.fn(() => of(createReport())) };

    TestBed.overrideComponent(RestaurantPosDashboardPage, {
      remove: { imports: [Chart, DatePicker] },
      add: { imports: [ChartStub, DatePickerStub] },
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

    expect(i18n.storage.getItem('restaurantPos.dashboard.viewMode')).toBe('table');
  });

  it('restores the last persisted view mode on mount when the URL has no explicit view', async () => {
    const i18n = provideI18nTesting();
    i18n.storage.setItem('restaurantPos.dashboard.viewMode', 'table');
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness();
    const api = { getReport: vi.fn(() => of(createReport())) };

    TestBed.overrideComponent(RestaurantPosDashboardPage, {
      remove: { imports: [Chart, DatePicker] },
      add: { imports: [ChartStub, DatePickerStub] },
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

    expect(screen.getByRole('button', { name: 'Ver como gráfico' })).toBeTruthy();
  });

  it('lets an explicit URL view param override the persisted preference', async () => {
    const i18n = provideI18nTesting();
    i18n.storage.setItem('restaurantPos.dashboard.viewMode', 'table');
    const restaurantContext = createRestaurantContextMock();
    const routeHarness = createRouteHarness({ view: 'chart' });
    const api = { getReport: vi.fn(() => of(createReport())) };

    TestBed.overrideComponent(RestaurantPosDashboardPage, {
      remove: { imports: [Chart, DatePicker] },
      add: { imports: [ChartStub, DatePickerStub] },
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

    expect(screen.getByRole('button', { name: 'Ver como tabla' })).toBeTruthy();
  });
});


