import { fireEvent, render, screen } from '@testing-library/angular';
import { ActivatedRoute, Router, convertToParamMap, type Params } from '@angular/router';
import { Component, input, output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';

import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { Chart, type ChartSeries } from '../../../../shared/ui/chart/chart';
import { DeveloperLogsApiService } from '../../api/developer-logs-api.service';
import { DeveloperLogsPage } from './developer-logs-page';

class TestResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

@Component({ selector: 'app-chart', template: '<button type="button" (click)="pointSelected.emit({ seriesName: firstSeriesName(), category: firstCategory(), value: firstValue() })">{{ title() }}</button>' })
class ChartStub {
  readonly type = input('line');
  readonly appearance = input('default');
  readonly size = input('md');
  readonly variant = input('primary');
  readonly data = input<ChartSeries[]>([]);
  readonly categories = input<string[]>([]);
  readonly title = input('');
  readonly description = input('');
  readonly loading = input(false);
  readonly emptyTitle = input('');
  readonly emptyDescription = input('');
  readonly max = input(100);
  readonly interactive = input(false);
  readonly pointSelected = output<{ seriesName: string; category: string; value: number }>();

  protected firstCategory(): string {
    return this.categories()[0] ?? '';
  }

  protected firstSeriesName(): string {
    return this.data()[0]?.name ?? this.title();
  }

  protected firstValue(): number {
    return this.data()[0]?.values.at(0) ?? 0;
  }
}

function pickerApiMocks() {
  return {
    getRestaurantOptions: vi.fn(() => of([{ id: 'restaurant-mesaflow-centro', name: 'MesaFlow Centro' }])),
    getActorOptions: vi.fn(() => of([{ id: 'user-1', label: 'developer@mesaflow.demo' }])),
    getEntityOptions: vi.fn(() => of([{ id: 'user-1', label: 'developer@mesaflow.demo' }])),
  };
}

function createRouteHarness(initialParams: Params = {}) {
  const queryParams$ = new BehaviorSubject(convertToParamMap(initialParams));
  const router = {
    navigate: vi.fn(async (_commands: unknown[], options?: { queryParams?: Params }) => {
      queryParams$.next(convertToParamMap(options?.queryParams ?? {}));
      return true;
    }),
  };

  return {
    providers: [
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: { queryParamMap: queryParams$.asObservable() } },
    ],
    route: {
      queryParamMap: queryParams$.asObservable(),
    },
    router,
  };
}

