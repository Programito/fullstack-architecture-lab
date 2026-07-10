import { ErrorHandler, Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import * as Sentry from '@sentry/angular';
import { catchError, filter, throwError } from 'rxjs';

import { API_BASE_URL } from '../api/api.config';
import { IdentitySessionStore } from '../../features/identity/identity-session.store';
import { CLIENT_ORIGIN_HEADER, resolveClientOrigin } from './client-origin';

type ClientLogPayload = {
  level: 'info' | 'warn' | 'error';
  event: string;
  message: string;
  path?: string;
  metadata?: Record<string, unknown>;
};

const CLIENT_EVENT_NAMES = {
  navigation: 'frontend.navigation',
  online: 'frontend.network.online',
  offline: 'frontend.network.offline',
  apiError: 'frontend.api.error',
  appError: 'frontend.error',
} as const;

@Injectable({ providedIn: 'root' })
export class ClientLogsService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly identity = inject(IdentitySessionStore);
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;

    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      const navigation = event as NavigationEnd;
      this.log({
        level: 'info',
        event: CLIENT_EVENT_NAMES.navigation,
        message: `Navigation to ${navigation.urlAfterRedirects}`,
        path: navigation.urlAfterRedirects,
      });
    });

    window.addEventListener('online', () => {
      this.log({ level: 'info', event: CLIENT_EVENT_NAMES.online, message: 'Browser connection restored.' });
    });
    window.addEventListener('offline', () => {
      this.log({ level: 'warn', event: CLIENT_EVENT_NAMES.offline, message: 'Browser connection lost.' });
    });
  }

  log(payload: ClientLogPayload): void {
    if (!this.identity.session().accessToken) {
      return;
    }
    const body: ClientLogPayload = {
      ...payload,
      metadata: {
        ...(payload.metadata ?? {}),
        clientOrigin: resolveClientOrigin(payload.path ?? this.router.url),
      },
    };
    void this.http.post<{ accepted: true }>(`${this.apiBaseUrl}/observability/client-events`, body).subscribe({
      next: () => undefined,
      error: () => undefined,
    });
  }

  logHttpError(error: HttpErrorResponse): void {
    this.log({
      level: error.status >= 500 ? 'error' : 'warn',
      event: CLIENT_EVENT_NAMES.apiError,
      message: `HTTP ${error.status || 0} while calling ${error.url ?? 'unknown endpoint'}`,
      path: this.router.url,
      metadata: {
        status: error.status,
        url: error.url ?? null,
      },
    });
  }

  logUnhandledError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.log({
      level: 'error',
      event: CLIENT_EVENT_NAMES.appError,
      message,
      path: this.router.url,
      metadata: error instanceof Error ? { name: error.name } : undefined,
    });
  }
}

@Injectable()
export class ClientLogErrorHandler implements ErrorHandler {
  private readonly logs = inject(ClientLogsService);

  handleError(error: unknown): void {
    this.logs.logUnhandledError(error);
    Sentry.captureException(error);
    console.error(error);
  }
}

export const clientLogHttpInterceptor: HttpInterceptorFn = (request, next) => {
  const logs = inject(ClientLogsService);
  const router = inject(Router);
  const isOwnApi = !request.url.startsWith('http') || request.url.startsWith(window.location.origin);
  const requestWithOrigin = !isOwnApi || request.headers.has(CLIENT_ORIGIN_HEADER)
    ? request
    : request.clone({ setHeaders: { [CLIENT_ORIGIN_HEADER]: resolveClientOrigin(router.url, request.url) } });

  return next(requestWithOrigin).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && !request.url.includes('/observability/client-events')) {
        logs.logHttpError(error);
      }
      return throwError(() => error);
    }),
  );
};
