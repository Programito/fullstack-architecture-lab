import { LowerCasePipe } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Subject, catchError, debounceTime, distinctUntilChanged, map, of, switchMap, timer } from 'rxjs';

import { Alert } from '../../../../shared/ui/alert/alert';
import { DateNavigator } from '../../../../shared/ui/date-navigator/date-navigator';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { SegmentedControl, type SegmentedControlOption } from '../../../../shared/ui/segmented-control/segmented-control';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { RestaurantPosApiService } from '../../api/restaurant-pos-api.service';
import type { CreateRestaurantReservationRequest, CustomerSummaryDto, RestaurantReservationDto, ServiceWindowDto } from '../../api/restaurant-pos-api.models';
import { RestaurantContextStore } from '../../state/restaurant-context.store';
import { RestaurantPosReservationsStore } from './restaurant-pos-reservations.store';
import type { ReservationAction } from './restaurant-pos-reservations.store';

type ServiceWindowEditRow = { name: string; startTime: string; endTime: string };
type ReservationServiceBucket = 'lunch' | 'dinner';
type ReservationStatusFilter = 'all' | RestaurantReservationDto['status'];
type ReservationServiceFilter = 'all' | ReservationServiceBucket;
type ReservationHighlightFilter = 'all' | 'unassigned' | 'overdue';
type ReservationCreateForm = {
  customerId: string | null;
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
  imports: [Alert, DateNavigator, Dialog, EmptyState, LowerCasePipe, SegmentedControl, Spinner, TranslocoPipe],
  providers: [RestaurantPosReservationsStore],
  templateUrl: './restaurant-pos-reservations-page.html',
  styleUrl: './restaurant-pos-reservations-page.css',
})
export class RestaurantPosReservationsPage {
  private readonly api = inject(RestaurantPosApiService);
  private readonly restaurantContext = inject(RestaurantContextStore);
  private readonly transloco = inject(TranslocoService);
  private readonly store = inject(RestaurantPosReservationsStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly customerSearch$ = new Subject<string>();

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
  protected readonly capacityWarningOpen = signal(false);
  private readonly pendingSubmitRequest = signal<CreateRestaurantReservationRequest | null>(null);

  // ── Estado del autocomplete de cliente ──────────────────────────────────────
  protected readonly selectedCustomer = signal<CustomerSummaryDto | null>(null);
  protected readonly customerSearchResults = signal<CustomerSummaryDto[]>([]);
  protected readonly customerSearchOpen = signal(false);
  protected readonly customerSearchLoading = signal(false);

  // ── Señales derivadas ────────────────────────────────────────────────────
  protected readonly activeRestaurant = this.restaurantContext.activeRestaurant;
  private readonly serviceWindows = this.store.serviceWindows;
  protected readonly serviceWindowsSaving = this.store.serviceWindowsSaving;
  protected readonly serviceTab = signal<string>('');
  protected readonly serviceTabOptions = computed<SegmentedControlOption[]>(() =>
    this.serviceWindows().map((w) => ({ label: w.name, value: w.id })),
  );
  protected readonly activeSlots = computed(() => {
    const windows = this.serviceWindows();
    const active = windows.find((w) => w.id === this.serviceTab()) ?? windows[0];
    return active ? generateTimeSlots(active.startTime, active.endTime) : [];
  });
  protected readonly recommendedSlots = computed(() => {
    const selected = this.creationForm().time;
    const slots = this.activeSlots();
    if (slots.length <= 4) return slots;
    const anchorIndex = Math.max(slots.indexOf(selected), 0);
    return Array.from(new Set([slots[anchorIndex - 1], slots[anchorIndex], slots[anchorIndex + 1], slots[anchorIndex + 2]].filter(Boolean))) as string[];
  });
  protected readonly secondarySlots = computed(() =>
    this.activeSlots().filter((slot) => !this.recommendedSlots().includes(slot)),
  );

  // ── Estado del dialog de edición de franjas ──────────────────────────────
  protected readonly serviceWindowsEditOpen = signal(false);
  protected readonly serviceWindowsEditRows = signal<ServiceWindowEditRow[]>([]);
  protected readonly serviceWindowsEditError = signal<string | null>(null);

  protected readonly availableTables = computed(() =>
    this.restaurantFloors()?.tables.map((table) => ({
      id: table.id,
      label: table.name || `Mesa ${table.tableNumber}`,
      capacity: table.capacity,
    })) ?? [],
  );
  protected readonly selectedTablesCapacity = computed(() => {
    const selectedIds = this.creationForm().tableIds;
    if (selectedIds.length === 0) return null;
    return this.availableTables()
      .filter((t) => selectedIds.includes(t.id))
      .reduce((total, t) => total + t.capacity, 0);
  });
  protected readonly selectedTableLabels = computed(() => {
    const selectedIds = this.creationForm().tableIds;
    return this.availableTables().filter((table) => selectedIds.includes(table.id)).map((table) => table.label);
  });
  protected readonly suggestedTables = computed(() => {
    const partySize = this.creationForm().partySize;
    const selectedIds = this.creationForm().tableIds;
    return this.availableTables()
      .map((table) => ({
        ...table,
        selected: selectedIds.includes(table.id),
        fit: table.capacity === partySize ? 'ideal' : table.capacity < partySize ? 'tight' : 'oversized' as const,
      }))
      .sort((left, right) => Math.abs(left.capacity - partySize) - Math.abs(right.capacity - partySize))
      .slice(0, 4);
  });
  protected readonly manualTables = computed(() => {
    const suggestedTableIds = new Set(this.suggestedTables().map((table) => table.id));
    const selectedTableIds = this.creationForm().tableIds;
    return this.availableTables()
      .filter((table) => !suggestedTableIds.has(table.id))
      .map((table) => ({ ...table, selected: selectedTableIds.includes(table.id) }));
  });
  protected readonly creationProgressState = computed(() => {
    const form = this.creationForm();
    const hasCustomer = form.customerNameSnapshot.trim().length > 0;
    const hasPartySize = form.partySize > 0;
    const hasTime = form.time.trim().length > 0;
    const hasSuggestedTable = form.tableIds.length > 0;

    let ctaLabelKey = 'restaurantPos.reservations.create.submit';
    if (!hasCustomer) ctaLabelKey = 'restaurantPos.reservations.create.cta.selectCustomer';
    else if (!hasPartySize) ctaLabelKey = 'restaurantPos.reservations.create.cta.selectPartySize';
    else if (!hasTime) ctaLabelKey = 'restaurantPos.reservations.create.cta.selectTime';
    else if (!hasSuggestedTable) ctaLabelKey = 'restaurantPos.reservations.create.cta.optionalTable';

    return { hasCustomer, hasPartySize, hasTime, hasSuggestedTable, ctaLabelKey };
  });
  protected readonly capacityWarningDescription = computed(() => {
    const capacity = this.selectedTablesCapacity();
    if (capacity === null) return '';
    return this.transloco.translate('restaurantPos.reservations.create.capacityWarning.description', {
      partySize: this.creationForm().partySize,
      capacity,
    });
  });
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
  protected readonly serviceLoadSummary = computed(() =>
    [
      { labelKey: 'restaurantPos.reservations.lunch', reservations: this.dayReservations().filter((reservation) => reservation.serviceBucket === 'lunch') },
      { labelKey: 'restaurantPos.reservations.dinner', reservations: this.dayReservations().filter((reservation) => reservation.serviceBucket === 'dinner') },
    ].map((group) => {
      const reservationCount = group.reservations.length;
      const unassignedCount = group.reservations.filter((reservation) => reservation.isUnassigned).length;
      const overdueCount = group.reservations.filter((reservation) => reservation.isOverdue).length;
      const upcomingCount = group.reservations.filter((reservation) => reservation.isUpcoming).length;
      const intensity = reservationCount >= 6 ? 'busy' : reservationCount >= 3 ? 'balanced' : 'quiet';
      return { serviceKey: group.labelKey, reservationCount, unassignedCount, overdueCount, upcomingCount, intensity } as const;
    }),
  );

  constructor() {
    this.restaurantContext.load();

    // Floors y service windows solo se recargan cuando cambia el restaurante
    effect(() => {
      const restaurant = this.restaurantContext.activeRestaurant();
      if (!restaurant) { this.store.clearData(); return; }
      this.store.loadFloors(restaurant.id);
      this.store.loadServiceWindows(restaurant.id);
    });

    // Reservas se recargan cuando cambia restaurante O fecha
    effect(() => {
      const restaurant = this.restaurantContext.activeRestaurant();
      if (!restaurant) return;
      this.store.loadReservations(restaurant.id, this.selectedDate());
    });

    // Inicializa el tab activo al primer servicio cuando llegan las franjas
    effect(() => {
      const windows = this.serviceWindows();
      if (windows.length > 0 && !windows.some((w) => w.id === this.serviceTab())) {
        this.serviceTab.set(windows[0]!.id);
      }
    });

    // Búsqueda de clientes con debounce
    this.customerSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) => {
        const restaurant = this.restaurantContext.activeRestaurant();
        if (!restaurant) return of([]);
        this.customerSearchLoading.set(true);
        return this.api.searchCustomers(restaurant.id, q).pipe(catchError(() => of([])));
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((results: CustomerSummaryDto[]) => {
      this.customerSearchLoading.set(false);
      this.customerSearchResults.set(results);
      this.customerSearchOpen.set(results.length > 0);
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
    this.capacityWarningOpen.set(false);
    this.pendingSubmitRequest.set(null);
    this.serviceTab.set(this.serviceWindows()[0]?.id ?? '');
    this.selectedCustomer.set(null);
    this.customerSearchResults.set([]);
    this.customerSearchOpen.set(false);
  }

  protected onCustomerSearchInput(value: string): void {
    this.updateCreateField('customerNameSnapshot', value);
    this.updateCreateField('customerId', null);
    this.selectedCustomer.set(null);
    if (value.trim().length >= 2) {
      this.customerSearch$.next(value.trim());
    } else {
      this.customerSearchResults.set([]);
      this.customerSearchOpen.set(false);
    }
  }

  protected onCustomerSearchBlur(): void {
    setTimeout(() => this.customerSearchOpen.set(false), 150);
  }

  protected onCustomerSearchFocus(): void {
    if (this.customerSearchResults().length > 0) this.customerSearchOpen.set(true);
  }

  protected selectCustomer(customer: CustomerSummaryDto): void {
    this.selectedCustomer.set(customer);
    this.updateCreateField('customerId', customer.id);
    this.updateCreateField('customerNameSnapshot', customer.name);
    this.updateCreateField('customerPhoneSnapshot', customer.phone ?? '');
    this.customerSearchOpen.set(false);
    this.customerSearchResults.set([]);
  }

  protected clearCustomerSelection(): void {
    this.selectedCustomer.set(null);
    this.updateCreateField('customerId', null);
    this.updateCreateField('customerNameSnapshot', '');
    this.updateCreateField('customerPhoneSnapshot', '');
  }

  protected readonly defaultServiceWindowRows: ServiceWindowEditRow[] = [
    { name: this.transloco.translate('restaurantPos.reservations.serviceWindowsDialog.defaultLunch'), startTime: '12:00', endTime: '16:30' },
    { name: this.transloco.translate('restaurantPos.reservations.serviceWindowsDialog.defaultDinner'), startTime: '20:00', endTime: '23:00' },
  ];

  protected openServiceWindowsEdit(): void {
    this.serviceWindowsEditRows.set(
      this.serviceWindows().map((w) => ({ name: w.name, startTime: w.startTime, endTime: w.endTime })),
    );
    this.serviceWindowsEditError.set(null);
    this.serviceWindowsEditOpen.set(true);
  }

  protected useDefaultServiceWindows(): void {
    this.serviceWindowsEditRows.set([...this.defaultServiceWindowRows]);
    this.serviceWindowsEditError.set(null);
  }

  protected closeServiceWindowsEdit(): void {
    this.serviceWindowsEditOpen.set(false);
    this.serviceWindowsEditError.set(null);
  }

  protected addServiceWindowRow(): void {
    this.serviceWindowsEditRows.update((rows) => [...rows, { name: '', startTime: '12:00', endTime: '16:00' }]);
  }

  protected removeServiceWindowRow(index: number): void {
    this.serviceWindowsEditRows.update((rows) => rows.filter((_, i) => i !== index));
  }

  protected updateServiceWindowRow(index: number, field: keyof ServiceWindowEditRow, value: string): void {
    this.serviceWindowsEditRows.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  protected saveServiceWindows(): void {
    const restaurant = this.activeRestaurant();
    if (!restaurant) return;
    const rows = this.serviceWindowsEditRows();
    if (rows.length === 0) {
      this.serviceWindowsEditError.set(this.transloco.translate('restaurantPos.reservations.serviceWindowsDialog.errorAtLeastOne'));
      return;
    }
    this.store.updateServiceWindows(
      restaurant.id,
      { windows: rows.map((r) => ({ name: r.name, startTime: r.startTime, endTime: r.endTime })) },
      () => this.closeServiceWindowsEdit(),
    );
  }

  protected updateCreateField<K extends keyof ReservationCreateForm>(
    field: K,
    value: ReservationCreateForm[K],
  ): void {
    this.creationForm.update((current) => ({ ...current, [field]: value }));
  }

  protected selectServiceWindow(serviceWindowId: string): void {
    this.serviceTab.set(serviceWindowId);
    const window = this.serviceWindows().find((candidate) => candidate.id === serviceWindowId);
    const slots = window ? generateTimeSlots(window.startTime, window.endTime) : [];
    if (!slots.includes(this.creationForm().time)) {
      this.updateCreateField('time', slots[0] ?? '');
    }
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

    const capacity = this.selectedTablesCapacity();
    if (capacity !== null && request.partySize > capacity) {
      this.pendingSubmitRequest.set(request);
      this.capacityWarningOpen.set(true);
      return;
    }

    this.doCreateReservation(restaurant.id, request);
  }

  protected confirmCapacityWarning(): void {
    const restaurant = this.activeRestaurant();
    const request = this.pendingSubmitRequest();
    if (!restaurant || !request) return;
    this.capacityWarningOpen.set(false);
    this.pendingSubmitRequest.set(null);
    this.doCreateReservation(restaurant.id, request);
  }

  protected dismissCapacityWarning(): void {
    this.capacityWarningOpen.set(false);
    this.pendingSubmitRequest.set(null);
  }

  private doCreateReservation(restaurantId: string, request: CreateRestaurantReservationRequest): void {
    this.creationSubmitting.set(true);
    this.creationError.set(null);

    this.api.createRestaurantReservation(restaurantId, request).subscribe({
      next: () => {
        this.creationSubmitting.set(false);
        this.closeCreateReservation();
        this.store.loadReservations(restaurantId, this.selectedDate());
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
  return { customerId: null, customerNameSnapshot: '', customerPhoneSnapshot: '', partySize: 2, time: '13:30', durationMinutes: 90, notes: '', tableIds: [] };
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

function generateTimeSlots(startTime: string, endTime: string, stepMinutes = 30): string[] {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  if ([startH, startM, endH, endM].some((v) => Number.isNaN(v))) return [];
  const startTotal = startH! * 60 + startM!;
  const endTotal = endH! * 60 + endM!;
  const slots: string[] = [];
  for (let t = startTotal; t <= endTotal; t += stepMinutes) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
  return slots;
}
