import { fireEvent, render, screen } from '@testing-library/angular';
import { of } from 'rxjs';

import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { KEY_VALUE_STORAGE, MemoryKeyValueStorage } from '../../../../shared/utils/storage/key-value-storage';
import type { User } from '../../models/user.model';
import { IdentityApiService } from '../../api/identity-api.service';
import { UserAdminPage } from './user-admin-page';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'waiter@mesaflow.demo',
    firstName: 'Waiter',
    lastName: 'Demo',
    enabled: true,
    accountType: 'regular',
    roleIds: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function seedSession(storage: MemoryKeyValueStorage, accountType: 'regular' | 'demo'): void {
  storage.setItem(
    'identity.session',
    JSON.stringify({
      userId: 'admin-1',
      roles: ['admin'],
      permissions: [],
      accessToken: 'token',
      scopes: { organizations: [], restaurants: [] },
      accountType,
    }),
  );
}

describe('UserAdminPage', () => {
  it('allows changing account types for a regular admin session', async () => {
    const storage = new MemoryKeyValueStorage();
    seedSession(storage, 'regular');
    const i18n = provideI18nTesting();
    const setUserAccountType = vi.fn(() => of(makeUser({ accountType: 'demo' })));
    const api = {
      listUsers: vi.fn(() => of([makeUser()])),
      getAuthPublicConfig: vi.fn(() => of({ demoLoginEnabled: true, demoRoles: [] })),
      setUserAccountType,
    };

    await render(UserAdminPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        { provide: KEY_VALUE_STORAGE, useValue: storage },
        { provide: IdentityApiService, useValue: api },
      ],
    });

    expect(screen.queryByText('userAdmin.demoRestriction.title')).toBeNull();
    const select = screen.getByLabelText('userAdmin.accountTypeFor') as HTMLSelectElement;
    expect(select.disabled).toBe(false);

    fireEvent.change(select, { target: { value: 'demo' } });

    expect(setUserAccountType).toHaveBeenCalledWith('user-1', 'demo');
  });

  it('blocks account type changes and shows a banner for a demo admin session', async () => {
    const storage = new MemoryKeyValueStorage();
    seedSession(storage, 'demo');
    const i18n = provideI18nTesting();
    const setUserAccountType = vi.fn(() => of(makeUser({ accountType: 'demo' })));
    const api = {
      listUsers: vi.fn(() => of([makeUser()])),
      getAuthPublicConfig: vi.fn(() => of({ demoLoginEnabled: true, demoRoles: [] })),
      setUserAccountType,
    };

    await render(UserAdminPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        { provide: KEY_VALUE_STORAGE, useValue: storage },
        { provide: IdentityApiService, useValue: api },
      ],
    });

    expect(screen.getByText('userAdmin.demoRestriction.title')).toBeTruthy();
    const select = screen.getByLabelText('userAdmin.accountTypeFor') as HTMLSelectElement;
    expect(select.disabled).toBe(true);

    fireEvent.change(select, { target: { value: 'demo' } });

    expect(setUserAccountType).not.toHaveBeenCalled();
  });
});
