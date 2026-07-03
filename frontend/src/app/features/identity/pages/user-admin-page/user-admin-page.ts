import { Component, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { Alert } from '../../../../shared/ui/alert/alert';
import { Card } from '../../../../shared/ui/card/card';
import type { AccountType } from '../../api/identity-api.models';
import { IdentityApiService } from '../../api/identity-api.service';
import { IdentitySessionStore } from '../../identity-session.store';
import type { User } from '../../models/user.model';

@Component({
  selector: 'app-user-admin-page',
  imports: [Alert, Card, TranslocoPipe],
  templateUrl: './user-admin-page.html',
  styleUrl: './user-admin-page.css',
})
export class UserAdminPage {
  private readonly api = inject(IdentityApiService);
  private readonly transloco = inject(TranslocoService);
  private readonly session = inject(IdentitySessionStore);

  protected readonly users = signal<User[]>([]);
  protected readonly loading = signal(true);
  protected readonly demoLoginEnabled = signal(false);
  protected readonly accountTypes: readonly AccountType[] = ['regular', 'demo', 'system', 'test'];
  // Demo admin accounts (public showcase logins) must not be able to change
  // other users' account types, to keep the shared demo environment intact.
  protected readonly accountTypeChangesBlocked = this.session.isDemoAccount;

  constructor() {
    this.loadUsers();
    this.api.getAuthPublicConfig().subscribe({
      next: (config) => this.demoLoginEnabled.set(config.demoLoginEnabled),
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
