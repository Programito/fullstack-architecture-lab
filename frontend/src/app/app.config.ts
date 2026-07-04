import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners, provideEnvironmentInitializer, provideZonelessChangeDetection, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import * as Sentry from '@sentry/angular';

import { routes } from './app.routes';
import { provideAppI18n } from './shared/i18n/i18n.providers';
import { provideAppTheme } from './shared/theme/theme.providers';
import { authInterceptor } from './features/identity/auth.interceptor';
import { ClientLogErrorHandler, ClientLogsService, clientLogHttpInterceptor } from './core/observability/client-logs.service';
import { SENTRY_DSN, SENTRY_ENABLED } from './core/observability/sentry.config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, clientLogHttpInterceptor])),
    provideAppTheme(),
    {
      provide: ErrorHandler,
      useClass: ClientLogErrorHandler,
    },
    provideEnvironmentInitializer(() => {
      inject(ClientLogsService).start();
    }),
    provideEnvironmentInitializer(() => {
      if (inject(SENTRY_ENABLED)) {
        Sentry.init({ dsn: SENTRY_DSN });
      }
    }),
    ...provideAppI18n(),
  ]
};
