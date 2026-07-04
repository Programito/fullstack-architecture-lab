// The Sentry DSN is write-only by design (it can only submit events, never
// read project data), so it is safe to keep in source rather than an env file.
export const SENTRY_DSN = 'https://57a538c7ea81b5a89b242fad33400d9d@o4511677787275264.ingest.de.sentry.io/4511677968220240';
