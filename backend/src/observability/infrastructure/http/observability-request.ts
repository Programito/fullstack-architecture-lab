import type { AuthenticatedRequest } from '../../../identity/presentation/rest/auth.guard';

export type ObservabilityRequest = Partial<AuthenticatedRequest> & {
  method?: string;
  originalUrl?: string;
  url?: string;
  params?: Record<string, string | undefined>;
  requestId?: string;
  auth?: AuthenticatedRequest['auth'];
};
