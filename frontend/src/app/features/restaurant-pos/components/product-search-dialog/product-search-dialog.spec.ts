import { fireEvent, render, screen, within } from '@testing-library/angular';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import type { Product } from '../../models/restaurant-pos.models';
import { ProductSearchDialog } from './product-search-dialog';

describe('ProductSearchDialog', () => {
  const products: Product[] = [
    {
      id: 'burger',
      name: 'Hamburguesa craft',
      categoryId: 'burgers-classic',
      category: 'Hamburguesas',
      basePrice: 12.5,
      price: 12.5,
      available: true,
      course: 'main',
      type: 'simple',
      modifierGroupIds: ['burger-extras'],
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
    },
  ];

  it('renders POS product actions, badges and favorites without zero steppers', async () => {
    const i18n = provideI18nTesting();
    const productViewChanged = vi.fn();
    const productCategoryFilterChanged = vi.fn();
    const favoriteToggled = vi.fn();
    const productIncremented = vi.fn();
    const productDecremented = vi.fn();
    const finished = vi.fn();

    const { fixture } = await render(ProductSearchDialog, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        open: true,
        query: '',
        products,
        productView: 'all',
        productCategoryFilter: 'all',
        productCategoryOptions: [
          { label: 'Todas', value: 'all' },
          { label: 'Principal', value: 'main' },
          { label: 'Bebidas', value: 'drinks' },
        ],
        favoriteProductIds: ['burger'],
        lastAddedProductId: 'lemonade',
        productQuantities: { burger: 2 },
      },
    });
    fixture.componentInstance.productViewChanged.subscribe(productViewChanged);
    fixture.componentInstance.productCategoryFilterChanged.subscribe(productCategoryFilterChanged);
    fixture.componentInstance.favoriteToggled.subscribe(favoriteToggled);
    fixture.componentInstance.productIncremented.subscribe(productIncremented);
    fixture.componentInstance.productDecremented.subscribe(productDecremented);
    fixture.componentInstance.finished.subscribe(finished);

    const burgerRow = screen.getByTestId('product-search-row-burger');
    const lemonadeRow = screen.getByTestId('product-search-row-lemonade');
    const comboRow = screen.getByTestId('product-search-row-combo');
    const soldOutRow = screen.getByTestId('product-search-row-sold-out');
    const favoriteButton = screen.getByRole('button', { name: 'Quitar Hamburguesa craft de favoritos' });
    const regularButton = screen.getAllByRole('button').find((button) => button.getAttribute('aria-pressed') === 'false');
    const burgerDecrease = within(burgerRow).getByRole('button', { name: 'Quitar una unidad de Hamburguesa craft' });
    const comboAction = within(comboRow).getByRole('button', { name: 'Configuración de menú próximamente para Menu Classic Burger' });
    const soldOutAction = within(soldOutRow).getByRole('button', { name: 'Añadir una unidad de Coulant de chocolate' });

    expect(favoriteButton.getAttribute('aria-pressed')).toBe('true');
    expect(favoriteButton.textContent?.trim()).toBe('\u2605');
    expect(regularButton?.getAttribute('aria-pressed')).toBe('false');
    expect(regularButton?.textContent?.trim()).toBe('\u2606');
    expect(screen.getByRole('dialog', { name: 'Añadir productos' })).toBeTruthy();
    expect(screen.getByText('Busca, filtra y añade productos al pedido.')).toBeTruthy();
    expect(screen.getByText('Hamburguesa craft')).toBeTruthy();
    expect(screen.getByText('Personalizable')).toBeTruthy();
    expect(screen.getByText('Menú')).toBeTruthy();
    expect(screen.getByText('Agotado')).toBeTruthy();
    expect(screen.queryByText('restaurantPos.service.combo')).toBeNull();
    expect(screen.queryByText('restaurantPos.service.addProductAction')).toBeNull();
    expect(screen.queryByText('restaurantPos.service.configureProductAction')).toBeNull();
    expect(screen.queryByText('Craft Burger')).toBeNull();
    expect(screen.queryByText('Finalizar')).toBeNull();
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeTruthy();

    expect(screen.getByLabelText('Cantidad de Hamburguesa craft: 2')).toBeTruthy();
    expect(within(lemonadeRow).getByRole('button', { name: 'Añadir una unidad de Limonada con gas' }).textContent?.trim()).toBe('Añadir');
    expect(within(lemonadeRow).queryByLabelText('Cantidad de Limonada con gas: 0')).toBeNull();
    expect(within(lemonadeRow).queryByRole('button', { name: 'Quitar una unidad de Limonada con gas' })).toBeNull();
    expect(within(burgerRow).getByRole('button', { name: 'Quitar una unidad de Hamburguesa craft' })).toBeTruthy();
    expect(within(burgerRow).getByRole('button', { name: 'Añadir una unidad de Hamburguesa craft' })).toBeTruthy();
    expect(burgerDecrease.hasAttribute('disabled')).toBe(false);
    expect(comboAction.hasAttribute('disabled')).toBe(true);
    expect(comboAction.textContent?.trim()).toBe('Próximamente');
    expect(soldOutAction.hasAttribute('disabled')).toBe(true);
    expect(burgerRow.querySelector('[data-testid="product-search-row-actions"]')).toBeTruthy();

    expect(screen.getByRole('radio', { name: 'Todos' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('radio', { name: 'Favoritos' }));

    expect(productViewChanged).toHaveBeenCalledWith('favorites');

    fireEvent.change(screen.getByRole('combobox', { name: 'Categoría' }), { target: { value: 'drinks' } });
    expect(productCategoryFilterChanged).toHaveBeenCalledWith('drinks');

    fireEvent.click(screen.getByRole('button', { name: 'Quitar Hamburguesa craft de favoritos' }));
    expect(favoriteToggled).toHaveBeenCalledWith('burger');

    fireEvent.click(screen.getByRole('button', { name: 'Añadir una unidad de Limonada con gas' }));
    expect(productIncremented).toHaveBeenCalledWith('lemonade');

    fireEvent.click(screen.getByRole('button', { name: 'Quitar una unidad de Hamburguesa craft' }));
    expect(productDecremented).toHaveBeenCalledWith('burger');

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(finished).toHaveBeenCalledOnce();
  });

  it('shows configure as the primary action for customizable products with no quantity', async () => {
    const i18n = provideI18nTesting();
    const productIncremented = vi.fn();

    const { fixture } = await render(ProductSearchDialog, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        open: true,
        query: '',
        products,
        productView: 'all',
        productCategoryFilter: 'all',
        productCategoryOptions: [{ label: 'Todas', value: 'all' }],
        favoriteProductIds: [],
        lastAddedProductId: null,
        productQuantities: {},
      },
    });
    fixture.componentInstance.productIncremented.subscribe(productIncremented);

    const burgerRow = screen.getByTestId('product-search-row-burger');
    const configureButton = within(burgerRow).getByRole('button', { name: 'Configurar Hamburguesa craft' });
    const customizableBadge = within(burgerRow).getByText('Personalizable');
    const actionSlot = burgerRow.querySelector('[data-testid="product-search-row-actions"]');

    expect(configureButton.textContent?.trim()).toBe('Configurar');
    expect(within(burgerRow).queryByLabelText('Cantidad de Hamburguesa craft: 0')).toBeNull();
    expect(customizableBadge.parentElement?.parentElement).toBe(actionSlot?.parentElement);

    fireEvent.click(configureButton);
    expect(productIncremented).toHaveBeenCalledWith('burger');
  });
});
