// The Sentry DSN is write-only by design (it can only submit events, never
// read project data), so it is safe to keep in source rather than an env file.
export const SENTRY_DSN = 'https://80d32267f0317c7e981467e6380400f0@o4511677787275264.ingest.de.sentry.io/4511677803659344';
