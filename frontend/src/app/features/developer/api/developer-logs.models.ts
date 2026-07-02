export type LogLevel = 'info' | 'warn' | 'error';
export type LogCategory = 'request' | 'error' | 'audit' | 'client';

// Must stay in sync by hand with `AuditEntityType` in
// backend/src/observability/application/audit-event.types.ts.
export const AUDIT_ENTITY_TYPES = ['auth', 'product', 'menu', 'menu-section', 'reservation', 'order'] as const;

export type DeveloperLogSummaryDto = {
  totalRequests: number;
  errorCount: number;
  errorRate: number;
  auditEvents: number;
  p95DurationMs: number;
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
