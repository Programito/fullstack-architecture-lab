import type { AuthenticatedRequest } from '../../../identity/presentation/rest/auth.guard';

export type ObservabilityRequest = Partial<AuthenticatedRequest> & {
  headers?: Record<string, string | string[] | undefined>;
  method?: string;
  originalUrl?: string;
  url?: string;
  params?: Record<string, string | undefined>;
  requestId?: string;
  auth?: AuthenticatedRequest['auth'];
};
