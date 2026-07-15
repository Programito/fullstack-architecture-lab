import { describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { API_BASE_URL } from './api.config';
import { REALTIME_ENABLED, REALTIME_URL } from '../realtime/realtime.config';

describe('environment-backed api config', () => {
  it('provides the API base URL from the active environment', () => {
    expect((API_BASE_URL as typeof API_BASE_URL & { ɵprov: { factory: () => string } }).ɵprov.factory()).toBe(environment.apiBaseUrl);
  });

  it('provides the realtime URL from the active environment', () => {
    expect((REALTIME_URL as typeof REALTIME_URL & { ɵprov: { factory: () => string | undefined } }).ɵprov.factory()).toBe(environment.realtimeUrl);
  });

  it('provides the realtime enabled flag from the active environment', () => {
    expect((REALTIME_ENABLED as typeof REALTIME_ENABLED & { ɵprov: { factory: () => boolean } }).ɵprov.factory()).toBe(environment.realtimeEnabled);
  });
});
