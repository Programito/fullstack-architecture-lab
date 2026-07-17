import { fireEvent, render, screen, within } from '@testing-library/angular';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import type { Product } from '../../models/restaurant-pos.models';
import { ProductSearchDialog } from './product-search-dialog';

describe('ProductSearchDialog', () => {
  const kitchenPolicy = { route: 'kitchen', requiresReadyBeforeServe: true } as const;
  const barPolicy = { route: 'bar', requiresReadyBeforeServe: false } as const;
  const dessertPolicy = { route: 'dessert_station', requiresReadyBeforeServe: true } as const;

  const products: Product[] = [
    {
      id: 'burger',
      name: 'Hamburguesa craft',
      categoryId: 'burgers-classic',
      category: 'Hamburguesas',
      description: 'Carne de ternera con salsa de la casa.',
      basePrice: 12.5,
      price: 12.5,
      available: true,
      course: 'main',
      type: 'simple',
      modifierGroupIds: ['burger-extras'],
      preparationPolicy: kitchenPolicy,
    },
    {
      id: 'lemonade',
      name: 'Limonada con gas',
      categoryId: 'drinks',
      category: 'Bebidas',
      basePrice: 4.5,
      price: 4.5,
      available: true,
      course: 'drinks',
      type: 'simple',
      modifierGroupIds: [],
      preparationPolicy: barPolicy,
    },
    {
      id: 'combo',
      name: 'Menu Classic Burger',
      categoryId: 'menus',
      category: 'Menus',
      basePrice: 13.5,
      price: 13.5,
      available: true,
      course: 'main',
      type: 'combo',
      modifierGroupIds: [],
      preparationPolicy: kitchenPolicy,
      comboDefinitionId: 'combo-classic-burger-menu',
    },
    {
      id: 'sold-out',
      name: 'Coulant de chocolate',
      categoryId: 'desserts',
      category: 'Postres',
      basePrice: 7,
      price: 7,
      available: false,
      course: 'dessert',
      type: 'simple',
      modifierGroupIds: [],
      preparationPolicy: dessertPolicy,
    },
    {
      id: 'platter-loin',
      name: 'Plato combinado de lomo',
      categoryId: 'platters',
      category: 'Platos combinados',
      basePrice: 12.9,
      price: 12.9,
      available: true,
      course: 'main',
      type: 'platter',
      modifierGroupIds: ['platter-remove', 'platter-extras'],
      preparationPolicy: kitchenPolicy,
      platterComponents: [
        { id: 'loin', name: 'Lomo', quantity: 1, removable: false, replaceable: false },
        { id: 'egg', name: 'Huevo', quantity: 1, removable: true, replaceable: false },
      ],
    },
    {
      id: 'platter-veggie',
      name: 'Plato combinado vegetal',
      categoryId: 'platters',
      category: 'Platos combinados',
      basePrice: 11.9,
      price: 11.9,
      available: true,
      course: 'main',
      type: 'platter',
      modifierGroupIds: [],
      preparationPolicy: kitchenPolicy,
      platterComponents: [
        { id: 'egg', name: 'Huevo', quantity: 1, removable: true, replaceable: false },
        { id: 'salad', name: 'Ensalada', quantity: 1, removable: true, replaceable: false },
      ],
    },
  ];

  const renderDialog = async (inputs: Record<string, unknown> = {}) => {
    const i18n = provideI18nTesting();

    return render(ProductSearchDialog, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        open: true,
        query: '',
        products,
        activeSection: 'all',
        favoriteProductIds: ['burger'],
        bestSellerProductIds: ['burger', 'combo'],
        lastAddedProductId: 'lemonade',
        productQuantities: { burger: 2, combo: 1 },
        selectedOrderTotal: 38.5,
        ...inputs,
      },
    });
  };

  const section = (name: string) => screen.getByRole('region', { name });

  it('renders the product picker as a drawer-style overlay with search-first hierarchy', async () => {
    await renderDialog({ open: true });

    const dialog = screen.getByRole('dialog', { name: 'Añadir productos' });
    expect(dialog.closest('app-dialog')?.getAttribute('data-layout')).toBe('drawer');
    expect(screen.getByTestId('product-picker-header')).toBeTruthy();
    expect(screen.getByTestId('product-picker-quick-sections')).toBeTruthy();
  });

  it('keeps quick add actions visible while browsing products', async () => {
    await renderDialog({ open: true });

    expect(screen.getAllByRole('button', { name: /Añadir/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Más vendidos|Favoritos/).length).toBeGreaterThan(0);
  });

  it('renders section chips, grouped products and polished POS card actions', async () => {
    const { fixture } = await renderDialog();
    const sectionChanged = vi.fn();
    const favoriteToggled = vi.fn();
    const productConfigured = vi.fn();
    const finished = vi.fn();
    fixture.componentInstance.sectionChanged.subscribe(sectionChanged);
    fixture.componentInstance.favoriteToggled.subscribe(favoriteToggled);
    fixture.componentInstance.productConfigured.subscribe(productConfigured);
    fixture.componentInstance.finished.subscribe(finished);

    for (const chip of ['Todos', 'Favoritos', 'Más vendidos', 'Bebidas', 'Comida', 'Menús', 'Platos combinados', 'Postres']) {
      expect(screen.getByRole('button', { name: chip })).toBeTruthy();
    }

    expect(screen.getByRole('heading', { name: 'Añadir productos' })).toBeTruthy();
    expect(section('Favoritos')).toBeTruthy();
    expect(section('Más vendidos')).toBeTruthy();
    expect(section('Bebidas')).toBeTruthy();
    expect(section('Platos combinados')).toBeTruthy();
    expect(section('Postres')).toBeTruthy();
    expect(within(section('Favoritos')).getByText('Hamburguesa craft')).toBeTruthy();
    expect(within(section('Más vendidos')).getByText('Menu Classic Burger')).toBeTruthy();
    expect(within(section('Bebidas')).getByText('Limonada con gas')).toBeTruthy();
    expect(within(section('Postres')).getByText('Coulant de chocolate')).toBeTruthy();
    expect(screen.queryByText(/restaurantPos\.service/)).toBeNull();
    expect(screen.queryByText('Finalizar')).toBeNull();
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeTruthy();
    expect(screen.getByText(/3 productos/).textContent).toMatch(/38,50/);
    expect(screen.getByTestId('product-search-layout').className).toContain('h-full');
    expect(screen.getByTestId('product-search-results').className).toContain('overflow-y-auto');

    const chips = screen.getByTestId('product-section-chips');
    expect(chips.className).toContain('flex-wrap');
    expect(chips.className).not.toContain('min-w-max');
    expect(chips.parentElement?.className).not.toContain('overflow-x-auto');

    const activeChip = screen.getByRole('button', { name: 'Todos' });
    expect(activeChip.className).toContain('text-[var(--ui-primary)]');
    expect(activeChip.className).toContain('hover:text-[var(--ui-primary)]');
    expect(activeChip.className).not.toContain('text-white');

    const burgerRow = screen.getAllByTestId('product-search-row-burger')[0];
    const lemonadeRow = screen.getByTestId('product-search-row-lemonade');
    const comboRow = screen.getAllByTestId('product-search-row-combo')[0];
    const platterRow = screen.getAllByTestId('product-search-row-platter-loin')[0];
    const soldOutRow = screen.getByTestId('product-search-row-sold-out');
    const lemonadeAvatar = screen.getByTestId('product-search-avatar-lemonade');
    const comboAvatar = screen.getAllByTestId('product-search-avatar-combo')[0];

    expect(within(burgerRow).getByText('Personalizable')).toBeTruthy();
    expect(within(burgerRow).getByText('Favorito')).toBeTruthy();
    expect(within(burgerRow).getByText('Más vendido')).toBeTruthy();
    expect(within(burgerRow).getByText('Carne de ternera con salsa de la casa.')).toBeTruthy();
    expect(within(comboRow).getByText('Menú')).toBeTruthy();
    expect(within(platterRow).getByText('Plato combinado')).toBeTruthy();
    expect(within(soldOutRow).getByText('Agotado')).toBeTruthy();
    expect(within(burgerRow).queryByLabelText('Cantidad de Hamburguesa craft: 2')).toBeNull();
    expect(within(lemonadeRow).queryByLabelText('Cantidad de Limonada con gas: 0')).toBeNull();
    expect(within(burgerRow).getByRole('button', { name: 'Configurar Hamburguesa craft' }).textContent?.trim()).toBe('Configurar');
    expect(within(lemonadeRow).getByRole('button', { name: 'Añadir una unidad de Limonada con gas' }).textContent?.trim()).toBe('Añadir');
    expect(within(comboRow).getByRole('button', { name: 'Configurar menú Menu Classic Burger' }).textContent?.trim()).toBe('Configurar menú');
    expect(within(platterRow).getByRole('button', { name: 'Configurar plato Plato combinado de lomo' }).textContent?.trim()).toBe('Configurar plato');
    expect(within(soldOutRow).getByRole('button', { name: 'Añadir una unidad de Coulant de chocolate' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Favoritos' }).className).toContain('cursor-pointer');
    expect(within(soldOutRow).getByRole('button', { name: 'Añadir una unidad de Coulant de chocolate' }).className).toContain('disabled:cursor-not-allowed');
    expect(lemonadeAvatar.className).toContain('rounded-full');
    expect(within(lemonadeAvatar).getByText('local_drink')).toBeTruthy();
    expect(within(comboAvatar).getByText('restaurant_menu')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Favoritos' }));
    expect(sectionChanged).toHaveBeenCalledWith('favorites');

    fireEvent.click(screen.getByRole('button', { name: 'Quitar Hamburguesa craft de favoritos' }));
    expect(favoriteToggled).toHaveBeenCalledWith('burger');

    fireEvent.click(within(lemonadeRow).getByRole('button', { name: 'Añadir una unidad de Limonada con gas' }));
    expect(productConfigured).toHaveBeenCalledWith('lemonade');

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(finished).toHaveBeenCalledOnce();
  });

  it('switches to flat search results and searches by type labels', async () => {
    await renderDialog({ query: 'plato combinado' });

    expect(section('Resultados para "plato combinado"')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Bebidas' })).toBeNull();
    expect(within(section('Resultados para "plato combinado"')).getByText('Plato combinado de lomo')).toBeTruthy();
    expect(within(section('Resultados para "plato combinado"')).getByText('Plato combinado vegetal')).toBeTruthy();
    expect(within(section('Resultados para "plato combinado"')).queryByText('Limonada con gas')).toBeNull();
  });

  it('matches search text without requiring accents', async () => {
    await renderDialog({ query: 'menu' });

    expect(within(section('Resultados para "menu"')).getByText('Menu Classic Burger')).toBeTruthy();
    expect(within(section('Resultados para "menu"')).queryByText('Limonada con gas')).toBeNull();
  });

  it('shows a single filtered section when the route passes section products', async () => {
    await renderDialog({
      activeSection: 'combos',
      products: products.filter((product) => product.type === 'combo'),
      allProducts: products,
      productQuantities: {},
    });

    expect(section('Menús')).toBeTruthy();
    expect(within(section('Menús')).getByText('Menu Classic Burger')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Bebidas' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Todos' }).textContent).toContain(String(products.length));
    expect(screen.getByRole('button', { name: 'Menús' }).textContent).toContain('1');
  });

  it('shows configured options without quantity steppers and lets each option be added again', async () => {
    const { fixture } = await renderDialog({
      activeSection: 'combos',
      products: products.filter((product) => product.type === 'combo'),
      productQuantities: { combo: 3 },
      configuredLines: [
        { lineId: 'line-combo-classic', productId: 'combo', quantity: 2, summary: 'Hamburguesa craft · Patatas bravas · Agua' },
        { lineId: 'line-combo-beer', productId: 'combo', quantity: 1, summary: 'Hamburguesa craft · Ensalada · Cerveza' },
      ],
    });
    const productConfigured = vi.fn();
    const configuredLineIncremented = vi.fn();
    fixture.componentInstance.productConfigured.subscribe(productConfigured);
    fixture.componentInstance.configuredLineIncremented.subscribe(configuredLineIncremented);

    const comboRow = screen.getByTestId('product-search-row-combo');
    const comboActions = within(comboRow).getByTestId('product-search-row-actions');
    expect(within(comboRow).getByText('3 en pedido · 2 opciones')).toBeTruthy();
    expect(comboActions.className).toContain('w-full');
    expect(comboActions.className).toContain('min-w-0');
    expect(comboActions.className).toContain('max-w-full');
    expect(comboActions.className).toContain('flex-wrap');
    expect(comboActions.className).not.toContain('shrink-0');
    expect(within(comboRow).queryByText(/Hamburguesa craft · Patatas bravas · Agua/)).toBeNull();

    fireEvent.click(within(comboRow).getByRole('button', { name: 'Ver opciones' }));

    expect(within(comboRow).getByTestId('product-search-options-panel').className).toContain('max-w-full');
    expect(within(comboRow).getByTestId('product-search-options-panel').className).toContain('overflow-hidden');
    expect(within(comboRow).getByText('2 x Hamburguesa craft · Patatas bravas · Agua')).toBeTruthy();
    expect(within(comboRow).getByText('1 x Hamburguesa craft · Ensalada · Cerveza')).toBeTruthy();
    expect(within(comboRow).queryByRole('button', { name: /Quitar una unidad de Menu Classic Burger/i })).toBeNull();

    fireEvent.click(within(comboRow).getByRole('button', { name: 'Añadir una unidad de Menu Classic Burger con Hamburguesa craft · Patatas bravas · Agua' }));
    expect(configuredLineIncremented).toHaveBeenCalledWith('line-combo-classic');

    fireEvent.click(within(comboRow).getByRole('button', { name: 'Crear otra opción de Menu Classic Burger' }));
    expect(productConfigured).toHaveBeenCalledWith('combo');
  });

  it('uses the selected order total for the footer summary when provided', async () => {
    await renderDialog({
      productQuantities: { burger: 2 },
      selectedOrderTotal: 27.4,
    });

    expect(screen.getByText(/2 productos/).textContent).toMatch(/27,40/);
  });
});
