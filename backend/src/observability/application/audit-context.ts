export function auditContext(
  request: {
    auth?: {
      userId?: string;
      roles?: string[];
      scopes?: { organizations?: string[]; restaurants?: string[] };
    };
    requestId?: string;
    method?: string;
    originalUrl?: string;
    url?: string;
  },
  restaurantId?: string | null,
): {
  organizationId: string | null;
  userId: string | null;
  restaurantId: string | null;
  requestId: string | null;
  method: string | null;
  path: string | null;
  actorRoles: string[];
} {
  return {
    organizationId: request.auth?.scopes?.organizations?.[0] ?? null,
    userId: request.auth?.userId ?? null,
    restaurantId: restaurantId ?? request.auth?.scopes?.restaurants?.[0] ?? null,
    requestId: request.requestId ?? null,
    method: request.method ?? null,
    path: request.originalUrl ?? request.url ?? null,
    actorRoles: request.auth?.roles ?? [],
  };
}
