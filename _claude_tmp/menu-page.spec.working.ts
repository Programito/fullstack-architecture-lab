import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Router } from '@angular/router';
import { fireEvent, render, screen, within } from '@testing-library/angular';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { MenuApiService, type MenuData, type MenuSectionAdminDto, type RestaurantProductSummaryDto } from '../../services/menu-api.service';
import {
  localizeComboProductDefinitions,
  localizeMenuCategories,
  localizeMenuProducts,
  localizeModifierGroups,
} from '../../services/menu-mock.service';
import { RestaurantContextStore } from '../../../restaurant-pos/state/restaurant-context.store';
import { MenuPage } from './menu-page';

const ACTIVE_RESTAURANT = {
  id: 'r1',
  name: 'MesaFlow Demo',
  displayName: 'MesaFlow Demo',
  timezone: 'Europe/Madrid',
  currency: 'EUR',
  isActive: true,
};

function buildMockMenuData(): MenuData {
  return {
    menuId: 'menu-demo-main',
    categories: localizeMenuCategories('es'),
    products: localizeMenuProducts('es').map((product) => ({ ...product, restaurantProductId: product.restaurantProductId ?? product.id })),
    modifierGroups: localizeModifierGroups('es'),
    comboProductDefinitions: localizeComboProductDefinitions('es'),
  };
}

const CATALOG_ONLY_PRODUCT: RestaurantProductSummaryDto = {
  id: 'rp-catalog-new',
  productId: 'p-catalog-new',
  name: 'Agua mineral',
  displayName: null,
  imageUrl: null,
  modifierGroupIds: [],
  productType: 'simple',
  course: 'drinks',
  preparationRoute: 'direct',
  priceCents: 150,
  currency: 'EUR',
  isAvailable: true,
  isVisible: true,
  allergens: [],
};

function makeMockMenuApi(overrides: Partial<{
  getMenu: () => ReturnType<MenuApiService['getMenu']>;
  createSection: () => ReturnType<MenuApiService['createSection']>;
  updateSection: () => ReturnType<MenuApiService['updateSection']>;
  deleteSection: () => ReturnType<MenuApiService['deleteSection']>;
  listProducts: () => ReturnType<MenuApiService['listProducts']>;
  addSectionItem: () => ReturnType<MenuApiService['addSectionItem']>;
  listModifierGroups: () => ReturnType<MenuApiService['listModifierGroups']>;
}> = {}) {
  return {
    getMenu: overrides.getMenu ?? (() => of(buildMockMenuData())),
    toggleAvailability: () => of(undefined),
    createSection: overrides.createSection ?? (() => of({ id: 'new-sec', menuId: 'menu-demo-main', name: 'Nueva', sortOrder: 5, isVisible: true } as MenuSectionAdminDto)),
    updateSection: overrides.updateSection ?? (() => of({ id: 'cat-hamburguesas', menuId: 'menu-demo-main', name: 'Hamburguesas', sortOrder: 0, isVisible: false } as MenuSectionAdminDto)),
    deleteSection: overrides.deleteSection ?? (() => of(undefined)),
    listProducts: overrides.listProducts ?? (() => of([])),
    addSectionItem: overrides.addSectionItem ?? (() => of(undefined)),
    listModifierGroups: overrides.listModifierGroups ?? (() => of(localizeModifierGroups('es'))),
    removeSectionItem: () => of(undefined),
    getProduct: () => of(undefined),
    createProduct: () => of(undefined),
    updateProduct: () => of(undefined),
    deleteProduct: () => of(undefined),
  };
}

