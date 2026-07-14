export const CLIENT_ORIGINS = ['web-admin', 'web-demo', 'web-pos', 'apk-customer', 'backend'] as const;

export type ClientOrigin = (typeof CLIENT_ORIGINS)[number];

type RequestLike = {
  headers?: Record<string, string | string[] | undefined>;
  originalUrl?: string;
  url?: string;
};

export function isClientOrigin(value: unknown): value is ClientOrigin {
  return typeof value === 'string' && (CLIENT_ORIGINS as readonly string[]).includes(value);
}

export function readClientOriginHeader(request: RequestLike): ClientOrigin | null {
  const headers = request.headers ?? {};
  const raw = headers['x-client-origin'] ?? headers['X-Client-Origin'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return isClientOrigin(value) ? value : null;
}

export function resolveClientOrigin(request: RequestLike, fallback: ClientOrigin = 'backend'): ClientOrigin {
  const fromHeader = readClientOriginHeader(request);
  if (fromHeader) return fromHeader;

  const path = request.originalUrl ?? request.url ?? '';
  if (path.includes('/auth/demo-login')) return 'web-demo';
  if (path.includes('/auth/login')) return 'web-admin';
  return fallback;
}

export function extractClientOrigin(metadata: unknown, fallback: ClientOrigin): ClientOrigin {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return fallback;
  const value = (metadata as Record<string, unknown>)['clientOrigin'];
  return isClientOrigin(value) ? value : fallback;
}
