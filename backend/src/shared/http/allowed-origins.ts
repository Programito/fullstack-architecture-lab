const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:4200'];

export function resolveAllowedOrigins(frontendOrigin: string | undefined): string[] {
  const configuredOrigins = (frontendOrigin ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins])];
}