describe('MenuPage', () => {
  const navigateByUrl = vi.fn(async () => true);

  const renderPage = async (
    apiOverrides = {},
    locale: 'es' | 'en' | 'ca' = 'es',
    breakpoints: Record<string, boolean> = { '(max-width: 1023px)': false, '(min-width: 900px)': true },
  ) => {
    navigateByUrl.mockClear();
    const i18n = provideI18nTesting(locale);

    const result = await render(MenuPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        {
          provide: BreakpointObserver,
          useValue: {
            observe: (query: string) => of({ matches: breakpoints[query] ?? false, breakpoints: { [query]: breakpoints[query] ?? false } }),
          },
        },
        { provide: MenuApiService, useValue: makeMockMenuApi(apiOverrides) },
        { provide: RestaurantContextStore, useValue: { activeRestaurant: signal(ACTIVE_RESTAURANT).asReadonly() } },
        { provide: Router, useValue: { navigateByUrl } },
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

    fireEvent.input(screen.getByLabelText('Buscar en el catálogo'), { target: { value: 'croquetas' } });
    fixture.detectChanges();

    expect(screen.getAllByText('Croquetas de jamón ibérico').length).toBeGreaterThan(0);
    expect(screen.queryByText('Hamburguesa craft')).toBeNull();
  });

  it('filters by category, availability and customization state', async () => {
    const { fixture } = await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Filtros' }));
    fixture.detectChanges();
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

  it('filters products by a selected allergen', async () => {
    const { fixture } = await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Filtros' }));
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: 'Gluten' }));
    fixture.detectChanges();

    expect(screen.getAllByText('Hamburguesa craft').length).toBeGreaterThan(0);
    expect(screen.queryByText('Café solo')).toBeNull();
  });

  it('combines multiple allergen filters with OR logic', async () => {
    const { fixture } = await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Filtros' }));
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: 'Pescado' }));
    fireEvent.click(screen.getByRole('button', { name: 'Leche' }));
    fixture.detectChanges();

    expect(screen.getAllByText('Hamburguesa craft').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ensalada César').length).toBeGreaterThan(0);
  });

  it('shows translated allergens in the selected product detail', async () => {
    const { fixture } = await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Hamburguesa craft/i }));
    fixture.detectChanges();

    const details = screen.getByRole('complementary');
    expect(within(details).getByText(/Gluten/)).toBeTruthy();
    expect(within(details).getByText(/Leche/)).toBeTruthy();
  });

  it('shows an allergen summary in product cards when allergens are declared', async () => {
    await renderPage();

    const card = screen.getAllByRole('button', { name: 'Hamburguesa craft' })[0];
    expect(within(card).getAllByText(/Gluten/).length).toBeGreaterThan(0);
  });

  it('lists menu products with a menu badge and keeps them out of the simple filter', async () => {
    const { fixture } = await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Filtros' }));
    fixture.detectChanges();
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

it('renders product images when available and the placeholder when missing', async () => {
  await renderPage();

  expect(screen.getAllByRole('img', { name: 'Hamburguesa craft' }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('img', { name: 'Menu Classic Burger' }).length).toBeGreaterThan(0);
  expect(screen.getAllByText('Sin imagen').length).toBeGreaterThan(0);
});


it('opens the menu review panel as a modal, closed by default', async () => {
  await renderPage();

  expect(screen.queryByLabelText('Revisión rápida del menú')).toBeNull();
});

it('renders the menu health panel with actionable warning groups', async () => {
  const { fixture } = await renderPage({
    listProducts: () => of([CATALOG_ONLY_PRODUCT]),
  });

  fireEvent.click(screen.getByRole('button', { name: /Revisar menú/i }));
  fixture.detectChanges();

  const healthPanel = screen.getByRole('region', { name: 'Revisión rápida del menú' });
  expect(within(healthPanel).getByRole('button', { name: /Sin imagen/i })).toBeTruthy();
  expect(within(healthPanel).getByRole('button', { name: /Sin sección/i })).toBeTruthy();
});

it('filters the current product list from a warning shortcut and closes the modal on confirm', async () => {
  const { fixture } = await renderPage({
    listProducts: () => of([CATALOG_ONLY_PRODUCT]),
  });

  fireEvent.click(screen.getByRole('button', { name: /Revisar menú/i }));
  fixture.detectChanges();

  const healthPanel = screen.getByRole('region', { name: 'Revisión rápida del menú' });
  fireEvent.click(within(healthPanel).getByRole('button', { name: /Sin sección/i }));
  fixture.detectChanges();

  expect(screen.getAllByText('Agua mineral').length).toBeGreaterThan(0);
  expect(screen.queryByText('Hamburguesa craft')).toBeNull();
  expect(screen.getByRole('region', { name: 'Revisión rápida del menú' })).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: /Ver \d+ productos/i }));
  fixture.detectChanges();

  expect(screen.queryByLabelText('Revisión rápida del menú')).toBeNull();
});

