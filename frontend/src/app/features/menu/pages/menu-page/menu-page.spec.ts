import { of } from 'rxjs';
import { vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/angular';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { MenuApiService, type MenuData, type MenuSectionAdminDto } from '../../services/menu-api.service';
import {
  localizeComboProductDefinitions,
  localizeMenuCategories,
  localizeMenuProducts,
  localizeModifierGroups,
} from '../../services/menu-mock.service';
import { MenuPage } from './menu-page';

function buildMockMenuData(): MenuData {
  return {
    menuId: 'menu-demo-main',
    categories: localizeMenuCategories('es'),
    products: localizeMenuProducts('es'),
    modifierGroups: localizeModifierGroups('es'),
    comboProductDefinitions: localizeComboProductDefinitions('es'),
  };
}

function makeMockMenuApi(overrides: Partial<{
  createSection: () => ReturnType<MenuApiService['createSection']>;
  updateSection: () => ReturnType<MenuApiService['updateSection']>;
  deleteSection: () => ReturnType<MenuApiService['deleteSection']>;
}> = {}) {
  return {
    getMenu: () => of(buildMockMenuData()),
    toggleAvailability: () => of(undefined),
    createSection: overrides.createSection ?? (() => of({ id: 'new-sec', menuId: 'menu-demo-main', name: 'Nueva', sortOrder: 5, isVisible: true } as MenuSectionAdminDto)),
    updateSection: overrides.updateSection ?? (() => of({ id: 'cat-hamburguesas', menuId: 'menu-demo-main', name: 'Hamburguesas', sortOrder: 0, isVisible: false } as MenuSectionAdminDto)),
    deleteSection: overrides.deleteSection ?? (() => of(undefined)),
    listProducts: () => of([]),
    addSectionItem: () => of(undefined),
    removeSectionItem: () => of(undefined),
  };
}

describe('MenuPage', () => {
  const renderPage = async (apiOverrides = {}) => {
    const i18n = provideI18nTesting('es');

    const result = await render(MenuPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        { provide: MenuApiService, useValue: makeMockMenuApi(apiOverrides) },
      ],
    });
    await result.fixture.whenStable();
    result.fixture.detectChanges();
    return result;
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

    fireEvent.click(screen.getByRole('button', { name: 'Categoría' }));
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: 'Bebidas' }));
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

    fireEvent.click(screen.getByRole('button', { name: 'Categoría' }));
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: 'Menús' }));
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
    expect(screen.getByText('Activa o desactiva productos para el servicio de hoy.')).toBeTruthy();
    expect(screen.getByText('Coulant de chocolate')).toBeTruthy();
  });

  it('shows an empty state when filters have no results', async () => {
    const { fixture } = await renderPage();

    fireEvent.input(screen.getByRole('searchbox', { name: 'Buscar en el catálogo' }), { target: { value: 'zzzzz' } });
    fixture.detectChanges();

    expect(screen.getByText('No hay productos que coincidan con los filtros.')).toBeTruthy();
    expect(screen.getByText('Selecciona un producto para revisar su detalle.')).toBeTruthy();
  });

  describe('tab Categorías — CRUD', () => {
    const goToCategories = async (apiOverrides = {}) => {
      const result = await renderPage(apiOverrides);
      fireEvent.click(screen.getByRole('radio', { name: 'Categorías' }));
      result.fixture.detectChanges();
      return result;
    };

    it('muestra un botón para crear una nueva sección', async () => {
      await goToCategories();
      expect(screen.getByRole('button', { name: /nueva sección/i })).toBeTruthy();
    });

    it('abre un formulario inline al pulsar nueva sección', async () => {
      const { fixture } = await goToCategories();

      fireEvent.click(screen.getByRole('button', { name: /nueva sección/i }));
      fixture.detectChanges();

      expect(screen.getByRole('textbox', { name: /nombre/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /guardar/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeTruthy();
    });

    it('llama a createSection y recarga al guardar con nombre válido', async () => {
      const createSection = vi.fn(() => of({ id: 'new-sec', menuId: 'menu-demo-main', name: 'Tapas', sortOrder: 5, isVisible: true } as MenuSectionAdminDto));
      const { fixture } = await goToCategories({ createSection });

      fireEvent.click(screen.getByRole('button', { name: /nueva sección/i }));
      fixture.detectChanges();

      fireEvent.input(screen.getByRole('textbox', { name: /nombre/i }), { target: { value: 'Tapas' } });
      fixture.detectChanges();
      fireEvent.click(screen.getByRole('button', { name: /guardar/i }));
      fixture.detectChanges();
      await fixture.whenStable();

      expect(createSection).toHaveBeenCalledWith('menu-demo-main', 'Tapas', true);
    });

    it('cierra el formulario sin llamar a la API al pulsar cancelar', async () => {
      const createSection = vi.fn(() => of({} as MenuSectionAdminDto));
      const { fixture } = await goToCategories({ createSection });

      fireEvent.click(screen.getByRole('button', { name: /nueva sección/i }));
      fixture.detectChanges();
      fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
      fixture.detectChanges();

      expect(screen.queryByRole('textbox', { name: /nombre/i })).toBeNull();
      expect(createSection).not.toHaveBeenCalled();
    });

    it('muestra botón para ocultar/mostrar cada sección y llama a updateSection', async () => {
      const updateSection = vi.fn(() => of({ id: 'cat-hamburguesas', menuId: 'menu-demo-main', name: 'Hamburguesas', sortOrder: 0, isVisible: false } as MenuSectionAdminDto));
      const { fixture } = await goToCategories({ updateSection });

      const toggle = screen.getAllByRole('checkbox')[0];
      fireEvent.click(toggle);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(updateSection).toHaveBeenCalled();
    });

    it('muestra botón de eliminar por sección y abre confirmación', async () => {
      const { fixture } = await goToCategories();

      const deleteButtons = screen.getAllByRole('button', { name: /eliminar sección/i });
      expect(deleteButtons.length).toBeGreaterThan(0);

      fireEvent.click(deleteButtons[0]);
      fixture.detectChanges();

      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(screen.getByText(/¿Eliminar/i)).toBeTruthy();
    });

    it('llama a deleteSection al confirmar la eliminación', async () => {
      const deleteSection = vi.fn(() => of(undefined));
      const { fixture } = await goToCategories({ deleteSection });

      fireEvent.click(screen.getAllByRole('button', { name: /eliminar sección/i })[0]);
      fixture.detectChanges();

      fireEvent.click(screen.getByRole('button', { name: /confirmar eliminación/i }));
      fixture.detectChanges();
      await fixture.whenStable();

      expect(deleteSection).toHaveBeenCalled();
    });
  });
});
