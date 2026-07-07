export type LogLevel = 'info' | 'warn' | 'error';
export type LogCategory = 'request' | 'error' | 'audit' | 'client';
export const CLIENT_ORIGIN_OPTIONS = ['web-admin', 'web-demo', 'web-pos', 'apk-customer', 'backend'] as const;
export type ClientOrigin = (typeof CLIENT_ORIGIN_OPTIONS)[number];

// Must stay in sync by hand with `AuditEntityType` in
// backend/src/observability/application/audit-event.types.ts.
export const AUDIT_ENTITY_TYPES = ['auth', 'product', 'menu', 'menu-section', 'reservation', 'order'] as const;

// Curated substrings of known backend routes (the `path` filter matches by
// "contains", so these work even though the stored path carries real ids
// and query strings). Must stay in sync by hand with the controllers under
// backend/src/{identity,restaurants,observability,health}/presentation/rest.
export const KNOWN_LOG_PATH_GROUPS = [
  { value: '/auth', label: '/auth' },
  { value: '/users', label: '/users' },
  { value: '/roles', label: '/roles' },
  { value: '/permissions', label: '/permissions' },
  { value: '/sessions', label: '/sessions' },
  { value: '/restaurants', label: '/restaurants' },
  { value: '/menu', label: '/restaurants/:id/menu' },
  { value: '/products', label: '/restaurants/:id/products' },
  { value: '/reservations', label: '/restaurants/:id/reservations' },
  { value: '/orders', label: '/restaurants/:id/orders' },
  { value: '/service-points', label: '/restaurants/:id/service-points' },
  { value: '/customers', label: '/restaurants/:id/customers' },
  { value: '/floors', label: '/restaurants/:id/floors' },
  { value: '/developer/logs', label: '/developer/logs' },
  { value: '/observability/client-events', label: '/observability/client-events' },
  { value: '/health', label: '/health' },
  { value: '/auth/login', label: '/auth/login' },
  { value: '/auth/demo-login', label: '/auth/demo-login' },
  { value: '/payments', label: '/restaurants/:id/orders/:orderId/payments' },
] as const;

export type DeveloperLogSummaryDto = {
  totalRequests: number;
  errorCount: number;
  errorRate: number;
  auditEvents: number;
  p95DurationMs: number;
  authByOrigin: Array<{
    key: ClientOrigin;
    succeeded: number;
    failed: number;
  }>;
  topSlowPaths: Array<{
    path: string;
    clientOrigin: ClientOrigin;
    p95DurationMs: number;
    total: number;
  }>;
  topErrorEvents: Array<{
    event: string;
    path: string | null;
    clientOrigin: ClientOrigin;
    count: number;
  }>;
};

export type DeveloperLogTimelinePointDto = {
  bucket: string;
  total: number;
  errors: number;
  audit: number;
};

export type DeveloperLogBreakdownDto = {
  levels: Array<{ key: LogLevel; count: number }>;
  categories: Array<{ key: LogCategory; count: number }>;
  origins: Array<{ key: string; count: number }>;
};

export type DeveloperLogEventDto = {
  id: string;
  timestamp: string;
  source: 'backend' | 'frontend';
  category: LogCategory;
  level: LogLevel;
  event: string;
  message: string;
  path: string | null;
  method: string | null;
  statusCode: number | null;
  durationMs: number | null;
  userId: string | null;
  restaurantId: string | null;
  requestId: string | null;
  actorRoles: string[];
  result: 'attempted' | 'succeeded' | 'failed' | null;
  clientOrigin: ClientOrigin;
  entityType: string | null;
  entityId: string | null;
  entityLabel: string | null;
  changedFields: string[];
  metadata: Record<string, unknown> | null;
};

export type DeveloperLogEventsResponseDto = {
  total: number;
  items: DeveloperLogEventDto[];
};

export type DeveloperLogFilters = {
  from: string;
  to: string;
  level: '' | LogLevel;
  category: '' | LogCategory;
  clientOrigin: '' | ClientOrigin;
  path: string;
  actorUserId: string;
  restaurantId: string;
  entityType: string;
  entityId: string;
  result: '' | 'attempted' | 'succeeded' | 'failed';
  search: string;
};

export type DeveloperLogsView = 'all' | 'operations' | 'audit';
export type DeveloperLogsQuickRange = '1h' | '6h' | '24h' | '3d' | '7d' | 'custom';

export type RestaurantOptionDto = {
  id: string;
  name: string;
};

export type PickerOptionDto = {
  id: string;
  label: string;
};
