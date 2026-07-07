import { Component, computed, effect, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Textarea } from '../../../../shared/ui/textarea/textarea';
import { IdentitySessionStore } from '../../../identity/identity-session.store';
import type { TimeEntryChangeRequestDto, TimeEntryDto } from '../../api/restaurant-pos-api.models';
import { RestaurantPosApiService } from '../../api/restaurant-pos-api.service';
import { RestaurantContextStore } from '../../state/restaurant-context.store';

type TimePageTab = 'mine' | 'team';

@Component({
  selector: 'app-restaurant-pos-time-page',
  imports: [TranslocoPipe, Alert, Button, Textarea],
  templateUrl: './restaurant-pos-time-page.html',
  styleUrl: './restaurant-pos-time-page.css',
})
export class RestaurantPosTimePage {
  private readonly api = inject(RestaurantPosApiService);
  private readonly restaurantContext = inject(RestaurantContextStore);
  private readonly session = inject(IdentitySessionStore);

  protected readonly myEntries = signal<TimeEntryDto[]>([]);
  protected readonly teamEntries = signal<TimeEntryDto[]>([]);
  protected readonly changeRequests = signal<TimeEntryChangeRequestDto[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly loadingMine = signal(true);
  protected readonly loadingTeam = signal(false);
  protected readonly submittingClock = signal(false);
  protected readonly submittingChangeRequest = signal(false);
  protected readonly activeTab = signal<TimePageTab>('mine');
  protected readonly clockNote = signal('');
  protected readonly editingEntryId = signal<string | null>(null);
  protected readonly changeReason = signal('');
  protected readonly requestedClockInAt = signal('');
  protected readonly requestedClockOutAt = signal('');
  protected readonly requestedClockInNote = signal('');
  protected readonly requestedClockOutNote = signal('');
  protected readonly teamDateFrom = signal('');
  protected readonly teamDateTo = signal('');
  protected readonly teamStatus = signal('');
  protected readonly teamWorkerUserId = signal('');

  protected readonly canReviewTeam = computed(() => this.session.hasRole('admin') || this.session.hasRole('manager'));
  protected readonly canSubmitChangeRequest = computed(() => this.changeReason().trim().length > 0);
  protected readonly openEntry = computed(() => this.myEntries().find((entry) => entry.status === 'open') ?? null);
  protected readonly pendingRequests = computed(() =>
    this.changeRequests().filter((request) => request.status === 'pending'),
  );
  protected readonly workerOptions = computed(() => {
    const map = new Map<string, { id: string; label: string }>();
    for (const entry of this.teamEntries()) {
      map.set(entry.user.id, {
        id: entry.user.id,
        label: `${entry.user.firstName} ${entry.user.lastName}`.trim() || entry.user.email,
      });
    }
    return Array.from(map.values());
  });

  constructor() {
    effect(() => {
      const restaurant = this.restaurantContext.activeRestaurant();
      if (!restaurant) return;

      this.loadOwnEntries(restaurant.id);
      if (this.canReviewTeam()) {
        this.loadTeamData(restaurant.id);
      }
    });
  }

  protected setTab(tab: TimePageTab): void {
    this.activeTab.set(tab);
  }

  protected updateClockNote(note: string): void {
    this.clockNote.set(note);
  }

  protected clockIn(): void {
    const restaurant = this.restaurantContext.activeRestaurant();
    if (!restaurant || this.submittingClock()) return;

    this.submittingClock.set(true);
    this.error.set(null);
    this.api.clockInRestaurantTimeEntry(restaurant.id, {
      clockInAt: new Date().toISOString(),
      clockInNote: this.clockNote().trim() || null,
    }).subscribe({
      next: () => {
        this.clockNote.set('');
        this.submittingClock.set(false);
        this.loadOwnEntries(restaurant.id);
      },
      error: () => {
        this.error.set('restaurantPos.time.errors.clockAction');
        this.submittingClock.set(false);
      },
    });
  }

  protected clockOut(): void {
    const restaurant = this.restaurantContext.activeRestaurant();
    const openEntry = this.openEntry();
    if (!restaurant || !openEntry || this.submittingClock()) return;

    this.submittingClock.set(true);
    this.error.set(null);
    this.api.clockOutRestaurantTimeEntry(restaurant.id, openEntry.id, {
      clockOutAt: new Date().toISOString(),
      clockOutNote: this.clockNote().trim() || null,
    }).subscribe({
      next: () => {
        this.clockNote.set('');
        this.submittingClock.set(false);
        this.loadOwnEntries(restaurant.id);
      },
      error: () => {
        this.error.set('restaurantPos.time.errors.clockAction');
        this.submittingClock.set(false);
      },
    });
  }

  protected startChangeRequest(entry: TimeEntryDto): void {
    this.error.set(null);
    this.editingEntryId.set(entry.id);
    this.changeReason.set('');
    this.requestedClockInAt.set(toLocalDateTimeInput(entry.clockInAt));
    this.requestedClockOutAt.set(entry.clockOutAt ? toLocalDateTimeInput(entry.clockOutAt) : '');
    this.requestedClockInNote.set(entry.clockInNote ?? '');
    this.requestedClockOutNote.set(entry.clockOutNote ?? '');
  }

  protected cancelChangeRequest(): void {
    this.editingEntryId.set(null);
    this.changeReason.set('');
    this.requestedClockInAt.set('');
    this.requestedClockOutAt.set('');
    this.requestedClockInNote.set('');
    this.requestedClockOutNote.set('');
  }

  protected submitChangeRequest(): void {
    const restaurant = this.restaurantContext.activeRestaurant();
    const entryId = this.editingEntryId();
    if (!restaurant || !entryId || this.submittingChangeRequest() || !this.canSubmitChangeRequest()) return;

    this.submittingChangeRequest.set(true);
    this.error.set(null);
    this.api.createRestaurantTimeEntryChangeRequest(restaurant.id, {
      timeEntryId: entryId,
      reason: this.changeReason().trim(),
      requestedClockInAt: fromLocalDateTimeInput(this.requestedClockInAt()),
      requestedClockOutAt: fromLocalDateTimeInput(this.requestedClockOutAt()),
      requestedClockInNote: this.requestedClockInNote().trim() || null,
      requestedClockOutNote: this.requestedClockOutNote().trim() || null,
    }).subscribe({
      next: () => {
        this.submittingChangeRequest.set(false);
        this.cancelChangeRequest();
        this.loadOwnEntries(restaurant.id);
        if (this.canReviewTeam()) this.loadTeamData(restaurant.id);
      },
      error: () => {
        this.error.set('restaurantPos.time.errors.changeRequest');
        this.submittingChangeRequest.set(false);
      },
    });
  }

  protected updateChangeReason(value: string): void {
    this.changeReason.set(value);
  }

  protected updateRequestedClockInAt(value: string): void {
    this.requestedClockInAt.set(value);
  }

  protected updateRequestedClockOutAt(value: string): void {
    this.requestedClockOutAt.set(value);
  }

  protected updateRequestedClockInNote(value: string): void {
    this.requestedClockInNote.set(value);
  }

  protected updateRequestedClockOutNote(value: string): void {
    this.requestedClockOutNote.set(value);
  }

  protected applyTeamFilters(): void {
    const restaurant = this.restaurantContext.activeRestaurant();
    if (!restaurant) return;
    this.error.set(null);
    this.loadTeamData(restaurant.id);
  }

  protected updateTeamDateFrom(value: string): void {
    this.teamDateFrom.set(value);
  }

  protected updateTeamDateTo(value: string): void {
    this.teamDateTo.set(value);
  }

  protected updateTeamStatus(value: string): void {
    this.teamStatus.set(value);
  }

  protected updateTeamWorkerUserId(value: string): void {
    this.teamWorkerUserId.set(value);
  }

  protected reviewRequest(requestId: string, status: 'approved' | 'rejected'): void {
    const restaurant = this.restaurantContext.activeRestaurant();
    if (!restaurant) return;

    this.error.set(null);
    this.api.reviewRestaurantTimeEntryChangeRequest(restaurant.id, requestId, {
      status,
      reviewNote: null,
    }).subscribe({
      next: () => {
        this.loadOwnEntries(restaurant.id);
        this.loadTeamData(restaurant.id);
      },
      error: () => {
        this.error.set('restaurantPos.time.errors.review');
      },
    });
  }

  protected formatDateTime(value: string | null): string {
    if (!value) return '-';
    return new Intl.DateTimeFormat(this.session.accountType() === 'demo' ? 'es' : undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  protected formatDuration(entry: TimeEntryDto): string {
    if (!entry.clockOutAt) return '-';
    const diffMs = new Date(entry.clockOutAt).getTime() - new Date(entry.clockInAt).getTime();
    const totalMinutes = Math.max(0, Math.round(diffMs / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }

  protected isEditingEntry(entryId: string): boolean {
    return this.editingEntryId() === entryId;
  }

  private loadOwnEntries(restaurantId: string): void {
    this.loadingMine.set(true);
    this.api.getMyRestaurantTimeEntries(restaurantId).subscribe({
      next: (entries) => {
        this.myEntries.set(entries);
        this.loadingMine.set(false);
      },
      error: () => {
        this.error.set('restaurantPos.time.errors.load');
        this.loadingMine.set(false);
      },
    });
  }

  private loadTeamData(restaurantId: string): void {
    this.loadingTeam.set(true);
    this.api.getTeamRestaurantTimeEntries(restaurantId, {
      dateFrom: this.teamDateFrom() || undefined,
      dateTo: this.teamDateTo() || undefined,
      status: normalizeEntryStatus(this.teamStatus()),
      workerUserId: this.teamWorkerUserId() || undefined,
    }).subscribe({
      next: (entries) => {
        this.teamEntries.set(entries);
        this.loadingTeam.set(false);
      },
      error: () => {
        this.error.set('restaurantPos.time.errors.load');
        this.loadingTeam.set(false);
      },
    });

    this.api.getRestaurantTimeEntryChangeRequests(restaurantId, 'pending').subscribe({
      next: (requests) => this.changeRequests.set(requests),
      error: () => this.error.set('restaurantPos.time.errors.load'),
    });
  }
}

function normalizeEntryStatus(value: string): 'open' | 'closed' | 'corrected' | undefined {
  return value === 'open' || value === 'closed' || value === 'corrected' ? value : undefined;
}

function toLocalDateTimeInput(value: string): string {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromLocalDateTimeInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}
