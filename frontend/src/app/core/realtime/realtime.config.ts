import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export const REALTIME_ENABLED = new InjectionToken<boolean>('REALTIME_ENABLED', {
  providedIn: 'root',
  factory: () => environment.realtimeEnabled,
});

export const REALTIME_URL = new InjectionToken<string | undefined>('REALTIME_URL', {
  providedIn: 'root',
  factory: () => environment.realtimeUrl,
});
