import { InjectionToken, isDevMode } from '@angular/core';

// The Sentry DSN is write-only by design (it can only submit events, never
// read project data), so it is safe to keep in source rather than an env file.
export const SENTRY_DSN = 'https://80d32267f0317c7e981467e6380400f0@o4511677787275264.ingest.de.sentry.io/4511677803659344';

// Angular builds have no runtime .env — this token is the frontend equivalent
// of the backend's SENTRY_ENABLED env var, following the same pattern as
// REALTIME_ENABLED (frontend/src/app/core/realtime/realtime.config.ts).
export const SENTRY_ENABLED = new InjectionToken<boolean>('SENTRY_ENABLED', {
  providedIn: 'root',
  factory: () => !isDevMode(),
});
