import { fireEvent, render, screen } from '@testing-library/angular';
import { ActivatedRoute, Router, convertToParamMap, type Params } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { DeveloperLogsApiService } from '../../api/developer-logs-api.service';
import { DeveloperLogsPage } from './developer-logs-page';

class TestResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
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
      })),
      getTimeline: vi.fn(() => of([{ bucket: '2026-07-02T10:00', total: 12, errors: 1, audit: 2 }])),
      getBreakdown: vi.fn(() => of({
        levels: [{ key: 'error', count: 8 }],
        categories: [{ key: 'request', count: 50 }],
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
    expect(api.getSummary).toHaveBeenCalled();
    expect(api.getEvents).toHaveBeenCalled();
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
      })),
      getTimeline: vi.fn(() => of([{ bucket: '2026-07-02T10:00', total: 12, errors: 1, audit: 2 }])),
      getBreakdown: vi.fn(() => of({
        levels: [{ key: 'error', count: 8 }],
        categories: [{ key: 'request', count: 50 }],
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
      })),
      getTimeline: vi.fn(() => of([{ bucket: '2026-07-02T10:00', total: 12, errors: 1, audit: 2 }])),
      getBreakdown: vi.fn(() => of({
        levels: [{ key: 'error', count: 8 }],
        categories: [{ key: 'request', count: 50 }],
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
      })),
      getTimeline: vi.fn(() => of([])),
      getBreakdown: vi.fn(() => of({ levels: [], categories: [] })),
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
      })),
      getTimeline: vi.fn(() => of([])),
      getBreakdown: vi.fn(() => of({
        levels: [{ key: 'info', count: 4 }],
        categories: [{ key: 'audit', count: 4 }],
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
      })),
      getTimeline: vi.fn(() => of([])),
      getBreakdown: vi.fn(() => of({ levels: [], categories: [] })),
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
});
