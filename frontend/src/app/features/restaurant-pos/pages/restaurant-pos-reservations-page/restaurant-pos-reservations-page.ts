import { LowerCasePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { map, timer } from 'rxjs';

import { Alert } from '../../../../shared/ui/alert/alert';
import { DateNavigator } from '../../../../shared/ui/date-navigator/date-navigator';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { RestaurantPosApiService } from '../../api/restaurant-pos-api.service';
import type { RestaurantReservationDto } from '../../api/restaurant-pos-api.models';
import { RestaurantContextStore } from '../../state/restaurant-context.store';
import { RestaurantPosReservationsStore } from './restaurant-pos-reservations.store';
import type { ReservationAction } from './restaurant-pos-reservations.store';

type ReservationServiceBucket = 'lunch' | 'dinner';
type ReservationStatusFilter = 'all' | RestaurantReservationDto['status'];
type ReservationServiceFilter = 'all' | ReservationServiceBucket;
type ReservationHighlightFilter = 'all' | 'unassigned' | 'overdue';
type ReservationCreateForm = {
  customerNameSnapshot: string;
  customerPhoneSnapshot: string;
  partySize: number;
  time: string;
  durationMinutes: number;
  notes: string;
  tableIds: string[];
};

type ReservationAgendaItem = {
  id: string;
  timeLabel: string;
  customerName: string;
  customerPhone: string | null;
  partySize: number;
  reservationAt: string;
  status: RestaurantReservationDto['status'];
  notes: string | null;
  tableLabel: string;
  serviceBucket: ReservationServiceBucket;
  isUpcoming: boolean;
  isOverdue: boolean;
  isUnassigned: boolean;
  availableActions: ReservationAction[];
};

@Component({
  selector: 'app-restaurant-pos-reservations-page',
  imports: [Alert, DateNavigator, Dialog, EmptyState, LowerCasePipe, Spinner, TranslocoPipe],
  providers: [RestaurantPosReservationsStore],
  templateUrl: './restaurant-pos-reservations-page.html',
  styleUrl: './restaurant-pos-reservations-page.css',
})
export class RestaurantPosReservationsPage {
  private readonly api = inject(RestaurantPosApiService);
  private readonly restaurantContext = inject(RestaurantContextStore);
  private readonly transloco = inject(TranslocoService);
  private readonly store = inject(RestaurantPosReservationsStore);

  // ── Reloj reactivo (actualiza isUpcoming/isOverdue cada 30 s) ────────────
  private readonly nowMs = toSignal(timer(0, 30_000).pipe(map(() => Date.now())), { initialValue: Date.now() });

  // ── Señales del store ────────────────────────────────────────────────────
  protected readonly loading = this.store.loading;
  protected readonly loadError = this.store.loadError;
  private readonly reservations = this.store.reservations;
  private readonly restaurantFloors = this.store.restaurantFloors;

  // ── Estado UI de la página ───────────────────────────────────────────────
  protected readonly selectedDate = signal(formatIsoDate(new Date()));
  protected readonly searchQuery = signal('');
  protected readonly statusFilter = signal<ReservationStatusFilter>('all');
  protected readonly serviceFilter = signal<ReservationServiceFilter>('all');
  protected readonly highlightFilter = signal<ReservationHighlightFilter>('all');
  protected readonly pendingAction = signal<{ action: ReservationAction; reservation: ReservationAgendaItem } | null>(null);
  protected readonly creationOpen = signal(false);
  protected readonly creationSubmitting = signal(false);
  protected readonly creationError = signal<string | null>(null);
  protected readonly creationForm = signal<ReservationCreateForm>(createReservationFormState());

  // ── Señales derivadas ────────────────────────────────────────────────────
  protected readonly activeRestaurant = this.restaurantContext.activeRestaurant;
  protected readonly availableTables = computed(() =>
    this.restaurantFloors()?.tables.map((table) => ({
      id: table.id,
      label: table.name || `Mesa ${table.tableNumber}`,
    })) ?? [],
  );
  protected readonly selectedDateLabel = computed(() =>
    new Intl.DateTimeFormat(this.transloco.getActiveLang(), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(parseLocalDate(this.selectedDate())),
  );
  protected readonly pendingActionTitle = computed(() => {
    const action = this.pendingAction()?.action;
    if (action === 'cancel') return this.transloco.translate('restaurantPos.reservations.confirmCancelTitle');
    if (action === 'no_show') return this.transloco.translate('restaurantPos.reservations.confirmNoShowTitle');
    return '';
  });
  protected readonly pendingActionDescription = computed(() => {
    const action = this.pendingAction()?.action;
    if (action === 'cancel') return this.transloco.translate('restaurantPos.reservations.confirmCancelDescription');
    if (action === 'no_show') return this.transloco.translate('restaurantPos.reservations.confirmNoShowDescription');
    return '';
  });
  protected readonly dayReservations = computed(() => this.buildDayReservations());
  protected readonly summary = computed(() => ({
    reservations: this.dayReservations().length,
    pax: this.dayReservations().reduce((total, r) => total + r.partySize, 0),
    unassigned: this.dayReservations().filter((r) => r.isUnassigned).length,
    overdue: this.dayReservations().filter((r) => r.isOverdue).length,
  }));
  private readonly filteredReservations = computed(() => this.filterReservations(this.dayReservations()));
  protected readonly lunchReservations = computed(() => this.filteredReservations().filter((r) => r.serviceBucket === 'lunch'));
  protected readonly dinnerReservations = computed(() => this.filteredReservations().filter((r) => r.serviceBucket === 'dinner'));
  protected readonly serviceGroups = computed(() => [
    { labelKey: 'restaurantPos.reservations.lunch', descKey: 'restaurantPos.reservations.lunchDescription', reservations: this.lunchReservations() },
    { labelKey: 'restaurantPos.reservations.dinner', descKey: 'restaurantPos.reservations.dinnerDescription', reservations: this.dinnerReservations() },
  ]);

  constructor() {
    this.restaurantContext.load();

    // Floors solo se recargan cuando cambia el restaurante (no al cambiar fecha)
    effect(() => {
      const restaurant = this.restaurantContext.activeRestaurant();
      if (!restaurant) { this.store.clearData(); return; }
      this.store.loadFloors(restaurant.id);
    });

    // Reservas se recargan cuando cambia restaurante O fecha
    effect(() => {
      const restaurant = this.restaurantContext.activeRestaurant();
      if (!restaurant) return;
      this.store.loadReservations(restaurant.id, this.selectedDate());
    });
  }

  protected trackReservation(_: number, reservation: ReservationAgendaItem): string {
    return reservation.id;
  }

  protected statusLabel(status: RestaurantReservationDto['status']): string {
    return this.transloco.translate(`restaurantPos.reservations.status.${status}`);
  }

  protected updateSearchQuery(value: string): void {
    this.searchQuery.set(value);
  }

  protected isActionLoading(reservationId: string): boolean {
    return this.store.isActionLoading(reservationId);
  }

  protected actionError(reservationId: string): string | null {
    return this.store.actionError(reservationId);
  }

  protected serviceStatusLabel(reservation: ReservationAgendaItem): string | null {
    if (reservation.isOverdue) return this.transloco.translate('restaurantPos.reservations.overdue');
    if (reservation.isUpcoming) return this.transloco.translate('restaurantPos.reservations.upcoming');
    return null;
  }

  protected countdownLabel(reservation: ReservationAgendaItem): string | null {
    if (!reservation.isUpcoming) return null;
    const diffMs = new Date(reservation.reservationAt).getTime() - this.nowMs();
    const diffMin = Math.round(diffMs / 60_000);
    if (diffMin <= 0) return this.transloco.translate('restaurantPos.reservations.countdownNow');
    if (diffMin <= 120) return this.transloco.translate('restaurantPos.reservations.countdownMinutes', { count: diffMin });
    return null;
  }

  protected actionLabel(action: ReservationAction): string {
    switch (action) {
      case 'confirm': return this.transloco.translate('restaurantPos.reservations.actions.confirm');
      case 'seat':    return this.transloco.translate('restaurantPos.reservations.actions.seat');
      case 'no_show': return this.transloco.translate('restaurantPos.reservations.actions.noShow');
      case 'cancel':  return this.transloco.translate('restaurantPos.reservations.actions.cancel');
    }
  }

  protected openCreateReservation(): void {
    this.creationError.set(null);
    this.creationOpen.set(true);
  }

  protected closeCreateReservation(): void {
    this.creationOpen.set(false);
    this.creationSubmitting.set(false);
    this.creationError.set(null);
    this.creationForm.set(createReservationFormState());
  }

  protected updateCreateField<K extends keyof ReservationCreateForm>(
    field: K,
    value: ReservationCreateForm[K],
  ): void {
    this.creationForm.update((current) => ({ ...current, [field]: value }));
  }

  protected toggleCreateTable(tableId: string, checked: boolean): void {
    this.creationForm.update((current) => ({
      ...current,
      tableIds: checked
        ? [...current.tableIds, tableId]
        : current.tableIds.filter((candidate) => candidate !== tableId),
    }));
  }

  protected applyAction(action: ReservationAction, reservation: ReservationAgendaItem): void {
    if (action === 'cancel' || action === 'no_show') {
      this.pendingAction.set({ action, reservation });
      return;
    }
    this.executeAction(action, reservation);
  }

  protected confirmPendingAction(): void {
    const pending = this.pendingAction();
    if (!pending) return;
    this.pendingAction.set(null);
    this.executeAction(pending.action, pending.reservation);
  }

  protected dismissPendingAction(): void {
    this.pendingAction.set(null);
  }

  protected retryLoad(): void {
    const restaurant = this.activeRestaurant();
    if (restaurant) this.store.loadReservations(restaurant.id, this.selectedDate());
  }

  protected setHighlightFilter(value: ReservationHighlightFilter): void {
    this.highlightFilter.set(this.highlightFilter() === value ? 'all' : value);
  }

  protected submitReservation(): void {
    const restaurant = this.activeRestaurant();
    if (!restaurant) return;

    const request = this.buildCreateReservationRequest();
    if (!request) return;

    this.creationSubmitting.set(true);
    this.creationError.set(null);

    this.api.createRestaurantReservation(restaurant.id, request).subscribe({
      next: () => {
        this.creationSubmitting.set(false);
        this.closeCreateReservation();
        this.store.loadReservations(restaurant.id, this.selectedDate());
      },
      error: () => {
        this.creationSubmitting.set(false);
        this.creationError.set(this.transloco.translate('restaurantPos.reservations.create.error'));
      },
    });
  }

  private executeAction(action: ReservationAction, reservation: ReservationAgendaItem): void {
    const restaurant = this.activeRestaurant();
    if (!restaurant) return;
    this.store.executeAction(action, restaurant.id, reservation.id, this.selectedDate());
  }

  private buildDayReservations(): ReservationAgendaItem[] {
    const now = this.nowMs();
    return this.reservations()
      .filter((r) => isSameLocalDate(r.reservationAt, this.selectedDate()))
      .map((r) => ({
        id: r.id,
        timeLabel: new Intl.DateTimeFormat(this.transloco.getActiveLang(), {
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(r.reservationAt)),
        customerPhone: r.customerPhoneSnapshot,
        customerName: r.customerNameSnapshot,
        reservationAt: r.reservationAt,
        partySize: r.partySize,
        status: r.status,
        notes: r.notes,
        tableLabel:
          r.tables.length > 0
            ? r.tables.map((t) => t.name || `Mesa ${t.tableNumber}`).join(' + ')
            : this.transloco.translate('restaurantPos.reservations.unassignedTable'),
        serviceBucket: serviceBucketFor(r.reservationAt),
        isUpcoming: isUpcomingReservation(r.reservationAt, r.status, this.selectedDate(), now),
        isOverdue: isOverdueReservation(r.reservationAt, r.status, this.selectedDate(), now),
        isUnassigned: r.tables.length === 0,
        availableActions: actionsForReservationStatus(r.status),
      }));
  }

  private filterReservations(reservations: ReservationAgendaItem[]): ReservationAgendaItem[] {
    const normalizedQuery = normalize(this.searchQuery());
    const highlight = this.highlightFilter();

    return reservations.filter((r) => {
      const matchesService = this.serviceFilter() === 'all' || r.serviceBucket === this.serviceFilter();
      const matchesStatus = this.statusFilter() === 'all' || r.status === this.statusFilter();
      const matchesQuery =
        normalizedQuery.length === 0 ||
        normalize(r.customerName).includes(normalizedQuery) ||
        normalize(r.customerPhone ?? '').includes(normalizedQuery);
      const matchesHighlight =
        highlight === 'all' ||
        (highlight === 'unassigned' && r.isUnassigned) ||
        (highlight === 'overdue' && r.isOverdue);
      return matchesService && matchesStatus && matchesQuery && matchesHighlight;
    });
  }

  private buildCreateReservationRequest() {
    const form = this.creationForm();
    const customerNameSnapshot = form.customerNameSnapshot.trim();
    if (customerNameSnapshot.length === 0) {
      this.creationError.set(this.transloco.translate('restaurantPos.reservations.create.validation.customerNameRequired'));
      return null;
    }
    if (form.partySize < 1) {
      this.creationError.set(this.transloco.translate('restaurantPos.reservations.create.validation.partySizeRequired'));
      return null;
    }
    const reservationAt = buildLocalReservationDateTime(this.selectedDate(), form.time);
    if (!reservationAt) {
      this.creationError.set(this.transloco.translate('restaurantPos.reservations.create.validation.timeRequired'));
      return null;
    }
    return {
      customerNameSnapshot,
      customerPhoneSnapshot: form.customerPhoneSnapshot.trim() || null,
      partySize: form.partySize,
      reservationAt,
      durationMinutes: form.durationMinutes,
      notes: form.notes.trim() || null,
      tableIds: form.tableIds,
    };
  }
}

function createReservationFormState(): ReservationCreateForm {
  return { customerNameSnapshot: '', customerPhoneSnapshot: '', partySize: 2, time: '13:30', durationMinutes: 90, notes: '', tableIds: [] };
}

function formatIsoDate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function isSameLocalDate(dateTime: string, selectedDate: string): boolean {
  return formatIsoDate(new Date(dateTime)) === selectedDate;
}

function serviceBucketFor(dateTime: string): ReservationServiceBucket {
  return new Date(dateTime).getHours() < 17 ? 'lunch' : 'dinner';
}

function actionsForReservationStatus(status: RestaurantReservationDto['status']): ReservationAction[] {
  if (status === 'pending') return ['confirm', 'cancel'];
  if (status === 'confirmed') return ['seat', 'no_show', 'cancel'];
  return [];
}

function isUpcomingReservation(
  reservationAt: string,
  status: RestaurantReservationDto['status'],
  selectedDate: string,
  now: number,
): boolean {
  if (!isSameLocalDate(reservationAt, selectedDate)) return false;
  if (status !== 'pending' && status !== 'confirmed') return false;
  return new Date(reservationAt).getTime() > now;
}

function isOverdueReservation(
  reservationAt: string,
  status: RestaurantReservationDto['status'],
  selectedDate: string,
  now: number,
): boolean {
  if (!isSameLocalDate(reservationAt, selectedDate)) return false;
  if (status !== 'pending' && status !== 'confirmed') return false;
  return new Date(reservationAt).getTime() <= now;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function buildLocalReservationDateTime(selectedDate: string, time: string): string | null {
  const [year, month, day] = selectedDate.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  if ([year, month, day, hours, minutes].some((v) => Number.isNaN(v))) return null;
  return new Date(year!, (month ?? 1) - 1, day ?? 1, hours!, minutes!, 0, 0).toISOString();
}
