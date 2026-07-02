import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { ObservabilityService } from '../../application/observability.service';
import type { ObservabilityRequest } from './observability-request';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly observability: ObservabilityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<ObservabilityRequest>();
    const response = context.switchToHttp().getResponse<{ statusCode?: number }>();
    request.requestId ??= crypto.randomUUID();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          void this.observability.record({
            source: 'backend',
            category: 'request',
            level: statusToLevel(response.statusCode),
            event: 'http.request.completed',
            message: `${request.method ?? 'GET'} ${pathOf(request)} completed with ${response.statusCode ?? 200}`,
            requestId: request.requestId,
            userId: request.auth?.userId ?? null,
            restaurantId: request.params?.id ?? request.auth?.scopes?.restaurants?.[0] ?? null,
            method: request.method ?? null,
            path: pathOf(request),
            statusCode: response.statusCode ?? 200,
            durationMs: Date.now() - startedAt,
          });
        },
      }),
    );
  }
}

function pathOf(request: ObservabilityRequest): string {
  return request.originalUrl ?? request.url ?? '/';
}

function statusToLevel(statusCode = 200): 'info' | 'warn' | 'error' {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  return 'info';
}
