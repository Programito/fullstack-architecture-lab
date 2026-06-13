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

  it('renders localized catalog products and filters by localized search text', async () => {
    const { fixture } = await renderPage();

    expect(screen.getByRole('heading', { name: 'Menú' })).toBeTruthy();
    expect(screen.getAllByText('Hamburguesa craft').length).toBeGreaterThan(0);
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

  it('lists combo products with a combo badge and keeps them out of the simple filter', async () => {
    const { fixture } = await renderPage();

    fireEvent.change(screen.getByRole('combobox', { name: 'Categoría' }), { target: { value: 'menus' } });
    fixture.detectChanges();

    expect(screen.getAllByText('Menu Classic Burger').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Combo').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('radio', { name: 'Simples' }));
    fixture.detectChanges();

    expect(screen.queryByText('Menu Classic Burger')).toBeNull();
    expect(screen.getByText('No hay productos que coincidan con los filtros.')).toBeTruthy();
  });

  it('shows selected product details and updates preview price from modifiers', async () => {
    const { fixture } = await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Hamburguesa craft/i }));
    fixture.detectChanges();

    const details = screen.getByRole('complementary');
    expect(within(details).getByText('Punto de la carne')).toBeTruthy();
    expect(within(details).getByText('Queso')).toBeTruthy();

    fireEvent.click(within(details).getByLabelText(/Queso/i));
    fixture.detectChanges();

    expect(within(details).getByText('€13.50')).toBeTruthy();
  });

  it('shows an empty state when filters have no results', async () => {
    const { fixture } = await renderPage();

    fireEvent.input(screen.getByRole('searchbox', { name: 'Buscar en el catálogo' }), { target: { value: 'zzzzz' } });
    fixture.detectChanges();

    expect(screen.getByText('No hay productos que coincidan con los filtros.')).toBeTruthy();
    expect(screen.getByText('Selecciona un producto para revisar su detalle.')).toBeTruthy();
  });
});
