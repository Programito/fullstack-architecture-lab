import { fireEvent, render, screen, within } from '@testing-library/angular';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { RestaurantPosStore } from '../../state/restaurant-pos.store';
import { RestaurantPosKitchenPage } from './restaurant-pos-kitchen-page';

describe('RestaurantPosKitchenPage', () => {
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

  const getPreparationColumn = (name: string): HTMLElement =>
    screen.getByRole('heading', { name }).closest('section')!;

  it('renders the preparation board on the kitchen route', async () => {
    await renderKitchenPage();

    expect(screen.getByRole('heading', { name: 'Cocina' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Preparación' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'En cocina' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Preparado' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Servido' })).toBeTruthy();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(3);
  });

  it('moves preparation lines from kitchen to ready and served', async () => {
    const { fixture } = await renderKitchenPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    sendTableOrderToKitchen(store);
    fixture.detectChanges();

    expect(within(getPreparationColumn('En cocina')).getByText('1x Hamburguesa craft')).toBeTruthy();
    expect(within(getPreparationColumn('En cocina')).getByText('1x Croquetas de jamón ibérico')).toBeTruthy();
    expect(screen.getByText(/Sin salsa/)).toBeTruthy();

    fireEvent.click(within(screen.getByText('1x Hamburguesa craft').closest('article')!).getByRole('button', { name: 'Marcar preparado' }));
    fixture.detectChanges();

    expect(store.ordersByTable()['table-1'].lines[0].status).toBe('ready');
    expect(within(getPreparationColumn('Preparado')).getByText('1x Hamburguesa craft')).toBeTruthy();

    fireEvent.click(within(screen.getByText('1x Hamburguesa craft').closest('article')!).getByRole('button', { name: 'Marcar servido' }));
    fixture.detectChanges();

    expect(store.ordersByTable()['table-1'].lines[0].status).toBe('served');
    expect(within(getPreparationColumn('Servido')).getByText('1x Hamburguesa craft')).toBeTruthy();
  });

  it('shows a warning when serving a kitchen line before it is ready', async () => {
    const { fixture } = await renderKitchenPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    sendTableOrderToKitchen(store);
    fixture.detectChanges();

    fireEvent.click(within(screen.getByText('1x Hamburguesa craft').closest('article')!).getByRole('button', { name: 'Marcar servido' }));
    fixture.detectChanges();

    expect(store.ordersByTable()['table-1'].lines[0].status).toBe('sent_to_kitchen');
    expect(screen.getByText('Este producto todavía no está marcado como preparado.')).toBeTruthy();
  });
});
