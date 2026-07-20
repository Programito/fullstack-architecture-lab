import { signal } from '@angular/core';
import { fireEvent, render, screen, within } from '@testing-library/angular';
import { NEVER, of } from 'rxjs';
import { vi } from 'vitest';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import type { RestaurantSummaryDto, ServiceFloorDto, ServicePointOrderDto } from '../../api/restaurant-pos-api.models';
import { mapServiceFloor, mapServicePointOrder } from '../../api/restaurant-pos-api.mappers';
import { RestaurantPosApiService } from '../../api/restaurant-pos-api.service';
import { RestaurantContextStore } from '../../state/restaurant-context.store';
import {
  DEFAULT_GRID_COLUMNS,
  DEFAULT_GRID_ROWS,
  MOCK_FLOOR_ELEMENTS,
  MOCK_RESTAURANT_TABLES,
} from '../../state/restaurant-pos.mock-data';
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
  }) => {
    const result = await render(RestaurantPosKitchenPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        { provide: RestaurantPosApiService, useValue: options?.api ?? idleApiMock() },
        { provide: RestaurantContextStore, useValue: options?.restaurantContext ?? nullContextMock() },
      ],
    });
    const store = result.fixture.debugElement.injector.get(RestaurantPosStore);

    store.hydrateLayout({
      floorId: 'floor-main',
      floorName: 'Sala principal',
      rows: DEFAULT_GRID_ROWS,
      columns: DEFAULT_GRID_COLUMNS,
      floorElements: MOCK_FLOOR_ELEMENTS,
      restaurantTables: MOCK_RESTAURANT_TABLES,
    });
    result.fixture.detectChanges();

    return result;
  };

  const sendTableOrderToKitchen = (store: RestaurantPosStore) => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');
    store.addProductToSelectedTable('product-2');
    store.updateSelectedOrderLineNote('product-2', 'Sin salsa');
    store.sendSelectedOrderToKitchen();
  };

  const getPreparationColumn = (name: string): HTMLElement =>
    screen.getByRole('heading', { name }).closest('section')!;

  const getLineArticle = (name: string): HTMLElement =>
    screen.getByRole('heading', { name }).closest('article')!;

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

    expect(within(getPreparationColumn('Pendiente')).getByRole('heading', { name: 'Hamburguesa craft' })).toBeTruthy();
    expect(screen.getByText(/Sin salsa/)).toBeTruthy();

    fireEvent.click(within(getLineArticle('Hamburguesa craft')).getByRole('button', { name: 'Preparándose' }));
    fixture.detectChanges();

    expect(store.ordersByTable()['table-1'].lines[0].status).toBe('preparing');
    expect(within(getPreparationColumn('Preparándose')).getByRole('heading', { name: 'Hamburguesa craft' })).toBeTruthy();

    fireEvent.click(within(getLineArticle('Hamburguesa craft')).getByRole('button', { name: 'Preparado' }));
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como preparado' }));
    fixture.detectChanges();

    expect(store.ordersByTable()['table-1'].lines[0].status).toBe('ready');
    expect(within(getPreparationColumn('Preparado')).getByRole('heading', { name: 'Hamburguesa craft' })).toBeTruthy();
  });

  it('can mark a preparing line directly as served from the ready dialog', async () => {
    const { fixture } = await renderKitchenPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    sendTableOrderToKitchen(store);
    fixture.detectChanges();

    fireEvent.click(within(getLineArticle('Hamburguesa craft')).getByRole('button', { name: 'Preparándose' }));
    fixture.detectChanges();

    fireEvent.click(within(getLineArticle('Hamburguesa craft')).getByRole('button', { name: 'Preparado' }));
    fixture.detectChanges();

    expect(screen.getByRole('heading', { name: 'Finalizar preparación' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Marcar como servido' }));
    fixture.detectChanges();

    expect(store.ordersByTable()['table-1'].lines[0].status).toBe('served');
    expect(screen.getByRole('button', { name: /servido/i })).toBeTruthy();
  });

  it('persists the direct served shortcut from preparing to the backend', async () => {
    const updateRestaurantOrderLineStatus = vi.fn(() => of({
      order: {
        id: 'order-1',
        restaurantId: 'restaurant-1',
        tableId: 'table-1',
        status: 'open' as const,
        currency: 'EUR',
        guestCount: 2,
        subtotalCents: 320,
        taxCents: 0,
        discountTotalCents: 0,
        totalCents: 320,
        paidCents: 0,
        balanceCents: 320,
        openedAt: '',
        updatedAt: '',
        closedAt: null,
      },
      lines: [],
      payments: [],
    }));
    const { fixture } = await renderKitchenPage({
      api: { ...idleApiMock(), updateRestaurantOrderLineStatus } as Partial<RestaurantPosApiService>,
      restaurantContext: {
        activeRestaurant: signal<RestaurantSummaryDto | null>({
          id: 'restaurant-1',
          organizationId: 'org-1',
          name: 'mesaflow',
          displayName: null,
          timezone: 'Europe/Madrid',
          currency: 'EUR',
          isActive: true,
        }).asReadonly(),
      },
    });
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    store.hydrateServicePointOrder('table-1', mapServicePointOrder({
      order: { id: 'order-1', tableId: 'table-1', status: 'sent_to_kitchen', openedAt: '', updatedAt: '', subtotalCents: 320, taxCents: 0, totalCents: 320, currency: 'EUR' },
      lines: [{ id: 'line-coke', productName: 'Coca-Cola', productType: 'simple', preparationRoute: 'bar', quantity: 1, unitPriceCents: 320, subtotalCents: 320, status: 'sent_to_kitchen', course: 'drinks', kitchenNote: null, updatedAt: '', modifiers: [], comboSlots: [] }],
    }));
    fixture.detectChanges();

    fireEvent.click(within(getLineArticle('Coca-Cola')).getByRole('button', { name: /Prepar/ }));
    fixture.detectChanges();
    fireEvent.click(within(getLineArticle('Coca-Cola')).getByRole('button', { name: 'Preparado' }));
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como servido' }));
    fixture.detectChanges();

    expect(updateRestaurantOrderLineStatus).toHaveBeenNthCalledWith(1, 'restaurant-1', 'order-1', 'line-coke', 'preparing');
    expect(updateRestaurantOrderLineStatus).toHaveBeenNthCalledWith(2, 'restaurant-1', 'order-1', 'line-coke', 'served');
  });

  it('shows kitchen lines when the store is hydrated with backend data', async () => {
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
      lines: [{ id: 'line-api-1', productName: 'Arroz con bogavante', productType: 'simple', preparationRoute: 'kitchen', quantity: 2, unitPriceCents: 2400, subtotalCents: 4800, status: 'sent_to_kitchen', course: 'mains', kitchenNote: null, updatedAt: '', modifiers: [], comboSlots: [] }],
    };

    const { fixture } = await renderKitchenPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    store.hydrateServiceFloor(mapServiceFloor(mockServiceFloor));
    store.hydrateServicePointOrder('table-api-1', mapServicePointOrder(mockOrder));
    fixture.detectChanges();

    expect(within(getPreparationColumn('Pendiente')).getByRole('heading', { name: 'Arroz con bogavante' })).toBeTruthy();
  });
});