describe('DeveloperLogsPage', () => {
  beforeAll(() => {
    globalThis.ResizeObserver = TestResizeObserver;
  });

  beforeEach(() => {
    TestBed.overrideComponent(DeveloperLogsPage, {
      remove: { imports: [Chart] },
      add: { imports: [ChartStub] },
    });
  });

  it('renders the main metrics and recent events table', async () => {
    const i18n = provideI18nTesting();
    const routeHarness = createRouteHarness();
    const api = {
      ...pickerApiMocks(),
      getSummary: vi.fn(() => of({
        totalRequests: 120,
        errorCount: 8,
        errorRate: 6.7,
        auditEvents: 20,
        p95DurationMs: 340,
        authByOrigin: [
          { key: 'web-admin', succeeded: 3, failed: 1 },
          { key: 'apk-customer', succeeded: 2, failed: 0 },
        ],
        topSlowPaths: [
          { path: '/api/v1/orders/:id/payments', clientOrigin: 'web-pos', p95DurationMs: 880, total: 12 },
        ],
        topErrorEvents: [
          { event: 'http.request.failed', path: '/api/v1/orders/:id/payments', clientOrigin: 'web-pos', count: 5 },
        ],
      })),
      getTimeline: vi.fn(() => of([{ bucket: '2026-07-02T10:00', total: 12, errors: 1, audit: 2 }])),
      getBreakdown: vi.fn(() => of({
        levels: [{ key: 'error', count: 8 }],
        categories: [{ key: 'request', count: 50 }],
        origins: [{ key: 'web-admin', count: 20 }],
      })),
      getEvents: vi.fn(() => of({
        total: 1,
        items: [{
          id: 'log-1',
          timestamp: '2026-07-02T10:00:00.000Z',
          source: 'backend',
          category: 'request',
          level: 'info',
          event: 'http.request.completed',
          message: 'GET /api/v1/health completed with 200',
          path: '/api/v1/health',
          method: 'GET',
          statusCode: 200,
          durationMs: 12,
          userId: null,
          restaurantId: null,
          requestId: 'req-1',
          actorRoles: [],
          result: null,
          clientOrigin: 'web-admin',
          entityType: null,
          entityId: null,
          entityLabel: null,
          changedFields: [],
          metadata: null,
        }],
      })),
    };

    await render(DeveloperLogsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: DeveloperLogsApiService, useValue: api },
      ],
    });

    expect(screen.getByText('120')).toBeTruthy();
    expect(screen.getByText('340 ms')).toBeTruthy();
    expect(screen.getByText('http.request.completed')).toBeTruthy();
    expect(screen.getAllByText('developer.logs.metrics.loginSucceeded').length).toBeGreaterThan(0);
    expect(screen.getAllByText('developer.logs.metrics.loginFailed').length).toBeGreaterThan(0);
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    expect(screen.getByText('developer.logs.sections.topSlowPaths')).toBeTruthy();
    expect(screen.getByText('developer.logs.sections.topErrors')).toBeTruthy();
    expect(screen.getAllByText('/api/v1/orders/:id/payments').length).toBeGreaterThan(0);
    expect(screen.getByText('880 ms')).toBeTruthy();
    expect(screen.getByText('http.request.failed')).toBeTruthy();
    expect(api.getSummary).toHaveBeenCalled();
    expect(api.getEvents).toHaveBeenCalled();
  });

  it('renders comparison text beneath the main kpi values', async () => {
    const i18n = provideI18nTesting();
    const routeHarness = createRouteHarness();
    const api = {
      ...pickerApiMocks(),
      getSummary: vi.fn(() => of({
        totalRequests: 20,
        errorCount: 4,
        errorRate: 20,
        auditEvents: 8,
        p95DurationMs: 300,
        authByOrigin: [],
        topSlowPaths: [],
        topErrorEvents: [],
        comparison: {
          previous: {
            totalRequests: 10,
            errorCount: 1,
            errorRate: 10,
            auditEvents: 5,
            p95DurationMs: 150,
          },
          delta: {
            totalRequests: { absolute: 10, percent: 100, direction: 'up' },
            errorCount: { absolute: 3, percent: 300, direction: 'up' },
            errorRate: { absolute: 10, percent: 100, direction: 'up' },
            auditEvents: { absolute: 3, percent: 60, direction: 'up' },
            p95DurationMs: { absolute: 150, percent: 100, direction: 'up' },
          },
        },
      })),
      getTimeline: vi.fn(() => of([])),
      getBreakdown: vi.fn(() => of({ levels: [], categories: [], origins: [] })),
      getEvents: vi.fn(() => of({ total: 0, items: [] })),
    };

    const { container } = await render(DeveloperLogsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: DeveloperLogsApiService, useValue: api },
      ],
    });

    expect(container.textContent).toContain('+100% developer.logs.metrics.vsPrevious');
    expect(container.textContent).toContain('+150 developer.logs.metrics.vsPrevious');
  });

  it('renders a no-comparison fallback when percent is null', async () => {
    const i18n = provideI18nTesting();
    const routeHarness = createRouteHarness();
    const api = {
      ...pickerApiMocks(),
      getSummary: vi.fn(() => of({
        totalRequests: 3,
        errorCount: 1,
        errorRate: 33.3,
        auditEvents: 0,
        p95DurationMs: 120,
        authByOrigin: [],
        topSlowPaths: [],
        topErrorEvents: [],
        comparison: {
          previous: {
            totalRequests: 0,
            errorCount: 0,
            errorRate: 0,
            auditEvents: 0,
            p95DurationMs: 0,
          },
          delta: {
            totalRequests: { absolute: 3, percent: null, direction: 'up' },
            errorCount: { absolute: 1, percent: null, direction: 'up' },
            errorRate: { absolute: 33.3, percent: null, direction: 'up' },
            auditEvents: { absolute: 0, percent: 0, direction: 'flat' },
            p95DurationMs: { absolute: 120, percent: null, direction: 'up' },
          },
        },
      })),
      getTimeline: vi.fn(() => of([])),
      getBreakdown: vi.fn(() => of({ levels: [], categories: [], origins: [] })),
      getEvents: vi.fn(() => of({ total: 0, items: [] })),
    };

    const { container } = await render(DeveloperLogsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: DeveloperLogsApiService, useValue: api },
      ],
    });

    expect(container.textContent).toContain('developer.logs.metrics.noComparison');
  });

  it('switches to audit view and loads filtered events from a quick range preset', async () => {
    const i18n = provideI18nTesting();
    const routeHarness = createRouteHarness();
    const api = {
      ...pickerApiMocks(),
      getSummary: vi.fn(() => of({
        totalRequests: 120,
        errorCount: 8,
        errorRate: 6.7,
        auditEvents: 20,
        p95DurationMs: 340,
        authByOrigin: [],
        topSlowPaths: [],
        topErrorEvents: [],
      })),
      getTimeline: vi.fn(() => of([{ bucket: '2026-07-02T10:00', total: 12, errors: 1, audit: 2 }])),
      getBreakdown: vi.fn(() => of({
        levels: [{ key: 'error', count: 8 }],
        categories: [{ key: 'request', count: 50 }],
        origins: [{ key: 'web-admin', count: 10 }],
      })),
      getEvents: vi.fn(() => of({
        total: 1,
        items: [{
          id: 'log-1',
          timestamp: '2026-07-02T10:00:00.000Z',
          source: 'backend',
          category: 'audit',
          level: 'info',
          event: 'auth.login.succeeded',
          message: 'User signed in.',
          path: '/api/v1/auth/login',
          method: 'POST',
          statusCode: 200,
          durationMs: 12,
          userId: 'user-1',
          restaurantId: null,
          requestId: 'req-1',
          actorRoles: ['developer'],
          result: 'succeeded',
          clientOrigin: 'web-admin',
          entityType: 'auth',
          entityId: 'user-1',
          entityLabel: 'developer@mesaflow.demo',
          changedFields: ['session'],
          metadata: null,
        }],
      })),
    };

    await render(DeveloperLogsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: DeveloperLogsApiService, useValue: api },
      ],
    });

    screen.getByRole('button', { name: 'developer.logs.views.audit' }).click();
    screen.getByRole('button', { name: 'developer.logs.ranges.24h' }).click();

    expect(api.getEvents).toHaveBeenLastCalledWith(expect.objectContaining({
      category: 'audit',
    }), 1, 20);
  });

  it('applies a path filter to all dashboard requests', async () => {
    const i18n = provideI18nTesting();
    const routeHarness = createRouteHarness();
    const api = {
      ...pickerApiMocks(),
      getSummary: vi.fn(() => of({
        totalRequests: 120,
        errorCount: 8,
        errorRate: 6.7,
        auditEvents: 20,
        p95DurationMs: 340,
        authByOrigin: [],
        topSlowPaths: [],
        topErrorEvents: [],
      })),
      getTimeline: vi.fn(() => of([{ bucket: '2026-07-02T10:00', total: 12, errors: 1, audit: 2 }])),
      getBreakdown: vi.fn(() => of({
        levels: [{ key: 'error', count: 8 }],
        categories: [{ key: 'request', count: 50 }],
        origins: [{ key: 'web-admin', count: 8 }],
      })),
      getEvents: vi.fn(() => of({
        total: 1,
        items: [{
          id: 'log-1',
          timestamp: '2026-07-02T10:00:00.000Z',
          source: 'backend',
          category: 'request',
          level: 'info',
          event: 'http.request.completed',
          message: 'GET /api/v1/orders completed with 200',
          path: '/api/v1/orders',
          method: 'GET',
          statusCode: 200,
          durationMs: 12,
          userId: null,
          restaurantId: null,
          requestId: 'req-1',
          actorRoles: [],
          result: null,
          clientOrigin: 'web-admin',
          entityType: null,
          entityId: null,
          entityLabel: null,
          changedFields: [],
          metadata: null,
        }],
      })),
    };

    await render(DeveloperLogsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: DeveloperLogsApiService, useValue: api },
      ],
    });

    const pathSelect = screen.getByLabelText('developer.logs.filters.path') as HTMLSelectElement;
    pathSelect.value = '/orders';
    pathSelect.dispatchEvent(new Event('change', { bubbles: true }));

    screen.getByRole('button', { name: 'developer.logs.filters.apply' }).click();

    const expectedFilter = expect.objectContaining({ path: '/orders' });
    expect(api.getSummary).toHaveBeenLastCalledWith(expectedFilter);
    expect(api.getTimeline).toHaveBeenLastCalledWith(expectedFilter);
    expect(api.getBreakdown).toHaveBeenLastCalledWith(expectedFilter);
    expect(api.getEvents).toHaveBeenLastCalledWith(expectedFilter, 1, 20);
  });

  it('applies a restaurant filter to all dashboard requests', async () => {
    const i18n = provideI18nTesting();
    const routeHarness = createRouteHarness();
    const api = {
      ...pickerApiMocks(),
      getSummary: vi.fn(() => of({
        totalRequests: 30,
        errorCount: 1,
        errorRate: 3.3,
        auditEvents: 5,
        p95DurationMs: 210,
        authByOrigin: [],
        topSlowPaths: [],
        topErrorEvents: [],
      })),
      getTimeline: vi.fn(() => of([])),
      getBreakdown: vi.fn(() => of({ levels: [], categories: [], origins: [] })),
      getEvents: vi.fn(() => of({ total: 0, items: [] })),
    };

    await render(DeveloperLogsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: DeveloperLogsApiService, useValue: api },
      ],
    });

    const restaurantIdCombobox = screen.getByRole('combobox', { name: 'developer.logs.filters.restaurantId' });
    fireEvent.focus(restaurantIdCombobox);
    fireEvent.click(screen.getByRole('option', { name: /MesaFlow Centro/i }));

    screen.getByRole('button', { name: 'developer.logs.filters.apply' }).click();

    const expectedFilter = expect.objectContaining({ restaurantId: 'restaurant-mesaflow-centro' });
    expect(api.getSummary).toHaveBeenLastCalledWith(expectedFilter);
    expect(api.getTimeline).toHaveBeenLastCalledWith(expectedFilter);
    expect(api.getBreakdown).toHaveBeenLastCalledWith(expectedFilter);
    expect(api.getEvents).toHaveBeenLastCalledWith(expectedFilter, 1, 20);
  });

  it('applies audit-specific filters to all dashboard requests', async () => {
    const i18n = provideI18nTesting();
    const routeHarness = createRouteHarness();
    const api = {
      ...pickerApiMocks(),
      getSummary: vi.fn(() => of({
        totalRequests: 4,
        errorCount: 0,
        errorRate: 0,
        auditEvents: 4,
        p95DurationMs: 0,
        authByOrigin: [],
        topSlowPaths: [],
        topErrorEvents: [],
      })),
      getTimeline: vi.fn(() => of([])),
      getBreakdown: vi.fn(() => of({
        levels: [{ key: 'info', count: 4 }],
        categories: [{ key: 'audit', count: 4 }],
        origins: [{ key: 'apk-customer', count: 4 }],
      })),
      getEvents: vi.fn(() => of({
        total: 1,
        items: [{
          id: 'log-1',
          timestamp: '2026-07-02T10:00:00.000Z',
          source: 'backend',
          category: 'audit',
          level: 'info',
          event: 'auth.demo-login.succeeded',
          message: 'Demo role developer signed in.',
          path: '/api/v1/auth/demo-login',
          method: 'POST',
          statusCode: 200,
          durationMs: null,
          userId: 'user-1',
          restaurantId: null,
          requestId: 'req-1',
          actorRoles: ['developer'],
          result: 'succeeded',
          clientOrigin: 'apk-customer',
          entityType: 'auth',
          entityId: 'user-1',
          entityLabel: 'developer@mesaflow.demo',
          changedFields: ['session'],
          metadata: null,
        }],
      })),
    };

    await render(DeveloperLogsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: DeveloperLogsApiService, useValue: api },
      ],
    });

    const entityTypeSelect = screen.getByLabelText('developer.logs.filters.entityType') as HTMLSelectElement;
    entityTypeSelect.value = 'auth';
    entityTypeSelect.dispatchEvent(new Event('change', { bubbles: true }));

    const entityIdCombobox = screen.getByRole('combobox', { name: 'developer.logs.filters.entityId' });
    fireEvent.focus(entityIdCombobox);
    fireEvent.click(screen.getByRole('option', { name: /developer@mesaflow.demo/i }));

    const actorUserIdCombobox = screen.getByRole('combobox', { name: 'developer.logs.filters.actorUserId' });
    fireEvent.focus(actorUserIdCombobox);
    fireEvent.click(screen.getByRole('option', { name: /developer@mesaflow.demo/i }));

    const resultSelect = screen.getByLabelText('developer.logs.filters.result') as HTMLSelectElement;
    resultSelect.value = 'succeeded';
    resultSelect.dispatchEvent(new Event('change', { bubbles: true }));

    screen.getByRole('button', { name: 'developer.logs.filters.apply' }).click();

    const expectedFilter = expect.objectContaining({
      actorUserId: 'user-1',
      entityType: 'auth',
      entityId: 'user-1',
      result: 'succeeded',
    });
    expect(api.getSummary).toHaveBeenLastCalledWith(expectedFilter);
    expect(api.getTimeline).toHaveBeenLastCalledWith(expectedFilter);
    expect(api.getBreakdown).toHaveBeenLastCalledWith(expectedFilter);
    expect(api.getEvents).toHaveBeenLastCalledWith(expectedFilter, 1, 20);
  });

  it('hydrates filters from query params on first load', async () => {
    const i18n = provideI18nTesting();
    const routeHarness = createRouteHarness({
      category: 'audit',
      entityType: 'auth',
      entityId: 'user-7',
      actorUserId: 'user-7',
      result: 'succeeded',
      path: '/api/v1/auth/demo-login',
      page: '2',
      view: 'audit',
    });
    const api = {
      ...pickerApiMocks(),
      getSummary: vi.fn(() => of({
        totalRequests: 1,
        errorCount: 0,
        errorRate: 0,
        auditEvents: 1,
        p95DurationMs: 0,
        authByOrigin: [],
        topSlowPaths: [],
        topErrorEvents: [],
      })),
      getTimeline: vi.fn(() => of([])),
      getBreakdown: vi.fn(() => of({ levels: [], categories: [], origins: [] })),
      getEvents: vi.fn(() => of({ total: 0, items: [] })),
    };

    await render(DeveloperLogsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: DeveloperLogsApiService, useValue: api },
      ],
    });

    expect(api.getSummary).toHaveBeenCalledWith(expect.objectContaining({
      category: 'audit',
      entityType: 'auth',
      entityId: 'user-7',
      actorUserId: 'user-7',
      result: 'succeeded',
      path: '/api/v1/auth/demo-login',
    }));
    expect(api.getEvents).toHaveBeenCalledWith(expect.anything(), 2, 20);
  });

  it('collapses and expands the filters panel', async () => {
    const i18n = provideI18nTesting();
    const routeHarness = createRouteHarness();
    const api = {
      ...pickerApiMocks(),
      getSummary: vi.fn(() => of({ totalRequests: 0, errorCount: 0, errorRate: 0, auditEvents: 0, p95DurationMs: 0, authByOrigin: [], topSlowPaths: [], topErrorEvents: [] })),
      getTimeline: vi.fn(() => of([])),
      getBreakdown: vi.fn(() => of({ levels: [], categories: [], origins: [] })),
      getEvents: vi.fn(() => of({ total: 0, items: [] })),
    };

    await render(DeveloperLogsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: DeveloperLogsApiService, useValue: api },
      ],
    });

    expect(screen.getByLabelText('developer.logs.filters.from')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'developer.logs.filters.hide' }));

    expect(screen.queryByLabelText('developer.logs.filters.from')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'developer.logs.filters.show' }));

    expect(screen.getByLabelText('developer.logs.filters.from')).toBeTruthy();
  });

  it('does not render a separate category select because the view chips own that state', async () => {
    const i18n = provideI18nTesting();
    const routeHarness = createRouteHarness();
    const api = {
      ...pickerApiMocks(),
      getSummary: vi.fn(() => of({ totalRequests: 0, errorCount: 0, errorRate: 0, auditEvents: 0, p95DurationMs: 0, authByOrigin: [], topSlowPaths: [], topErrorEvents: [] })),
      getTimeline: vi.fn(() => of([])),
      getBreakdown: vi.fn(() => of({ levels: [], categories: [], origins: [] })),
      getEvents: vi.fn(() => of({ total: 0, items: [] })),
    };

    await render(DeveloperLogsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: DeveloperLogsApiService, useValue: api },
      ],
    });

    expect(screen.queryByLabelText('developer.logs.filters.category')).toBeNull();
    expect(screen.getByRole('button', { name: 'developer.logs.views.operations' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'developer.logs.views.audit' })).toBeTruthy();
  });

  it('shows a compact active-filter summary after selecting origin and path', async () => {
    const i18n = provideI18nTesting();
    const routeHarness = createRouteHarness();
    const api = {
      ...pickerApiMocks(),
      getSummary: vi.fn(() => of({
        totalRequests: 12,
        errorCount: 2,
        errorRate: 16.7,
        auditEvents: 3,
        p95DurationMs: 280,
        authByOrigin: [],
        topSlowPaths: [],
        topErrorEvents: [],
      })),
      getTimeline: vi.fn(() => of([])),
      getBreakdown: vi.fn(() => of({ levels: [], categories: [], origins: [] })),
      getEvents: vi.fn(() => of({ total: 0, items: [] })),
    };

    await render(DeveloperLogsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: DeveloperLogsApiService, useValue: api },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'developer.logs.filters.clientOrigin developer.logs.origins.web-pos' }));
    const pathSelect = screen.getByLabelText('developer.logs.filters.path') as HTMLSelectElement;
    pathSelect.value = '/payments';
    pathSelect.dispatchEvent(new Event('change', { bubbles: true }));
    screen.getByRole('button', { name: 'developer.logs.filters.apply' }).click();

    expect(screen.getByText('developer.logs.filters.activeTitle')).toBeTruthy();
    expect(screen.getAllByText('developer.logs.origins.web-pos').length).toBeGreaterThan(0);
    expect(screen.getByText('/restaurants/:id/orders/:orderId/payments')).toBeTruthy();
  });

  it('applies a client-origin chip filter and shows it in the event detail', async () => {
    const i18n = provideI18nTesting();
    const routeHarness = createRouteHarness();
    const api = {
      ...pickerApiMocks(),
      getSummary: vi.fn(() => of({
        totalRequests: 8,
        errorCount: 1,
        errorRate: 12.5,
        auditEvents: 2,
        p95DurationMs: 250,
        authByOrigin: [{ key: 'apk-customer', succeeded: 1, failed: 0 }],
        topSlowPaths: [],
        topErrorEvents: [],
      })),
      getTimeline: vi.fn(() => of([])),
      getBreakdown: vi.fn(() => of({
        levels: [{ key: 'info', count: 2 }],
        categories: [{ key: 'audit', count: 2 }],
        origins: [{ key: 'apk-customer', count: 2 }],
      })),
      getEvents: vi.fn(() => of({
        total: 1,
        items: [{
          id: 'log-1',
          timestamp: '2026-07-02T10:00:00.000Z',
          source: 'backend',
          category: 'audit',
          level: 'info',
          event: 'auth.demo-login.succeeded',
          message: 'Customer signed in.',
          path: '/api/v1/auth/demo-login',
          method: 'POST',
          statusCode: 200,
          durationMs: 18,
          userId: 'user-1',
          restaurantId: null,
          requestId: 'req-1',
          actorRoles: ['customer'],
          result: 'succeeded',
          clientOrigin: 'apk-customer',
          entityType: 'auth',
          entityId: 'user-1',
          entityLabel: 'customer@mesaflow.demo',
          changedFields: ['session'],
          metadata: { clientOrigin: 'apk-customer' },
        }],
      })),
    };

    await render(DeveloperLogsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: DeveloperLogsApiService, useValue: api },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'developer.logs.filters.clientOrigin developer.logs.origins.apk-customer' }));
    screen.getByRole('button', { name: 'developer.logs.filters.apply' }).click();

    expect(api.getEvents).toHaveBeenLastCalledWith(expect.objectContaining({ clientOrigin: 'apk-customer' }), 1, 20);

    fireEvent.click(screen.getByText('auth.demo-login.succeeded'));
    expect(screen.getAllByText('developer.logs.origins.apk-customer').length).toBeGreaterThan(0);
  });

  it('keeps origin filters inside the filter bar and leaves only business shortcuts below', async () => {
    const i18n = provideI18nTesting();
    const routeHarness = createRouteHarness();
    const api = {
      ...pickerApiMocks(),
      getSummary: vi.fn(() => of({
        totalRequests: 12,
        errorCount: 2,
        errorRate: 16.7,
        auditEvents: 3,
        p95DurationMs: 280,
        authByOrigin: [],
        topSlowPaths: [],
        topErrorEvents: [],
      })),
      getTimeline: vi.fn(() => of([])),
      getBreakdown: vi.fn(() => of({ levels: [], categories: [], origins: [] })),
      getEvents: vi.fn(() => of({ total: 0, items: [] })),
    };

    await render(DeveloperLogsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: DeveloperLogsApiService, useValue: api },
      ],
    });

    expect(screen.queryByRole('button', { name: 'developer.logs.shortcuts.apkCustomer' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'developer.logs.shortcuts.webDemo' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'developer.logs.shortcuts.webPos' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'developer.logs.filters.clientOrigin developer.logs.origins.apk-customer' }));
    screen.getByRole('button', { name: 'developer.logs.filters.apply' }).click();

    expect(api.getSummary).toHaveBeenLastCalledWith(expect.objectContaining({
      clientOrigin: 'apk-customer',
    }));

    fireEvent.click(screen.getByRole('button', { name: 'developer.logs.shortcuts.payments' }));
    expect(api.getSummary).toHaveBeenLastCalledWith(expect.objectContaining({
      path: '/payments',
    }));
  });

  it('shows only the filter section relevant to the selected view', async () => {
    const i18n = provideI18nTesting();
    const routeHarness = createRouteHarness();
    const api = {
      ...pickerApiMocks(),
      getSummary: vi.fn(() => of({
        totalRequests: 12,
        errorCount: 1,
        errorRate: 8.3,
        auditEvents: 2,
        p95DurationMs: 180,
        authByOrigin: [],
        topSlowPaths: [],
        topErrorEvents: [],
      })),
      getTimeline: vi.fn(() => of([])),
      getBreakdown: vi.fn(() => of({ levels: [], categories: [], origins: [] })),
      getEvents: vi.fn(() => of({ total: 0, items: [] })),
    };

    await render(DeveloperLogsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: DeveloperLogsApiService, useValue: api },
      ],
    });

    expect(screen.getByRole('heading', { level: 3, name: 'developer.logs.views.operations' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'developer.logs.views.audit' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'developer.logs.views.operations' }));
    expect(screen.getByRole('heading', { level: 3, name: 'developer.logs.views.operations' })).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 3, name: 'developer.logs.views.audit' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'developer.logs.views.audit' }));
    expect(screen.queryByRole('heading', { level: 3, name: 'developer.logs.views.operations' })).toBeNull();
    expect(screen.getByRole('heading', { level: 3, name: 'developer.logs.views.audit' })).toBeTruthy();
  });

  it('clears active filters inline from the filter bar', async () => {
    const i18n = provideI18nTesting();
    const routeHarness = createRouteHarness({
      clientOrigin: 'apk-customer',
      path: '/orders',
      view: 'operations',
    });
    const api = {
      ...pickerApiMocks(),
      getSummary: vi.fn(() => of({
        totalRequests: 12,
        errorCount: 1,
        errorRate: 8.3,
        auditEvents: 2,
        p95DurationMs: 180,
        authByOrigin: [],
        topSlowPaths: [],
        topErrorEvents: [],
      })),
      getTimeline: vi.fn(() => of([])),
      getBreakdown: vi.fn(() => of({ levels: [], categories: [], origins: [] })),
      getEvents: vi.fn(() => of({ total: 0, items: [] })),
    };

    await render(DeveloperLogsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: DeveloperLogsApiService, useValue: api },
      ],
    });

    expect(api.getSummary).toHaveBeenLastCalledWith(expect.objectContaining({
      clientOrigin: 'apk-customer',
      path: '/orders',
    }));

    fireEvent.click(screen.getByRole('button', { name: 'developer.logs.filters.clear developer.logs.origins.apk-customer' }));
    expect(api.getSummary).toHaveBeenLastCalledWith(expect.objectContaining({
      clientOrigin: '',
      path: '/orders',
    }));

    fireEvent.click(screen.getByRole('button', { name: 'developer.logs.filters.clear /restaurants/:id/orders' }));
    expect(api.getSummary).toHaveBeenLastCalledWith(expect.objectContaining({
      clientOrigin: '',
      path: '',
    }));
  });

  it('applies operational filters when the errors kpi is clicked', async () => {
    const i18n = provideI18nTesting();
    const routeHarness = createRouteHarness();
    const api = {
      ...pickerApiMocks(),
      getSummary: vi.fn(() => of({
        totalRequests: 42,
        errorCount: 6,
        errorRate: 14.3,
        auditEvents: 7,
        p95DurationMs: 310,
        authByOrigin: [],
        topSlowPaths: [],
        topErrorEvents: [],
      })),
      getTimeline: vi.fn(() => of([])),
      getBreakdown: vi.fn(() => of({ levels: [], categories: [], origins: [] })),
      getEvents: vi.fn(() => of({ total: 0, items: [] })),
    };

    await render(DeveloperLogsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: DeveloperLogsApiService, useValue: api },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'developer.logs.metrics.errors' }));

    expect(api.getSummary).toHaveBeenLastCalledWith(expect.objectContaining({
      category: 'request',
      level: 'error',
    }));
    expect(api.getEvents).toHaveBeenLastCalledWith(expect.objectContaining({
      category: 'request',
      level: 'error',
    }), 1, 20);
  });

  it('applies filters from a slow-path insight item', async () => {
    const i18n = provideI18nTesting();
    const routeHarness = createRouteHarness();
    const api = {
      ...pickerApiMocks(),
      getSummary: vi.fn(() => of({
        totalRequests: 21,
        errorCount: 3,
        errorRate: 14.3,
        auditEvents: 5,
        p95DurationMs: 420,
        authByOrigin: [],
        topSlowPaths: [
          { path: '/api/v1/orders/:id/payments', clientOrigin: 'web-pos', p95DurationMs: 880, total: 12 },
        ],
        topErrorEvents: [],
      })),
      getTimeline: vi.fn(() => of([])),
      getBreakdown: vi.fn(() => of({ levels: [], categories: [], origins: [] })),
      getEvents: vi.fn(() => of({ total: 0, items: [] })),
    };

    await render(DeveloperLogsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: DeveloperLogsApiService, useValue: api },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: /\/api\/v1\/orders\/:id\/payments/i }));

    expect(api.getSummary).toHaveBeenLastCalledWith(expect.objectContaining({
      category: 'request',
      path: '/api/v1/orders/:id/payments',
      clientOrigin: 'web-pos',
    }));
    expect(api.getEvents).toHaveBeenLastCalledWith(expect.objectContaining({
      category: 'request',
      path: '/api/v1/orders/:id/payments',
      clientOrigin: 'web-pos',
    }), 1, 20);
  });

  it('applies filters from a top-error insight item', async () => {
    const i18n = provideI18nTesting();
    const routeHarness = createRouteHarness();
    const api = {
      ...pickerApiMocks(),
      getSummary: vi.fn(() => of({
        totalRequests: 21,
        errorCount: 3,
        errorRate: 14.3,
        auditEvents: 5,
        p95DurationMs: 420,
        authByOrigin: [],
        topSlowPaths: [],
        topErrorEvents: [
          { event: 'http.request.failed', path: '/api/v1/orders/:id/payments', clientOrigin: 'web-pos', count: 5 },
        ],
      })),
      getTimeline: vi.fn(() => of([])),
      getBreakdown: vi.fn(() => of({ levels: [], categories: [], origins: [] })),
      getEvents: vi.fn(() => of({ total: 0, items: [] })),
    };

    await render(DeveloperLogsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: DeveloperLogsApiService, useValue: api },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: /http\.request\.failed/i }));

    expect(api.getSummary).toHaveBeenLastCalledWith(expect.objectContaining({
      category: 'request',
      level: 'error',
      path: '/api/v1/orders/:id/payments',
      clientOrigin: 'web-pos',
      search: 'http.request.failed',
    }));
    expect(api.getEvents).toHaveBeenLastCalledWith(expect.objectContaining({
      category: 'request',
      level: 'error',
      path: '/api/v1/orders/:id/payments',
      clientOrigin: 'web-pos',
      search: 'http.request.failed',
    }), 1, 20);
  });

  it('applies filters from an origin breakdown card', async () => {
    const i18n = provideI18nTesting();
    const routeHarness = createRouteHarness();
    const api = {
      ...pickerApiMocks(),
      getSummary: vi.fn(() => of({
        totalRequests: 18,
        errorCount: 2,
        errorRate: 11.1,
        auditEvents: 4,
        p95DurationMs: 230,
        authByOrigin: [],
        topSlowPaths: [],
        topErrorEvents: [],
      })),
      getTimeline: vi.fn(() => of([])),
      getBreakdown: vi.fn(() => of({
        levels: [],
        categories: [],
        origins: [{ key: 'apk-customer', count: 7 }],
      })),
      getEvents: vi.fn(() => of({ total: 0, items: [] })),
    };

    await render(DeveloperLogsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: DeveloperLogsApiService, useValue: api },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'developer.logs.origins.apk-customer developer.logs.charts.origins' }));

    expect(api.getSummary).toHaveBeenLastCalledWith(expect.objectContaining({
      clientOrigin: 'apk-customer',
    }));
    expect(api.getEvents).toHaveBeenLastCalledWith(expect.objectContaining({
      clientOrigin: 'apk-customer',
    }), 1, 20);
  });

  it('applies auth filters from an auth-by-origin card', async () => {
    const i18n = provideI18nTesting();
    const routeHarness = createRouteHarness();
    const api = {
      ...pickerApiMocks(),
      getSummary: vi.fn(() => of({
        totalRequests: 18,
        errorCount: 2,
        errorRate: 11.1,
        auditEvents: 4,
        p95DurationMs: 230,
        authByOrigin: [{ key: 'web-demo', succeeded: 5, failed: 1 }],
        topSlowPaths: [],
        topErrorEvents: [],
      })),
      getTimeline: vi.fn(() => of([])),
      getBreakdown: vi.fn(() => of({ levels: [], categories: [], origins: [] })),
      getEvents: vi.fn(() => of({ total: 0, items: [] })),
    };

    await render(DeveloperLogsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: DeveloperLogsApiService, useValue: api },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'developer.logs.origins.web-demo developer.logs.metrics.loginSucceeded' }));

    expect(api.getSummary).toHaveBeenLastCalledWith(expect.objectContaining({
      clientOrigin: 'web-demo',
      category: 'audit',
      entityType: 'auth',
    }));
    expect(api.getEvents).toHaveBeenLastCalledWith(expect.objectContaining({
      clientOrigin: 'web-demo',
      category: 'audit',
      entityType: 'auth',
    }), 1, 20);
  });

  it('renders summary kpis separately from per-origin channel cards', async () => {
    const i18n = provideI18nTesting();
    const routeHarness = createRouteHarness();
    const api = {
      ...pickerApiMocks(),
      getSummary: vi.fn(() => of({
        totalRequests: 120,
        errorCount: 8,
        errorRate: 6.7,
        auditEvents: 20,
        p95DurationMs: 340,
        authByOrigin: [
          { key: 'web-admin', succeeded: 3, failed: 1 },
          { key: 'apk-customer', succeeded: 2, failed: 0 },
        ],
        topSlowPaths: [],
        topErrorEvents: [],
      })),
      getTimeline: vi.fn(() => of([])),
      getBreakdown: vi.fn(() => of({
        levels: [],
        categories: [],
        origins: [
          { key: 'web-admin', count: 20 },
          { key: 'web-pos', count: 12 },
        ],
      })),
      getEvents: vi.fn(() => of({ total: 0, items: [] })),
    };

    const { container } = await render(DeveloperLogsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: DeveloperLogsApiService, useValue: api },
      ],
    });

    const summaryCards = container.querySelector('.developer-logs-page__summary-cards');
    const channelCards = container.querySelector('.developer-logs-page__channel-cards');
    expect(summaryCards).toBeTruthy();
    expect(channelCards).toBeTruthy();
    expect(summaryCards?.querySelectorAll('app-card').length).toBe(5);
    expect(channelCards?.textContent).toContain('web-admin');
    expect(channelCards?.textContent).toContain('apk-customer');
  });

  it('renders auth-by-origin and slow-path trend dashboards when summary data exists', async () => {
    const i18n = provideI18nTesting();
    const routeHarness = createRouteHarness();
    const api = {
      ...pickerApiMocks(),
      getSummary: vi.fn(() => of({
        totalRequests: 120,
        errorCount: 8,
        errorRate: 6.7,
        auditEvents: 20,
        p95DurationMs: 340,
        authByOrigin: [
          { key: 'web-admin', succeeded: 3, failed: 1 },
          { key: 'apk-customer', succeeded: 2, failed: 0 },
        ],
        topSlowPaths: [
          { path: '/api/v1/orders/:id/payments', clientOrigin: 'web-pos', p95DurationMs: 880, total: 12 },
        ],
        topErrorEvents: [],
      })),
      getTimeline: vi.fn(() => of([])),
      getBreakdown: vi.fn(() => of({ levels: [], categories: [], origins: [] })),
      getEvents: vi.fn(() => of({ total: 0, items: [] })),
    };

    const { container } = await render(DeveloperLogsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: DeveloperLogsApiService, useValue: api },
      ],
    });

    expect(container.textContent).toContain('developer.logs.sections.authByOrigin');
    expect(container.textContent).toContain('developer.logs.sections.slowPaths');
  });

  it('renders an error-trends chart when backend trend data exists', async () => {
    const i18n = provideI18nTesting();
    const routeHarness = createRouteHarness();
    const api = {
      ...pickerApiMocks(),
      getSummary: vi.fn(() => of({
        totalRequests: 10,
        errorCount: 4,
        errorRate: 40,
        auditEvents: 2,
        p95DurationMs: 300,
        authByOrigin: [],
        topSlowPaths: [],
        topErrorEvents: [],
      })),
      getTimeline: vi.fn(() => of([])),
      getBreakdown: vi.fn(() => of({ levels: [], categories: [], origins: [] })),
      getEvents: vi.fn(() => of({ total: 0, items: [] })),
      getErrorTrendsByPath: vi.fn(() => of([
        { bucket: '2026-07-02T10:00', path: '/api/v1/auth/login', count: 2 },
        { bucket: '2026-07-02T11:00', path: '/api/v1/restaurants/:id/orders/:id/payments', count: 1 },
      ])),
    };

    const { container } = await render(DeveloperLogsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: DeveloperLogsApiService, useValue: api },
      ],
    });

    expect(container.textContent).toContain('developer.logs.sections.errorTrends');
  });

  it('applies request path filters from the slow-path chart', async () => {
    const i18n = provideI18nTesting();
    const routeHarness = createRouteHarness();
    const api = {
      ...pickerApiMocks(),
      getSummary: vi.fn(() => of({
        totalRequests: 20,
        errorCount: 2,
        errorRate: 10,
        auditEvents: 1,
        p95DurationMs: 260,
        authByOrigin: [],
        topSlowPaths: [
          { path: '/api/v1/orders/:id/payments', clientOrigin: 'web-pos', p95DurationMs: 880, total: 12 },
        ],
        topErrorEvents: [],
      })),
      getTimeline: vi.fn(() => of([])),
      getBreakdown: vi.fn(() => of({ levels: [], categories: [], origins: [] })),
      getEvents: vi.fn(() => of({ total: 0, items: [] })),
      getErrorTrendsByPath: vi.fn(() => of([])),
    };

    await render(DeveloperLogsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: DeveloperLogsApiService, useValue: api },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'developer.logs.sections.slowPaths' }));

    expect(api.getSummary).toHaveBeenLastCalledWith(expect.objectContaining({
      category: 'request',
      path: '/api/v1/orders/:id/payments',
    }));
    expect(api.getEvents).toHaveBeenLastCalledWith(expect.objectContaining({
      category: 'request',
      path: '/api/v1/orders/:id/payments',
    }), 1, 20);
  });

  it('applies request error filters from the error-trends chart', async () => {
    const i18n = provideI18nTesting();
    const routeHarness = createRouteHarness();
    const api = {
      ...pickerApiMocks(),
      getSummary: vi.fn(() => of({
        totalRequests: 10,
        errorCount: 4,
        errorRate: 40,
        auditEvents: 2,
        p95DurationMs: 300,
        authByOrigin: [],
        topSlowPaths: [],
        topErrorEvents: [],
      })),
      getTimeline: vi.fn(() => of([])),
      getBreakdown: vi.fn(() => of({ levels: [], categories: [], origins: [] })),
      getEvents: vi.fn(() => of({ total: 0, items: [] })),
      getErrorTrendsByPath: vi.fn(() => of([
        { bucket: '2026-07-02T10:00', path: '/api/v1/auth/login', count: 2 },
        { bucket: '2026-07-02T11:00', path: '/api/v1/restaurants/:id/orders/:id/payments', count: 1 },
      ])),
    };

    await render(DeveloperLogsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: DeveloperLogsApiService, useValue: api },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'developer.logs.sections.errorTrends' }));

    expect(api.getSummary).toHaveBeenLastCalledWith(expect.objectContaining({
      category: 'request',
      level: 'error',
      path: '/api/v1/auth/login',
      search: '',
    }));
    expect(api.getEvents).toHaveBeenLastCalledWith(expect.objectContaining({
      category: 'request',
      level: 'error',
      path: '/api/v1/auth/login',
      search: '',
    }), 1, 20);
  });

  it('renders the events table with a compact table variant', async () => {
    const i18n = provideI18nTesting();
    const routeHarness = createRouteHarness();
    const api = {
      ...pickerApiMocks(),
      getSummary: vi.fn(() => of({
        totalRequests: 120,
        errorCount: 8,
        errorRate: 6.7,
        auditEvents: 20,
        p95DurationMs: 340,
        authByOrigin: [],
        topSlowPaths: [],
        topErrorEvents: [],
      })),
      getTimeline: vi.fn(() => of([])),
      getBreakdown: vi.fn(() => of({ levels: [], categories: [], origins: [] })),
      getEvents: vi.fn(() => of({
        total: 1,
        items: [{
          id: 'log-1',
          timestamp: '2026-07-02T10:00:00.000Z',
          source: 'backend',
          category: 'request',
          level: 'info',
          event: 'http.request.completed',
          message: 'GET /api/v1/health completed with 200',
          path: '/api/v1/health',
          method: 'GET',
          statusCode: 200,
          durationMs: 12,
          userId: null,
          restaurantId: null,
          requestId: 'req-1',
          actorRoles: [],
          result: null,
          clientOrigin: 'web-admin',
          entityType: null,
          entityId: null,
          entityLabel: null,
          changedFields: [],
          metadata: null,
        }],
      })),
    };

    const { container } = await render(DeveloperLogsPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        ...routeHarness.providers,
        { provide: DeveloperLogsApiService, useValue: api },
      ],
    });

    expect(container.querySelector('.table.table--sm.table--minimal')).toBeTruthy();
  });
});
