import { fireEvent, render, screen } from '@testing-library/angular';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import type { Product } from '../../models/restaurant-pos.models';
import { ProductSearchDialog } from './product-search-dialog';

describe('ProductSearchDialog', () => {
  const products: Product[] = [
    {
      id: 'burger',
      name: 'Craft Burger',
      category: 'Burgers',
      price: 12.5,
      available: true,
    },
    {
      id: 'lemonade',
      name: 'Sparkling Lemonade',
      category: 'Drinks',
      price: 4.5,
      available: true,
    },
  ];

  it('renders product view segments and lets products be marked as favorites independently from adding them', async () => {
    const i18n = provideI18nTesting();
    const productViewChanged = vi.fn();
    const productCategoryFilterChanged = vi.fn();
    const favoriteToggled = vi.fn();
    const productSelected = vi.fn();

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
      },
    });
    fixture.componentInstance.productViewChanged.subscribe(productViewChanged);
    fixture.componentInstance.productCategoryFilterChanged.subscribe(productCategoryFilterChanged);
    fixture.componentInstance.favoriteToggled.subscribe(favoriteToggled);
    fixture.componentInstance.productSelected.subscribe(productSelected);

    const favoriteButton = screen.getByRole('button', { name: 'Quitar Craft Burger de favoritos' });
    const regularButton = screen.getAllByRole('button').find((button) => button.getAttribute('aria-pressed') === 'false');

    expect(favoriteButton.getAttribute('aria-pressed')).toBe('true');
    expect(favoriteButton.className).toContain('focus-visible:ring-2');
    expect(favoriteButton.className).toContain('active:scale-95');
    expect(favoriteButton.textContent?.trim()).toBe('\u2605');
    expect(regularButton?.getAttribute('aria-pressed')).toBe('false');
    expect(regularButton?.textContent?.trim()).toBe('\u2606');
    expect(screen.getByText('Añadido')).toBeTruthy();
    expect(screen.getByTestId('product-search-results').className).toContain('h-[22rem]');
    expect(screen.getByRole('radio', { name: 'Todos' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('radio', { name: 'Favoritos' }));

    expect(productViewChanged).toHaveBeenCalledWith('favorites');

    fireEvent.change(screen.getByRole('combobox', { name: 'Categoría' }), { target: { value: 'drinks' } });
    expect(productCategoryFilterChanged).toHaveBeenCalledWith('drinks');

    fireEvent.click(screen.getByRole('button', { name: 'Quitar Craft Burger de favoritos' }));
    expect(favoriteToggled).toHaveBeenCalledWith('burger');
    expect(productSelected).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /^Sparkling Lemonade/ }));
    expect(productSelected).toHaveBeenCalledWith('lemonade');
  });
});
