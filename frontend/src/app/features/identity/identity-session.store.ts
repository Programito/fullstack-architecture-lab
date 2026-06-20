import { computed, inject, Injectable, signal } from '@angular/core';

import { KEY_VALUE_STORAGE } from '../../shared/utils/storage/key-value-storage';
import type { PermissionName } from './models/permission.model';

const STORAGE_KEY = 'identity.session';

export type IdentitySessionSnapshot = {
  userId: string | null;
  roles: string[];
  permissions: PermissionName[];
  accessToken: string | null;
};

const EMPTY_SESSION: IdentitySessionSnapshot = {
  userId: null,
  roles: [],
  permissions: [],
  accessToken: null,
};

@Injectable({
  providedIn: 'root',
})
export class IdentitySessionStore {
  private readonly storage = inject(KEY_VALUE_STORAGE);
  private readonly sessionState = signal<IdentitySessionSnapshot>(this.readFromStorage());

  readonly session = this.sessionState.asReadonly();
  readonly roles = computed(() => this.sessionState().roles);
  readonly permissions = computed(() => this.sessionState().permissions);
  readonly isAuthenticated = computed(() => Boolean(this.sessionState().userId));

  hasPermission(permission: PermissionName): boolean {
    return this.permissions().includes(permission);
  }

  setSession(session: IdentitySessionSnapshot): void {
    const normalized: IdentitySessionSnapshot = {
      userId: session.userId,
      roles: [...new Set(session.roles)],
      permissions: [...new Set(session.permissions)],
      accessToken: session.accessToken,
    };
    this.sessionState.set(normalized);
    this.storage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }

  clear(): void {
    this.sessionState.set(EMPTY_SESSION);
    this.storage.removeItem(STORAGE_KEY);
  }

  private readFromStorage(): IdentitySessionSnapshot {
    const rawValue = this.storage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return EMPTY_SESSION;
    }

    try {
      const parsed = JSON.parse(rawValue) as Partial<IdentitySessionSnapshot>;
      return {
        userId: typeof parsed.userId === 'string' ? parsed.userId : null,
        roles: Array.isArray(parsed.roles) ? [...new Set(parsed.roles.filter(isString))] : [],
        permissions: Array.isArray(parsed.permissions)
          ? [...new Set(parsed.permissions.filter(isPermissionName))]
          : [],
        accessToken: typeof parsed.accessToken === 'string' ? parsed.accessToken : null,
      };
    } catch {
      this.storage.removeItem(STORAGE_KEY);
      return EMPTY_SESSION;
    }
  }
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isPermissionName(value: unknown): value is PermissionName {
  return value === 'service' || value === 'menu' || value === 'kitchen' || value === 'layout';
}
