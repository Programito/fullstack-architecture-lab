import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { KEY_VALUE_STORAGE, MemoryKeyValueStorage } from '../../shared/utils/storage/key-value-storage';
import type { AuthResponseDto } from './api/identity-api.models';
import { IdentityApiService } from './api/identity-api.service';
import { IdentitySessionStore } from './identity-session.store';
import { refreshIdentitySessionOnStartup } from './identity-session-refresh';

describe('refreshIdentitySessionOnStartup', () => {
  const makeAuthResponse = (permissions: AuthResponseDto['permissions']): AuthResponseDto => ({
    accessToken: 'new-token',
    tokenType: 'Bearer',
    expiresIn: 900,
    user: {
      id: 'user-1',
      email: 'worker@test.local',
      firstName: 'Worker',
      lastName: 'Demo',
      enabled: true,
      accountType: 'regular',
      roles: ['waiter'],
      createdAt: '',
      updatedAt: '',
    },
    roles: ['waiter'],
    permissions,
    scopes: { organizations: [], restaurants: ['rest-1'] },
  });

  const setup = (opts?: {
    session?: Record<string, unknown>;
    refresh?: () => Observable<AuthResponseDto>;
  }) => {
    const storage = new MemoryKeyValueStorage();
    if (opts?.session) {
      storage.setItem('identity.session', JSON.stringify(opts.session));
    }

    const refresh =
      opts?.refresh ??
      vi.fn(() => of(makeAuthResponse(['service', 'time_tracking', 'layout'])));
    const navigate = vi.fn(() => Promise.resolve(true));

    TestBed.configureTestingModule({
      providers: [
        { provide: KEY_VALUE_STORAGE, useValue: storage },
        { provide: IdentityApiService, useValue: { refresh } },
        { provide: Router, useValue: { navigate } },
      ],
    });

    return {
      refresh,
      navigate,
      storage,
      store: TestBed.inject(IdentitySessionStore),
    };
  };

  it('refreshes an existing session on startup and updates permissions', () => {
    const { refresh, store } = setup({
      session: {
        userId: 'user-1',
        roles: ['waiter'],
        permissions: ['service', 'layout'],
        accessToken: 'old-token',
        scopes: { organizations: [], restaurants: ['rest-1'] },
        accountType: 'regular',
      },
    });

    TestBed.runInInjectionContext(() => refreshIdentitySessionOnStartup());

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(store.permissions()).toEqual(['service', 'time_tracking', 'layout']);
  });

  it('does not refresh when there is no authenticated session', () => {
    const { refresh } = setup();

    TestBed.runInInjectionContext(() => refreshIdentitySessionOnStartup());

    expect(refresh).not.toHaveBeenCalled();
  });

  it('clears the session and redirects to login when refresh fails', () => {
    const refresh = vi.fn(() => throwError(() => new Error('refresh failed')));
    const { navigate, storage, store } = setup({
      session: {
        userId: 'user-1',
        roles: ['waiter'],
        permissions: ['service'],
        accessToken: 'old-token',
        scopes: { organizations: [], restaurants: ['rest-1'] },
        accountType: 'regular',
      },
      refresh,
    });

    TestBed.runInInjectionContext(() => refreshIdentitySessionOnStartup());

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(store.isAuthenticated()).toBe(false);
    expect(storage.getItem('identity.session')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
