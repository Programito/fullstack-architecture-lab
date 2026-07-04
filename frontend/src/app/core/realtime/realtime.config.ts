import { InjectionToken } from '@angular/core';

export const REALTIME_ENABLED = new InjectionToken<boolean>('REALTIME_ENABLED', {
  providedIn: 'root',
  factory: () => false,
});

export const REALTIME_URL = new InjectionToken<string | undefined>('REALTIME_URL', {
  providedIn: 'root',
  factory: () => undefined,
});
