import { signal } from '@angular/core';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/angular';
import { NEVER, of } from 'rxjs';
import { vi } from 'vitest';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import type { RestaurantSummaryDto, ServiceFloorDto, ServicePointOrderDto } from '../../api/restaurant-pos-api.models';
import { RestaurantPosApiService } from '../../api/restaurant-pos-api.service';
import { RestaurantContextStore } from '../../state/restaurant-context.store';
import { RestaurantPosStore } from '../../state/restaurant-pos.store';
import { RestaurantPosKitchenPage } from './restaurant-pos-kitchen-page';

const nullContextMock = () => ({
  activeRestaurant: signal<RestaurantSummaryDto | null>(null).asReadonly(),
  load: vi.fn(),
});

const idleApiMock = () => ({
  getRestaurantServiceFloor: vi.fn(() => NEVER),
  getRestaurantServicePointOrder: vi.fn(() => NEVER),
});

describe('RestaurantPosKitchenPage', () => {
  const i18n = provideI18nTesting();

  const renderKitchenPage = async (options?: {
    api?: Partial<RestaurantPosApiService>;
    restaurantContext?: Partial<RestaurantContextStore>;
  }) =>
    render(RestaurantPosKitchenPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        { provide: RestaurantPosApiService, useValue: options?.api ?? idleApiMock() },
        { provide: RestaurantContextStore, useValue: options?.restaurantContext ?? nullContextMock() },
      ],
    });

  const sendTableOrderToKitchen = (store: RestaurantPosStore) => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');
    store.addProductToSelectedTable('product-2');
    store.updateSelectedOrderLineNote('product-2', 'Sin salsa');
    store.sendSelectedOrderToKitchen();
  };

  const getPreparationColumn = (name: string): HTMLElement =>
    screen.getByRole('heading', { name }).closest('section')!;

  it('renders the preparation board with the three new columns', async () => {
    await renderKitchenPage();

    expect(screen.getByRole('heading', { name: 'Cocina' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Preparación' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Pendiente' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Preparándose' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Preparado' })).toBeTruthy();
  });

  it('moves a line from pending to preparing then to ready', async () => {
    const { fixture } = await renderKitchenPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    sendTableOrderToKitchen(store);
    fixture.detectChanges();

    expect(within(getPreparationColumn('Pendiente')).getByText('1x Hamburguesa craft')).toBeTruthy();
    expect(screen.getByText(/Sin salsa/)).toBeTruthy();

    fireEvent.click(within(screen.getByText('1x Hamburguesa craft').closest('article')!).getByRole('button', { name: 'Preparándose' }));
    fixture.detectChanges();

    expect(store.ordersByTable()['table-1'].lines[0].status).toBe('preparing');
    expect(within(getPreparationColumn('Preparándose')).getByText('1x Hamburguesa craft')).toBeTruthy();

    fireEvent.click(within(screen.getByText('1x Hamburguesa craft').closest('article')!).getByRole('button', { name: 'Preparado' }));
    fixture.detectChanges();

    expect(store.ordersByTable()['table-1'].lines[0].status).toBe('ready');
    expect(within(getPreparationColumn('Preparado')).getByText('1x Hamburguesa craft')).toBeTruthy();
  });

  it('shows kitchen lines loaded from the API when a restaurant is active', async () => {
    const mockServiceFloor: ServiceFloorDto = {
      restaurantId: 'restaurant-1',
      floor: { id: 'floor-1', name: 'Sala', rows: 10, columns: 10 },
      elements: [{ id: 'elem-1', type: 'table', label: 'M1', x: 0, y: 0, width: 2, height: 2, tableId: 'table-api-1', shape: 'round' }],
      servicePoints: [
        {
          table: { id: 'table-api-1', tableNumber: 1, name: null, capacity: 2, status: 'occupied', serviceStartedAt: null },
          summary: { lineCount: 1, guestCount: 2, totalCents: 1000, currency: 'EUR', servicePhase: { course: 'mains', status: 'in_progress' } },
        },
      ],
      totals: { servicePointCount: 1, occupiedCount: 1, openOrderCount: 1 },
    };

    const mockOrder: ServicePointOrderDto = {
      order: { id: 'order-api-1', tableId: 'table-api-1', status: 'open', openedAt: '', updatedAt: '', subtotalCents: 1000, taxCents: 0, totalCents: 1000, currency: 'EUR' },
      lines: [{ id: 'line-api-1', productName: 'Arroz con bogavante', quantity: 2, unitPriceCents: 2400, subtotalCents: 4800, status: 'sent_to_kitchen', course: 'mains', kitchenNote: null, updatedAt: '' }],
    };

    const activeRestaurant = signal<RestaurantSummaryDto | null>({
      id: 'restaurant-1', name: 'Test', displayName: null, timezone: 'Europe/Madrid', currency: 'EUR', isActive: true,
    });

    await renderKitchenPage({
      api: {
        getRestaurantServiceFloor: vi.fn((_r: string) => of(mockServiceFloor)),
        getRestaurantServicePointOrder: vi.fn((_r: string, _t: string) => of(mockOrder)),
      } as Partial<RestaurantPosApiService>,
      restaurantContext: { activeRestaurant: activeRestaurant.asReadonly(), load: vi.fn() },
    });

    await waitFor(() => {
      expect(within(getPreparationColumn('Pendiente')).getByText('2x Arroz con bogavante')).toBeTruthy();
    });
  });
});