it('keeps the desktop detail panel pinned while browsing the list', async () => {
  await renderPage();

  const detailPanel = screen.getByRole('complementary');
  expect(detailPanel.className).toContain('lg:sticky');
  expect(detailPanel.className).toContain('lg:top-28');
  expect(detailPanel.className).toContain('lg:max-h-[calc(100dvh-7rem)]');
  expect(detailPanel.className).toContain('lg:overflow-y-auto');
});

it('supports a compact review mode', async () => {
  const { fixture } = await renderPage();

  fireEvent.click(screen.getByRole('radio', { name: 'Compacta' }));
  fixture.detectChanges();

  expect(screen.getAllByText(/Ruta:/).length).toBeGreaterThan(0);
  expect(screen.getAllByText('Hamburguesa craft').length).toBeGreaterThan(0);
});

it('combines operational review filters', async () => {
  const { fixture } = await renderPage();

  fireEvent.click(screen.getByRole('button', { name: /Revisar menú/i }));
  fixture.detectChanges();

  fireEvent.click(screen.getByRole('button', { name: 'Solo menús' }));
  fireEvent.click(screen.getByRole('button', { name: 'Con imagen' }));
  fixture.detectChanges();

  expect(screen.getAllByText('Menu Classic Burger').length).toBeGreaterThan(0);
  expect(screen.queryByText('Hamburguesa craft')).toBeNull();
});

it('keeps the selected product stable when switching between card and compact modes', async () => {
  const { fixture } = await renderPage();

  fireEvent.click(screen.getAllByRole('button', { name: /Croquetas de jamón ibérico/i }).at(-1)!);
  fixture.detectChanges();
  expect(screen.getByRole('complementary').textContent).toContain('Croquetas de jamón ibérico');

  fireEvent.click(screen.getByRole('radio', { name: 'Compacta' }));
  fixture.detectChanges();

  expect(screen.getByRole('complementary').textContent).toContain('Croquetas de jamón ibérico');
});

it('opens and closes the filter dialog in mobile mode', async () => {
  const { fixture } = await renderPage({}, 'es', {
    '(max-width: 1023px)': true,
    '(min-width: 900px)': false,
  });

  fireEvent.click(screen.getByRole('button', { name: 'Filtros' }));
  fixture.detectChanges();
  expect(screen.getByRole('dialog', { name: 'Filtros' })).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: /cerrar dialogo/i }));
  fixture.detectChanges();
  expect(screen.queryByRole('dialog', { name: 'Filtros' })).toBeNull();
});

it('shows allergen filters inside the mobile filter dialog', async () => {
  const { fixture } = await renderPage({}, 'es', {
    '(max-width: 1023px)': true,
    '(min-width: 900px)': false,
  });

  fireEvent.click(screen.getByRole('button', { name: 'Filtros' }));
  fixture.detectChanges();

  const dialog = screen.getByRole('dialog', { name: 'Filtros' });
  expect(within(dialog).getByRole('button', { name: 'Gluten' })).toBeTruthy();
});

it('shows combo summaries inside the mobile detail dialog', async () => {
  const { fixture } = await renderPage({}, 'es', {
    '(max-width: 1023px)': true,
    '(min-width: 900px)': false,
  });

  fireEvent.click(screen.getAllByRole('button', { name: 'Menu Classic Burger' })[0]);
  fixture.detectChanges();

  const dialog = screen.getByRole('dialog', { name: 'Menu Classic Burger' });
  expect(within(dialog).getByText('Incluye Hamburguesa clásica + Patatas fritas + Coca-Cola')).toBeTruthy();
});

it('keeps create product reachable on smaller widths', async () => {
  const { fixture } = await renderPage({}, 'es', {
    '(max-width: 1023px)': true,
    '(min-width: 900px)': false,
  });

  fireEvent.click(screen.getByRole('button', { name: 'Nuevo producto' }));
  fixture.detectChanges();

  expect(navigateByUrl).toHaveBeenCalledWith('/restaurant-pos/menu/products/new');
});

