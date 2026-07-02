import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners, provideEnvironmentInitializer, provideZonelessChangeDetection, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideAppI18n } from './shared/i18n/i18n.providers';
import { provideAppTheme } from './shared/theme/theme.providers';
import { authInterceptor } from './features/identity/auth.interceptor';
import { ClientLogErrorHandler, ClientLogsService, clientLogHttpInterceptor } from './core/observability/client-logs.service';

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
    ...provideAppI18n(),
  ]
};
