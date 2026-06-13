import { fireEvent, render, screen } from '@testing-library/angular';
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
      modifierGroupIds: [],
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
  ];

  it('renders quantity controls and keeps favorites independent from adding products', async () => {
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

    const favoriteButton = screen.getByRole('button', { name: 'Quitar Hamburguesa craft de favoritos' });
    const regularButton = screen.getAllByRole('button').find((button) => button.getAttribute('aria-pressed') === 'false');
    const burgerDecrease = screen.getByRole('button', { name: 'Quitar una unidad de Hamburguesa craft' });
    const lemonadeDecrease = screen.getByRole('button', { name: 'Quitar una unidad de Limonada con gas' });

    expect(favoriteButton.getAttribute('aria-pressed')).toBe('true');
    expect(favoriteButton.className).toContain('focus-visible:ring-2');
    expect(favoriteButton.className).toContain('active:scale-95');
    expect(favoriteButton.textContent?.trim()).toBe('\u2605');
    expect(regularButton?.getAttribute('aria-pressed')).toBe('false');
    expect(regularButton?.textContent?.trim()).toBe('\u2606');
    expect(screen.getByText('Añadido')).toBeTruthy();
    expect(screen.getByText('Hamburguesa craft')).toBeTruthy();
    expect(screen.queryByText('Craft Burger')).toBeNull();
    expect(screen.getByLabelText('Cantidad de Hamburguesa craft: 2')).toBeTruthy();
    expect(screen.getByLabelText('Cantidad de Limonada con gas: 0')).toBeTruthy();
    expect(burgerDecrease.hasAttribute('disabled')).toBe(false);
    expect(lemonadeDecrease.hasAttribute('disabled')).toBe(true);
    expect(screen.getByTestId('product-search-results').className).toContain('h-[22rem]');

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

    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
    expect(finished).toHaveBeenCalledOnce();
  });
});
