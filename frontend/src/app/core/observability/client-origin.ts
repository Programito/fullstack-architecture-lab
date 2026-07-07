export const CLIENT_ORIGINS = ['web-admin', 'web-demo', 'web-pos', 'apk-customer', 'backend'] as const;

export type ClientOrigin = (typeof CLIENT_ORIGINS)[number];

export const CLIENT_ORIGIN_HEADER = 'X-Client-Origin';

export function resolveClientOrigin(currentPath: string, requestUrl?: string): ClientOrigin {
  if (requestUrl?.includes('/auth/demo-login')) return 'web-demo';
  if (currentPath.startsWith('/restaurant-pos')) return 'web-pos';
  return 'web-admin';
}

export function isClientOrigin(value: unknown): value is ClientOrigin {
  return typeof value === 'string' && (CLIENT_ORIGINS as readonly string[]).includes(value);
}