it('shows only one primary create action in mobile layout', async () => {
  await renderPage({}, 'es', {
    '(max-width: 1023px)': true,
    '(min-width: 900px)': false,
  });

  expect(screen.getAllByRole('button', { name: 'Nuevo producto' })).toHaveLength(1);
});

it('navigates to the product editor page when creating a product', async () => {
  await renderPage();

  fireEvent.click(screen.getAllByRole('button', { name: 'Nuevo producto' })[0]);

  expect(navigateByUrl).toHaveBeenCalledWith('/restaurant-pos/menu/products/new');
});

it('navigates to the product editor page when editing a product', async () => {
  await renderPage();

  fireEvent.click(screen.getAllByRole('button', { name: 'Editar producto' })[0]);

  expect(navigateByUrl).toHaveBeenCalledWith(expect.stringMatching(/^\/restaurant-pos\/menu\/products\/.+\/edit$/));
});

it('keeps long product names clamped inside cards', async () => {
  const menuData = buildMockMenuData();
  const longName =
    'Hamburguesa craft edición especial con bacon ahumado, cebolla caramelizada y cheddar madurado de la casa';
  menuData.products[0] = { ...menuData.products[0], name: longName };

  await renderPage({
    getMenu: () => of(menuData),
  });

  expect(screen.getAllByText(longName)[0].className).toContain('line-clamp-2');
});

it('keeps combo and customizable badges visible on smaller widths', async () => {
  const menuData = buildMockMenuData();
  const comboIndex = menuData.products.findIndex((product) => product.name === 'Menu Classic Burger');
  menuData.products[comboIndex] = {
    ...menuData.products[comboIndex],
    modifierGroupIds: ['drink-size'],
  };

  await renderPage(
    {
      getMenu: () => of(menuData),
    },
    'es',
    {
      '(max-width: 1023px)': true,
      '(min-width: 900px)': false,
    },
  );

  const comboCard = screen.getAllByRole('button', { name: 'Menu Classic Burger' })[0];
  expect(within(comboCard).getByText('Menú')).toBeTruthy();
  expect(within(comboCard).getByText('Personalizable')).toBeTruthy();
});

it('renders combo cards with an inclusion summary', async () => {
  await renderPage();

  const comboCard = screen.getAllByRole('button', { name: 'Menu Classic Burger' })[0];

  expect(within(comboCard).getByText('Incluye Hamburguesa clásica + Patatas fritas + Coca-Cola')).toBeTruthy();
});

