import { fireEvent, render, screen, within } from '@testing-library/angular';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { RestaurantPosStore } from '../../state/restaurant-pos.store';
import { RestaurantPosServicePage } from './restaurant-pos-service-page';

describe('RestaurantPosServicePage', () => {
  const renderServicePage = async () => {
    const i18n = provideI18nTesting();

    return render(RestaurantPosServicePage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
    });
  };

  it('renders a compact service floor and empty selected-table panel', async () => {
    await renderServicePage();

    expect(screen.getByRole('heading', { name: 'Servicio de sala' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Plano de servicio' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Selecciona una mesa' })).toBeTruthy();
    expect(screen.getByText('Pagada')).toBeTruthy();
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
    fireEvent.click(screen.getByRole('button', { name: /Buscar producto/i }));
    fireEvent.input(screen.getByRole('searchbox', { name: /Buscar producto/i }), { target: { value: 'lemon' } });
    fixture.detectChanges();
    fireEvent.click(within(screen.getByRole('dialog', { name: /Buscar producto/i })).getByRole('button', { name: /Sparkling Lemonade/i }));
    fixture.detectChanges();

    expect(store.selectedOrder()?.lines[0]).toEqual(expect.objectContaining({ productName: 'Sparkling Lemonade' }));
    expect(screen.getByText('1 x Sparkling Lemonade')).toBeTruthy();
    expect(screen.getByRole('dialog', { name: /Buscar producto/i })).toBeTruthy();
  });

  it('adds products and advances the selected table through kitchen, served, and payment states', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    fireEvent.click(screen.getByRole('button', { name: /Craft Burger/i }));

    expect(screen.getByText('1 x Craft Burger')).toBeTruthy();
    expect(screen.getByText('Principal · Pendiente')).toBeTruthy();
    expect(store.selectedTable()?.status).toBe('occupied');

    fireEvent.click(screen.getByRole('button', { name: /Cocina/i }));
    fixture.detectChanges();

    expect(store.selectedTable()?.status).toBe('waiting_kitchen');
    expect(screen.getByText('Principal · En cocina')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Servido/i }));
    fixture.detectChanges();

    expect(store.selectedTable()?.status).toBe('served');
    expect(screen.getByText('Principal · Servido')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Efectivo/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cobrar/i }));
    fixture.detectChanges();

    expect(store.selectedOrder()?.paymentMethod).toBe('cash');
    expect(store.selectedOrder()?.status).toBe('paid');
    expect(store.selectedTable()?.status).toBe('paid');
  });

  it('opens a simulated card gateway and accepts or rejects payment without losing the order', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    fireEvent.click(screen.getByRole('button', { name: /Craft Burger/i }));
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

  it('marks cleaning and frees the selected table from the service panel', async () => {
    const { fixture } = await renderServicePage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    fireEvent.click(screen.getByLabelText('M1 mesa, Libre'));
    fireEvent.click(screen.getByRole('button', { name: /Craft Burger/i }));
    fireEvent.click(screen.getByRole('button', { name: /Limpieza/i }));
    fixture.detectChanges();

    expect(store.selectedTable()?.status).toBe('cleaning');
    expect(within(screen.getByLabelText('Panel de mesa seleccionada')).getAllByText('Limpieza').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Liberar mesa/i }));
    fixture.detectChanges();

    expect(store.selectedTable()?.status).toBe('free');
    expect(store.selectedOrder()?.lines).toEqual([]);
  });
});
