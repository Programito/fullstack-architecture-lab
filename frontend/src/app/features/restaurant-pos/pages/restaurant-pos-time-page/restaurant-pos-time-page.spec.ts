import { fireEvent, render, screen, within } from '@testing-library/angular';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { IdentitySessionStore } from '../../../identity/identity-session.store';
import { RestaurantPosApiService } from '../../api/restaurant-pos-api.service';
import { RestaurantContextStore } from '../../state/restaurant-context.store';
import { RestaurantPosTimePage } from './restaurant-pos-time-page';

function createIdentityStore(roles: string[] = ['waiter']) {
  return {
    hasRole: (role: string) => roles.includes(role),
    accountType: () => 'regular',
  } as unknown as IdentitySessionStore;
}

function createRestaurantContextStore() {
  return {
    activeRestaurant: () => ({
      id: 'restaurant-1',
      displayName: 'MesaFlow Centro',
      name: 'MesaFlow Centro',
    }),
  } as unknown as RestaurantContextStore;
}

function createApiMock() {
  return {
    getMyRestaurantTimeEntries: vi.fn(() =>
      of([
        {
          id: 'entry-open',
          userId: 'user-1',
          restaurantId: 'restaurant-1',
          clockInAt: '2026-07-07T08:00:00.000Z',
          clockOutAt: null,
          clockInNote: 'Apertura',
          clockOutNote: null,
          status: 'open',
          createdAt: '2026-07-07T08:00:00.000Z',
          updatedAt: '2026-07-07T08:00:00.000Z',
          user: { id: 'user-1', firstName: 'Laura', lastName: 'Gomez', email: 'laura@example.com' },
        },
        {
          id: 'entry-closed',
          userId: 'user-1',
          restaurantId: 'restaurant-1',
          clockInAt: '2026-07-06T08:00:00.000Z',
          clockOutAt: '2026-07-06T16:00:00.000Z',
          clockInNote: 'Servicio comida',
          clockOutNote: 'Cierre',
          status: 'closed',
          createdAt: '2026-07-06T08:00:00.000Z',
          updatedAt: '2026-07-06T16:00:00.000Z',
          user: { id: 'user-1', firstName: 'Laura', lastName: 'Gomez', email: 'laura@example.com' },
        },
      ]),
    ),
    clockInRestaurantTimeEntry: vi.fn(() => of({})),
    clockOutRestaurantTimeEntry: vi.fn(() => of({})),
    createRestaurantTimeEntryChangeRequest: vi.fn(() => of({ id: 'change-1' })),
    getTeamRestaurantTimeEntries: vi.fn(() =>
      of([
        {
          id: 'entry-team',
          userId: 'user-2',
          restaurantId: 'restaurant-1',
          clockInAt: '2026-07-07T09:00:00.000Z',
          clockOutAt: '2026-07-07T17:00:00.000Z',
          clockInNote: null,
          clockOutNote: null,
          status: 'closed',
          createdAt: '2026-07-07T09:00:00.000Z',
          updatedAt: '2026-07-07T17:00:00.000Z',
          user: { id: 'user-2', firstName: 'Mario', lastName: 'Soler', email: 'mario@example.com' },
        },
      ]),
    ),
    getRestaurantTimeEntryChangeRequests: vi.fn(() =>
      of([
        {
          id: 'change-pending',
          restaurantId: 'restaurant-1',
          status: 'pending',
          reason: 'Entre antes',
          reviewNote: null,
          reviewedAt: null,
          requestedClockInAt: '2026-07-07T08:55:00.000Z',
          requestedClockOutAt: null,
          requestedClockInNote: 'Apertura real',
          requestedClockOutNote: null,
          createdAt: '2026-07-07T17:30:00.000Z',
          updatedAt: '2026-07-07T17:30:00.000Z',
          timeEntry: {
            id: 'entry-team',
            userId: 'user-2',
            restaurantId: 'restaurant-1',
            clockInAt: '2026-07-07T09:00:00.000Z',
            clockOutAt: '2026-07-07T17:00:00.000Z',
            clockInNote: null,
            clockOutNote: null,
            status: 'closed',
            createdAt: '2026-07-07T09:00:00.000Z',
            updatedAt: '2026-07-07T17:00:00.000Z',
            user: { id: 'user-2', firstName: 'Mario', lastName: 'Soler', email: 'mario@example.com' },
          },
          requestedByUser: { id: 'user-2', firstName: 'Mario', lastName: 'Soler', email: 'mario@example.com' },
          reviewedByUser: null,
        },
      ]),
    ),
    reviewRestaurantTimeEntryChangeRequest: vi.fn(() => of({ id: 'change-pending' })),
  } as unknown as RestaurantPosApiService;
}

describe('RestaurantPosTimePage', () => {
  it('shows the clock out action when there is an open entry', async () => {
    const i18n = provideI18nTesting();

    await render(RestaurantPosTimePage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        { provide: RestaurantPosApiService, useValue: createApiMock() },
        { provide: IdentitySessionStore, useValue: createIdentityStore(['waiter']) },
        { provide: RestaurantContextStore, useValue: createRestaurantContextStore() },
      ],
    });

    expect(screen.getByRole('button', { name: 'restaurantPos.time.clockCard.clockOut' })).toBeTruthy();
  });

  it('renders the personal history and opens the change request form', async () => {
    const i18n = provideI18nTesting();

    await render(RestaurantPosTimePage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        { provide: RestaurantPosApiService, useValue: createApiMock() },
        { provide: IdentitySessionStore, useValue: createIdentityStore(['waiter']) },
        { provide: RestaurantContextStore, useValue: createRestaurantContextStore() },
      ],
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'restaurantPos.time.history.requestChange' })[0]!);

    expect(screen.getByLabelText('restaurantPos.time.changeRequest.reason')).toBeTruthy();
  });

  it('shows the team review area only for manager/admin', async () => {
    const i18n = provideI18nTesting();

    await render(RestaurantPosTimePage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        { provide: RestaurantPosApiService, useValue: createApiMock() },
        { provide: IdentitySessionStore, useValue: createIdentityStore(['manager']) },
        { provide: RestaurantContextStore, useValue: createRestaurantContextStore() },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'restaurantPos.time.tabs.team' }));

    expect(screen.getAllByText('Mario Soler').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'restaurantPos.time.requests.approve' })).toBeTruthy();
  });

  it('approves a pending change request and refreshes the team data', async () => {
    const i18n = provideI18nTesting();
    const api = createApiMock();

    await render(RestaurantPosTimePage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        { provide: RestaurantPosApiService, useValue: api },
        { provide: IdentitySessionStore, useValue: createIdentityStore(['admin']) },
        { provide: RestaurantContextStore, useValue: createRestaurantContextStore() },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'restaurantPos.time.tabs.team' }));
    const requestCard = screen.getByText('Entre antes').closest('article');
    fireEvent.click(within(requestCard!).getByRole('button', { name: 'restaurantPos.time.requests.approve' }));

    expect(api.reviewRestaurantTimeEntryChangeRequest).toHaveBeenCalledWith('restaurant-1', 'change-pending', {
      status: 'approved',
      reviewNote: null,
    });
  });
});