it('renders changeable extras summaries for customizable products', async () => {
  await renderPage();

  const burgerCard = screen.getAllByRole('button', { name: 'Hamburguesa craft' })[0];

  expect(within(burgerCard).getByText(/Queso o Huevo/)).toBeTruthy();
  expect(within(burgerCard).getByText(/Pepinillos o Salsa/)).toBeTruthy();
  expect(within(burgerCard).getByText(/Punto de la carne/)).toBeTruthy();
});

  it('keeps customizable and combo badges visible, and allows both on the same card', async () => {
    const menuData = buildMockMenuData();
    const comboIndex = menuData.products.findIndex((product) => product.name === 'Menu Classic Burger');
    menuData.products[comboIndex] = {
      ...menuData.products[comboIndex],
      modifierGroupIds: ['drink-size'],
    };

    await renderPage({
      getMenu: () => of(menuData),
    });

    const craftCard = screen.getAllByRole('button', { name: 'Hamburguesa craft' })[0];
    expect(within(craftCard).getByText('Personalizable')).toBeTruthy();

    const comboCard = screen.getAllByRole('button', { name: 'Menu Classic Burger' })[0];
    expect(within(comboCard).getByText('Menú')).toBeTruthy();
    expect(within(comboCard).getByText('Personalizable')).toBeTruthy();
  });

  it('shows selected product details and updates preview price from modifiers', async () => {
    const { fixture } = await renderPage();

    const productCard = screen.getByRole('button', { name: /Hamburguesa craft/i });
    expect(productCard.className).toContain('cursor-pointer');

    fireEvent.click(productCard);
    fixture.detectChanges();

    const details = screen.getByRole('complementary');
    expect(within(details).getAllByText(/Punto de la carne/).length).toBeGreaterThan(0);
    expect(within(details).getByLabelText(/Queso/i).closest('label')?.className).toContain('cursor-pointer');

    fireEvent.click(within(details).getByLabelText(/Queso/i));
    fixture.detectChanges();

    expect(within(details).getByText('€13.50')).toBeTruthy();
  });

  it('keeps the detail panel hierarchy as include, change, then price impact', async () => {
    const menuData = buildMockMenuData();
    const comboIndex = menuData.products.findIndex((product) => product.name === 'Menu Classic Burger');
    menuData.products[comboIndex] = {
      ...menuData.products[comboIndex],
      modifierGroupIds: ['drink-size'],
    };

    const { fixture } = await renderPage({
      getMenu: () => of(menuData),
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Menu Classic Burger' })[0]);
    fixture.detectChanges();

    const details = screen.getByRole('complementary');
    const detailText = details.textContent ?? '';

    expect(detailText).toContain('Incluye');
    expect(detailText).toContain('Puedes cambiar');
    expect(detailText).toContain('Suplemento');
    expect(detailText.indexOf('Incluye')).toBeLessThan(detailText.indexOf('Puedes cambiar'));
    expect(detailText.indexOf('Puedes cambiar')).toBeLessThan(detailText.indexOf('Suplemento'));
  });

  it('keeps price supplements visible and correct in the detail panel', async () => {
    const { fixture } = await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Hamburguesa craft/i }));
    fixture.detectChanges();

    const details = screen.getByRole('complementary');

    expect(within(details).getAllByText(/Suplemento \+€1.50/).length).toBeGreaterThan(0);
    expect(within(details).getAllByText(/Suplemento \+€1.00/).length).toBeGreaterThan(0);
  });

  it('shows remove groups as kitchen instructions instead of additions', async () => {
    const { fixture } = await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Hamburguesa craft/i }));
    fixture.detectChanges();

    const details = screen.getByRole('complementary');
    const removeGroup = within(details).getByText('Quitar ingredientes').closest('fieldset');

    expect(removeGroup).toBeTruthy();
    expect(within(removeGroup!).getByText('SIN Cebolla')).toBeTruthy();
    expect(within(removeGroup!).getAllByText('Suplemento +€0.00').length).toBeGreaterThan(0);
    expect(within(removeGroup!).queryByText('Añadir Cebolla')).toBeNull();
  });

  it('shows add-on groups with positive inline price deltas', async () => {
    const { fixture } = await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Hamburguesa craft/i }));
    fixture.detectChanges();

    const details = screen.getByRole('complementary');
    const addGroup = within(details).getByText('Añadir Extras de hamburguesa').closest('fieldset');

    expect(addGroup).toBeTruthy();
    expect(within(addGroup!).getByText('Suplemento +€1.50')).toBeTruthy();
    expect(within(addGroup!).getByText('Suplemento +€1.00')).toBeTruthy();
  });

  it('shows the one-choice hint for single-choice groups', async () => {
    const { fixture } = await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Hamburguesa craft/i }));
    fixture.detectChanges();

    const details = screen.getByRole('complementary');
    const singleChoiceGroup = within(details).getByText('Elegir Punto de la carne').closest('fieldset');

    expect(singleChoiceGroup).toBeTruthy();
    expect(within(singleChoiceGroup!).getByText('Elige 1')).toBeTruthy();
    expect(within(singleChoiceGroup!).getAllByText('Suplemento +€0.00').length).toBeGreaterThan(0);
  });

  it('shows the max-selection hint for multi-choice groups when available', async () => {
    const { fixture } = await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Café solo/i }));
    fixture.detectChanges();

    const details = screen.getByRole('complementary');
    const multiChoiceGroup = within(details).getByText('Elegir Opciones de café').closest('fieldset');

    expect(multiChoiceGroup).toBeTruthy();
    expect(within(multiChoiceGroup!).getByText('Hasta 3')).toBeTruthy();
  });

  it('shows a price badge for priced options and a warning badge for unused modifier groups', async () => {
    const sharedModifierGroups = [
      ...localizeModifierGroups('es'),
      {
        id: 'unused-group',
        name: 'Grupo sin usar',
        type: 'multiple' as const,
        required: false,
        minSelections: 0,
        maxSelections: 1,
        options: [{ id: 'unused-opt', name: 'Opción suelta', priceDelta: 0 }],
      },
    ];

    const { fixture } = await renderPage({ listModifierGroups: () => of(sharedModifierGroups) });

    fireEvent.click(screen.getByRole('radio', { name: 'Modificadores' }));
    fixture.detectChanges();

    const extrasCard = screen.getByText('Extras de hamburguesa').closest('article');
    expect(within(extrasCard!).getByText(/Bacon.*\+€1\.50/)).toBeTruthy();

    const unusedCard = screen.getByText('Grupo sin usar').closest('article');
    expect(within(unusedCard!).getByText('Usado en 0 productos')).toBeTruthy();
  });

  it('groups modifier groups by selection type with a translated heading', async () => {
    const { fixture } = await renderPage();

    fireEvent.click(screen.getByRole('radio', { name: 'Modificadores' }));
    fixture.detectChanges();

    expect(screen.getAllByText(/Selección única/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Selección múltiple/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Quitar ingredientes/).length).toBeGreaterThan(0);
  });

  it('filters modifier groups with the per-tab search box', async () => {
    const { fixture } = await renderPage();

    fireEvent.click(screen.getByRole('radio', { name: 'Modificadores' }));
    fixture.detectChanges();

    fireEvent.input(screen.getByLabelText('Buscar en esta pestaña'), { target: { value: 'extras de hamburguesa' } });
    fixture.detectChanges();

    expect(screen.getByText('Extras de hamburguesa')).toBeTruthy();
    expect(screen.queryByText('Punto de la carne')).toBeNull();
  });

  it('shows a no-results message when the tab search has no matches', async () => {
    const { fixture } = await renderPage();

    fireEvent.click(screen.getByRole('radio', { name: 'Modificadores' }));
    fixture.detectChanges();

    fireEvent.input(screen.getByLabelText('Buscar en esta pestaña'), { target: { value: 'zzzzz' } });
    fixture.detectChanges();

    expect(screen.getByText('No hay resultados para tu búsqueda.')).toBeTruthy();
  });

  it('clears the tab search when switching tabs', async () => {
    const { fixture } = await renderPage();

    fireEvent.click(screen.getByRole('radio', { name: 'Modificadores' }));
    fixture.detectChanges();
    fireEvent.input(screen.getByLabelText('Buscar en esta pestaña'), { target: { value: 'extras' } });
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('radio', { name: 'Categorías' }));
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('radio', { name: 'Modificadores' }));
    fixture.detectChanges();

    expect((screen.getByLabelText('Buscar en esta pestaña') as HTMLInputElement).value).toBe('');
    expect(screen.getByText('Punto de la carne')).toBeTruthy();
  });

  it('filters combos with the per-tab search box', async () => {
    const { fixture } = await renderPage();

    fireEvent.click(screen.getByRole('radio', { name: 'Menús' }));
    fixture.detectChanges();

    fireEvent.input(screen.getByLabelText('Buscar en esta pestaña'), { target: { value: 'zzzzz' } });
    fixture.detectChanges();

    expect(screen.queryByText('Menu Classic Burger')).toBeNull();
    expect(screen.getByText('No hay resultados para tu búsqueda.')).toBeTruthy();
  });

  it('shows an image or placeholder on platter cards, matching combos', async () => {
    const { fixture } = await renderPage();

    fireEvent.click(screen.getByRole('radio', { name: 'Platos combinados' }));
    fixture.detectChanges();

    const card = screen.getByText('Plato combinado de lomo').closest('article');
    expect(card).toBeTruthy();
    expect(within(card!).queryByRole('img') ?? within(card!).getByText('Sin imagen')).toBeTruthy();
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
  expect(screen.getByText('Qué revisar en los combos')).toBeTruthy();

  fireEvent.click(screen.getByRole('radio', { name: 'Platos combinados' }));
    fixture.detectChanges();
    expect(screen.getByText('Plato combinado de lomo')).toBeTruthy();
    expect(screen.getAllByText('Plato combinado').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('radio', { name: 'Disponibilidad' }));
    fixture.detectChanges();
    expect(screen.getByText('Activa o desactiva productos para el servicio de hoy.')).toBeTruthy();
    expect(screen.getByText('Coulant de chocolate')).toBeTruthy();
  });

  it('keeps combo image coverage scoped to combo products only', async () => {
    const menuData = buildMockMenuData();
    const comboIndex = menuData.products.findIndex((product) => product.id === 'product-16');
    menuData.products[comboIndex] = { ...menuData.products[comboIndex], imageUrl: undefined };

    const { fixture } = await renderPage({
      getMenu: () => of(menuData),
    });

    fireEvent.click(screen.getByRole('radio', { name: 'Menús' }));
    fixture.detectChanges();

    const withImageCard = screen.getByText('Con imagen').closest('div');
    expect(withImageCard).toBeTruthy();
    expect(within(withImageCard!).getByText('0')).toBeTruthy();
  });

  it('renders the parent category name instead of the raw parent id', async () => {
    const { fixture } = await renderPage();

    fireEvent.click(screen.getByRole('radio', { name: 'Categorías' }));
    fixture.detectChanges();

    expect(screen.getAllByText(/Categoría padre: Hamburguesas/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Categoría padre: burgers-classic/)).toBeNull();
  });

  it('renders es sales strings localized instead of fallback english copy', async () => {
    const { fixture } = await renderPage();

    expect(screen.queryAllByText('No image')).toHaveLength(0);
    expect(screen.getAllByText('Sin imagen').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Hamburguesa craft/i }));
    fixture.detectChanges();

    expect(screen.getByText('Precio de vista previa')).toBeTruthy();
  });

  it('renders ca sales strings localized in catalan', async () => {
    const { fixture } = await renderPage({}, 'ca');

    expect(screen.queryAllByText('No image')).toHaveLength(0);
    expect(screen.getAllByText('Sense imatge').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Hamburguesa craft/i }));
    fixture.detectChanges();

    expect(screen.getByText('Preu de vista prèvia')).toBeTruthy();
    expect(screen.getByText("Pots canviar")).toBeTruthy();
  });

  it('shows an empty state when filters have no results', async () => {
    const { fixture } = await renderPage();

    fireEvent.input(screen.getByLabelText('Buscar en el catálogo'), { target: { value: 'zzzzz' } });
    fixture.detectChanges();

    expect(screen.getByText('No hay productos que coincidan con los filtros.')).toBeTruthy();
    expect(screen.getByText('Selecciona un producto para revisar su detalle.')).toBeTruthy();
  });

  describe('tab Categorías â€” CRUD', () => {
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

  describe('tab Productos â€” artículo sin sección', () => {
    const renderWithCatalogProduct = async (overrides = {}) => {
      const result = await renderPage({
        listProducts: () => of([CATALOG_ONLY_PRODUCT]),
        ...overrides,
      });
      return result;
    };

    it('muestra badge "Sin sección" para artículos del catálogo sin asignar', async () => {
      await renderWithCatalogProduct();
      expect(screen.getAllByText('Sin sección').length).toBeGreaterThan(0);
    });

    it('mantiene el badge "Personalizable" para artículos de catálogo con modificadores', async () => {
      await renderWithCatalogProduct({
        listProducts: () =>
          of([
            {
              ...CATALOG_ONLY_PRODUCT,
              name: 'Burger fuera de carta',
              modifierGroupIds: ['burger-extras'],
            },
          ]),
      });

      const card = screen.getAllByRole('button', { name: 'Burger fuera de carta' })[0];
      expect(within(card).getByText('Personalizable')).toBeTruthy();
    });

    it('muestra botón "Añadir a sección" para artículos sin asignar', async () => {
      await renderWithCatalogProduct();
      expect(screen.getByRole('button', { name: /añadir a sección/i })).toBeTruthy();
    });

    it('abre el selector de sección al pulsar "Añadir a sección"', async () => {
      const { fixture } = await renderWithCatalogProduct();

      fireEvent.click(screen.getByRole('button', { name: /añadir a sección/i }));
      fixture.detectChanges();

      expect(screen.getByRole('dialog', { name: /añadir a sección/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Bebidas' })).toBeTruthy();
    });

    it('llama a addSectionItem con menuId, sectionId y restaurantProductId correctos', async () => {
      const addSectionItem = vi.fn(() => of(undefined));
      const { fixture } = await renderWithCa