import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAppI18n } from './shared/i18n/i18n.providers';
import { provideAppTheme } from './shared/theme/theme.providers';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAppTheme(),
    ...provideAppI18n(),
  ]
};
