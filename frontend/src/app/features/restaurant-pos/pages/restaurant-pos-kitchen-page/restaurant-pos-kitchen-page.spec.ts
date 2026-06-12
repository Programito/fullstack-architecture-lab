import { fireEvent, render, screen, within } from '@testing-library/angular';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { RestaurantPosStore } from '../../state/restaurant-pos.store';
import { RestaurantPosKitchenPage } from './restaurant-pos-kitchen-page';

describe('RestaurantPosKitchenPage', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const renderKitchenPage = async () => {
    const i18n = provideI18nTesting();

    return render(RestaurantPosKitchenPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
    });
  };

  const sendTableOrderToKitchen = (store: RestaurantPosStore) => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');
    store.addProductToSelectedTable('product-2');
    store.updateSelectedOrderLineNote('product-2', 'Sin salsa');
    store.sendSelectedOrderToKitchen();
  };

  const getColumn = (name: string): HTMLElement => screen.getByRole('heading', { name }).closest('section')!;

  it('renders an empty kitchen queue', async () => {
    await renderKitchenPage();

    expect(screen.getByRole('heading', { name: 'Cocina' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Sin comandas en cocina' })).toBeTruthy();
    expect(screen.getAllByText('0').length).toBe(3);
  });

  it('moves kitchen lines across board columns and back one phase', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-12T10:00:00.000Z'));
    const { fixture } = await renderKitchenPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    sendTableOrderToKitchen(store);
    vi.setSystemTime(new Date('2026-06-12T10:04:00.000Z'));
    fixture.detectChanges();

    expect(screen.getByRole('heading', { name: 'En cola' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Preparándose' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Preparado para coger' })).toBeTruthy();
    expect(within(getColumn('En cola')).getByRole('heading', { name: 'M1' })).toBeTruthy();
    expect(within(getColumn('En cola')).getByText('1 x Craft Burger')).toBeTruthy();
    expect(within(getColumn('En cola')).getByText('1 x Iberian Ham Croquettes')).toBeTruthy();
    expect(screen.getAllByText(/Espera: 4 min/).length).toBe(2);
    expect(screen.getByText('Sin salsa')).toBeTruthy();

    fireEvent.click(within(screen.getByText('1 x Craft Burger').closest('li')!).getByRole('button', { name: 'Empezar Craft Burger' }));
    fixture.detectChanges();

    expect(store.ordersByTable()['table-1'].lines[0].status).toBe('preparing');
    expect(within(getColumn('Preparándose')).getByText('1 x Craft Burger')).toBeTruthy();
    expect(within(getColumn('En cola')).getByText('1 x Iberian Ham Croquettes')).toBeTruthy();
    expect(screen.getAllByRole('heading', { name: 'M1' }).length).toBe(2);

    fireEvent.click(within(screen.getByText('1 x Craft Burger').closest('li')!).getByRole('button', { name: 'Marcar Craft Burger como preparado' }));
    fixture.detectChanges();

    expect(store.ordersByTable()['table-1'].lines[0].status).toBe('ready');
    expect(within(getColumn('Preparado para coger')).getByText('1 x Craft Burger')).toBeTruthy();

    fireEvent.click(within(screen.getByText('1 x Craft Burger').closest('li')!).getByRole('button', { name: 'Volver Craft Burger a la fase anterior' }));
    fixture.detectChanges();

    expect(store.ordersByTable()['table-1'].lines[0].status).toBe('preparing');
    expect(within(getColumn('Preparándose')).getByText('1 x Craft Burger')).toBeTruthy();
    expect(within(getColumn('En cola')).getByText('1 x Iberian Ham Croquettes')).toBeTruthy();
  });

  it('archives ready lines from kitchen without serving the table order', async () => {
    const { fixture } = await renderKitchenPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    sendTableOrderToKitchen(store);
    store.markOrderLineReady('table-1', 'product-1');
    fixture.detectChanges();

    expect(within(getColumn('Preparado para coger')).getByText('1 x Craft Burger')).toBeTruthy();

    fireEvent.click(within(screen.getByText('1 x Craft Burger').closest('li')!).getByRole('button', { name: 'Archivar Craft Burger de cocina' }));
    fixture.detectChanges();

    const archivedLine = store.ordersByTable()['table-1'].lines.find((line) => line.productId === 'product-1');

    expect(archivedLine).toEqual(expect.objectContaining({ status: 'picked_up' }));
    expect(archivedLine).not.toHaveProperty('servedAt');
    expect(within(getColumn('Preparado para coger')).queryByText('1 x Craft Burger')).toBeNull();
    expect(within(getColumn('En cola')).getByText('1 x Iberian Ham Croquettes')).toBeTruthy();
  });
});
