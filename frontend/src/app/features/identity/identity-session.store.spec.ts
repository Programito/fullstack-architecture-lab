import { TestBed } from '@angular/core/testing';

import { KEY_VALUE_STORAGE, MemoryKeyValueStorage } from '../../shared/utils/storage/key-value-storage';
import { IdentitySessionStore } from './identity-session.store';
import type { AuthResponseDto } from './api/identity-api.models';

describe('IdentitySessionStore', () => {
  const setup = () => {
    const storage = new MemoryKeyValueStorage();
    TestBed.configureTestingModule({
      providers: [{ provide: KEY_VALUE_STORAGE, useValue: storage }],
    });

    return {
      storage,
      store: TestBed.inject(IdentitySessionStore),
    };
  };

  it('hydrates the session from storage and exposes permissions', () => {
    const storage = new MemoryKeyValueStorage();
    storage.setItem(
      'identity.session',
      JSON.stringify({
        userId: 'user-1',
        roles: ['waiter'],
        permissions: ['service', 'layout'],
        accessToken: 'token',
        scopes: { organizations: [], restaurants: ['rest-1'] },
      }),
    );

    TestBed.configureTestingModule({
      providers: [{ provide: KEY_VALUE_STORAGE, useValue: storage }],
    });

    const store = TestBed.inject(IdentitySessionStore);

    expect(store.isAuthenticated()).toBe(true);
    expect(store.permissions()).toEqual(['service', 'layout']);
    expect(store.hasPermission('service')).toBe(true);
    expect(store.hasPermission('menu')).toBe(false);
    expect(store.scopes()).toEqual({ organizations: [], restaurants: ['rest-1'] });
  });

  it('normalizes and persists a session snapshot', () => {
    const { store, storage } = setup();

    store.setSession({
      userId: 'user-1',
      roles: ['waiter', 'waiter'],
      permissions: ['layout', 'service', 'layout'],
      accessToken: 'token',
      scopes: { organizations: ['org-1'], restaurants: [] },
    });

    expect(store.roles()).toEqual(['waiter']);
    expect(store.permissions()).toEqual(['layout', 'service']);
    expect(store.scopes()).toEqual({ organizations: ['org-1'], restaurants: [] });
    expect(storage.getItem('identity.session')).toContain('"userId":"user-1"');
  });

  it('clears the session state and storage', () => {
    const { store, storage } = setup();

    store.setSession({
      userId: 'user-1',
      roles: ['manager'],
      permissions: ['service'],
      accessToken: 'token',
      scopes: { organizations: [], restaurants: ['rest-1'] },
    });
    store.clear();

    expect(store.session()).toEqual({
      userId: null,
      roles: [],
      permissions: [],
      accessToken: null,
      scopes: { organizations: [], restaurants: [] },
    });
    expect(storage.getItem('identity.session')).toBeNull();
  });

  it('stores scopes from setAuthResponse and exposes them', () => {
    const { store } = setup();

    const authResponse: AuthResponseDto = {
      accessToken: 'tok-123',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: {
        id: 'user-2',
        email: 'w@test.com',
        firstName: 'Waiter',
        lastName: 'Demo',
        enabled: true,
        accountType: 'regular',
        roles: ['waiter'],
        createdAt: '',
        updatedAt: '',
      },
      roles: ['waiter'],
      permissions: ['service'],
      scopes: { organizations: [], restaurants: ['rest-abc'] },
    };

    store.setAuthResponse(authResponse);

    expect(store.scopes()).toEqual({ organizations: [], restaurants: ['rest-abc'] });
    expect(store.isAuthenticated()).toBe(true);
  });

  it('falls back to empty scopes when reading old storage without scopes field', () => {
    const storage = new MemoryKeyValueStorage();
    storage.setItem(
      'identity.session',
      JSON.stringify({
        userId: 'user-1',
        roles: ['waiter'],
        permissions: ['service'],
        accessToken: 'token',
      }),
    );

    TestBed.configureTestingModule({
      providers: [{ provide: KEY_VALUE_STORAGE, useValue: storage }],
    });

    const store = TestBed.inject(IdentitySessionStore);

    expect(store.scopes()).toEqual({ organizations: [], restaurants: [] });
    expect(store.isAuthenticated()).toBe(true);
  });
});
