import { fireEvent, render, screen } from '@testing-library/angular';
import { of } from 'rxjs';

import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { KEY_VALUE_STORAGE, MemoryKeyValueStorage } from '../../../../shared/utils/storage/key-value-storage';
import type { User } from '../../models/user.model';
import { IdentityApiService } from '../../api/identity-api.service';
import { RestaurantPosApiService } from '../../../restaurant-pos/api/restaurant-pos-api.service';
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

function makeApiMock(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    listUsers: vi.fn(() => of([makeUser()])),
    getAuthPublicConfig: vi.fn(() => of({ demoLoginEnabled: true, demoRoles: [] })),
    setUserAccountType: vi.fn(() => of(makeUser({ accountType: 'demo' }))),
    setUserEnabled: vi.fn(() => of(makeUser({ enabled: false }))),
    listOrganizations: vi.fn(() => of([])),
    setUserRestaurantScope: vi.fn(() => of(makeUser())),
    ...overrides,
  };
}

function makeRestaurantPosApiMock(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    listRestaurants: vi.fn(() => of([])),
    ...overrides,
  };
}

describe('UserAdminPage', () => {
  it('allows changing account types for a regular admin session', async () => {
    const storage = new MemoryKeyValueStorage();
    seedSession(storage, 'regular');
    const i18n = provideI18nTesting();
    const api = makeApiMock();

    await render(UserAdminPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        { provide: KEY_VALUE_STORAGE, useValue: storage },
        { provide: IdentityApiService, useValue: api },
        { provide: RestaurantPosApiService, useValue: makeRestaurantPosApiMock() },
      ],
    });

    expect(screen.queryByText('userAdmin.demoRestriction.title')).toBeNull();
    const select = screen.getByLabelText('userAdmin.accountTypeFor') as HTMLSelectElement;
    expect(select.disabled).toBe(false);

    fireEvent.change(select, { target: { value: 'demo' } });

    expect(api.setUserAccountType).toHaveBeenCalledWith('user-1', 'demo');
  });

  it('blocks account type changes and shows a banner for a demo admin session', async () => {
    const storage = new MemoryKeyValueStorage();
    seedSession(storage, 'demo');
    const i18n = provideI18nTesting();
    const api = makeApiMock();

    await render(UserAdminPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        { provide: KEY_VALUE_STORAGE, useValue: storage },
        { provide: IdentityApiService, useValue: api },
        { provide: RestaurantPosApiService, useValue: makeRestaurantPosApiMock() },
      ],
    });

    expect(screen.getByText('userAdmin.demoRestriction.title')).toBeTruthy();
    const select = screen.getByLabelText('userAdmin.accountTypeFor') as HTMLSelectElement;
    expect(select.disabled).toBe(true);

    fireEvent.change(select, { target: { value: 'demo' } });

    expect(api.setUserAccountType).not.toHaveBeenCalled();
  });

  it('blocks scope assignment controls for a demo admin session', async () => {
    const storage = new MemoryKeyValueStorage();
    seedSession(storage, 'demo');
    const i18n = provideI18nTesting();
    const api = makeApiMock({
      listOrganizations: vi.fn(() => of([{ id: 'org-1', name: 'Organización Uno' }])),
    });

    await render(UserAdminPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        { provide: KEY_VALUE_STORAGE, useValue: storage },
        { provide: IdentityApiService, useValue: api },
        { provide: RestaurantPosApiService, useValue: makeRestaurantPosApiMock() },
      ],
    });

    const organizationSelect = screen.getByLabelText('userAdmin.scopeOrganizationFor') as HTMLSelectElement;
    const restaurantSelect = screen.getByLabelText('userAdmin.scopeRestaurantFor') as HTMLSelectElement;
    const saveButton = screen.getByLabelText('userAdmin.scopeSaveFor') as HTMLButtonElement;

    expect(organizationSelect.disabled).toBe(true);
    expect(restaurantSelect.disabled).toBe(true);
    expect(saveButton.disabled).toBe(true);
  });

  it('filters the restaurant options by the selected organization and saves the scope', async () => {
    const storage = new MemoryKeyValueStorage();
    seedSession(storage, 'regular');
    const i18n = provideI18nTesting();
    const api = makeApiMock({
      listOrganizations: vi.fn(() =>
        of([
          { id: 'org-1', name: 'Organización Uno' },
          { id: 'org-2', name: 'Organización Dos' },
        ]),
      ),
    });
    const restaurantPosApi = makeRestaurantPosApiMock({
      listRestaurants: vi.fn(() =>
        of([
          { id: 'rest-1', organizationId: 'org-1', name: 'Centro', displayName: 'Centro', timezone: 'Europe/Madrid', currency: 'EUR', isActive: true },
          { id: 'rest-2', organizationId: 'org-2', name: 'Norte', displayName: 'Norte', timezone: 'Europe/Madrid', currency: 'EUR', isActive: true },
        ]),
      ),
    });

    await render(UserAdminPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        { provide: KEY_VALUE_STORAGE, useValue: storage },
        { provide: IdentityApiService, useValue: api },
        { provide: RestaurantPosApiService, useValue: restaurantPosApi },
      ],
    });

    const organizationSelect = screen.getByLabelText('userAdmin.scopeOrganizationFor') as HTMLSelectElement;
    fireEvent.change(organizationSelect, { target: { value: 'org-1' } });

    const restaurantSelect = screen.getByLabelText('userAdmin.scopeRestaurantFor') as HTMLSelectElement;
    const optionValues = Array.from(restaurantSelect.options).map((option) => option.value).filter(Boolean);
    expect(optionValues).toEqual(['rest-1']);

    fireEvent.change(restaurantSelect, { target: { value: 'rest-1' } });

    const saveButton = screen.getByLabelText('userAdmin.scopeSaveFor');
    fireEvent.click(saveButton);

    expect(api.setUserRestaurantScope).toHaveBeenCalledWith('user-1', {
      organizationId: 'org-1',
      restaurantId: 'rest-1',
    });
    expect(await screen.findByText('userAdmin.scopeSaved')).toBeTruthy();
  });

  it('disables a user after confirmation for a regular admin session', async () => {
    const storage = new MemoryKeyValueStorage();
    seedSession(storage, 'regular');
    const i18n = provideI18nTesting();
    const api = makeApiMock();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    await render(UserAdminPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        { provide: KEY_VALUE_STORAGE, useValue: storage },
        { provide: IdentityApiService, useValue: api },
        { provide: RestaurantPosApiService, useValue: makeRestaurantPosApiMock() },
      ],
    });

    const toggle = screen.getByLabelText('userAdmin.enabledFor') as HTMLInputElement;
    expect(toggle.disabled).toBe(false);

    fireEvent.click(toggle);

    expect(window.confirm).toHaveBeenCalled();
    expect(api.setUserEnabled).toHaveBeenCalledWith('user-1', false);
  });

  it('does not disable a user when the confirmation is dismissed', async () => {
    const storage = new MemoryKeyValueStorage();
    seedSession(storage, 'regular');
    const i18n = provideI18nTesting();
    const api = makeApiMock();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    await render(UserAdminPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        { provide: KEY_VALUE_STORAGE, useValue: storage },
        { provide: IdentityApiService, useValue: api },
        { provide: RestaurantPosApiService, useValue: makeRestaurantPosApiMock() },
      ],
    });

    const toggle = screen.getByLabelText('userAdmin.enabledFor') as HTMLInputElement;
    fireEvent.click(toggle);

    expect(api.setUserEnabled).not.toHaveBeenCalled();
  });

  it('blocks disabling users for a demo admin session', async () => {
    const storage = new MemoryKeyValueStorage();
    seedSession(storage, 'demo');
    const i18n = provideI18nTesting();
    const api = makeApiMock();

    await render(UserAdminPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        { provide: KEY_VALUE_STORAGE, useValue: storage },
        { provide: IdentityApiService, useValue: api },
        { provide: RestaurantPosApiService, useValue: makeRestaurantPosApiMock() },
      ],
    });

    const toggle = screen.getByLabelText('userAdmin.enabledFor') as HTMLInputElement;
    expect(toggle.disabled).toBe(true);
  });
});
