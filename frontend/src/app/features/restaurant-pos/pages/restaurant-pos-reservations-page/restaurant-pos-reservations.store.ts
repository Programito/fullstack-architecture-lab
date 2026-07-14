import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';

import { ToastService } from '../../../../shared/ui/toast/toast';
import { RestaurantPosApiService } from '../../api/restaurant-pos-api.service';
import type { RestaurantFloorsDto, RestaurantReservationDto, ServiceWindowDto, UpdateServiceWindowsRequest } from '../../api/restaurant-pos-api.models';

export type ReservationAction = 'confirm' | 'seat' | 'no_show' | 'cancel';

type ReservationsLoadContext = {
  restaurantId: string;
  date: string | undefined;
};

@Injectable()
export class RestaurantPosReservationsStore {
  private readonly api = inject(RestaurantPosApiService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

  // ── Señales privadas (estado interno mutable) ────────────────────────────
  private readonly _reservations = signal<RestaurantReservationDto[]>([]);
  private readonly _restaurantFloors = signal<RestaurantFloorsDto | null>(null);
  private readonly _serviceWindows = signal<ServiceWindowDto[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadError = signal(false);
  private readonly _serviceWindowsSaving = signal(false);
  private readonly _actionState = signal<Record<string, { loading: boolean; error: string | null }>>({});
  private reservationsLoadGeneration = 0;
  private currentReservationsContext: ReservationsLoadContext | null = null;

  // ── Señales públicas readonly (contratos de la vista) ────────────────────
  readonly reservations = this._reservations.asReadonly();
  readonly restaurantFloors = this._restaurantFloors.asReadonly();
  readonly serviceWindows = this._serviceWindows.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loadError = this._loadError.asReadonly();
  readonly serviceWindowsSaving = this._serviceWindowsSaving.asReadonly();
  readonly actionState = this._actionState.asReadonly();

  // ── Consultas ────────────────────────────────────────────────────────────
  isActionLoading(reservationId: string): boolean {
    return this._actionState()[reservationId]?.loading ?? false;
  }

  actionError(reservationId: string): string | null {
    return this._actionState()[reservationId]?.error ?? null;
  }

  // ── Comandos ─────────────────────────────────────────────────────────────
  loadReservations(restaurantId: string, date?: string): void {
    this.currentReservationsContext = { restaurantId, date };
    const generation = ++this.reservationsLoadGeneration;
    this._loading.set(true);
    this._loadError.set(false);
    this.api
      .getRestaurantReservations(restaurantId, date)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reservations) => {
          if (generation !== this.reservationsLoadGeneration) return;
          this._reservations.set(reservations);
          this._loading.set(false);
        },
        error: () => {
          if (generation !== this.reservationsLoadGeneration) return;
          this._loading.set(false);
          this._loadError.set(true);
        },
      });
  }

  loadFloors(restaurantId: string): void {
    this.api
      .getRestaurantFloors(restaurantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((floors) => {
        this._restaurantFloors.set(floors);
      });
  }

  loadServiceWindows(restaurantId: string): void {
    this.api
      .getRestaurantServiceWindows(restaurantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((windows) => {
        this._serviceWindows.set(windows);
      });
  }

  updateServiceWindows(
    restaurantId: string,
    body: UpdateServiceWindowsRequest,
    onSuccess: () => void,
  ): void {
    this._serviceWindowsSaving.set(true);
    this.api
      .updateRestaurantServiceWindows(restaurantId, body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (windows) => {
          this._serviceWindows.set(windows);
          this._serviceWindowsSaving.set(false);
          onSuccess();
        },
        error: () => {
          this._serviceWindowsSaving.set(false);
        },
      });
  }

  clearData(): void {
    this.reservationsLoadGeneration += 1;
    this.currentReservationsContext = null;
    this._reservations.set([]);
    this._restaurantFloors.set(null);
    this._serviceWindows.set([]);
    this._loading.set(false);
    this._loadError.set(false);
  }

  executeAction(action: ReservationAction, restaurantId: string, reservationId: string, date?: string): void {
    this._actionState.update((state) => ({
      ...state,
      [reservationId]: { loading: true, error: null },
    }));

    this.actionRequest(action, restaurantId, reservationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this._actionState.update((state) => ({
            ...state,
            [reservationId]: { loading: false, error: null },
          }));
          if (this.isCurrentReservationsContext(restaurantId, date)) {
            this.loadReservations(restaurantId, date);
          }
          this.toast.success({
            title: this.transloco.translate(`restaurantPos.reservations.actionSuccess.${action}.title`),
            description: this.transloco.translate(`restaurantPos.reservations.actionSuccess.${action}.description`),
          });
        },
        error: () => {
          this._actionState.update((state) => ({
            ...state,
            [reservationId]: {
              loading: false,
              error: this.transloco.translate('restaurantPos.reservations.actionError'),
            },
          }));
        },
      });
  }

  private actionRequest(action: ReservationAction, restaurantId: string, reservationId: string) {
    switch (action) {
      case 'confirm':
        return this.api.confirmRestaurantReservation(restaurantId, reservationId);
      case 'seat':
        return this.api.seatRestaurantReservation(restaurantId, reservationId);
      case 'no_show':
        return this.api.markRestaurantReservationNoShow(restaurantId, reservationId);
      case 'cancel':
        return this.api.cancelRestaurantReservation(restaurantId, reservationId);
    }
  }

  private isCurrentReservationsContext(restaurantId: string, date?: string): boolean {
    return this.currentReservationsContext?.restaurantId === restaurantId
      && this.currentReservationsContext.date === date;
  }
}
