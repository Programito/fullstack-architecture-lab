import type { LogCategory, LogLevel } from '@prisma/client';

export const OBSERVABILITY_EVENT_CATALOG: Record<string, { category: LogCategory; level?: LogLevel }> = {
  'http.request.completed': { category: 'request' },
  'http.request.failed': { category: 'request' },
  'auth.login.succeeded': { category: 'audit', level: 'info' },
  'auth.demo-login.succeeded': { category: 'audit', level: 'info' },
  'auth.logout.succeeded': { category: 'audit', level: 'info' },
  'frontend.navigation': { category: 'client', level: 'info' },
  'frontend.network.online': { category: 'client', level: 'info' },
  'frontend.network.offline': { category: 'client', level: 'warn' },
  'frontend.api.error': { category: 'client', level: 'error' },
  'frontend.error': { category: 'client', level: 'error' },
};
