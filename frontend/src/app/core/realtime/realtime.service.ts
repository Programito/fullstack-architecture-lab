import { effect, inject, Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { ClientLogsService } from '../observability/client-logs.service';
import { IdentitySessionStore } from '../../features/identity/identity-session.store';
import { RestaurantContextStore } from '../../features/restaurant-pos/state/restaurant-context.store';
import { REALTIME_TRANSPORT } from './realtime-transport';
import { REALTIME_ENABLED, REALTIME_URL } from './realtime.config';

export type OrderInvalidatedEvent = {
  restaurantId: string;
  tableId: string | null;
  orderId: string | null;
  reason: string;
};

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly enabled = inject(REALTIME_ENABLED);
  private readonly url = inject(REALTIME_URL);
  private readonly transport = inject(REALTIME_TRANSPORT);
  private readonly session = inject(IdentitySessionStore);
  private readonly restaurantContext = inject(RestaurantContextStore);
  private readonly clientLogs = inject(ClientLogsService);

  private readonly invalidatedSubject = new Subject<OrderInvalidatedEvent>();
  readonly invalidated$: Observable<OrderInvalidatedEvent> = this.invalidatedSubject.asObservable();

  private connected = false;
  private joinedRestaurantId: string | null = null;

  constructor() {
    if (!this.enabled) return;

    this.transport.on('order:invalidated', (payload) => {
      this.invalidatedSubject.next(payload as OrderInvalidatedEvent);
    });

    this.transport.on('connect_error', (error) => {
      this.clientLogs.log({
        level: 'warn',
        event: 'frontend.realtime.connect_error',
        message: 'Realtime socket connection failed.',
        metadata: { error: String(error) },
      });
    });

    this.transport.on('reconnect', () => {
      this.clientLogs.log({
        level: 'info',
        event: 'frontend.realtime.reconnected',
        message: 'Realtime socket reconnected.',
      });
    });

    effect(() => {
      const authenticated = this.session.isAuthenticated();
      const restaurant = this.restaurantContext.activeRestaurant();

      if (!authenticated || !restaurant) {
        this.teardown();
        return;
      }

      if (!this.connected) {
        this.transport.connect(this.url, () => ({ token: this.session.session().accessToken ?? '' }));
        this.connected = true;
      }

      if (this.joinedRestaurantId !== restaurant.id) {
        this.transport.emit('join-restaurant', restaurant.id);
        this.joinedRestaurantId = restaurant.id;
      }
    });
  }

  private teardown(): void {
    if (!this.connected) return;
    this.transport.disconnect();
    this.connected = false;
    this.joinedRestaurantId = null;
  }
}
