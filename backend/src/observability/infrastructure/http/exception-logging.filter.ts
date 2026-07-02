import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

import { ObservabilityService } from '../../application/observability.service';
import type { ObservabilityRequest } from './observability-request';

@Catch()
@Injectable()
export class ExceptionLoggingFilter implements ExceptionFilter {
  constructor(private readonly observability: ObservabilityService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<ObservabilityRequest>();
    const response = http.getResponse<{
      status(code: number): { json(body: unknown): void };
    }>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception instanceof Error ? exception.message : 'Unexpected error';

    request.requestId ??= crypto.randomUUID();
    void this.observability.record({
      source: 'backend',
      category: 'request',
      level: status >= 500 ? 'error' : 'warn',
      event: 'http.request.failed',
      message,
      requestId: request.requestId,
      userId: request.auth?.userId ?? null,
      restaurantId: request.params?.id ?? request.auth?.scopes?.restaurants?.[0] ?? null,
      method: request.method ?? null,
      path: request.originalUrl ?? request.url ?? '/',
      statusCode: status,
      metadata: exception instanceof Error ? { name: exception.name } : null,
    });

    response.status(status).json(httpBody(exception, status, message));
  }
}

function httpBody(exception: unknown, status: number, message: string): unknown {
  if (exception instanceof HttpException) {
    const body = exception.getResponse();
    if (typeof body === 'string') {
      return { statusCode: status, message: body };
    }
    return body;
  }

  return {
    statusCode: status,
    message,
  };
}
