import { fireEvent, render, screen, within } from '@testing-library/angular';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { MenuPage } from './menu-page';

describe('MenuPage', () => {
  const renderPage = async () => {
    const i18n = provideI18nTesting('es');

    return render(MenuPage, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
    });
  };

  it('renders localized catalog products, tabs and filters by localized search text', async () => {
    const { fixture } = await renderPage();

    expect(screen.getByRole('heading', { name: 'Menú' })).toBeTruthy();
    for (const tab of ['Productos', 'Categorías', 'Modificadores', 'Menús', 'Platos combinados', 'Disponibilidad']) {
      expect(screen.getByRole('radio', { name: tab })).toBeTruthy();
    }
    expect(screen.getAllByText('Hamburguesa craft').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cocina/).length).toBeGreaterThan(0);
    expect(screen.queryByText('Craft Burger')).toBeNull();

    fireEvent.input(screen.getByRole('searchbox', { name: 'Buscar en el catálogo' }), { target: { value: 'croquetas' } });
    fixture.detectChanges();

    expect(screen.getAllByText('Croquetas de jamón ibérico').length).toBeGreaterThan(0);
    expect(screen.queryByText('Hamburguesa craft')).toBeNull();
  });

  it('filters by category, availability and customization state', async () => {
    const { fixture } = await renderPage();

    fireEvent.change(screen.getByRole('combobox', { name: 'Categoría' }), { target: { value: 'drinks' } });
    fixture.detectChanges();

    expect(screen.getAllByText('Limonada con gas').length).toBeGreaterThan(0);
    expect(screen.queryByText('Croquetas de jamón ibérico')).toBeNull();

    fireEvent.click(screen.getByRole('radio', { name: 'Agotados' }));
    fixture.detectChanges();

    expect(screen.getAllByText('Cerveza').length).toBeGreaterThan(0);
    expect(screen.queryByText('Limonada con gas')).toBeNull();

    fireEvent.click(screen.getByRole('radio', { name: 'Personalizables' }));
    fixture.detectChanges();

    expect(screen.getAllByText('Cerveza').length).toBeGreaterThan(0);
    expect(screen.queryByText('No hay productos que coincidan con los filtros.')).toBeNull();
  });

  it('lists menu products with a menu badge and keeps them out of the simple filter', async () => {
    const { fixture } = await renderPage();

    fireEvent.change(screen.getByRole('combobox', { name: 'Categoría' }), { target: { value: 'menus' } });
    fixture.detectChanges();

    expect(screen.getAllByText('Menu Classic Burger').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Menú').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('radio', { name: 'Simples' }));
    fixture.detectChanges();

    expect(screen.queryByText('Menu Classic Burger')).toBeNull();
    expect(screen.getByText('No hay productos que coincidan con los filtros.')).toBeTruthy();
  });

  it('shows selected product details and updates preview price from modifiers', async () => {
    const { fixture } = await renderPage();

    const productCard = screen.getByRole('button', { name: /Hamburguesa craft/i });
    expect(productCard.className).toContain('cursor-pointer');

    fireEvent.click(productCard);
    fixture.detectChanges();

    const details = screen.getByRole('complementary');
    expect(within(details).getByText('Punto de la carne')).toBeTruthy();
    expect(within(details).getByText('Queso')).toBeTruthy();
    expect(within(details).getByLabelText(/Queso/i).closest('label')?.className).toContain('cursor-pointer');

    fireEvent.click(within(details).getByLabelText(/Queso/i));
    fixture.detectChanges();

    expect(within(details).getByText('€13.50')).toBeTruthy();
  });

  it('shows management tabs for categories, modifiers, menus, platters and availability', async () => {
    const { fixture } = await renderPage();

    fireEvent.click(screen.getByRole('radio', { name: 'Categorías' }));
    fixture.detectChanges();
    expect(screen.getByText('Hamburguesas')).toBeTruthy();
    expect(screen.getAllByText(/Subcategorías/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('radio', { name: 'Modificadores' }));
    fixture.detectChanges();
    expect(screen.getByText('Extras de hamburguesa')).toBeTruthy();
    expect(screen.getAllByText(/opciones/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('radio', { name: 'Menús' }));
    fixture.detectChanges();
    expect(screen.getByText('Menu Classic Burger')).toBeTruthy();
    expect(screen.getAllByText('Menú').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('radio', { name: 'Platos combinados' }));
    fixture.detectChanges();
    expect(screen.getByText('Plato combinado de lomo')).toBeTruthy();
    expect(screen.getAllByText('Plato combinado').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('radio', { name: 'Disponibilidad' }));
    fixture.detectChanges();
    expect(screen.getByRole('heading', { name: 'Productos disponibles' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Productos agotados' })).toBeTruthy();
    expect(screen.getByText('Coulant de chocolate')).toBeTruthy();
  });

  it('shows an empty state when filters have no results', async () => {
    const { fixture } = await renderPage();

    fireEvent.input(screen.getByRole('searchbox', { name: 'Buscar en el catálogo' }), { target: { value: 'zzzzz' } });
    fixture.detectChanges();

    expect(screen.getByText('No hay productos que coincidan con los filtros.')).toBeTruthy();
    expect(screen.getByText('Selecciona un producto para revisar su detalle.')).toBeTruthy();
  });
});
