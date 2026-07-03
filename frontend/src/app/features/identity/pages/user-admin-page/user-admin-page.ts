import { Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { Alert } from '../../../../shared/ui/alert/alert';
import { Card } from '../../../../shared/ui/card/card';
import { Select, type SelectOption } from '../../../../shared/ui/select/select';
import { Switch } from '../../../../shared/ui/switch/switch';
import type { RestaurantSummaryDto } from '../../../restaurant-pos/api/restaurant-pos-api.models';
import { RestaurantPosApiService } from '../../../restaurant-pos/api/restaurant-pos-api.service';
import type { AccountType, OrganizationSummaryDto } from '../../api/identity-api.models';
import { IdentityApiService } from '../../api/identity-api.service';
import { IdentitySessionStore } from '../../identity-session.store';
import type { User } from '../../models/user.model';

type ScopeDraft = { organizationId: string; restaurantId: string };

@Component({
  selector: 'app-user-admin-page',
  imports: [Alert, Card, Select, Switch, TranslocoPipe],
  templateUrl: './user-admin-page.html',
  styleUrl: './user-admin-page.css',
})
export class UserAdminPage {
  private readonly api = inject(IdentityApiService);
  private readonly restaurantPosApi = inject(RestaurantPosApiService);
  private readonly transloco = inject(TranslocoService);
  private readonly session = inject(IdentitySessionStore);

  protected readonly users = signal<User[]>([]);
  protected readonly loading = signal(true);
  protected readonly demoLoginEnabled = signal(false);
  protected readonly accountTypes: readonly AccountType[] = ['regular', 'demo', 'system', 'test'];
  // Demo admin accounts (public showcase logins) must not be able to change
  // other users' account types, to keep the shared demo environment intact.
  protected readonly accountTypeChangesBlocked = this.session.isDemoAccount;

  protected readonly organizations = signal<OrganizationSummaryDto[]>([]);
  protected readonly restaurants = signal<RestaurantSummaryDto[]>([]);
  protected readonly scopeDrafts = signal<Record<string, ScopeDraft>>({});
  protected readonly savedScopeUserIds = signal<ReadonlySet<string>>(new Set());

  protected readonly organizationOptions = computed<SelectOption[]>(() =>
    this.organizations().map((organization) => ({ label: organization.name, value: organization.id })),
  );

  constructor() {
    this.loadUsers();
    this.api.getAuthPublicConfig().subscribe({
      next: (config) => this.demoLoginEnabled.set(config.demoLoginEnabled),
    });
    this.api.listOrganizations().subscribe({
      next: (organizations) => this.organizations.set(organizations),
    });
    this.restaurantPosApi.listRestaurants().subscribe({
      next: (restaurants) => this.restaurants.set(restaurants),
    });
  }

  protected changeAccountType(user: User, event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (this.accountTypeChangesBlocked()) {
      select.value = user.accountType;
      return;
    }
    const accountType = select.value as AccountType;
    if (accountType === user.accountType) return;
    const revokesSessions = accountType === 'system'
      || accountType === 'test'
      || (accountType === 'demo' && !this.demoLoginEnabled());
    if (revokesSessions && !window.confirm(this.transloco.translate('userAdmin.confirmRevocation'))) {
      select.value = user.accountType;
      return;
    }
    select.disabled = true;
    this.api.setUserAccountType(user.id, accountType).subscribe({
      next: (updated) => {
        this.users.update((users) => users.map((candidate) => candidate.id === updated.id ? updated : candidate));
        select.disabled = false;
      },
      error: () => {
        select.value = user.accountType;
        select.disabled = false;
      },
    });
  }

  protected toggleEnabled(user: User, enabled: boolean): void {
    if (this.accountTypeChangesBlocked()) return;
    if (!enabled && !window.confirm(this.transloco.translate('userAdmin.confirmRevocation'))) return;

    this.api.setUserEnabled(user.id, enabled).subscribe({
      next: (updated) => {
        this.users.update((users) => users.map((candidate) => candidate.id === updated.id ? updated : candidate));
      },
    });
  }

  protected restaurantOptionsFor(organizationId: string): SelectOption[] {
    return this.restaurants()
      .filter((restaurant) => restaurant.organizationId === organizationId)
      .map((restaurant) => ({ label: restaurant.displayName ?? restaurant.name, value: restaurant.id }));
  }

  protected draftFor(userId: string): ScopeDraft {
    return this.scopeDrafts()[userId] ?? { organizationId: '', restaurantId: '' };
  }

  protected selectScopeOrganization(userId: string, organizationId: string): void {
    this.scopeDrafts.update((drafts) => ({ ...drafts, [userId]: { organizationId, restaurantId: '' } }));
    this.clearSavedScope(userId);
  }

  protected selectScopeRestaurant(userId: string, restaurantId: string): void {
    this.scopeDrafts.update((drafts) => ({
      ...drafts,
      [userId]: { organizationId: drafts[userId]?.organizationId ?? '', restaurantId },
    }));
    this.clearSavedScope(userId);
  }

  protected saveScope(user: User): void {
    if (this.accountTypeChangesBlocked()) return;
    const draft = this.draftFor(user.id);
    if (!draft.organizationId) return;

    this.api
      .setUserRestaurantScope(user.id, {
        organizationId: draft.organizationId,
        restaurantId: draft.restaurantId || undefined,
      })
      .subscribe({
        next: () => this.savedScopeUserIds.update((ids) => new Set(ids).add(user.id)),
      });
  }

  private clearSavedScope(userId: string): void {
    this.savedScopeUserIds.update((ids) => {
      if (!ids.has(userId)) return ids;
      const next = new Set(ids);
      next.delete(userId);
      return next;
    });
  }

  private loadUsers(): void {
    this.api.listUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
