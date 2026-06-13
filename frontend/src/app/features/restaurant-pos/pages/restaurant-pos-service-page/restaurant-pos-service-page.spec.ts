import { fireEvent, render, screen, within } from '@testing-library/angular';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { KEY_VALUE_STORAGE, MemoryKeyValueStorage, type KeyValueStorage } from '../../../../shared/utils/storage/key-value-storage';
import { RestaurantPosStore } from '../../state/restaurant-pos.store';
import { RestaurantPosServicePage } from './restaurant-pos-service-page';

describe('RestaurantPosServicePage', () => {
  const renderServicePage = async (storage?: KeyValueStorage) => {
    const i18n = provideI18nTesting();

    return render(RestaurantPosServicePage, {
      imports: [...i18n.imports],
      providers: storage ? [...i18n.providers, { provide: KEY_VALUE_STORAGE, useValue: storage }] : [...i18n.providers],
    });
  };

  const addProductFromSearch = (fixture: { detectChanges: () => void }, productName: RegExp) => {
    fireEvent.click(screen.getByRole('button', { name: /Buscar producto/i }));
    fixture.detectChanges();
    const dialog = screen.getByRole('dialog', { name: /Buscar producto/i });
    const product = within(dialog).getByText(productName).textContent ?? '';
    fireEvent.click(within(dialog).getByRole('button', { name: new RegExp(`Añadir una unidad de ${product}`) }));
    fixture.detectChanges();
    const customizer = screen.queryByRole('dialog', { name: new RegExp(product) });
    if (customizer) {
      fireEvent.click(within(customizer).getByRole('button', { name: /Añadir por/i }));
      fixture.detectChanges();
    }
    fireEvent.click(within(dialog).getByRole('button', { name: 'Finalizar' }));
    fixture.detectChanges();
  };

  it('renders a compact service floor and empty selected-table panel', async () => {
    await renderServicePage();

    expect(screen.getByRole('heading', { name: 'Servicio de sala' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Plano de servicio' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Selecciona una mesa' })).toBeTruthy();
    expect(screen.getByText('0/5')).toBeTruthy();
    expect(screen.getByText('Pagada')).toBeTruthy();
    expect(screen.queryByText('Añadir rápido')).toBeNull();
    expect(screen.getByRole('button', { name: /Buscar mesa\/taburete/i })).toBeTruthy();
    expect(screen.getByLabelText('M1 mesa, Libre')).toBeTruthy();
    expect(screen.queryByRole('toolbar', { name: 'Acciones del elemento del plano' })).toBeNull();
  });

  it('opens the selected table panel from the floor plan', async () => {
    await renderServicePage();

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));

    expect(screen.getByRole('heading', { name: 'Mesa 1' })).toBeTruthy();
    expect(screen.getByText('Sin iniciar')).toBeTruthy();
    expect(screen.getByText('Todavía no hay productos añadidos.')).toBeTruthy();
  });

  it('opens a selected stool as a one-person service panel', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('Stool 1 mesa, Libre'));

    expect(store.selectedTableId()).toBe('stool-1');
    expect(screen.getByRole('heading', { name: 'T1' })).toBeTruthy();
    expect(screen.getByText('1 pax')).toBeTruthy();
  });

  it('filters products in a modal and adds the selected result to the current order', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    fireEvent.click(within(screen.getByLabelText('Panel de mesa seleccionada')).getByRole('button', { name: /Buscar producto/i }));
    fireEvent.input(within(screen.getByRole('dialog', { name: /Buscar producto/i })).getByRole('searchbox', { name: /Buscar producto/i }), {
      target: { value: 'limonada' },
    });
    fixture.detectChanges();
    fireEvent.click(within(screen.getByRole('dialog', { name: /Buscar producto/i })).getByRole('button', { name: 'Añadir una unidad de Limonada con gas' }));
    fixture.detectChanges();

    expect(store.selectedOrder()?.lines[0]).toEqual(expect.objectContaining({ productName: 'Limonada con gas' }));
    expect(screen.getByText('1 x Limonada con gas')).toBeTruthy();
    expect(screen.getByRole('dialog', { name: /Buscar producto/i })).toBeTruthy();
    expect(within(screen.getByRole('dialog', { name: /Buscar producto/i })).getByText('Añadido')).toBeTruthy();
    expect(within(screen.getByRole('dialog', { name: /Buscar producto/i })).getByLabelText('Cantidad de Limonada con gas: 1')).toBeTruthy();
  });

  it('updates product quantities live from the search modal and closes it with finish', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    fireEvent.click(within(screen.getByLabelText('Panel de mesa seleccionada')).getByRole('button', { name: /Buscar producto/i }));
    fixture.detectChanges();

    const dialog = screen.getByRole('dialog', { name: /Buscar producto/i });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Añadir una unidad de Limonada con gas' }));
    fixture.detectChanges();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Añadir una unidad de Limonada con gas' }));
    fixture.detectChanges();

    expect(store.selectedOrder()?.lines.find((line) => line.productName === 'Limonada con gas')).toEqual(expect.objectContaining({ quantity: 2 }));
    expect(screen.getByText('2 x Limonada con gas')).toBeTruthy();
    expect(within(dialog).getByLabelText('Cantidad de Limonada con gas: 2')).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Quitar una unidad de Limonada con gas' }));
    fixture.detectChanges();
    expect(store.selectedOrder()?.lines.find((line) => line.productName === 'Limonada con gas')).toEqual(expect.objectContaining({ quantity: 1 }));

    fireEvent.click(within(dialog).getByRole('button', { name: 'Quitar una unidad de Limonada con gas' }));
    fixture.detectChanges();
    expect(store.selectedOrder()?.lines.find((line) => line.productName === 'Limonada con gas')).toBeUndefined();
    expect(within(dialog).getByRole('button', { name: 'Quitar una unidad de Limonada con gas' }).hasAttribute('disabled')).toBe(true);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Finalizar' }));
    fixture.detectChanges();

    expect(screen.queryByRole('dialog', { name: /Buscar producto/i })).toBeNull();
  });

  it('opens the customizer for configurable products and adds the selected snapshot', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    fireEvent.click(within(screen.getByLabelText('Panel de mesa seleccionada')).getByRole('button', { name: /Buscar producto/i }));
    fixture.detectChanges();

    const searchDialog = screen.getByRole('dialog', { name: /Buscar producto/i });
    fireEvent.click(within(searchDialog).getByRole('button', { name: 'Añadir una unidad de Hamburguesa craft' }));
    fixture.detectChanges();

    const customizer = screen.getByRole('dialog', { name: /Hamburguesa craft/i });
    fireEvent.click(within(customizer).getByLabelText(/Bacon/i));
    fireEvent.input(within(customizer).getByRole('textbox'), { target: { value: 'Sin prisa' } });
    fireEvent.click(within(customizer).getByRole('button', { name: /Añadir por/i }));
    fixture.detectChanges();

    const line = store.selectedOrder()?.lines.find((currentLine) => currentLine.productName === 'Hamburguesa craft');
    expect(line).toEqual(
      expect.objectContaining({
        productId: 'product-1',
        quantity: 1,
        kitchenNote: 'Sin prisa',
        unitPrice: 14,
      }),
    );
    expect(line?.selectedModifiers.map((modifier) => modifier.optionId)).toContain('extra-bacon');
    expect(screen.getByText(/Bacon/)).toBeTruthy();
    expect(screen.getByText(/Nota: Sin prisa/)).toBeTruthy();
  });

  it('filters the product search by favorites and lets favorites be updated from the dialog', async () => {
    const { fixture } = await renderServicePage();

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    fireEvent.click(within(screen.getByLabelText('Panel de mesa seleccionada')).getByRole('button', { name: /Buscar producto/i }));
    fixture.detectChanges();

    const dialog = screen.getByRole('dialog', { name: /Buscar producto/i });
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Favoritos' }));
    fixture.detectChanges();

    expect(within(dialog).getByText('Hamburguesa craft')).toBeTruthy();
    expect(within(dialog).getByText('Limonada con gas')).toBeTruthy();
    expect(within(dialog).queryByText('Croquetas de jamón ibérico')).toBeNull();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Quitar Hamburguesa craft de favoritos' }));
    fixture.detectChanges();

    expect(within(dialog).queryByText('Hamburguesa craft')).toBeNull();

    fireEvent.click(within(dialog).getByRole('radio', { name: 'Todos' }));
    fixture.detectChanges();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Añadir Croquetas de jamón ibérico a favoritos' }));
    fixture.detectChanges();
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Favoritos' }));
    fixture.detectChanges();

    expect(within(dialog).getByText('Croquetas de jamón ibérico')).toBeTruthy();
  });

  it('loads and persists favorite products in local storage', async () => {
    const storage = new MemoryKeyValueStorage();
    storage.setItem('locale', 'es');
    storage.setItem('restaurant-pos.favorite-products', JSON.stringify(['product-2']));
    const { fixture } = await renderServicePage(storage);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    fireEvent.click(within(screen.getByLabelText('Panel de mesa seleccionada')).getByRole('button', { name: /Buscar producto/i }));
    fixture.detectChanges();

    const dialog = screen.getByRole('dialog', { name: /Buscar producto/i });
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Favoritos' }));
    fixture.detectChanges();

    expect(within(dialog).getByText('Croquetas de jamón ibérico')).toBeTruthy();
    expect(within(dialog).queryByText('Hamburguesa craft')).toBeNull();

    fireEvent.click(within(dialog).getByRole('radio', { name: 'Todos' }));
    fixture.detectChanges();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Añadir Hamburguesa craft a favoritos' }));
    fixture.detectChanges();

    expect(storage.getItem('restaurant-pos.favorite-products')).toBe(JSON.stringify(['product-2', 'product-1']));
  });

  it('filters the product search by service course from the category selector', async () => {
    const { fixture } = await renderServicePage();

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    fireEvent.click(within(screen.getByLabelText('Panel de mesa seleccionada')).getByRole('button', { name: /Buscar producto/i }));
    fixture.detectChanges();

    const dialog = screen.getByRole('dialog', { name: /Buscar producto/i });
    fireEvent.change(within(dialog).getByRole('combobox', { name: 'Categoría' }), { target: { value: 'drinks' } });
    fixture.detectChanges();

    expect(within(dialog).getByText('Limonada con gas')).toBeTruthy();
    expect(within(dialog).getByText('Café solo')).toBeTruthy();
    expect(within(dialog).queryByText('Hamburguesa craft')).toBeNull();
    expect(within(dialog).queryByText('Ensalada César')).toBeNull();
  });

  it('adds products and advances the selected table through kitchen, served, and payment states', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    addProductFromSearch(fixture, /^Hamburguesa craft/);

    expect(screen.getByText('1 x Hamburguesa craft')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Añadir una unidad de Hamburguesa craft' }));
    fixture.detectChanges();
    expect(screen.getByText('2 x Hamburguesa craft')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar una unidad de Hamburguesa craft' }));
    fixture.detectChanges();
    expect(screen.getByText('1 x Hamburguesa craft')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Principal' })).toBeTruthy();
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0);
    expect(store.selectedTable()?.status).toBe('occupied');

    fireEvent.click(screen.getByRole('button', { name: /Cocina/i }));
    fixture.detectChanges();

    expect(store.selectedTable()?.status).toBe('waiting_kitchen');
    expect(screen.getAllByText('En cocina').length).toBeGreaterThan(0);

    fireEvent.input(screen.getByRole('textbox', { name: 'Nota para Hamburguesa craft' }), { target: { value: 'Sin cebolla' } });
    fireEvent.click(screen.getByRole('button', { name: 'Marcar Hamburguesa craft como preparado' }));
    fixture.detectChanges();

    expect(store.selectedOrder()?.lines[0]).toEqual(expect.objectContaining({ note: 'Sin cebolla', status: 'ready' }));
    expect(screen.getAllByText('Preparado').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Marcar Hamburguesa craft como servido' }));
    fixture.detectChanges();

    expect(store.selectedTable()?.status).toBe('served');
    expect(screen.getAllByText('Servido').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Efectivo/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cobrar/i }));
    fixture.detectChanges();

    expect(store.selectedOrder()?.paymentMethod).toBe('cash');
    expect(store.selectedOrder()?.status).toBe('paid');
    expect(store.selectedTable()?.status).toBe('paid');
  });

  it('removes a product line from the selected order', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    addProductFromSearch(fixture, /^Hamburguesa craft/);
    addProductFromSearch(fixture, /^Limonada con gas/);

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Hamburguesa craft del pedido' }));
    fixture.detectChanges();

    expect(store.selectedOrder()?.lines.map((line) => line.productName)).toEqual(['Limonada con gas']);
    expect(screen.queryByText('1 x Hamburguesa craft')).toBeNull();
    expect(screen.getByText('1 x Limonada con gas')).toBeTruthy();
  });

  it('opens a simulated card gateway and accepts or rejects payment without losing the order', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    addProductFromSearch(fixture, /^Hamburguesa craft/);
    fireEvent.click(screen.getByRole('button', { name: /Tarjeta/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cobrar/i }));
    fixture.detectChanges();

    expect(screen.getByRole('dialog', { name: /Pasarela bancaria/i })).toBeTruthy();
    expect(screen.getByText(/Conectando con terminal/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Error/i }));
    fixture.detectChanges();

    expect(screen.getByText(/Pago rechazado/i)).toBeTruthy();
    expect(store.selectedTable()?.status).toBe('occupied');
    expect(store.selectedOrder()?.status).toBe('open');
    expect(store.selectedOrder()?.lines.length).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: /Aceptar pago/i }));
    fixture.detectChanges();

    expect(store.selectedOrder()?.paymentMethod).toBe('card');
    expect(store.selectedOrder()?.status).toBe('paid');
    expect(store.selectedTable()?.status).toBe('paid');
    expect(screen.queryByRole('dialog', { name: /Pasarela bancaria/i })).toBeNull();
  });

  it('searches a table or stool, selects it, and focuses it in the floor plan', async () => {
    vi.useFakeTimers();
    const scrollIntoView = vi.fn();
    const focus = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const originalFocus = HTMLElement.prototype.focus;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    HTMLElement.prototype.focus = focus;
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByRole('button', { name: /Buscar mesa\/taburete/i }));
    fireEvent.input(screen.getByRole('searchbox', { name: /Buscar mesa\/taburete/i }), { target: { value: 'Stool 2' } });
    fixture.detectChanges();
    fireEvent.click(within(screen.getByRole('dialog', { name: /Buscar mesa\/taburete/i })).getByRole('button', { name: /Stool 2/i }));
    fixture.detectChanges();
    vi.runOnlyPendingTimers();

    expect(store.selectedTableId()).toBe('stool-2');
    expect(screen.queryByRole('dialog', { name: /Buscar mesa\/taburete/i })).toBeNull();
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', inline: 'center', behavior: 'smooth' });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });

    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    HTMLElement.prototype.focus = originalFocus;
    vi.useRealTimers();
  });

  it('filters service point search by table status', async () => {
    const { fixture } = await renderServicePage();

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    addProductFromSearch(fixture, /^Hamburguesa craft/);
    fireEvent.click(screen.getByRole('button', { name: /Buscar mesa\/taburete/i }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Estado' }), { target: { value: 'occupied' } });
    fixture.detectChanges();

    const dialog = screen.getByRole('dialog', { name: /Buscar mesa\/taburete/i });
    expect(within(dialog).getByRole('button', { name: /M1/ })).toBeTruthy();
    expect(within(dialog).queryByRole('button', { name: /M2/ })).toBeNull();
  });

  it('returns to the previous selected service point', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    fireEvent.click(screen.getByLabelText('M2 mesa, Libre'));
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: 'Volver a M1' }));
    fixture.detectChanges();

    expect(store.selectedTableId()).toBe('table-1');
    expect(screen.getByRole('button', { name: 'Volver a M2' })).toBeTruthy();
  });

  it('marks cleaning and frees the selected table from the service panel', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    addProductFromSearch(fixture, /^Hamburguesa craft/);
    fireEvent.click(screen.getByRole('button', { name: /Limpieza/i }));
    fixture.detectChanges();

    expect(store.selectedTable()?.status).toBe('cleaning');
    expect(within(screen.getByLabelText('Panel de mesa seleccionada')).getAllByText('Limpieza').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Liberar la mesa seleccionada/i }));
    fixture.detectChanges();

    expect(screen.getByRole('dialog', { name: 'Liberar mesa' })).toBeTruthy();
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Liberar mesa' })).getByRole('button', { name: 'Liberar mesa' }));
    fixture.detectChanges();

    expect(store.selectedTable()?.status).toBe('free');
    expect(store.selectedOrder()?.lines).toEqual([]);
  });
});
