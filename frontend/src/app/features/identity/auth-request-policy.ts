const AUTH_ROUTE_SEGMENTS = ['/auth/login', '/auth/demo-login', '/auth/refresh', '/auth/public-config'];

export function shouldAttachAuthHeader(requestUrl: string, windowOrigin: string, apiBaseUrl: string): boolean {
  const isAuthRequest = AUTH_ROUTE_SEGMENTS.some((segment) => requestUrl.includes(segment));
  if (isAuthRequest) return false;

  if (!requestUrl.startsWith('http')) return true;
  if (requestUrl.startsWith(windowOrigin)) return true;

  const normalizedApiBaseUrl = apiBaseUrl.replace(/\/+$/, '');
  return requestUrl.startsWith(normalizedApiBaseUrl);
}
