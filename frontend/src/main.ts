import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import * as Sentry from '@sentry/angular';

import { appConfig } from './app/app.config';
import { App } from './app/app';
import { SENTRY_DSN } from './app/core/observability/sentry.config';

if (!isDevMode()) {
  Sentry.init({ dsn: SENTRY_DSN });
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
