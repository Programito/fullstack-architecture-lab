import { TestBed } from '@angular/core/testing';

import { KEY_VALUE_STORAGE, MemoryKeyValueStorage } from '../../shared/utils/storage/key-value-storage';
import { IdentitySessionStore } from './identity-session.store';

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
  });

  it('normalizes and persists a session snapshot', () => {
    const { store, storage } = setup();

    store.setSession({
      userId: 'user-1',
      roles: ['waiter', 'waiter'],
      permissions: ['layout', 'service', 'layout'],
      accessToken: 'token',
    });

    expect(store.roles()).toEqual(['waiter']);
    expect(store.permissions()).toEqual(['layout', 'service']);
    expect(storage.getItem('identity.session')).toContain('"userId":"user-1"');
  });

  it('clears the session state and storage', () => {
    const { store, storage } = setup();

    store.setSession({
      userId: 'user-1',
      roles: ['manager'],
      permissions: ['service'],
      accessToken: 'token',
    });
    store.clear();

    expect(store.session()).toEqual({
      userId: null,
      roles: [],
      permissions: [],
      accessToken: null,
    });
    expect(storage.getItem('identity.session')).toBeNull();
  });
});
